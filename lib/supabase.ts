import './cryptoPolyfill';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import { neonData, neonAuth, NEON_AUTH_URL, NEON_S3_ENDPOINT, getNeonJWTToken, persistSessionToken, getPersistedSessionToken, clearPersistedSession, restoreSession, isJwtAnonymous, parseJwtPayload } from './neon';

// Dynamically resolves Node-only modules in CLI scripts/tests without Metro bundling them into client builds
function safeNodeRequire(moduleName: string): any {
  if (Platform.OS !== 'web' && Platform.OS !== 'android' && Platform.OS !== 'ios') {
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
      try {
        const req = eval('require');
        return req(moduleName);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Realtime channel implementation for Neon.
 * Provides active change-detection polling on PostgREST endpoints to deliver real-time
 * social events (friend requests, friendships, payment updates) without proprietary websockets.
 */
export class NeonRealtimeChannel {
  private _listeners: Array<{
    event: string;
    schema: string;
    table: string;
    filter?: string;
    callback: (payload: any) => void;
  }> = [];
  private _pollIntervalId: any = null;
  private _lastSnapshots: Map<string, any[]> = new Map();
  private _statusCallback: any = null;
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  on(
    type: string,
    filterConfig: { event: string; schema?: string; table: string; filter?: string },
    callback: (payload: any) => void,
  ) {
    this._listeners.push({
      event: filterConfig.event || '*',
      schema: filterConfig.schema || 'public',
      table: filterConfig.table,
      filter: filterConfig.filter,
      callback,
    });
    return this;
  }

  subscribe(statusCallback?: (status: string, err?: any) => void) {
    if (statusCallback) {
       statusCallback('SUBSCRIBED');
       this._statusCallback = statusCallback;
    }
    this.startPolling();
    return this;
  }

  private async pollChanges() {
    for (const listener of this._listeners) {
      try {
        let query = (neonData as any).from(listener.table).select('*');

        // ── Filter ──────────────────────────────────────────────────────────
        const isFiltered = !!listener.filter;
        if (isFiltered) {
          const match = listener.filter!.match(/^([^=]+)=eq\.(.+)$/);
          if (match) {
            const [, col, val] = match;
            query = query.eq(col, val);
          }
        }

        // ── Ordering and limits ──────────────────────────────────────────────
        // CRITICAL: DELETE detection requires that every row in the subscription
        // scope is present in every snapshot. If we order by timestamp DESC and
        // apply a LIMIT, a row that receives an UPDATE (bumping updated_at) will
        // displace an *older* row from the window — generating a false DELETE.
        //
        // Rule:
        //  • Filtered subscriptions (user_id=eq.xxx): no ordering, high limit.
        //    All rows for that user fit comfortably; DELETE detection is safe.
        //  • Unfiltered global subscriptions: order DESC for INSERT/UPDATE, but
        //    NEVER emit DELETE — a row leaving the window is not a deletion.
        const FILTERED_LIMIT = 1000;
        const GLOBAL_LIMIT = 200;

        const ORDERED_BY_UPDATED_AT = new Set([
          'profiles', 'connect_profiles', 'payment_requests',
          'tasks', 'habits', 'notes', 'day_notes', 'focus_sessions',
        ]);
        const ORDERED_BY_CREATED_AT = new Set([
          'connect_friendships', 'connect_friend_requests', 'connect_blocks',
          'connect_follows', 'connect_achievements', 'connect_xp_log',
          'user_notifications', 'announcements',
        ]);

        let allData: any[] = [];
        let fetchError = null;

        if (isFiltered) {
          // Fetch ALL rows for this filter to ensure complete snapshots for DELETE detection.
          // Requires stable ordering to paginate safely.
          if (ORDERED_BY_UPDATED_AT.has(listener.table)) {
            query = query.order('updated_at', { ascending: true });
          } else if (ORDERED_BY_CREATED_AT.has(listener.table)) {
            query = query.order('created_at', { ascending: true });
          } else {
            // Fallback stable ordering (assuming id exists on most tables)
            query = query.order('id', { ascending: true });
          }

          let from = 0;
          while (true) {
            const pageQuery = (query as any).range(from, from + FILTERED_LIMIT - 1);
            const { data, error } = await pageQuery;
            if (error) { fetchError = error; break; }
            if (!data || data.length === 0) break;
            allData.push(...data);
            if (data.length < FILTERED_LIMIT) break;
            from += FILTERED_LIMIT;
          }
        } else {
          // Global subscription: single limited fetch, DESC ordering to get latest.
          if (ORDERED_BY_UPDATED_AT.has(listener.table)) {
            query = query.order('updated_at', { ascending: false }).limit(GLOBAL_LIMIT);
          } else if (ORDERED_BY_CREATED_AT.has(listener.table)) {
            query = query.order('created_at', { ascending: false }).limit(GLOBAL_LIMIT);
          } else {
            query = query.limit(GLOBAL_LIMIT);
          }
          const { data, error } = await query;
          if (error) { fetchError = error; }
          else if (data) { allData = data; }
        }

        if (fetchError) {
          if (this._statusCallback) this._statusCallback('CHANNEL_ERROR', fetchError);
          continue;
        }

        const data = allData;
        if (!data) continue;
        if (!data) continue;

        const listenerKey = `${listener.table}:${listener.filter || 'all'}`;
        const prevData = this._lastSnapshots.get(listenerKey) || null;
        this._lastSnapshots.set(listenerKey, data);

        if (!prevData) {
          // Initial poll — establish baseline snapshot, emit nothing.
          continue;
        }

        const getPk = (item: any): string => {
          if (item.user_id && item.friend_id) return `${item.user_id}-${item.friend_id}`;
          if (item.sender_id && item.receiver_id) return `${item.sender_id}-${item.receiver_id}`;
          if (item.user_id && item.followee_id) return `${item.user_id}-${item.followee_id}`;
          if (item.blocker_id && item.blocked_id) return `${item.blocker_id}-${item.blocked_id}`;
          if (item.id) return String(item.id);
          if (item.user_id) return String(item.user_id);
          return JSON.stringify(item);
        };

        const prevMap = new Map<string, any>(prevData.map((item: any) => [getPk(item), item]));
        const currentMap = new Map<string, any>(data.map((item: any) => [getPk(item), item]));

        // ── INSERT / UPDATE ─────────────────────────────────────────────────
        for (const [id, currentItem] of currentMap) {
          const prevItem = prevMap.get(id);
          if (!prevItem) {
            if (listener.event === '*' || listener.event === 'INSERT') {
              listener.callback({
                eventType: 'INSERT',
                new: currentItem,
                old: null,
                table: listener.table,
                schema: listener.schema,
              });
            }
          } else if (JSON.stringify(currentItem) !== JSON.stringify(prevItem)) {
            if (listener.event === '*' || listener.event === 'UPDATE') {
              listener.callback({
                eventType: 'UPDATE',
                new: currentItem,
                old: prevItem,
                table: listener.table,
                schema: listener.schema,
              });
            }
          }
        }

        // ── DELETE ──────────────────────────────────────────────────────────
        // Only emit DELETEs for filtered subscriptions, where every row in the
        // scope is present in the snapshot (no ordering-based displacement).
        // For unfiltered subscriptions, records leaving a DESC-ordered window
        // are NOT deletions and must not be reported as such.
        if (isFiltered && (listener.event === '*' || listener.event === 'DELETE')) {
          for (const [id, prevItem] of prevMap) {
            if (!currentMap.has(id)) {
              listener.callback({
                eventType: 'DELETE',
                new: null,
                old: prevItem,
                table: listener.table,
                schema: listener.schema,
              });
            }
          }
        }
      } catch (err) {
        if (this._statusCallback) this._statusCallback('CHANNEL_ERROR', err);
      }
    }
  }

  startPolling() {
    if (this._pollIntervalId) return;
    this.pollChanges();
    // Poll every 8 seconds while active
    this._pollIntervalId = setInterval(() => {
      this.pollChanges();
    }, 8000);
  }

  unsubscribe() {
    if (this._pollIntervalId) {
      clearInterval(this._pollIntervalId);
      this._pollIntervalId = null;
    }
    this._listeners = [];
    return Promise.resolve('ok');
  }
}

/**
 * Neon Unified Client:
 * Drop-in replacement for Supabase across the application.
 * Routes all database queries to Neon Data API (PostgREST) with JWT injection,
 * all authentication flows to Neon Auth, and provides real object-storage operations.
 */
export class NeonUnifiedClient {
  private _authListeners = new Set<(event: string, session: any) => void>();
  private _activeChannels = new Map<string, NeonRealtimeChannel>();

  constructor() {
    try {
      if ((neonAuth as any)?.useSession?.subscribe) {
        (neonAuth as any).useSession.subscribe((val: any) => {
          if (val?.data?.session) {
            this.emitAuthStateChange('SIGNED_IN', this.formatSession(val.data));
          }
        });
      }
    } catch (e) {}
  }

  private formatSession(data: any) {
    if (!data?.session) return null;
    const token = data.session?.token || '';
    if (token) {
      persistSessionToken(token).catch(() => {});
    }
    return {
      access_token: token,
      token_type: 'bearer',
      user: {
        id: data.user?.id || data.session?.userId,
        email: data.user?.email,
        user_metadata: {
          full_name: data.user?.name,
          avatar_url: data.user?.image,
        },
      },
      ...data.session,
    };
  }

  emitAuthStateChange(event: string, session: any) {
    if (session?.access_token) {
      persistSessionToken(session.access_token).catch(() => {});
    }
    this._authListeners.forEach((listener) => {
      try {
        listener(event, session);
      } catch (err) {
        console.error('[NeonClient] Auth listener error:', err);
      }
    });
  }

  from(table: string) {
    return (neonData as any).from(table);
  }

  get auth() {
    return {
      getSession: async () => {
        try {
          const { data, error } = await neonAuth.getSession().catch(() => ({ data: null, error: null }));
          if (data?.session) {
            const session = this.formatSession(data);
            if (session) {
              const dataApiJwt = await getNeonJWTToken();
              if (dataApiJwt) session.access_token = dataApiJwt;
              return { data: { session }, error: null };
            }
          }

          // Fallback for React Native & persisted sessions across restarts
          const isManual = await AsyncStorage.getItem('groundwork_manual_signout');
          if (isManual === 'true') {
            return { data: { session: null }, error: null };
          }

          const offlineSessionStr = await AsyncStorage.getItem('groundwork_offline_session');
          if (offlineSessionStr) {
            try {
              const parsed = JSON.parse(offlineSessionStr);
              const token = parsed?.access_token || parsed?.token;
              if (token) {
                await persistSessionToken(token);
                return { data: { session: parsed }, error: null };
              }
            } catch (_) {}
          }

          const persistedToken = await getPersistedSessionToken();
          if (persistedToken && !isJwtAnonymous(persistedToken)) {
            const payload = parseJwtPayload(persistedToken);
            const userId = payload?.sub || payload?.user_id;
            if (userId) {
              let profile: any = null;
              try {
                const profileStr = await AsyncStorage.getItem(`profile_${userId}`);
                if (profileStr) profile = JSON.parse(profileStr);
              } catch (_) {}

              const reconstructedSession = {
                access_token: persistedToken,
                token: persistedToken,
                token_type: 'bearer',
                user: {
                  id: userId,
                  email: payload?.email || profile?.email || '',
                  user_metadata: {
                    full_name: profile?.full_name || payload?.name || '',
                    avatar_url: profile?.avatar_url || '',
                  },
                },
              };
              await AsyncStorage.setItem('groundwork_offline_session', JSON.stringify(reconstructedSession));
              return { data: { session: reconstructedSession }, error: null };
            }
          }

          return { data: { session: null }, error: error || null };
        } catch (e: any) {
          return { data: { session: null }, error: e };
        }
      },

      getUser: async () => {
        try {
          const { data } = await this.auth.getSession();
          if (data?.session?.user) {
            return { data: { user: data.session.user }, error: null };
          }
          try {
            const { useAuthStore } = require('@/store/useAuthStore');
            const storeUser = useAuthStore.getState().session?.user;
            if (storeUser) {
              return { data: { user: storeUser }, error: null };
            }
          } catch (_) {}
          return { data: { user: null }, error: null };
        } catch (e: any) {
          return { data: { user: null }, error: e };
        }
      },

      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        this._authListeners.add(callback);
        this.auth.getSession().then(({ data }) => {
          if (data?.session) {
            callback('INITIAL_SESSION', data.session);
          }
        }).catch(() => {});

        return {
          data: {
            subscription: {
              unsubscribe: () => {
                this._authListeners.delete(callback);
              },
            },
          },
        };
      },

      signInWithPassword: async (credentials: { email: string; password: string }) => {
        try {
          const origin = Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
            ? window.location.origin
            : 'https://groundwork.app';

          let jwtToken: string | null = null;

          // Attempt to fetch authenticated JWT directly from Neon Auth
          try {
            const rawRes = await fetch(`${NEON_AUTH_URL}/sign-in/email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Origin: origin,
              },
              body: JSON.stringify({
                email: credentials.email.trim(),
                password: credentials.password,
              }),
            });

            const cookies = rawRes.headers.get('set-cookie');
            if (cookies) {
              await AsyncStorage.setItem('neon_auth_cookie', cookies).catch(() => {});
              const tokenRes = await fetch(`${NEON_AUTH_URL}/token`, {
                headers: {
                  Origin: origin,
                  Cookie: cookies,
                },
              });
              if (tokenRes.ok) {
                const tokenJson = await tokenRes.json().catch(() => null);
                if (tokenJson?.token) {
                  jwtToken = tokenJson.token;
                }
              }
            }
          } catch (_) {}

          const { data, error } = await neonAuth.signIn.email(credentials);
          if (error) return { data: { session: null, user: null }, error };
          const session = this.formatSession(data);
          if (session) {
            if (jwtToken && !isJwtAnonymous(jwtToken)) {
              session.access_token = jwtToken;
              session.token = jwtToken;
              await persistSessionToken(jwtToken);
            } else {
              const dataApiJwt = await getNeonJWTToken();
              if (dataApiJwt && !isJwtAnonymous(dataApiJwt)) {
                session.access_token = dataApiJwt;
                session.token = dataApiJwt;
              }
            }
          }
          this.emitAuthStateChange('SIGNED_IN', session);
          return { data: { session, user: session?.user }, error: null };
        } catch (err: any) {
          return { data: { session: null, user: null }, error: err };
        }
      },

      signUp: async (params: { email: string; password: string; options?: any }) => {
        try {
          const origin = Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
            ? window.location.origin
            : 'https://groundwork.app';

          let jwtToken: string | null = null;

          try {
            const rawRes = await fetch(`${NEON_AUTH_URL}/sign-up/email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Origin: origin,
              },
              body: JSON.stringify({
                email: params.email.trim(),
                password: params.password,
                name: params.options?.data?.full_name || params.email.split('@')[0],
              }),
            });

            const cookies = rawRes.headers.get('set-cookie');
            if (cookies) {
              await AsyncStorage.setItem('neon_auth_cookie', cookies).catch(() => {});
              const tokenRes = await fetch(`${NEON_AUTH_URL}/token`, {
                headers: {
                  Origin: origin,
                  Cookie: cookies,
                },
              });
              if (tokenRes.ok) {
                const tokenJson = await tokenRes.json().catch(() => null);
                if (tokenJson?.token) {
                  jwtToken = tokenJson.token;
                }
              }
            }
          } catch (_) {}

          const { data, error } = await neonAuth.signUp.email({
            email: params.email,
            password: params.password,
            name: params.options?.data?.full_name || params.email.split('@')[0],
          });
          if (error) return { data: { session: null, user: null }, error };
          const session = this.formatSession(data);
          if (session) {
            if (jwtToken && !isJwtAnonymous(jwtToken)) {
              session.access_token = jwtToken;
              session.token = jwtToken;
              await persistSessionToken(jwtToken);
            } else {
              const dataApiJwt = await getNeonJWTToken();
              if (dataApiJwt && !isJwtAnonymous(dataApiJwt)) {
                session.access_token = dataApiJwt;
                session.token = dataApiJwt;
              }
            }
          }
          this.emitAuthStateChange('SIGNED_IN', session);
          return { data: { session, user: session?.user }, error: null };
        } catch (err: any) {
          return { data: { session: null, user: null }, error: err };
        }
      },

      signInWithOAuth: async (params: { provider: string; options?: any }) => {
        return (neonAuth.signIn as any).social({
          provider: params.provider,
          callbackURL: params.options?.redirectTo || 'groundwork://auth/callback',
        });
      },

      signOut: async (_options?: any) => {
        try {
          await neonAuth.signOut();
        } catch (e) {}
        // Clear all persisted session state (token + expiry) so a restart
        // does not restore a session that was explicitly terminated.
        await clearPersistedSession();
        this.removeAllChannels();
        this.emitAuthStateChange('SIGNED_OUT', null);
        return { error: null };
      },

      updateUser: async (attributes: any) => {
        try {
          if (attributes.password) {
            return (neonAuth as any).changePassword({
              newPassword: attributes.password,
              revokeOtherSessions: false,
            });
          }
          if (attributes.email) {
            try {
              const res = await (neonAuth as any).changeEmail({
                newEmail: attributes.email,
              });
              if (res?.error) {
                const msg =
                  res.error.code === 'CHANGE_EMAIL_DISABLED' ||
                  res.error.message?.toLowerCase().includes('disabled')
                    ? 'Email changes are currently not enabled by the authentication provider.'
                    : res.error.message || 'Failed to request email change.';
                return { data: null, error: new Error(msg) };
              }
              if (res?.data?.status === false || res?.data?.error) {
                return {
                  data: null,
                  error: new Error(res.data.error?.message || 'Email change request failed.'),
                };
              }
              return { data: { user: res?.data?.user || null }, error: null };
            } catch (err: any) {
              const msg =
                err?.code === 'CHANGE_EMAIL_DISABLED' ||
                err?.message?.toLowerCase().includes('disabled') ||
                err?.message?.toLowerCase().includes('not supported')
                  ? 'Email changes are currently not enabled by the authentication provider.'
                  : err?.message || 'Failed to update email.';
              return { data: null, error: new Error(msg) };
            }
          }
          if (attributes.data) {
            const authRes = await neonAuth.getSession().catch(() => null);
            let userId = authRes?.data?.user?.id || authRes?.data?.session?.userId;
            if (!userId) {
              try {
                const { useAuthStore } = require('@/store/useAuthStore');
                userId = useAuthStore.getState().session?.user?.id || useAuthStore.getState().getUserId();
              } catch (_) {}
            }
            if (userId && userId !== 'guest') {
              const PROFILE_COLUMNS = new Set([
                'id', 'username', 'full_name', 'avatar_url', 'role',
                'pro_status', 'pro_until', 'is_banned', 'settings',
                'email', 'provider', 'bio', 'subscription_type',
                'activation_date', 'expiration_date', 'latest_payment_request_id',
              ]);

              const directUpdates: Record<string, any> = {};
              const settingsUpdates: Record<string, any> = {};

              for (const [key, val] of Object.entries(attributes.data)) {
                if (PROFILE_COLUMNS.has(key) && key !== 'settings') {
                  directUpdates[key] = val;
                } else if (key === 'settings' && typeof val === 'object' && val !== null) {
                  Object.assign(settingsUpdates, val);
                } else {
                  settingsUpdates[key] = val;
                }
              }

              let finalSettings: Record<string, any> = settingsUpdates;
              try {
                const profileService = require('@/lib/profileSettingsService');
                const updateFn = profileService.atomicUpdateProfileSettings || profileService.default?.atomicUpdateProfileSettings;
                if (typeof updateFn === 'function') {
                  const res = await updateFn(
                    userId,
                    () => ({
                      directUpdates,
                      settingsUpdates,
                    })
                  );
                  if (res?.settings) {
                    finalSettings = res.settings;
                  }
                }
              } catch (profileErr) {
                console.warn('[NeonClient] Profile settings update fallback:', profileErr);
              }

              return {
                data: {
                  user: {
                    ...(authRes?.data?.user || {}),
                    id: userId,
                    user_metadata: finalSettings,
                  },
                },
                error: null,
              };
            }
          }
          return { data: { user: null }, error: null };
        } catch (e: any) {
          return { data: null, error: e };
        }
      },

      exchangeCodeForSession: async (_code: string) => {
        return this.auth.getSession();
      },

      setSession: async (_tokens: { access_token: string; refresh_token: string }) => {
        return this.auth.getSession();
      },

      resetPasswordForEmail: async (email: string, options?: { redirectTo?: string }) => {
        try {
          const redirectTo = options?.redirectTo || (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
            ? `${window.location.origin}/reset-password`
            : 'groundwork://reset-password');
          const res = await (neonAuth as any).requestPasswordReset({
            email,
            redirectTo,
          });
          if (res?.error) return { data: null, error: res.error };
          return { data: res?.data || res || {}, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },

      resetPassword: async (params: { token: string; newPassword: string }) => {
        try {
          const res = await (neonAuth as any).resetPassword({
            token: params.token,
            newPassword: params.newPassword,
          });
          if (res?.error) return { data: null, error: res.error };
          return { data: res?.data || res || {}, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
    };
  }

  channel(name: string) {
    let chan = this._activeChannels.get(name);
    if (!chan) {
      chan = new NeonRealtimeChannel(name);
      this._activeChannels.set(name, chan);
    }
    return chan;
  }

  removeChannel(channel: any) {
    if (channel && typeof channel.unsubscribe === 'function') {
      channel.unsubscribe();
      if (channel.name) {
        this._activeChannels.delete(channel.name);
      }
    }
    return Promise.resolve();
  }

  removeAllChannels() {
    for (const [name, channel] of this._activeChannels) {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe();
      }
    }
    this._activeChannels.clear();
    return Promise.resolve();
  }

  get storage() {
    const storageEndpoint = NEON_S3_ENDPOINT || 'https://br-billowing-wind-b4lz1az2.storage.c-6.us-east-2.aws.neon.tech';

    const getStorageApiUrl = () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/api/storage`;
      }
      if (process.env.EXPO_PUBLIC_STORAGE_API_URL) {
        return process.env.EXPO_PUBLIC_STORAGE_API_URL;
      }
      return (process.env.EXPO_PUBLIC_API_URL || 'https://groundwork.pro.et') + '/api/storage';
    };

    const callStorageApi = async (payload: any): Promise<{ data: any; error: any }> => {
      try {
        const token = await getNeonJWTToken();
        const sessionRes = await neonAuth.getSession().catch(() => null);
        const callerUserId = sessionRes?.data?.user?.id || sessionRes?.data?.session?.userId;

        // In Node CLI / test environments, invoke local serverStorage directly if available
        if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node && !process.env.TEST_FORCE_HTTP_STORAGE) {
          try {
            const serverStorage = safeNodeRequire('./serverStorage');
            if (serverStorage) {
              if (payload.action === 'get-upload-url') {
                return await serverStorage.authorizeAndSignUpload({
                  caller: callerUserId ? { userId: callerUserId, role: 'user' } : null,
                  bucket: payload.bucket,
                  filePath: payload.filePath,
                  contentType: payload.contentType,
                });
              }
              if (payload.action === 'create-signed-url') {
                return await serverStorage.authorizeAndSignDownload({
                  caller: callerUserId ? { userId: callerUserId, role: 'user' } : null,
                  bucket: payload.bucket,
                  filePath: payload.filePath,
                  expiresIn: payload.expiresIn,
                });
              }
            }
          } catch (_) {}
        }

        const endpoint = getStorageApiUrl();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok || json?.error) {
          const errMsg = json?.error?.message || json?.error || `Storage authorization failed (${res.status})`;
          return { data: null, error: new Error(errMsg) };
        }
        return { data: json?.data || json, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    };

    return {
      from: (bucket: string) => ({
        getPublicUrl: (filePath: string) => {
          if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
            return { data: { publicUrl: filePath } };
          }
          const cleanPath = filePath.replace(/^\/+/, '');
          return {
            data: {
              publicUrl: `${storageEndpoint}/uploads/${bucket}/${cleanPath}`,
            },
          };
        },

        upload: async (filePath: string, fileData: any, options?: { contentType?: string; upsert?: boolean }) => {
          try {
            const cleanPath = filePath.replace(/^\/+/, '');
            const contentType = options?.contentType || 'application/octet-stream';

            // 1. Authenticated server-side authorization and presigned S3 PUT URL generation
            const authResult = await callStorageApi({
              action: 'get-upload-url',
              bucket,
              filePath: cleanPath,
              contentType,
            });

            if (authResult.error || !authResult.data?.uploadUrl) {
              return { data: null, error: authResult.error || new Error('Upload authorization rejected') };
            }

            // 2. Perform authenticated upload to presigned S3 endpoint
            const uploadResponse = await fetch(authResult.data.uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': contentType,
              },
              body: fileData,
            });

            if (!uploadResponse.ok) {
              const errText = await uploadResponse.text().catch(() => uploadResponse.statusText);
              return { data: null, error: new Error(`S3 upload failed (${uploadResponse.status}): ${errText}`) };
            }

            return { data: { path: authResult.data.path || cleanPath }, error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },

        createSignedUrl: async (filePath: string, expiresIn: number = 60) => {
          try {
            const cleanPath = filePath.replace(/^\/+/, '');

            // Authenticated server-side authorization and presigned S3 GET URL generation
            const authResult = await callStorageApi({
              action: 'create-signed-url',
              bucket,
              filePath: cleanPath,
              expiresIn,
            });

            if (authResult.error || !authResult.data?.signedUrl) {
              return { data: null, error: authResult.error || new Error('Signed URL authorization rejected') };
            }

            return { data: { signedUrl: authResult.data.signedUrl }, error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },

        download: async (filePath: string) => {
          try {
            const { data: signedData, error: signErr } = await this.storage.from(bucket).createSignedUrl(filePath, 60);
            if (signErr || !signedData?.signedUrl) {
              return { data: null, error: signErr || new Error('Download failed: unauthorized') };
            }

            const response = await fetch(signedData.signedUrl);
            if (!response.ok) {
              return { data: null, error: new Error(`Storage download failed: ${response.statusText}`) };
            }
            const blob = await response.blob();
            return { data: blob, error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },

        remove: async (paths: string[]) => {
          try {
            for (const p of paths) {
              const cleanPath = p.replace(/^\/+/, '');
              const s3Key = `${bucket}/${cleanPath}`;
              // S3 deletion can be performed via serverStorage or signed endpoint in Node CLI
              if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
                try {
                  const serverStorage = safeNodeRequire('./serverStorage');
                  const awsSdk = safeNodeRequire('@aws-sdk/client-s3');
                  if (serverStorage && awsSdk) {
                    const s3 = serverStorage.getS3Client?.();
                    if (s3) {
                      await s3.send(new awsSdk.DeleteObjectCommand({ Bucket: 'uploads', Key: s3Key }));
                    }
                  }
                } catch (_) {}
              }
            }
            return { data: paths, error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },
      }),
    };
  }
}

export const supabase = new NeonUnifiedClient();
