import { clearLocalData } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

const IS_GUEST_KEY = 'groundwork_is_guest';

interface AuthState {
  session: Session | null;
  profile: any | null;
  isGuest: boolean;
  isLoading: boolean;
  onboardingDone: boolean;
  welcomeShown: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: any | null) => void;
  setIsGuest: (isGuest: boolean) => void;
  setOnboardingDone: (done: boolean) => void;
  setWelcomeShown: (welcomeShown: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  getUserId: () => string;
}

const isOnline = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch('https://yevrsmlwmegovfwdxpjw.supabase.co', { 
      method: 'HEAD',
      signal: controller.signal
    });
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
  onboardingDone: false,
  welcomeShown: false,
  
  setSession: (session) => {
    set({ session, isGuest: false });
    AsyncStorage.removeItem(IS_GUEST_KEY);
    if (session) {
      set({ welcomeShown: true });
      AsyncStorage.setItem('groundwork_welcome_shown', 'true');
    }
  },

  setProfile: (profile) => set({ profile }),
  
  setIsGuest: (isGuest) => {
    set({ isGuest });
    if (isGuest) {
      set({ welcomeShown: true });
      AsyncStorage.setItem('groundwork_welcome_shown', 'true');
      AsyncStorage.setItem(IS_GUEST_KEY, 'true');
      AsyncStorage.getItem('profile_guest').then(cached => {
        if (cached) {
          set({ profile: JSON.parse(cached) });
        } else {
          const defaultGuestProfile = {
            id: 'guest',
            username: 'Guest',
            full_name: 'Guest User',
            bio: 'On a mission to stay productive.',
            avatar_url: `https://api.dicebear.com/7.x/avataaars/png?seed=guest`,
            role: 'member',
            pro_status: false,
          };
          set({ profile: defaultGuestProfile });
          AsyncStorage.setItem('profile_guest', JSON.stringify(defaultGuestProfile));
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
      AsyncStorage.setItem('groundwork_welcome_shown', 'true');
    } else {
      AsyncStorage.removeItem('groundwork_welcome_shown');
    }
  },
  
  getUserId: () => {
    const { session, isGuest } = get();
    if (session?.user?.id) return session.user.id;
    if (isGuest) return 'guest';
    return 'guest';
  },
  
  initialize: async () => {
    try {
      console.log('[AuthStore] Initializing...');
      // 1. Check for existing session
      let { data: { session } } = await supabase.auth.getSession();
      
      // Offline fallback: if no session, check if we have groundwork_offline_session cached
      if (!session) {
        const offlineSessionStr = await AsyncStorage.getItem('groundwork_offline_session');
        if (offlineSessionStr) {
          const online = await isOnline();
          if (!online) {
            try {
              session = JSON.parse(offlineSessionStr);
              console.log('[AuthStore] Restored session from offline cache');
            } catch (err) {}
          }
        }
      }
      
      if (session) {
        await AsyncStorage.setItem('groundwork_offline_session', JSON.stringify(session));
      }
      
      // 2. Check for guest status if no session
      let isGuest = false;
      if (!session) {
        const guestValue = await AsyncStorage.getItem(IS_GUEST_KEY);
        isGuest = guestValue === 'true';
      }

      // Check onboarding status
      const onboardingVal = await AsyncStorage.getItem('permissions_onboarding_done');
      const onboardingDone = onboardingVal === 'true';
      
      // Check welcome shown status
      const welcomeShownVal = await AsyncStorage.getItem('groundwork_welcome_shown');
      const welcomeShown = welcomeShownVal === 'true' || !!session || isGuest;
      
      set({ session, isGuest, onboardingDone, welcomeShown, isLoading: false });

      if (isGuest) {
        const cached = await AsyncStorage.getItem('profile_guest');
        if (cached) {
          set({ profile: JSON.parse(cached) });
        } else {
          const defaultGuestProfile = {
            id: 'guest',
            username: 'Guest',
            full_name: 'Guest User',
            bio: 'On a mission to stay productive.',
            avatar_url: `https://api.dicebear.com/7.x/avataaars/png?seed=guest`,
            role: 'member',
            pro_status: false,
          };
          set({ profile: defaultGuestProfile });
          await AsyncStorage.setItem('profile_guest', JSON.stringify(defaultGuestProfile));
        }
      }

      // Check ban status and fetch profile if logged in (wrapped in try-catch for offline support)
      if (session?.user?.id) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (!error && profile) {
            if (profile.is_banned) {
              const { Alert } = require('react-native');
              Alert.alert('Account Banned', 'Your account has been suspended for violating our terms of service.');
              get().signOut();
              return;
            }
            set({ profile });
            // Cache profile locally for offline use
            await AsyncStorage.setItem(`profile_${session.user.id}`, JSON.stringify(profile));
          } else {
            // Load cached profile if offline
            const cached = await AsyncStorage.getItem(`profile_${session.user.id}`);
            if (cached) {
              set({ profile: JSON.parse(cached) });
            }
          }
        } catch (e) {
          console.warn('[AuthStore] Offline profile load fallback:', e);
          const cached = await AsyncStorage.getItem(`profile_${session.user.id}`);
          if (cached) {
            set({ profile: JSON.parse(cached) });
          }
        }
      }

      // 3. If session exists, trigger immediate data hydration
      if (session) {
        console.log('[AuthStore] Existing session found, hydrating data...');
        const { useSessionStore } = require('./useSessionStore');
        useSessionStore.getState().initializeDevice();
        
        // Hydrate settings and app data
        const { useStore } = require('./useStore');
        const { useSettingsStore } = require('./useSettingsStore');
        
        // Parallel load
        Promise.all([
          useStore.getState().syncFromCloud(session),
          useSettingsStore.getState().loadSettings()
        ]).catch(e => console.warn('[AuthStore] Pre-load hydration failed:', e));
      }
    } catch (e) {
      console.error('[AuthStore] Initialization error:', e);
      set({ session: null, isGuest: false, isLoading: false });
    }
    
    // Listen for auth state changes (login/logout)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthStore] Auth state changed:', _event);
      
      if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
        if (session) {
          await AsyncStorage.setItem('groundwork_offline_session', JSON.stringify(session));
        }
        await AsyncStorage.removeItem('groundwork_manual_signout');
      }

      if (_event === 'SIGNED_IN') {
        // Set session immediately so AuthMiddleware can navigate without waiting for profile fetch
        set({ session, isGuest: false, isLoading: false });
        AsyncStorage.removeItem(IS_GUEST_KEY);

        // Fetch profile in the background — does not block navigation
        if (session?.user?.id) {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (!error && profile) {
              if (profile.is_banned) {
                const { Alert } = require('react-native');
                Alert.alert('Account Banned', 'Your account has been suspended for violating our terms of service.');
                get().signOut();
                return;
              }
              set({ profile });
              await AsyncStorage.setItem(`profile_${session.user.id}`, JSON.stringify(profile));
            } else {
              const cached = await AsyncStorage.getItem(`profile_${session.user.id}`);
              if (cached) set({ profile: JSON.parse(cached) });
            }
          } catch (e) {
            console.warn('[AuthStore] Profile fetch failed (offline):', e);
            const cached = await AsyncStorage.getItem(`profile_${session?.user?.id}`);
            if (cached) set({ profile: JSON.parse(cached) });
          }

          // Hydrate app data
          try {
            const { useStore } = require('./useStore');
            const { useSettingsStore } = require('./useSettingsStore');
            const { useSessionStore } = require('./useSessionStore');
            await useSessionStore.getState().initializeDevice();
            await Promise.all([
              useStore.getState().syncFromCloud(session),
              useSettingsStore.getState().loadSettings()
            ]);
          } catch (e) {
            console.warn('[AuthStore] Post-login hydration failed:', e);
          }
        }
      } else if (_event === 'INITIAL_SESSION') {
        // INITIAL_SESSION fires at startup — initialize() handles it already.
        // Only process here if initialize() somehow missed it (edge case).
        if (session && !get().session) {
          set({ session, isGuest: false, isLoading: false });
        }
      } else if (_event === 'SIGNED_OUT') {
        const isManual = await AsyncStorage.getItem('groundwork_manual_signout');
        const online = await isOnline();
        if (!online && isManual !== 'true') {
          console.log('[AuthStore] Ignored offline automatic SIGNED_OUT event');
          return;
        }
        await AsyncStorage.removeItem('groundwork_manual_signout');
        await AsyncStorage.removeItem('groundwork_offline_session');

        set({ session: null, profile: null, isGuest: false, isLoading: false });
        const { useStore } = require('./useStore');
        const { useSettingsStore } = require('./useSettingsStore');
        
        useStore.setState({ tasks: [], habits: [], notes: [], focusSessions: [], dayNotes: {} });
        useSettingsStore.setState({
          appPin: null,
          faceIdEnabled: false,
          autoLockTimeout: 0,
          isLocked: false,
          focusTimerActive: false,
          focusTimerSelectedTaskId: null,
          focusTimerStartTime: null
        });
      }
    });
  },

  signOut: async () => {
    const userId = get().getUserId();
    console.log('[AuthStore] Initiating sign out for:', userId);
    
    try {
      await AsyncStorage.setItem('groundwork_manual_signout', 'true');
      await AsyncStorage.removeItem('groundwork_offline_session');
    } catch (e) {}

    // 1. Stop syncing
    try {
      const { stopSyncManager } = require('./useStore');
      if (stopSyncManager) stopSyncManager();
    } catch (e) {
      console.warn('[AuthStore] Failed to stop sync manager:', e);
    }

    // 2. Revoke device session
    try {
      const { useSessionStore } = require('./useSessionStore');
      const sessionStore = useSessionStore.getState();
      if (sessionStore?.deviceId) {
        await sessionStore.revokeSession(sessionStore.deviceId);
      }
    } catch (e) {
      console.warn('[AuthStore] Session revocation failed:', e);
    }

    // 3. Actual Supabase Sign Out
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[AuthStore] Supabase signOut failed:', e);
    }
    
    try {
      await AsyncStorage.removeItem(IS_GUEST_KEY);
    } catch (e) {
      console.warn('[AuthStore] Failed to remove guest key:', e);
    }
    
    // 4. Clear sensitive AsyncStorage keys (Preserve permissions_onboarding_done because device permissions don't reset on log out!)
    try {
      await AsyncStorage.multiRemove([
        'last_ambient_sound',
        'notification_preferences'
      ]);
    } catch (e) {
      console.warn('[AuthStore] Failed to clear AsyncStorage keys:', e);
    }
    
    // 5. Clear ALL local SQLite data (The cloud is the source of truth)
    try {
      if (userId) {
        clearLocalData(userId);
      }
    } catch (e) {
      console.warn('[AuthStore] Failed to clear local SQLite data:', e);
    }
    
    // 6. Reset in-memory states
    try {
      const { useStore } = require('./useStore');
      const { useSettingsStore } = require('./useSettingsStore');
      
      useStore.setState({ tasks: [], habits: [], notes: [], focusSessions: [], dayNotes: {} });
      useSettingsStore.setState({
        appPin: null,
        faceIdEnabled: false,
        autoLockTimeout: 0,
        isLocked: false,
        focusTimerActive: false
      });
    } catch (e) {
      console.warn('[AuthStore] Failed to reset store states:', e);
    }
    
    try {
      await AsyncStorage.removeItem('groundwork_welcome_shown');
    } catch (e) {
      console.warn('[AuthStore] Failed to remove welcome shown key:', e);
    }
    
    set({ session: null, profile: null, isGuest: false, welcomeShown: false });
    console.log('[AuthStore] Successfully signed out and cleared local data.');
  }
}));
