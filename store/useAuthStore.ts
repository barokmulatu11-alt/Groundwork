import { clearLocalData } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export interface Session {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
}

const IS_GUEST_KEY = "groundwork_is_guest";

interface AuthState {
  session: Session | null;
  profile: any | null;
  isGuest: boolean;
  isLoading: boolean;
  isOAuthPending: boolean;
  onboardingDone: boolean;
  welcomeShown: boolean;
  isSigningOut: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: any | null) => void;
  setIsGuest: (isGuest: boolean) => void;
  setIsOAuthPending: (pending: boolean) => void;
  setOnboardingDone: (done: boolean) => void;
  setWelcomeShown: (welcomeShown: boolean) => void;
  /** Re-runs the SIGNED_IN / SIGNED_OUT side-effects when called from auth screens. */
  handleAuthEvent: (event: string, data: { user?: any; session?: any } | null) => Promise<void>;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  getUserId: () => string;
}

const isOnline = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const ping = await fetch("https://clients3.google.com/generate_204", {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (ping.status === 204 || ping.ok) {
      return true;
    }
  } catch (_) {}

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 3000);
    const apiUrl = process.env.EXPO_PUBLIC_NEON_API_URL || "https://ep-gentle-night-b4oacb89.apirest.c-6.us-east-2.aws.neon.tech/neondb/rest/v1";
    
    const response = await fetch(
      apiUrl,
      {
        method: "HEAD",
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);
    return response.status >= 200 && response.status < 500;
  } catch (e) {
    return false;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isGuest: false,
  isLoading: true,
  isSigningOut: false,
  isOAuthPending: false,
  onboardingDone: false,
  welcomeShown: false,

  setIsOAuthPending: (pending) => set({ isOAuthPending: pending }),

  setSession: (session) => {
    set({ session, isGuest: false });
    AsyncStorage.removeItem(IS_GUEST_KEY);
    if (session) {
      set({ welcomeShown: true });
      AsyncStorage.setItem("groundwork_welcome_shown", "true");
    }
  },

  setProfile: (profile) => set({ profile }),

  setIsGuest: (isGuest) => {
    set({ isGuest });
    if (isGuest) {
      set({ welcomeShown: true });
      AsyncStorage.setItem("groundwork_welcome_shown", "true");
      AsyncStorage.setItem(IS_GUEST_KEY, "true");
      AsyncStorage.getItem("profile_guest").then((cached) => {
        if (cached) {
          set({ profile: JSON.parse(cached) });
        } else {
          const defaultGuestProfile = {
            id: "guest",
            username: "Guest",
            full_name: "Guest User",
            bio: "On a mission to stay productive.",
            avatar_url: null,
            role: "member",
            pro_status: false,
          };
          set({ profile: defaultGuestProfile });
          AsyncStorage.setItem(
            "profile_guest",
            JSON.stringify(defaultGuestProfile),
          );
        }
      });
    } else {
      AsyncStorage.removeItem(IS_GUEST_KEY);
    }
  },

  setOnboardingDone: (onboardingDone) => set({ onboardingDone }),

  setWelcomeShown: (welcomeShown) => {
    set({ welcomeShown });
    if (welcomeShown) {
      AsyncStorage.setItem("groundwork_welcome_shown", "true");
    } else {
      AsyncStorage.removeItem("groundwork_welcome_shown");
    }
  },

  getUserId: () => {
    const { session, isGuest } = get();
    if (session?.user?.id) return session.user.id;
    if (isGuest) return "guest";
    return "guest";
  },

  /**
   * handleAuthEvent: replays SIGNED_IN / SIGNED_OUT logic for callers that need
   * to drive auth-state changes from outside onAuthStateChange (e.g. OAuth callback
   * in login.tsx where the session is retrieved manually after browser redirect).
   */
  handleAuthEvent: async (event, data) => {
    if (event === "SIGNED_IN" && data?.user) {
      const session = data.session ?? get().session;
      set({ session: session as Session | null, isGuest: false, isLoading: false });
      AsyncStorage.removeItem(IS_GUEST_KEY);
      if (session) {
        await AsyncStorage.setItem("groundwork_offline_session", JSON.stringify(session));
        await AsyncStorage.removeItem("groundwork_manual_signout");
      }
      const userId = data.user?.id;
      if (userId) {
        try {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
          if (!error && profile) {
            set({ profile });
            await AsyncStorage.setItem(`profile_${userId}`, JSON.stringify(profile));
          } else {
            const cached = await AsyncStorage.getItem(`profile_${userId}`);
            if (cached) set({ profile: JSON.parse(cached) });
          }
        } catch (e) {
          const cached = await AsyncStorage.getItem(`profile_${userId}`);
          if (cached) set({ profile: JSON.parse(cached) });
        }
        try {
          const { initializeAccountRewards } = require('@/lib/rewardsService');
          await initializeAccountRewards(userId);
        } catch (_) {}
      }
    } else if (event === "SIGNED_OUT") {
      set({ session: null, profile: null, isGuest: false, isLoading: false });
      await AsyncStorage.removeItem("groundwork_offline_session");
    }
  },

  initialize: async () => {
    try {
      console.log("[AuthStore] Initializing...");
      // 1. Check for existing session
      const isManualSignout = await AsyncStorage.getItem(
        "groundwork_manual_signout",
      );

      let session: any = null;
      if (isManualSignout !== "true") {
        const { data } = await supabase.auth.getSession();
        session = data?.session || null;

        // Persistent storage fallback: restore cached session if available
        if (!session) {
          const offlineSessionStr = await AsyncStorage.getItem(
            "groundwork_offline_session",
          );
          if (offlineSessionStr) {
            try {
              const parsed = JSON.parse(offlineSessionStr);
              if (parsed?.user?.id && (parsed?.access_token || parsed?.token)) {
                session = parsed;
                console.log("[AuthStore] Restored session from persistent storage");
              }
            } catch (err) {
              console.warn("[AuthStore] Session restoration failed:", err);
            }
          }
        }

        if (session) {
          await AsyncStorage.setItem(
            "groundwork_offline_session",
            JSON.stringify(session),
          );
          const tok = session.access_token || session.token;
          if (tok) {
            try {
              const { persistSessionToken } = require('@/lib/neon');
              await persistSessionToken(tok);
            } catch (_) {}
          }
        }
      } else {
        console.log("[AuthStore] Manual signout flag active, skipping session restoration");
      }

      // 2. Check for guest status if no session
      let isGuest = false;
      if (!session) {
        const guestValue = await AsyncStorage.getItem(IS_GUEST_KEY);
        isGuest = guestValue === "true";
      }

      // Check onboarding status
      const onboardingVal = await AsyncStorage.getItem(
        "permissions_onboarding_done",
      );
      const onboardingDone = onboardingVal === "true";

      // Check welcome shown status
      const welcomeShownVal = await AsyncStorage.getItem(
        "groundwork_welcome_shown",
      );
      const welcomeShown = welcomeShownVal === "true" || !!session || isGuest;

      // Immediate state update so the UI can render
      set({ session, isGuest, onboardingDone, welcomeShown, isLoading: false });

      if (isGuest) {
        const cached = await AsyncStorage.getItem("profile_guest");
        if (cached) {
          set({ profile: JSON.parse(cached) });
        } else {
          const defaultGuestProfile = {
            id: "guest",
            username: "Guest",
            full_name: "Guest User",
            bio: "On a mission to stay productive.",
            avatar_url: null,
            role: "member",
            pro_status: false,
          };
          set({ profile: defaultGuestProfile });
          await AsyncStorage.setItem(
            "profile_guest",
            JSON.stringify(defaultGuestProfile),
          );
        }
        try {
          const { initializeAccountRewards } = require('@/lib/rewardsService');
          await initializeAccountRewards('guest');
        } catch (_) {}
      }

      // Check ban status and fetch profile if logged in (wrapped in try-catch for offline support)
      if (session?.user?.id) {
        try {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (!error && profile) {
            if (profile.is_banned) {
              const { Alert } = require("react-native");
              Alert.alert(
                "Account Banned",
                "Your account has been suspended for violating our terms of service.",
              );
              get().signOut();
              return;
            }
            set({ profile });
            // Cache profile locally for offline use
            await AsyncStorage.setItem(
              `profile_${session.user.id}`,
              JSON.stringify(profile),
            );
          } else {
            // Load cached profile if offline
            const cached = await AsyncStorage.getItem(
              `profile_${session.user.id}`,
            );
            if (cached) {
              set({ profile: JSON.parse(cached) });
            }
          }
        } catch (e) {
          console.warn("[AuthStore] Offline profile load fallback:", e);
          const cached = await AsyncStorage.getItem(
            `profile_${session.user.id}`,
          );
          if (cached) {
            set({ profile: JSON.parse(cached) });
          }
        }
      }

      // 3. If session exists, trigger immediate data hydration
      if (session) {
        console.log("[AuthStore] Existing session found, hydrating data...");
        const { useSessionStore } = require("./useSessionStore");
        useSessionStore.getState().initializeDevice();

        // Hydrate settings and app data
        const { useStore } = require("./useStore");
        const { useSettingsStore } = require("./useSettingsStore");

        // Parallel load — awaited so startup hydration and rewards complete before gates evaluate
        await Promise.all([
          useStore.getState().syncFromCloud(session),
          useSettingsStore.getState().loadSettings(),
          (async () => {
            const { initializeAccountRewards } = require('@/lib/rewardsService');
            await initializeAccountRewards(session.user.id);
          })(),
        ]).catch((e) =>
          console.warn("[AuthStore] Pre-load hydration failed:", e),
        );
      }
    } catch (e) {
      console.error("[AuthStore] Initialization error:", e);
      set({ session: null, isGuest: false, isLoading: false });
    }

    // Listen for auth state changes (login/logout)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("[AuthStore] Auth state changed:", _event);

      if (_event === "SIGNED_IN" || _event === "TOKEN_REFRESHED") {
        if (session) {
          await AsyncStorage.setItem(
            "groundwork_offline_session",
            JSON.stringify(session),
          );
        }
        await AsyncStorage.removeItem("groundwork_manual_signout");
      }

      if (_event === "SIGNED_IN") {
        // Set session immediately so AuthMiddleware can navigate without waiting for profile fetch
        set({ session, isGuest: false });
        set({ isLoading: false });
        AsyncStorage.removeItem(IS_GUEST_KEY);

        // Fetch profile in the background — does not block navigation
        if (session?.user?.id) {
          try {
            const { data: profile, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();

            if (!error && profile) {
              if (profile.is_banned) {
                const { Alert } = require("react-native");
                Alert.alert(
                  "Account Banned",
                  "Your account has been suspended for violating our terms of service.",
                );
                get().signOut();
                return;
              }
              set({ profile });
              await AsyncStorage.setItem(
                `profile_${session.user.id}`,
                JSON.stringify(profile),
              );
            } else {
              const cached = await AsyncStorage.getItem(
                `profile_${session.user.id}`,
              );
              if (cached) set({ profile: JSON.parse(cached) });
            }
          } catch (e) {
            console.warn("[AuthStore] Profile fetch failed (offline):", e);
            const cached = await AsyncStorage.getItem(
              `profile_${session?.user?.id}`,
            );
            if (cached) set({ profile: JSON.parse(cached) });
          }

          // Hydrate app data
          try {
            const { useStore } = require("./useStore");
            const { useSettingsStore } = require("./useSettingsStore");
            const { useSessionStore } = require("./useSessionStore");
            await useSessionStore.getState().initializeDevice();
            await Promise.all([
              useStore.getState().syncFromCloud(session),
              useSettingsStore.getState().loadSettings(),
              (async () => {
                const { initializeAccountRewards } = require('@/lib/rewardsService');
                await initializeAccountRewards(session.user.id);
              })(),
            ]);
          } catch (e) {
            console.warn("[AuthStore] Post-login hydration failed:", e);
          }
        }
      } else if (_event === "INITIAL_SESSION") {
        // INITIAL_SESSION fires at startup — initialize() handles it already.
        // Only process here if initialize() somehow missed it (edge case).
        if (session && !get().session) {
          set({ session, isGuest: false, isLoading: false });
        }
      } else if (_event === "SIGNED_OUT") {
        const isManual = await AsyncStorage.getItem(
          "groundwork_manual_signout",
        );
        if (isManual !== "true") {
          console.log("[AuthStore] Ignored automatic non-manual SIGNED_OUT event");
          return;
        }
        await AsyncStorage.removeItem("groundwork_manual_signout");
        await AsyncStorage.removeItem("groundwork_offline_session");

        set({ session: null, profile: null, isGuest: false, isLoading: false });
        const { useStore } = require("./useStore");
        const { useSettingsStore } = require("./useSettingsStore");

        useStore.setState({
          tasks: [],
          habits: [],
          notes: [],
          focusSessions: [],
          dayNotes: {},
        });
        useSettingsStore.setState({
          appPin: null,
          faceIdEnabled: false,
          autoLockTimeout: 0,
          isLocked: false,
          focusTimerActive: false,
          focusTimerSelectedTaskId: null,
          focusTimerStartTime: null,
        });
      }
    });
  },

  signOut: async () => {
    const userId = get().getUserId();
    console.log("[AuthStore] Initiating sign out for:", userId);

    // 1. Immediately trigger loading state so UI reacts on first tap
    set({ isSigningOut: true });

    try {
      await AsyncStorage.setItem("groundwork_manual_signout", "true");
      await AsyncStorage.removeItem("groundwork_offline_session");
      // Keep welcome shown so the user lands directly on the Login screen
      await AsyncStorage.setItem("groundwork_welcome_shown", "true");
    } catch (e) {}

    // 2. Stop account-specific background sync manager
    try {
      const { stopSyncManager } = require("./useStore");
      if (stopSyncManager) stopSyncManager();
    } catch (e) {
      console.warn("[AuthStore] Failed to stop sync manager:", e);
    }

    // 3. Stop all active realtime PostgREST/Supabase channels
    try {
      (supabase as any).removeAllChannels?.();
    } catch (e) {
      console.warn("[AuthStore] Failed to remove realtime channels:", e);
    }

    // 4. Revoke device session with 2.5s timeout (never hang on poor connectivity)
    try {
      const { useSessionStore } = require("./useSessionStore");
      const sessionStore = useSessionStore.getState();
      if (sessionStore?.deviceId) {
        await Promise.race([
          sessionStore.revokeSession(sessionStore.deviceId),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Revoke timeout")), 2500)),
        ]).catch((err) => console.warn("[AuthStore] Session revocation skipped/timed out:", err));
      }
    } catch (e) {
      console.warn("[AuthStore] Session revocation failed:", e);
    }

    // 5. Remote sign out with 2.5s timeout (handle network failures honestly, never trap user)
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("SignOut timeout")), 2500)),
      ]).catch((err) => console.warn("[AuthStore] Remote sign out timed out, proceeding locally:", err));
    } catch (e) {
      console.warn("[AuthStore] Supabase signOut failed:", e);
    }

    try {
      await AsyncStorage.removeItem(IS_GUEST_KEY);
    } catch (e) {
      console.warn("[AuthStore] Failed to remove guest key:", e);
    }

    // 6. Clear sensitive session-specific keys
    try {
      await AsyncStorage.multiRemove([
        "last_ambient_sound",
        "notification_preferences",
      ]);
    } catch (e) {
      console.warn("[AuthStore] Failed to clear AsyncStorage keys:", e);
    }

    // 7. PRESERVE unsynced offline work under original owner (userId)!
    // Notice: We deliberately DO NOT call clearLocalData(userId) here.
    // Local SQLite rows remain intact under user_id, protecting offline work from data loss.

    // 8. Reset in-memory stores immediately so no account data leaks into UI
    try {
      const { useStore } = require("./useStore");
      const { useSettingsStore } = require("./useSettingsStore");

      useStore.setState({
        tasks: [],
        habits: [],
        notes: [],
        focusSessions: [],
        dayNotes: {},
        isSyncing: false,
        syncError: false,
      });
      useSettingsStore.setState({
        appPin: null,
        faceIdEnabled: false,
        autoLockTimeout: 0,
        isLocked: false,
        focusTimerActive: false,
      });
    } catch (e) {
      console.warn("[AuthStore] Failed to reset store states:", e);
    }

    // 9. Complete sign-out state transition
    set({
      session: null,
      profile: null,
      isGuest: false,
      welcomeShown: true,
      isLoading: false,
      isSigningOut: false,
    });
    try {
      const { initializeAccountRewards } = require('@/lib/rewardsService');
      await initializeAccountRewards('guest');
    } catch (_) {}
    console.log("[AuthStore] Successfully completed sign out.");
  },

  deleteAccount: async (): Promise<boolean> => {
    const userId = get().getUserId();
    const { session, isGuest } = get();
    console.log("[AuthStore] Deleting account for user:", userId);
    set({ isSigningOut: true });

    try {
      if (!isGuest && session?.user?.id) {
        // 1. Delete user cloud records across relational tables
        try {
          const { neonData } = require('@/lib/neon');
          await Promise.allSettled([
            neonData.from('tasks').delete().eq('user_id', userId),
            neonData.from('habits').delete().eq('user_id', userId),
            neonData.from('notes').delete().eq('user_id', userId),
            neonData.from('focus_sessions').delete().eq('user_id', userId),
            neonData.from('day_notes').delete().eq('user_id', userId),
            neonData.from('connect_profiles').delete().eq('user_id', userId),
            neonData.from('profiles').delete().eq('id', userId),
          ]);
        } catch (cloudErr) {
          console.warn('[AuthStore] Cloud account deletion partial error:', cloudErr);
        }
      }

      // 2. Clear local SQLite database for this user
      try {
        clearLocalData(userId);
      } catch (dbErr) {
        console.warn('[AuthStore] Local DB clear error:', dbErr);
      }

      // 3. Clear all cached keys for this user
      try {
        await AsyncStorage.multiRemove([
          `profile_${userId}`,
          `settings_${userId}`,
          'groundwork_offline_session',
          'neon_auth_jwt',
          'neon_auth_jwt_exp',
          'groundwork_manual_signout',
        ]);
      } catch (_) {}

      // 4. Sign out cleanly
      await get().signOut();
      return true;
    } catch (e) {
      console.error('[AuthStore] Delete account failed:', e);
      set({ isSigningOut: false });
      return false;
    }
  },
}));
