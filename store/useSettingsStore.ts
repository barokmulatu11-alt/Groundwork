import * as db from '@/lib/db';
import { rescheduleAll } from '@/lib/notifications';
import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import { supabase } from '@/lib/supabase';

export interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  notificationsEnabled: boolean;
  tasksLayout: 'list' | 'grid';
  habitsLayout: 'list' | 'grid';
  notesLayout: 'list' | 'grid';
  fontSize: 'small' | 'medium' | 'large';
  isUpdateBannerDismissed: boolean;
  defaultFocusDuration: number;
  dailyGoal: number;
  focusTimerActive: boolean;
  focusTimerTimeLeft: number;
  focusTimerMode: 'Study' | 'Quick Sprint' | 'Deep Work' | 'Custom';
  focusTimerDurationMinutes: number;
  focusTimerSelectedTaskId: string | null;
  focusTimerStartTime: number | null;
  defaultTaskPriority: 'Low' | 'Medium' | 'High';
  defaultReminderTime: number;
  weekStartDay: 'Sunday' | 'Monday';
  autoSortTasks: boolean;
  pomodoroFocusDuration: number;
  pomodoroBreakDuration: number;
  pomodoroLongBreakDuration: number;
  pomodoroAutoStartBreaks: boolean;
  smartSuggestionsEnabled: boolean;
  offlineMode: boolean;
  faceIdEnabled: boolean;
  appPin: string | null;
  autoLockTimeout: number; // in seconds, 0 = immediate
  updated_at?: string;
  isLocked: boolean;
  lastActive: number | null;
  twoFactorEnabled: boolean;
  
  setLocked: (locked: boolean) => void;
  setLastActive: (time: number | null) => void;
  setTwoFactorEnabled: (enabled: boolean) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setAccentColor: (color: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTasksLayout: (layout: 'list' | 'grid') => void;
  setHabitsLayout: (layout: 'list' | 'grid') => void;
  setNotesLayout: (layout: 'list' | 'grid') => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setUpdateBannerDismissed: (dismissed: boolean) => void;
  setDefaultFocusDuration: (duration: number) => void;
  setDailyGoal: (goal: number) => void;
  setFocusTimerActive: (active: boolean) => void;
  setFocusTimerTimeLeft: (timeLeft: number) => void;
  setFocusTimerMode: (mode: 'Study' | 'Quick Sprint' | 'Deep Work' | 'Custom') => void;
  setFocusTimerDurationMinutes: (duration: number) => void;
  setFocusTimerSelectedTaskId: (taskId: string | null) => void;
  setFocusTimerStartTime: (startTime: number | null) => void;
  setDefaultTaskPriority: (priority: 'Low' | 'Medium' | 'High') => void;
  setDefaultReminderTime: (time: number) => void;
  setWeekStartDay: (day: 'Sunday' | 'Monday') => void;
  setAutoSortTasks: (autoSort: boolean) => void;
  setPomodoroFocusDuration: (duration: number) => void;
  setPomodoroBreakDuration: (duration: number) => void;
  setPomodoroLongBreakDuration: (duration: number) => void;
  setPomodoroAutoStartBreaks: (autoStart: boolean) => void;
  setSmartSuggestionsEnabled: (enabled: boolean) => void;
  setOfflineMode: (offline: boolean) => void;
  setFaceIdEnabled: (enabled: boolean) => void;
  setAppPin: (pin: string | null) => void;
  setAutoLockTimeout: (timeout: number) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'system',
  accentColor: '#007AFF',
  notificationsEnabled: false,
  tasksLayout: 'list',
  habitsLayout: 'grid',
  notesLayout: 'grid',
  fontSize: 'medium',
  isUpdateBannerDismissed: false,
  defaultFocusDuration: 25,
  dailyGoal: 5,
  focusTimerActive: false,
  focusTimerTimeLeft: 25 * 60,
  focusTimerMode: 'Study',
  focusTimerDurationMinutes: 25,
  focusTimerSelectedTaskId: null,
  focusTimerStartTime: null,
  defaultTaskPriority: 'Medium',
  defaultReminderTime: 10,
  weekStartDay: 'Monday',
  autoSortTasks: true,
  pomodoroFocusDuration: 25,
  pomodoroBreakDuration: 5,
  pomodoroLongBreakDuration: 15,
  pomodoroAutoStartBreaks: false,
  smartSuggestionsEnabled: true,
  offlineMode: false,
  faceIdEnabled: false,
  appPin: null,
  autoLockTimeout: 0,
  isLocked: false,
  lastActive: null,
  twoFactorEnabled: false,
  
  setTheme: (theme) => {
    set({ theme });
    get().saveSettings();
  },
  setAccentColor: (accentColor) => {
    set({ accentColor });
    get().saveSettings();
  },
  setTasksLayout: (tasksLayout) => {
    set({ tasksLayout });
    get().saveSettings();
  },
  setHabitsLayout: (habitsLayout) => {
    set({ habitsLayout });
    get().saveSettings();
  },
  setNotesLayout: (notesLayout) => {
    set({ notesLayout });
    get().saveSettings();
  },
  setFontSize: (fontSize) => {
    set({ fontSize });
    get().saveSettings();
  },
  setUpdateBannerDismissed: (isUpdateBannerDismissed) => {
    set({ isUpdateBannerDismissed });
    get().saveSettings();
  },
  setDefaultFocusDuration: (defaultFocusDuration) => {
    set({ defaultFocusDuration });
    get().saveSettings();
  },
  setDailyGoal: (dailyGoal) => {
    set({ dailyGoal });
    get().saveSettings();
  },
  setFocusTimerActive: (focusTimerActive) => {
    set({ focusTimerActive });
  },
  setFocusTimerTimeLeft: (focusTimerTimeLeft) => {
    set({ focusTimerTimeLeft });
  },
  setFocusTimerMode: (focusTimerMode) => {
    set({ focusTimerMode });
    get().saveSettings();
  },
  setFocusTimerDurationMinutes: (focusTimerDurationMinutes) => {
    set({ focusTimerDurationMinutes });
    get().saveSettings();
  },
  setFocusTimerSelectedTaskId: (focusTimerSelectedTaskId) => {
    set({ focusTimerSelectedTaskId });
  },
  setFocusTimerStartTime: (focusTimerStartTime) => {
    set({ focusTimerStartTime });
  },
  setDefaultTaskPriority: (defaultTaskPriority) => {
    set({ defaultTaskPriority });
    get().saveSettings();
  },
  setDefaultReminderTime: (defaultReminderTime) => {
    set({ defaultReminderTime });
    get().saveSettings();
  },
  setWeekStartDay: (weekStartDay) => {
    set({ weekStartDay });
    get().saveSettings();
  },
  setAutoSortTasks: (autoSortTasks) => {
    set({ autoSortTasks });
    get().saveSettings();
  },
  setPomodoroFocusDuration: (pomodoroFocusDuration) => {
    set({ pomodoroFocusDuration });
    get().saveSettings();
  },
  setPomodoroBreakDuration: (pomodoroBreakDuration) => {
    set({ pomodoroBreakDuration });
    get().saveSettings();
  },
  setPomodoroLongBreakDuration: (pomodoroLongBreakDuration) => {
    set({ pomodoroLongBreakDuration });
    get().saveSettings();
  },
  setPomodoroAutoStartBreaks: (pomodoroAutoStartBreaks) => {
    set({ pomodoroAutoStartBreaks });
    get().saveSettings();
  },
  setSmartSuggestionsEnabled: (smartSuggestionsEnabled) => {
    set({ smartSuggestionsEnabled });
    get().saveSettings();
  },
  setOfflineMode: (offlineMode) => {
    set({ offlineMode });
    get().saveSettings();
  },
  setFaceIdEnabled: (faceIdEnabled) => {
    set({ faceIdEnabled });
    get().saveSettings();
  },
  setAppPin: (appPin) => {
    set({ appPin });
    get().saveSettings();
  },
  setAutoLockTimeout: (autoLockTimeout) => {
    set({ autoLockTimeout });
    get().saveSettings();
  },
  setLocked: (isLocked) => set({ isLocked }),
  setLastActive: (lastActive) => set({ lastActive }),
  setTwoFactorEnabled: (twoFactorEnabled) => {
    set({ twoFactorEnabled });
    get().saveSettings();
  },
  
  loadSettings: async () => {
    const userId = useAuthStore.getState().getUserId();
    // If guest, load settings only from local SQLite
    if (userId === 'guest') {
      const localGuestSettings = db.getUserSettings('guest');
      if (localGuestSettings) {
        console.log('[SettingsStore] Loading guest local settings');
        set(localGuestSettings);
      } else {
        console.log('[SettingsStore] No local settings for guest, using defaults');
      }
      return;
    }

    console.log(`[SettingsStore] Loading settings for user: ${userId}`);
    
    // 1. Try local SQLite first
    const localSettings = db.getUserSettings(userId);
    
    // 2. Try Supabase cloud settings (profiles table first, user metadata fallback)
    try {
      let cloudSettings: any = null;
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .single();
      
      if (!profileError && profileData?.settings && Object.keys(profileData.settings).length > 0) {
        cloudSettings = profileData.settings;
        console.log('[SettingsStore] Found cloud settings in profiles table');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.user_metadata?.settings) {
          cloudSettings = user.user_metadata.settings;
          console.log('[SettingsStore] Found cloud settings in user metadata fallback');
        }
      }

      if (cloudSettings) {
        // Merge logic: If local settings exist, compare updated_at
        if (localSettings) {
          const cloudTime = cloudSettings.updated_at ? new Date(cloudSettings.updated_at).getTime() : 0;
          const localTime = localSettings.updated_at ? new Date(localSettings.updated_at).getTime() : 0;

          if (cloudTime > localTime) {
            console.log('[SettingsStore] Cloud settings are newer, updating local');
            set(cloudSettings);
            db.saveUserSettings(userId, cloudSettings);
          } else {
            console.log('[SettingsStore] Local settings are newer or equal');
            set(localSettings);
          }
        } else {
          // No local settings, use cloud
          console.log('[SettingsStore] No local settings found, applying cloud data');
          set(cloudSettings);
          db.saveUserSettings(userId, cloudSettings);
        }
      } else if (localSettings) {
        // No cloud settings but local exists
        set(localSettings);
      }
    } catch (e) {
      console.warn('[SettingsStore] Failed to fetch cloud settings, falling back to local:', e);
      if (localSettings) set(localSettings);
    }
  },
  
  saveSettings: async () => {
    const userId = useAuthStore.getState().getUserId();
    if (userId === 'guest') return;

    const state = get();
    const now = new Date().toISOString();
    const updatedState = { ...state, updated_at: now };
    
    // Update local state and DB
    set({ updated_at: now });
    db.saveUserSettings(userId, updatedState);
    
    // Sync to cloud (Supabase)
    if (!state.offlineMode) {
      // Exclude non-serializable fields
      const { 
        loadSettings, saveSettings, setTheme, setAccentColor, 
        setNotificationsEnabled, setTasksLayout, setHabitsLayout, 
        setNotesLayout, setFontSize, setUpdateBannerDismissed,
        setDefaultFocusDuration, setDailyGoal, setFocusTimerActive,
        setFocusTimerTimeLeft, setFocusTimerMode, setFocusTimerDurationMinutes,
        setFocusTimerSelectedTaskId, setFocusTimerStartTime,
        setDefaultTaskPriority, setDefaultReminderTime, setWeekStartDay,
        setAutoSortTasks, setPomodoroFocusDuration, setPomodoroBreakDuration,
        setPomodoroLongBreakDuration, setPomodoroAutoStartBreaks,
        setSmartSuggestionsEnabled, setOfflineMode, setFaceIdEnabled,
        setAppPin, setAutoLockTimeout, setLocked, setLastActive,
        setTwoFactorEnabled, ...serializableSettings 
      } = updatedState as any;
      
      try {
        // 1. Sync to profiles table (main source of truth)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ settings: serializableSettings })
          .eq('id', userId);
        
        if (profileError) throw profileError;

        // 2. Sync to auth metadata for trigger/cache robustness
        await supabase.auth.updateUser({
          data: { settings: serializableSettings }
        });
        
        console.log('[SettingsStore] Successfully synced settings to profiles and user metadata');
      } catch (e) {
        console.warn('[SettingsStore] Cloud sync failed (will retry on next foreground):', e);
      }
    }
  },
  
  setNotificationsEnabled: async (enabled) => {
    set({ notificationsEnabled: enabled });
    const { useStore } = require('@/store/useStore');
    const habits = useStore.getState().habits;
    const totalStreak = habits.reduce((acc: any, h: any) => acc + h.streak, 0);
    await rescheduleAll(enabled, totalStreak);
    get().saveSettings();
  },
}));
