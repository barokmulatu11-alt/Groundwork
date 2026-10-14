import * as db from '@/lib/db';
import { rescheduleAll } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';

export interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  premiumThemeId: string;
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
  quietHoursEnabled: boolean;
  taskRemindersEnabled: boolean;
  habitRemindersEnabled: boolean;
  appUpdatesEnabled: boolean;
  
  setLocked: (locked: boolean) => void;
  setLastActive: (time: number | null) => void;
  setTwoFactorEnabled: (enabled: boolean) => void;
  setQuietHoursEnabled: (enabled: boolean) => void;
  setTaskRemindersEnabled: (enabled: boolean) => void;
  setHabitRemindersEnabled: (enabled: boolean) => void;
  setAppUpdatesEnabled: (enabled: boolean) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setAccentColor: (color: string) => void;
  setPremiumThemeId: (id: string) => void;
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
  premiumThemeId: 'default',
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
  quietHoursEnabled: true,
  taskRemindersEnabled: true,
  habitRemindersEnabled: true,
  appUpdatesEnabled: false,
  
  setTheme: (theme) => {
    set({ theme });
    get().saveSettings();
  },
  setAccentColor: (accentColor) => {
    set({ accentColor });
    get().saveSettings();
  },
  setPremiumThemeId: (premiumThemeId) => {
    set({ premiumThemeId });
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
  setQuietHoursEnabled: (quietHoursEnabled) => {
    set({ quietHoursEnabled });
    get().saveSettings();
  },
  setTaskRemindersEnabled: (taskRemindersEnabled) => {
    set({ taskRemindersEnabled });
    get().saveSettings();
  },
  setHabitRemindersEnabled: (habitRemindersEnabled) => {
    set({ habitRemindersEnabled });
    get().saveSettings();
  },
  setAppUpdatesEnabled: (appUpdatesEnabled) => {
    set({ appUpdatesEnabled });
    get().saveSettings();
  },
  
  loadSettings: async () => {
    const userId = useAuthStore.getState().getUserId();

    // Always load from local SQLite first (synchronous feel)
    const localSettings = db.getUserSettings(userId);
    if (localSettings) {
      // Guard: never allow accentColor or premiumThemeId to be empty
      if (!localSettings.accentColor) localSettings.accentColor = '#007AFF';
      if (!localSettings.premiumThemeId) localSettings.premiumThemeId = 'default';
      set(localSettings);
      // Keep device mirror in sync
      try {
        db.saveUserSettings('__device_theme', {
          accentColor: localSettings.accentColor,
          premiumThemeId: localSettings.premiumThemeId,
          theme: localSettings.theme,
        });
      } catch (_) {}
    }

    // If guest, stop here
    if (userId === 'guest') return;

    // Then try cloud for newer data
    try {
      let cloudSettings: any = null;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .single();

      if (!profileError && profileData?.settings && Object.keys(profileData.settings).length > 0) {
        cloudSettings = profileData.settings;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.user_metadata?.settings) {
          cloudSettings = user.user_metadata.settings;
        }
      }

      if (cloudSettings) {
        // Guard visual fields
        if (!cloudSettings.accentColor) cloudSettings.accentColor = '#007AFF';
        if (!cloudSettings.premiumThemeId) cloudSettings.premiumThemeId = 'default';
        const cloudTime = cloudSettings.updated_at ? new Date(cloudSettings.updated_at).getTime() : 0;
        const localTime = localSettings?.updated_at ? new Date(localSettings.updated_at).getTime() : 0;

        if (cloudTime > localTime) {
          set(cloudSettings);
          db.saveUserSettings(userId, cloudSettings);
        }
      }
    } catch (e) {
      console.warn('[SettingsStore] Cloud settings sync failed:', e);
    }
  },
  
  saveSettings: async () => {
    const userId = useAuthStore.getState().getUserId();

    const state = get();
    const now = new Date().toISOString();
    const updatedState = { ...state, updated_at: now };
    
    // Always save locally
    set({ updated_at: now });
    
    // Save under real user ID (or guest)
    db.saveUserSettings(userId, updatedState);
    
    // Mirror visual settings under device key so theme loads before auth
    try {
      db.saveUserSettings('__device_theme', {
        accentColor: state.accentColor,
        premiumThemeId: state.premiumThemeId,
        theme: state.theme,
        updated_at: now,
      });
    } catch (_) {}

    if (userId === 'guest') return;
    
    // Sync to cloud (Supabase)
    if (!state.offlineMode) {
      const { 
        loadSettings, saveSettings, setTheme, setAccentColor, setPremiumThemeId,
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
        setTwoFactorEnabled, setQuietHoursEnabled, setTaskRemindersEnabled,
        setHabitRemindersEnabled, setAppUpdatesEnabled, ...serializableSettings 
      } = updatedState as any;
      
      try {
        const { atomicUpdateProfileSettings } = await import('@/lib/profileSettingsService');
        await atomicUpdateProfileSettings(userId, () => ({
          settingsUpdates: serializableSettings,
        }));
      } catch (e) {
        console.warn('[SettingsStore] Cloud sync failed:', e);
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

// ─── Synchronous init ─────────────────────────────────────────────────────────
// Loads visual settings (theme, accent, premiumThemeId) from the device-level
// cache key before auth is ready, so ThemeContext gets the correct values on
// the very first render.
try {
  const _db = require('@/lib/db');
  // 1. Try device-level theme cache (fastest, no auth needed)
  const _device = _db.getUserSettings('__device_theme');
  if (_device?.accentColor || _device?.premiumThemeId || _device?.theme) {
    useSettingsStore.setState({
      accentColor: _device.accentColor,
      premiumThemeId: _device.premiumThemeId,
      theme: _device.theme,
    });
  } else {
    // 2. Fallback: try guest settings
    const _guest = _db.getUserSettings('guest');
    if (_guest?.accentColor || _guest?.premiumThemeId || _guest?.theme) {
      useSettingsStore.setState({
        accentColor: _guest.accentColor,
        premiumThemeId: _guest.premiumThemeId,
        theme: _guest.theme,
      });
    }
  }
} catch (_) {}
