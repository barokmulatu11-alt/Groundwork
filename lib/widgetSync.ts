import { NativeModules, Platform, Appearance } from 'react-native';
import { getLocalDateString, formatHeaderDate } from '@/lib/dateUtils';
import { parseHabitDates } from '@/lib/habitUtils';
import type { Task, Habit, Note } from '@/lib/db';

const { WidgetBridge } = NativeModules;

export interface WidgetTaskItem {
  id: string;
  title: string;
  due_time?: string | null;
  priority?: string | null;
}

export interface WidgetTasksPayload {
  dateFormatted: string;
  completedCount: number;
  totalCount: number;
  accentColor: string;
  isDark: boolean;
  tasks: WidgetTaskItem[];
}

export interface WidgetHabitItem {
  id: string;
  title: string;
  streak: number;
  completedToday: boolean;
  color?: string;
}

export interface WidgetHabitsPayload {
  dateFormatted: string;
  completedCount: number;
  totalCount: number;
  accentColor: string;
  isDark: boolean;
  habits: WidgetHabitItem[];
}

export interface WidgetFocusPayload {
  todayMinutes: number;
  sessionCount: number;
  dailyGoalMinutes: number;
  accentColor: string;
  isDark: boolean;
}

export interface WidgetNotesPayload {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  accentColor: string;
  isDark: boolean;
}

const getThemeSettings = () => {
  try {
    const { useSettingsStore } = require('@/store/useSettingsStore');
    const settings = useSettingsStore.getState();
    const accentColor = settings.accentColor || '#0066FF';
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && Appearance.getColorScheme() === 'dark');
    return { accentColor, isDark };
  } catch {
    return { accentColor: '#0066FF', isDark: true };
  }
};

/**
 * Sync Tasks Widget
 */
export const syncWidgetData = async (tasksList?: Task[]): Promise<boolean> => {
  if (Platform.OS !== 'android' || !WidgetBridge || typeof WidgetBridge.updateWidgetData !== 'function') {
    return false;
  }

  try {
    let tasks: Task[] = [];
    if (tasksList && Array.isArray(tasksList)) {
      tasks = tasksList;
    } else {
      const { useStore } = require('@/store/useStore');
      tasks = useStore.getState().tasks || [];
    }

    const { accentColor, isDark } = getThemeSettings();
    const todayStr = getLocalDateString();
    const todayFormatted = formatHeaderDate();

    const activeTasks = tasks.filter((t) => !t.deleted_at);
    const todayTasks = activeTasks.filter((t) => t.date === todayStr || !t.date);

    const completedToday = todayTasks.filter((t) => t.completed);
    const pendingToday = todayTasks.filter((t) => !t.completed);

    const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const sortedPending = [...pendingToday].sort((a, b) => {
      const weightA = priorityWeight[a.priority || 'medium'] || 2;
      const weightB = priorityWeight[b.priority || 'medium'] || 2;
      if (weightB !== weightA) return weightB - weightA;
      if (a.due_time && !b.due_time) return -1;
      if (!a.due_time && b.due_time) return 1;
      return 0;
    });

    const topTasks: WidgetTaskItem[] = sortedPending.slice(0, 6).map((t) => ({
      id: t.id,
      title: t.title || 'Untitled task',
      due_time: t.due_time || t.time_block || null,
      priority: t.priority || 'medium',
    }));

    const payload: WidgetTasksPayload = {
      dateFormatted: `Today · ${todayFormatted}`,
      completedCount: completedToday.length,
      totalCount: todayTasks.length,
      accentColor,
      isDark,
      tasks: topTasks,
    };

    await WidgetBridge.updateWidgetData(JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn('[WidgetSync] Failed to update tasks widget:', error);
    return false;
  }
};

/**
 * Checks for tasks completed directly on widget
 */
export const processPendingWidgetCompletions = async (): Promise<void> => {
  if (
    Platform.OS !== 'android' ||
    !WidgetBridge ||
    typeof WidgetBridge.getPendingCompletions !== 'function'
  ) {
    return;
  }

  try {
    const taskIds: string[] = await WidgetBridge.getPendingCompletions();
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return;
    }

    const { useStore } = require('@/store/useStore');
    const store = useStore.getState();
    let hasChanges = false;

    for (const taskId of taskIds) {
      const existingTask = (store.tasks || []).find((t: Task) => t.id === taskId);
      if (existingTask && !existingTask.completed) {
        await store.toggleTask(taskId, true);
        hasChanges = true;
      }
    }

    if (hasChanges && typeof store.syncWithCloud === 'function') {
      store.syncWithCloud().catch(() => {});
    }
  } catch (error) {
    console.warn('[WidgetSync] Error processing pending widget completions:', error);
  }
};

/**
 * Sync Habits Widget
 */
