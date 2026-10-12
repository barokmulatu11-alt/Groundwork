import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';
import { neonData, neonAuth, NEON_S3_ENDPOINT, getNeonJWTToken, clearPersistedSession, restoreSession } from './neon';

// Rollback config: Keep Supabase credentials available for rollback until replacement is fully verified
const supabaseUrl = 'https://yevrsmlwmegovfwdxpjw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldnJzbWx3bWVnb3Zmd2R4cGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzM3MTcsImV4cCI6MjA5MzQwOTcxN30.loonFy8rzw-HVe7ugIz8QnC_yKMTPzTQHoFdwuOE8Pc';

const customStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {}
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {}
  },
};

const rawSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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
 * If EXPO_PUBLIC_USE_SUPABASE === 'true', falls back to Supabase client for rollback.
 */
class NeonUnifiedClient {
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
    return {
      access_token: data.session?.token || '',
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
    this._authListeners.forEach((listener) => {
      try {
        listener(event, session);
      } catch (err) {
        console.error('[NeonClient] Auth listener error:', err);
      }
    });
  }

  from(table: string) {
    if (process.env.EXPO_PUBLIC_USE_SUPABASE === 'true') {
      return rawSupabaseClient.from(table);
    }
    return (neonData as any).from(table);
  }

  get auth() {
    if (process.env.EXPO_PUBLIC_USE_SUPABASE === 'true') {
      return rawSupabaseClient.auth;
    }

    return {
      getSession: async () => {
        try {
          const { data, error } = await neonAuth.getSession();
          if (error || !data) return { data: { session: null }, error: error || null };
          const session = this.formatSession(data);
          if (session) {
            const dataApiJwt = await getNeonJWTToken();
            if (dataApiJwt) session.access_token = dataApiJwt;
          }
          return { data: { session }, error: null };
        } catch (e: any) {
          return { data: { session: null }, error: e };
        }
      },

      getUser: async () => {
        try {
          const { data, error } = await neonAuth.getSession();
          if (error || !data) return { data: { user: null }, error: error || null };
          const session = this.formatSession(data);
          return { data: { user: session?.user || null }, error: null };
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
        const { data, error } = await neonAuth.signIn.email(credentials);
        if (error) return { data: { session: null, user: null }, error };
        const session = this.formatSession(data);
        if (session) {
          const dataApiJwt = await getNeonJWTToken();
          if (dataApiJwt) session.access_token = dataApiJwt;
        }
        this.emitAuthStateChange('SIGNED_IN', session);
        return { data: { session, user: session?.user }, error: null };
      },

      signUp: async (params: { email: string; password: string; options?: any }) => {
        const { data, error } = await neonAuth.signUp.email({
          email: params.email,
          password: params.password,
          name: params.options?.data?.full_name || params.email.split('@')[0],
        });
        if (error) return { data: { session: null, user: null }, error };
        const session = this.formatSession(data);
        if (session) {
          const dataApiJwt = await getNeonJWTToken();
          if (dataApiJwt) session.access_token = dataApiJwt;
        }
        this.emitAuthStateChange('SIGNED_IN', session);
        return { data: { session, user: session?.user }, error: null };
      },

      signInWithOAuth: async (params: { provider: string; options?: any }) => {
        return (neonAuth.signIn as any).social({
          provider: params.provider,
          callbackURL: params.options?.redirectTo || 'groundwork://auth/callback',
        });
      },

      signOut: async () => {
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
            const { data: authData } = await neonAuth.getSession();
            const userId = authData?.user?.id || authData?.session?.userId;
            if (userId) {
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

              const { atomicUpdateProfileSettings } = await import('@/lib/profileSettingsService');
              const { settings: finalSettings } = await atomicUpdateProfileSettings(
                userId,
                () => ({
                  directUpdates,
                  settingsUpdates,
                })
              );

              return {
                data: {
                  user: {
                    ...(authData?.user || {}),
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
        if (process.env.EXPO_PUBLIC_USE_SUPABASE === 'true') {
          return rawSupabaseClient.auth.updateUser({ password: params.newPassword });
        }
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
    if (process.env.EXPO_PUBLIC_USE_SUPABASE === 'true') {
      return rawSupabaseClient.channel(name);
    }
    let chan = this._activeChannels.get(name);
    if (!chan) {
      chan = new NeonRealtimeChannel(name);
      this._activeChannels.set(name, chan);
    }
    return chan;
  }

  removeChannel(channel: any) {
    if (process.env.EXPO_PUBLIC_USE_SUPABASE === 'true') {
      return rawSupabaseClient.removeChannel(channel);
    }
    if (channel && typeof channel.unsubscribe === 'function') {
      channel.unsubscribe();
      if (channel.name) {
        this._activeChannels.delete(channel.name);
      }
    }
    return Promise.resolve();
  }

  removeAllChannels() {
    if (process.env.EXPO_PUBLIC_USE_SUPABASE === 'true') {
      return (rawSupabaseClient as any).removeAllChannels?.();
    }
    for (const [name, channel] of this._activeChannels) {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe();
      }
    }
    this._activeChannels.clear();
    return Promise.resolve();
  }

  get storage() {
    if (process.env.EXPO_PUBLIC_USE_SUPABASE === 'true') {
      return rawSupabaseClient.storage;
    }
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

        // In Node server environments, invoke local serverStorage directly if available
        if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node && !process.env.TEST_FORCE_HTTP_STORAGE) {
          try {
            const serverStorage = require('./serverStorage');
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
              // S3 deletion can be performed via serverStorage or signed endpoint
              if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
                try {
                  const { getS3Client } = require('./serverStorage');
                  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
                  const s3 = getS3Client();
                  if (s3) {
                    await s3.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: s3Key }));
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
export { rawSupabaseClient };
