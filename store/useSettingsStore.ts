import * as db from '@/lib/db';
import { rescheduleAll } from '@/lib/notifications';
import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';

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
  loadSettings: () => void;
  saveSettings: () => void;
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
  
  loadSettings: () => {
    const userId = useAuthStore.getState().getUserId();
    const settings = db.getUserSettings(userId);
    if (settings) {
      set(settings);
      console.log(`[SettingsStore] Loaded settings for user: ${userId}`);
    }
  },
  
  saveSettings: async () => {
    const userId = useAuthStore.getState().getUserId();
    const state = get();
    const updatedState = { ...state, updated_at: new Date().toISOString() };
    set({ updated_at: updatedState.updated_at });
    db.saveUserSettings(userId, updatedState);
    
    // Sync to cloud
    const { supabase } = require('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && !state.offlineMode) {
      // Exclude functions and non-serializable fields
      const { loadSettings, saveSettings, setTheme, setAccentColor, ...serializableSettings } = updatedState as any;
      
      try {
        await supabase.auth.updateUser({
          data: { settings: serializableSettings }
        });
      } catch (e) {
        console.warn('[SettingsStore] Failed to sync settings to cloud', e);
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