export const syncHabitsWidgetData = async (habitsList?: Habit[]): Promise<boolean> => {
  if (Platform.OS !== 'android' || !WidgetBridge || typeof WidgetBridge.updateHabitsWidgetData !== 'function') {
    return false;
  }

  try {
    let habits: Habit[] = [];
    if (habitsList && Array.isArray(habitsList)) {
      habits = habitsList;
    } else {
      const { useStore } = require('@/store/useStore');
      habits = useStore.getState().habits || [];
    }

    const { accentColor, isDark } = getThemeSettings();
    const todayStr = getLocalDateString();
    const todayFormatted = formatHeaderDate();

    const activeHabits = habits.filter((h) => !h.deleted_at);
    let completedCount = 0;

    const habitItems: WidgetHabitItem[] = activeHabits.slice(0, 4).map((h) => {
      const dates = parseHabitDates(h.dates_completed);
      const completedToday = dates.includes(todayStr);
      if (completedToday) completedCount += 1;
      return {
        id: h.id,
        title: h.title,
        streak: h.streak || 0,
        completedToday,
        color: accentColor,
      };
    });

    const payload: WidgetHabitsPayload = {
      dateFormatted: `Today · ${todayFormatted}`,
      completedCount,
      totalCount: habitItems.length,
      accentColor,
      isDark,
      habits: habitItems,
    };

    await WidgetBridge.updateHabitsWidgetData(JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn('[WidgetSync] Failed to update habits widget:', error);
    return false;
  }
};

/**
 * Checks for habits checked-in directly on widget
 */
export const processPendingHabitCheckins = async (): Promise<void> => {
  if (
    Platform.OS !== 'android' ||
    !WidgetBridge ||
    typeof WidgetBridge.getPendingHabitCheckins !== 'function'
  ) {
    return;
  }

  try {
    const habitIds: string[] = await WidgetBridge.getPendingHabitCheckins();
    if (!habitIds || !Array.isArray(habitIds) || habitIds.length === 0) {
      return;
    }

    const { useStore } = require('@/store/useStore');
    const store = useStore.getState();
    const todayStr = getLocalDateString();
    let hasChanges = false;

    for (const habitId of habitIds) {
      const habit = (store.habits || []).find((h: Habit) => h.id === habitId);
      if (habit) {
        const dates = parseHabitDates(habit.dates_completed);
        if (!dates.includes(todayStr)) {
          await store.toggleHabit(habitId, todayStr);
          hasChanges = true;
        }
      }
    }

    if (hasChanges && typeof store.syncWithCloud === 'function') {
      store.syncWithCloud().catch(() => {});
    }
  } catch (error) {
    console.warn('[WidgetSync] Error processing pending habit check-ins:', error);
  }
};

/**
 * Sync Focus Widget
 */
export const syncFocusWidgetData = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !WidgetBridge || typeof WidgetBridge.updateFocusWidgetData !== 'function') {
    return false;
  }

  try {
    const { useStore } = require('@/store/useStore');
    const store = useStore.getState();
    const { accentColor, isDark } = getThemeSettings();
    const todayStr = getLocalDateString();

    const sessions = store.focusSessions || [];
    const todaySessions = sessions.filter(
      (s: any) => s.date === todayStr || (s.started_at && s.started_at.startsWith(todayStr))
    );

    const todayMinutes = todaySessions.reduce((acc: number, s: any) => acc + (s.duration_minutes || 0), 0);

    const payload: WidgetFocusPayload = {
      todayMinutes,
      sessionCount: todaySessions.length,
      dailyGoalMinutes: 60,
      accentColor,
      isDark,
    };

    await WidgetBridge.updateFocusWidgetData(JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn('[WidgetSync] Failed to update focus widget:', error);
    return false;
  }
};

/**
 * Sync Notes Widget
 */
export const syncNotesWidgetData = async (notesList?: Note[]): Promise<boolean> => {
  if (Platform.OS !== 'android' || !WidgetBridge || typeof WidgetBridge.updateNotesWidgetData !== 'function') {
    return false;
  }

  try {
    let notes: Note[] = [];
    if (notesList && Array.isArray(notesList)) {
      notes = notesList;
    } else {
      const { useStore } = require('@/store/useStore');
      notes = useStore.getState().notes || [];
    }

    const { accentColor, isDark } = getThemeSettings();
    const activeNotes = notes.filter((n) => !n.deleted_at);

    // Prioritize pinned notes, then most recently updated
    const sorted = [...activeNotes].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    });

    const topNote = sorted[0];

    const payload: WidgetNotesPayload = {
      id: topNote?.id || '',
      title: topNote?.title || '',
      content: topNote?.content || '',
      isPinned: !!topNote?.is_pinned,
      accentColor,
      isDark,
    };

    await WidgetBridge.updateNotesWidgetData(JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn('[WidgetSync] Failed to update notes widget:', error);
    return false;
  }
};

/**
 * Sync all widgets and process pending interactions
 */
export const syncAllWidgets = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  await Promise.allSettled([
    processPendingWidgetCompletions(),
    processPendingHabitCheckins(),
    syncWidgetData(),
    syncHabitsWidgetData(),
    syncFocusWidgetData(),
    syncNotesWidgetData(),
  ]);
};
