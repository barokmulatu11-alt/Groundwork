import { clearLocalData } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

const IS_GUEST_KEY = 'groundwork_is_guest';

interface AuthState {
  session: Session | null;
  isGuest: boolean;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setIsGuest: (isGuest: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  getUserId: () => string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isGuest: false,
  isLoading: true,
  
  setSession: (session) => {
    set({ session, isGuest: false });
    AsyncStorage.removeItem(IS_GUEST_KEY);
  },
  
  setIsGuest: (isGuest) => {
    set({ isGuest });
    if (isGuest) {
      AsyncStorage.setItem(IS_GUEST_KEY, 'true');
    } else {
      AsyncStorage.removeItem(IS_GUEST_KEY);
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
      // 1. Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      // 2. Check for guest status if no session
      let isGuest = false;
      if (!session) {
        const guestValue = await AsyncStorage.getItem(IS_GUEST_KEY);
        isGuest = guestValue === 'true';
      }
      set({ session, isGuest, isLoading: false });

      // Initialize session management
      if (session) {
        const { useSessionStore } = require('./useSessionStore');
        useSessionStore.getState().initializeDevice();
      }
    } catch (e) {
      console.error('[AuthStore] Initialization error:', e);
      set({ session: null, isGuest: false, isLoading: false });
    }
    
    // Listen for auth changes (this handles logouts, logins, token refreshes)
    supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AuthStore] Auth state changed:', _event);
      set({ session });
      if (session) {
        set({ isGuest: false });
        AsyncStorage.removeItem(IS_GUEST_KEY);
        import('./useStore').then(({ useStore }) => {
          useStore.getState().syncFromCloud();
        });
        import('./useSettingsStore').then(({ useSettingsStore }) => {
          useSettingsStore.getState().loadSettings();
        });
      } else {
        // Clear settings when logged out
        import('./useSettingsStore').then(({ useSettingsStore }) => {
          useSettingsStore.setState({
            theme: 'light',
            notificationsEnabled: false,
            tasksLayout: 'list',
            habitsLayout: 'grid',
            notesLayout: 'grid',
            isUpdateBannerDismissed: false,
            defaultFocusDuration: 25,
            dailyGoal: 5,
            focusTimerActive: false,
            focusTimerTimeLeft: 25 * 60,
            focusTimerMode: 'Study',
            focusTimerDurationMinutes: 25,
            focusTimerSelectedTaskId: null,
            focusTimerStartTime: null
          });
        });
      }
    });
  },

  signOut: async () => {
    const userId = get().getUserId();
    
    // Stop syncing
    import('./useStore').then(({ stopSyncManager }) => {
      if (stopSyncManager) stopSyncManager();
    });

    // Remove this device from sessions
    try {
      const { useSessionStore } = require('./useSessionStore');
      const sessionStore = useSessionStore.getState();
      if (sessionStore.deviceId) {
        await sessionStore.revokeSession(sessionStore.deviceId);
      }
    } catch (e) {
      console.warn('[AuthStore] Failed to revoke session during logout', e);
    }

    await supabase.auth.signOut();
    await AsyncStorage.removeItem(IS_GUEST_KEY);
    
    // Clear all user-specific AsyncStorage keys (keep theme_preference to preserve aesthetic for next login)
    await AsyncStorage.multiRemove([
      'last_ambient_sound',
      'notification_preferences',
    ]);
    
    // Delete all local data for this user
    clearLocalData(userId);
    
    // Reset store state
    import('./useStore').then(({ useStore }) => {
      useStore.setState({ tasks: [], habits: [], notes: [], focusSessions: [], dayNotes: {} });
    });
    
    // Reset only sensitive and session-specific settings
    import('./useSettingsStore').then(({ useSettingsStore }) => {
      useSettingsStore.setState({
        appPin: null,
        faceIdEnabled: false,
        autoLockTimeout: 0,
        focusTimerActive: false,
        focusTimerSelectedTaskId: null,
        focusTimerStartTime: null
      });
    });
    
    set({ session: null, isGuest: false });
    console.log('[AuthStore] Signed out successfully, data cleared for user:', userId);
  }
}));
