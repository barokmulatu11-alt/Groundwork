import {
    initAnalyticsTables,
    trackTask,
    trackHabit,
    trackNote,
    trackFocus
} from "@/lib/analytics";
import { addXP, XP_VALUES } from "@/lib/connect/xpSystem";
import * as db from "@/lib/db";
import { FocusSession, Habit, Note, Task } from "@/lib/db";
import {
    calculateBestHabitStreak,
    calculateHabitStreak,
    parseHabitDates,
} from "@/lib/habitUtils";
import { hapticSuccess } from "@/lib/haptics";
import {
    canAddHabit,
    canAddTask,
    type GateResult,
} from "@/lib/subscriptionService";

export type TaskCreationResult = GateResult & { success?: boolean; error?: string; task?: Task };
export type HabitCreationResult = GateResult & { success?: boolean; error?: string; habit?: Habit };
import { neonData, neonAuth } from "@/lib/neon";
import { AppState as RNAppState } from "react-native";
import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";

// Initialize analytics tables on startup
try {
  initAnalyticsTables();
} catch (e) {
  console.warn("[Store] Analytics tables initialization failed:", e);
}
export { FocusSession, Habit, Note, Task };
export type { GateResult };

/** Single-source-of-truth sync status.  All other sync flags must stay consistent with this. */
export type SyncStatus =
  | 'idle'          // never ran a sync for this session
  | 'syncing'       // in-flight
  | 'synced'        // last run completed fully with no upload failures
  | 'partial'       // last run completed but ≥1 upload failed; lastSyncedAt preserved
  | 'failed';       // last run aborted due to required query error or thrown exception

interface AppState {
  tasks: Task[];
  habits: Habit[];
  notes: Note[];
  focusSessions: FocusSession[];
  // Only updated when every required operation succeeds (no partial failures).
  lastSyncedAt: string | null;
  // Authoritative status field — drives the badge, manual-sync message, and retry logic.
  syncStatus: SyncStatus;
  // Deprecated aliases kept for backward-compat; always agree with syncStatus.
  isSyncing: boolean;
  syncError: boolean;
  syncPartial: boolean;
  syncPartialFailures: string[];

  loadAllTasks: () => Promise<void>;
  addTask: (task: Partial<Task>) => Promise<TaskCreationResult>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string, currentStatus: boolean) => Promise<void>;

  loadHabits: () => Promise<void>;
  addHabit: (habit: Partial<Habit>) => Promise<HabitCreationResult>;
  toggleHabit: (id: string, date: string) => Promise<void>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;

  loadNotes: () => Promise<void>;
  addNote: (note: Partial<Note>) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  loadFocusSessions: () => Promise<void>;
  addFocusSession: (session: Partial<FocusSession>) => Promise<void>;

  syncFromCloud: (session?: any) => Promise<SyncResult>;
  importData: (data: any) => Promise<void>;
  loadDayNotes: () => Promise<void>;
  saveDayNote: (date: string, text: string) => Promise<void>;
  dayNotes: Record<string, string>;
  draftNote: Partial<Note> | null;
  setDraftNote: (note: Partial<Note> | null) => void;
}

export interface SyncResult {
  success: boolean;
  partial?: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  partialFailures?: string[];
  counts?: {
    tasks: number;
    habits: number;
    notes: number;
    focus: number;
  };
}

const pushToCloud = async (table: string, data: any): Promise<boolean> => {
  try {
    let sessionUser: any = useAuthStore.getState().session?.user;
    if (!sessionUser) {
      try {
        const { data: sessionData } = await neonAuth.getSession();
        sessionUser = sessionData?.user;
      } catch (_) {}
    }
    if (!sessionUser) return false;

    const userId = sessionUser.id;
    let cloudData: any = {};

    if (table === "tasks") {
      cloudData = {
        id: data.id,
        user_id: userId,
        title: data.title || "",
        date: data.date || new Date().toISOString().split("T")[0],
        time_block: data.time_block || null,
        priority: data.priority || "Medium",
        note: data.note || "",
        reminder_time: data.reminder_time || null,
        order_index: data.order_index ?? 0,
        completed: Boolean(data.completed),
        completed_at: data.completed_at || null,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        deleted_at: data.deleted_at || null,
      };
    } else if (table === "habits") {
      cloudData = {
        id: data.id,
        user_id: userId,
        title: data.title || "",
        frequency: data.frequency || "daily",
        dates_completed: Array.isArray(data.dates_completed)
          ? JSON.stringify(data.dates_completed)
          : typeof data.dates_completed === "string"
            ? data.dates_completed
            : "[]",
        streak: Number(data.streak) || 0,
        best_streak: Number(data.best_streak) || 0,
        is_paused: Boolean(data.is_paused),
        category: data.category || "All",
        difficulty: data.difficulty || "Medium",
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        deleted_at: data.deleted_at || null,
      };
    } else if (table === "notes") {
      cloudData = {
        id: data.id,
        user_id: userId,
        title: data.title || "",
        content: data.content || "",
        is_locked: Boolean(data.is_locked),
        is_pinned: Boolean(data.is_pinned),
        audio_uris: Array.isArray(data.audio_uris)
          ? JSON.stringify(data.audio_uris)
          : typeof data.audio_uris === "string"
            ? data.audio_uris
            : "[]",
        drawing_uris: Array.isArray(data.drawing_uris)
          ? JSON.stringify(data.drawing_uris)
          : typeof data.drawing_uris === "string"
            ? data.drawing_uris
            : "[]",
        image_uris: Array.isArray(data.image_uris)
          ? JSON.stringify(data.image_uris)
          : typeof data.image_uris === "string"
            ? data.image_uris
            : "[]",
        tags: Array.isArray(data.tags)
          ? JSON.stringify(data.tags)
          : typeof data.tags === "string"
            ? data.tags
            : "[]",
        folder: data.folder || "General",
        priority: data.priority || "Medium",
        study_hours: Number(data.study_hours) || 0,
        revision_score: Number(data.revision_score) || 0,
        last_reviewed_at: data.last_reviewed_at || null,
        flashcards: Array.isArray(data.flashcards)
          ? JSON.stringify(data.flashcards)
          : typeof data.flashcards === "string"
            ? data.flashcards
            : "[]",
        formulas: Array.isArray(data.formulas)
          ? JSON.stringify(data.formulas)
          : typeof data.formulas === "string"
            ? data.formulas
            : "[]",
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        deleted_at: data.deleted_at || null,
      };
    } else if (table === "focus_sessions") {
      const now = new Date().toISOString();
      cloudData = {
        id: data.id,
        user_id: userId,
        duration_minutes: Number(data.duration_minutes) || 0,
        started_at: data.started_at || data.created_at || now,
        completed_at: data.completed_at || null,
        task_id: data.task_id || null,
        mode: data.mode || "Focus",
        date: data.date || now.split("T")[0],
        created_at: data.created_at || now,
        updated_at: data.updated_at || now,
      };
    } else if (table === "user_settings") {
      cloudData = {
        user_id: userId,
        theme: data.theme || "light",
        accent_color: data.accentColor || data.accent_color || "#007AFF",
        premium_theme_id: data.premiumThemeId || data.premium_theme_id || "default",
        notifications_enabled: (data.notificationsEnabled || data.notifications_enabled) ? 1 : 0,
        tasks_layout: data.tasksLayout || data.tasks_layout || "list",
        habits_layout: data.habitsLayout || data.habits_layout || "grid",
        notes_layout: data.notesLayout || data.notes_layout || "grid",
        is_update_banner_dismissed: (data.isUpdateBannerDismissed || data.is_update_banner_dismissed) ? 1 : 0,
        default_focus_duration: data.defaultFocusDuration || data.default_focus_duration || 25,
        daily_goal: data.dailyGoal || data.daily_goal || 5,
        focus_timer_active: (data.focusTimerActive || data.focus_timer_active) ? 1 : 0,
        focus_timer_time_left: data.focusTimerTimeLeft || data.focus_timer_time_left || 1500,
        focus_timer_mode: data.focusTimerMode || data.focus_timer_mode || "Study",
        focus_timer_duration_minutes: data.focusTimerDurationMinutes || data.focus_timer_duration_minutes || 25,
        focus_timer_selected_task_id: data.focusTimerSelectedTaskId || data.focus_timer_selected_task_id || null,
        focus_timer_start_time: data.focusTimerStartTime || data.focus_timer_start_time || null,
        default_task_priority: data.defaultTaskPriority || data.default_task_priority || "Medium",
        default_reminder_time: data.defaultReminderTime ?? 10,
        week_start_day: data.weekStartDay || "Monday",
        auto_sort_tasks: data.autoSortTasks ? 1 : 0,
        pomodoro_focus_duration: data.pomodoroFocusDuration ?? 25,
        pomodoro_break_duration: data.pomodoroBreakDuration ?? 5,
        pomodoro_long_break_duration: data.pomodoroLongBreakDuration ?? 15,
        pomodoro_auto_start_breaks: data.pomodoroAutoStartBreaks ? 1 : 0,
        smart_suggestions_enabled: data.smartSuggestionsEnabled ? 1 : 0,
        offline_mode: data.offlineMode ? 1 : 0,
        face_id_enabled: data.faceIdEnabled ? 1 : 0,
        app_pin: data.appPin || null,
        auto_lock_timeout: data.autoLockTimeout || 0,
        updated_at: data.updated_at || new Date().toISOString(),
      };
    } else if (table === "day_notes") {
      cloudData = {
        id: data.id || data.date,
        user_id: userId,
        date: data.date,
        note_text: data.note_text || "",
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      };
    } else if (table === "sub_tasks") {
      cloudData = {
        id: data.id,
        task_id: data.task_id,
        user_id: userId,
        title: data.title || "",
        completed: Boolean(data.completed),
        order_index: Number(data.order_index) || 0,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        deleted_at: data.deleted_at || null,
      };
    } else {
      cloudData = { ...data, user_id: userId };
      const keysToSerialize = [
        "dates_completed",
        "tags",
        "audio_uris",
        "drawing_uris",
        "image_uris",
      ];
      keysToSerialize.forEach((key) => {
        if (cloudData[key] && Array.isArray(cloudData[key])) {
          cloudData[key] = JSON.stringify(cloudData[key]);
        }
      });
    }

    let { error } = await neonData.from(table).upsert(cloudData);
    if (
      error &&
      table === "notes" &&
      /flashcards|formulas|schema cache/i.test(error.message || "")
    ) {
      const slim = { ...cloudData };
      delete slim.flashcards;
      delete slim.formulas;
      delete slim.study_hours;
      delete slim.revision_score;
      delete slim.last_reviewed_at;
      ({ error } = await neonData.from(table).upsert(slim));
    }
    if (error) {
      console.warn(`[Cloud] Push to ${table} failed:`, error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn(
      `[Cloud] Push to ${table} failed (offline or error):`,
      e?.message || e,
    );
    return false;
  }
};

const pushBatchToCloud = async (table: string, items: any[]): Promise<boolean> => {
  if (!items || items.length === 0) return true;
  try {
    const userId = getUserId();
    if (!userId || userId === "guest") return false;

    const prepared = items.map((item) => {
      if (table === "sub_tasks") {
        return {
          id: item.id,
          task_id: item.task_id,
          user_id: userId,
          title: item.title || "",
          completed: Boolean(item.completed),
          order_index: Number(item.order_index) || 0,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
          deleted_at: item.deleted_at || null,
        };
      }
      if (table === "day_notes") {
        return {
          id: item.id || item.date,
          user_id: userId,
          date: item.date,
          note_text: item.note_text || "",
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
        };
      }
      const cloudData = { ...item, user_id: userId };
      const keysToSerialize = [
        "dates_completed",
        "tags",
        "audio_uris",
        "drawing_uris",
        "image_uris",
      ];
      keysToSerialize.forEach((key) => {
        if (cloudData[key] && Array.isArray(cloudData[key])) {
          cloudData[key] = JSON.stringify(cloudData[key]);
        }
      });
      return cloudData;
    });

    const chunkSize = 25;
    for (let i = 0; i < prepared.length; i += chunkSize) {
      const chunk = prepared.slice(i, i + chunkSize);
      let { error } = await neonData.from(table).upsert(chunk);
      if (
        error &&
        table === "notes" &&
        /flashcards|formulas|schema cache/i.test(error.message || "")
      ) {
        const slim = chunk.map((c) => {
          const s = { ...c };
          delete s.flashcards;
          delete s.formulas;
          delete s.study_hours;
          delete s.revision_score;
          delete s.last_reviewed_at;
          return s;
        });
        ({ error } = await neonData.from(table).upsert(slim));
      }
      if (error) {
        console.warn(`[Cloud] Push batch to ${table} failed:`, error.message);
        return false;
      }
    }
    return true;
  } catch (e: any) {
    console.warn(`[Cloud] Push batch to ${table} failed (offline or error):`, e?.message || e);
    return false;
  }
};

const getUserId = () => {
  const { session, isGuest } = useAuthStore.getState();
  if (isGuest) return "guest";
  if (session?.user?.id) return session.user.id;
  return "guest";
};

export const useStore = create<AppState>((set, get) => ({
  tasks: [],
  habits: [],
  notes: [],
  focusSessions: [],
  dayNotes: {},
  draftNote: null,
  lastSyncedAt: null,
  syncStatus: 'idle',
  isSyncing: false,
  syncError: false,
  syncPartial: false,
  syncPartialFailures: [],

  setDraftNote: (note) => set({ draftNote: note }),

  loadAllTasks: async () => {
    const userId = getUserId();
    const tasks = await db.getTasks(userId);
    set({ tasks: tasks || [] });
    try {
      const { syncWidgetData } = require('@/lib/widgetSync');
      syncWidgetData(tasks || []);
    } catch (_) {}
  },

  addTask: async (taskData) => {
    const gate = canAddTask();
    if (!gate.allowed) return { ...gate, success: false, error: gate.reason || 'Pro limit reached' };

    const userId = getUserId();
    const order_index = get().tasks.length;
    const newTask = await db.addTask({
      ...taskData,
      user_id: userId,
      order_index,
    });
    if (newTask) {
      set({ tasks: [...get().tasks, newTask] });
      pushToCloud("tasks", newTask);
      if (Array.isArray(newTask.sub_tasks)) {
        for (const st of newTask.sub_tasks) {
          pushToCloud("sub_tasks", {
            ...st,
            task_id: newTask.id,
            user_id: userId,
          });
        }
      }
      db.updateConnectProfileStats(userId);
      // Track analytics event
      try { trackTask.created(newTask.id, newTask.title || "", newTask.priority); } catch (_) {}
      // Sync to Native Android Home Screen Widget
      try {
        const { syncWidgetData } = require('@/lib/widgetSync');
        syncWidgetData([...get().tasks, newTask]);
      } catch (_) {}
      // Auto-schedule notification if task has due time and notifications are allowed
      try {
        const { useSettingsStore } = require('@/store/useSettingsStore');
        if (useSettingsStore.getState().notificationsEnabled) {
          const timeStr = newTask.due_time || newTask.time_block;
          if (timeStr && !newTask.completed) {
            const { scheduleTaskReminder } = require('@/lib/notifications');
            const now = new Date();
            const dateStr = newTask.date || now.toISOString().split('T')[0];
            const formattedTime = timeStr.includes(':') && timeStr.length <= 5 ? timeStr + ':00' : timeStr;
            const parsed = new Date(`${dateStr}T${formattedTime}`);
            if (!isNaN(parsed.getTime()) && parsed > now) {
              scheduleTaskReminder(newTask.id, newTask.title || 'Task', parsed, newTask.reminder_offset || 15);
            }
          }
        }
      } catch (_) {}
      return { allowed: true, success: true, task: newTask };
    }
    return { allowed: true, success: false, error: 'Failed to create task in local database' };
  },

  updateTask: async (id, updates) => {
    // 1. Immediate optimistic update in Zustand store
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t)),
    }));
    // 2. Persist to SQLite
    await db.updateTask(id, updates);
    // 3. Reconcile with SQLite fresh tasks
    const userId = getUserId();
    const freshTasks = db.getTasks(userId);
    if (freshTasks && freshTasks.length > 0) {
      const merged = freshTasks.map((ft) => (ft.id === id ? { ...ft, ...updates } : ft));
      set({ tasks: merged });
    }
    const task = get().tasks.find((t) => t.id === id);
    if (task) {
      pushToCloud("tasks", task);
      db.updateConnectProfileStats(task.user_id || userId);
    }
    if (Array.isArray(updates.sub_tasks)) {
      for (const st of (task?.sub_tasks || updates.sub_tasks)) {
        pushToCloud("sub_tasks", {
          ...st,
          task_id: id,
          user_id: task?.user_id || userId,
        });
      }
    }
    // Sync to Native Android Home Screen Widget
    try {
      const { syncWidgetData } = require('@/lib/widgetSync');
      syncWidgetData(get().tasks);
    } catch (_) {}
    // Auto-schedule or cancel notification on task updates
    try {
      const { useSettingsStore } = require('@/store/useSettingsStore');
      if (useSettingsStore.getState().notificationsEnabled) {
        const { scheduleTaskReminder, cancelTaskReminder } = require('@/lib/notifications');
        const updated = get().tasks.find((t) => t.id === id);
        if (updated) {
          if (updated.completed || updated.deleted_at) {
            cancelTaskReminder(id);
          } else {
            const timeStr = updated.due_time || updated.time_block;
            if (timeStr) {
              const now = new Date();
              const dateStr = updated.date || now.toISOString().split('T')[0];
              const formattedTime = timeStr.includes(':') && timeStr.length <= 5 ? timeStr + ':00' : timeStr;
              const parsed = new Date(`${dateStr}T${formattedTime}`);
              if (!isNaN(parsed.getTime()) && parsed > now) {
                scheduleTaskReminder(updated.id, updated.title || 'Task', parsed, updated.reminder_offset || 15);
              }
            }
          }
        }
      }
    } catch (_) {}
  },

  deleteTask: async (id) => {
    const now = new Date().toISOString();
    const task = get().tasks.find((t) => t.id === id);
    await db.deleteTask(id);
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
    // Soft delete in cloud — pass full object so pushToCloud has all required fields
    if (task) {
      pushToCloud("tasks", { ...task, deleted_at: now, updated_at: now });
      // Track analytics event
      try { trackTask.deleted(task.id, task.title || ""); } catch (_) {}
    } else {
      pushToCloud("tasks", { id, deleted_at: now, updated_at: now });
    }
    db.updateConnectProfileStats(getUserId());
    try {
      const { cancelTaskReminder } = require('@/lib/notifications');
      cancelTaskReminder(id);
    } catch (_) {}
    try {
      const { syncWidgetData } = require('@/lib/widgetSync');
      syncWidgetData(get().tasks);
    } catch (_) {}
  },

  toggleTask: async (id, currentStatus) => {
    const completed = !currentStatus;
    const completed_at = completed ? new Date().toISOString() : null;
    await db.updateTask(id, { completed, completed_at });
    const updatedTasks = get().tasks.map((t) =>
      t.id === id ? { ...t, completed, completed_at } : t,
    );
    set({ tasks: updatedTasks });
    const task = updatedTasks.find((t) => t.id === id);
    try {
      const { syncWidgetData } = require('@/lib/widgetSync');
      syncWidgetData(updatedTasks);
    } catch (_) {}
    try {
      const { scheduleTaskReminder, cancelTaskReminder } = require('@/lib/notifications');
      if (completed) {
        cancelTaskReminder(id);
      } else if (task) {
        const { useSettingsStore } = require('@/store/useSettingsStore');
        if (useSettingsStore.getState().notificationsEnabled) {
          const timeStr = task.due_time || task.time_block;
          if (timeStr) {
            const now = new Date();
            const dateStr = task.date || now.toISOString().split('T')[0];
            const formattedTime = timeStr.includes(':') && timeStr.length <= 5 ? timeStr + ':00' : timeStr;
            const parsed = new Date(`${dateStr}T${formattedTime}`);
            if (!isNaN(parsed.getTime()) && parsed > now) {
              scheduleTaskReminder(task.id, task.title || 'Task', parsed, task.reminder_offset || 15);
            }
          }
        }
      }
    } catch (_) {}
    if (task) {
      pushToCloud("tasks", task);
      if (completed) {
        hapticSuccess();
        const userId = getUserId();
        await addXP(userId, XP_VALUES.TASK_COMPLETED, "Task completed");
        // Track analytics event
        try { trackTask.completed(task.id, task.title || ""); } catch (_) {}
        // Check if all tasks for today are done
        const today = new Date().toISOString().split("T")[0];
        const todayTasks = updatedTasks.filter(
          (t) => t.date === today && !t.deleted_at,
        );
        if (todayTasks.length > 0 && todayTasks.every((t) => t.completed)) {
          await addXP(
            userId,
            XP_VALUES.DAILY_ALL_TASKS_DONE,
            "All tasks completed today",
          );
        }
      }
      db.updateConnectProfileStats(task.user_id || getUserId());
    }
  },

  loadHabits: async () => {
    const userId = getUserId();
    const raw = await db.getHabits(userId);
    const habits = (raw || []).map((h) => {
      const dates = parseHabitDates(h.dates_completed);
      const streak = calculateHabitStreak(dates);
      const best_streak = Math.max(
        h.best_streak,
        calculateBestHabitStreak(dates),
      );
      if (streak !== h.streak || best_streak !== h.best_streak) {
        db.db.runSync(
          "UPDATE habits SET streak = ?, best_streak = ? WHERE id = ?",
          [streak, best_streak, h.id],
        );
        return { ...h, streak, best_streak };
      }
      return h;
    });
    set({ habits });
    try {
      const { syncHabitsWidgetData } = require('@/lib/widgetSync');
      syncHabitsWidgetData(habits);
    } catch (_) {}
  },

  addHabit: async (habitData) => {
    const gate = canAddHabit();
    if (!gate.allowed) return { ...gate, success: false, error: gate.reason || 'Pro limit reached' };

    const userId = getUserId();
    const newHabit = await db.addHabit({ ...habitData, user_id: userId });
    if (newHabit) {
      set({ habits: [newHabit, ...get().habits] });
      pushToCloud("habits", newHabit);
      // Track analytics event
      try { trackHabit.created(newHabit.id, newHabit.title || "", newHabit.frequency); } catch (_) {}
      return { allowed: true, success: true, habit: newHabit };
    }
    return { allowed: true, success: false, error: 'Failed to create habit in local database' };
  },

  toggleHabit: async (id, date) => {
    try {
      const habit = get().habits.find((h) => h.id === id);
      if (!habit) return;
      const dates = parseHabitDates(habit.dates_completed);
      const isCheckingIn = !dates.includes(date);
      const newDates = isCheckingIn
        ? [...dates, date]
        : dates.filter((d) => d !== date);
      const newStreak = calculateHabitStreak(newDates, date);
      const newBest = Math.max(
        habit.best_streak,
        calculateBestHabitStreak(newDates),
      );
      const updated_at = new Date().toISOString();

      db.db.runSync(
        "UPDATE habits SET dates_completed = ?, streak = ?, best_streak = ?, updated_at = ? WHERE id = ?",
        [JSON.stringify(newDates), newStreak, newBest, updated_at, id],
      );

      const updatedHabit = {
        ...habit,
        dates_completed: JSON.stringify(newDates),
        streak: newStreak,
        best_streak: newBest,
        updated_at,
      };
      set({
        habits: get().habits.map((h) => (h.id === id ? updatedHabit : h)),
      });
      try {
        const { syncHabitsWidgetData } = require('@/lib/widgetSync');
        syncHabitsWidgetData(get().habits);
      } catch (_) {}

      pushToCloud("habits", updatedHabit);

      if (isCheckingIn) {
        hapticSuccess();
        const userId = getUserId();
        await addXP(userId, XP_VALUES.HABIT_CHECKED_IN, "Habit checked in");
        // Track analytics event
        try { trackHabit.completed(habit.id, habit.title || "", newStreak); } catch (_) {}
        if (newStreak === 7)
          await addXP(
            userId,
            XP_VALUES.HABIT_STREAK_7_DAYS,
            "7-day habit streak",
          );
        if (newStreak === 14)
          await addXP(
            userId,
            XP_VALUES.HABIT_STREAK_14_DAYS,
            "14-day habit streak",
          );
        if (newStreak === 30)
          await addXP(
            userId,
            XP_VALUES.HABIT_STREAK_30_DAYS,
            "30-day habit streak",
          );
      }
    } catch (e) {
      console.error("[Store] toggleHabit failed:", e);
    }
  },

  updateHabit: async (id, updates) => {
    try {
      const habit = get().habits.find((h) => h.id === id);
      if (!habit) return;

      const updated_at = new Date().toISOString();
      await db.updateHabit(id, { ...updates, updated_at });

      const updatedHabit = { ...habit, ...updates, updated_at };
      set({
        habits: get().habits.map((h) => (h.id === id ? updatedHabit : h)),
      });
      try {
        const { syncHabitsWidgetData } = require('@/lib/widgetSync');
        syncHabitsWidgetData(get().habits);
      } catch (_) {}
      await pushToCloud("habits", updatedHabit);
    } catch (e) {
      console.error("[Store] updateHabit error:", e);
    }
  },

  deleteHabit: async (id) => {
    try {
      const now = new Date().toISOString();
      const habit = get().habits.find((h) => h.id === id);
      await db.deleteHabit(id);
      set({ habits: get().habits.filter((h) => h.id !== id) });
      try {
        const { syncHabitsWidgetData } = require('@/lib/widgetSync');
        syncHabitsWidgetData(get().habits.filter((h) => h.id !== id));
      } catch (_) {}
      // Soft delete in cloud — pass full object so pushToCloud has all required fields
      const habitPayload = habit
        ? { ...habit, deleted_at: now, updated_at: now }
        : { id, deleted_at: now, updated_at: now };
      await pushToCloud("habits", habitPayload);
      try { trackHabit.deleted(id, habit?.title || ""); } catch (_) {}
    } catch (e) {
      console.error("[Store] deleteHabit error:", e);
    }
  },

  loadNotes: async () => {
    const userId = getUserId();
    const notes = await db.getNotes(userId);
    set({ notes: notes || [] });
    try {
      const { syncNotesWidgetData } = require('@/lib/widgetSync');
      syncNotesWidgetData(notes || []);
    } catch (_) {}
  },

  addNote: async (noteData) => {
    const userId = getUserId();
    const newNote = await db.addNote({ ...noteData, user_id: userId });
    if (newNote) {
      set({ notes: [newNote, ...get().notes] });
      pushToCloud("notes", newNote);
      await addXP(userId, XP_VALUES.NOTE_CREATED, "Note created");
      // Track analytics event
      try {
        const tags = Array.isArray(newNote.tags)
          ? newNote.tags
          : (typeof newNote.tags === "string" ? JSON.parse(newNote.tags || "[]") : []);
        trackNote.created(newNote.id, newNote.title || "", tags);
      } catch (_) {}
    }
  },

  updateNote: async (id, updates) => {
    await db.updateNote(id, updates);
    const updatedNotes = get().notes.map((n) =>
      n.id === id ? { ...n, ...updates } : n,
    );
    set({ notes: updatedNotes });
    const note = updatedNotes.find((n) => n.id === id);
    if (note) {
      pushToCloud("notes", note);
      // Track analytics event
      try { trackNote.updated(note.id, note.title || "", updates); } catch (_) {}
    }
  },

  deleteNote: async (id) => {
    const now = new Date().toISOString();
    const note = get().notes.find((n) => n.id === id);
    await db.deleteNote(id);
    set({ notes: get().notes.filter((n) => n.id !== id) });
    // Soft delete in cloud — pass full object so pushToCloud has all required fields
    if (note) {
      pushToCloud("notes", { ...note, deleted_at: now, updated_at: now });
    } else {
      pushToCloud("notes", { id, deleted_at: now, updated_at: now });
    }
  },

  loadFocusSessions: async () => {
    const userId = getUserId();
    const sessions = await db.getFocusSessions(userId);
    set({ focusSessions: sessions || [] });
    try {
      const { syncFocusWidgetData } = require('@/lib/widgetSync');
      syncFocusWidgetData();
    } catch (_) {}
  },

  addFocusSession: async (sessionData) => {
    const userId = getUserId();
    const newSession = await db.addFocusSession({
      ...sessionData,
      user_id: userId,
    });
    if (newSession) {
      set({ focusSessions: [newSession, ...get().focusSessions] });
      pushToCloud("focus_sessions", newSession);
      await addXP(
        userId,
        XP_VALUES.FOCUS_SESSION_COMPLETED,
        "Focus session completed",
      );
      // Track analytics event
      try {
        trackFocus.ended(
          newSession.id,
          newSession.duration_minutes || 0,
          true,
          newSession.mode || "Focus",
        );
      } catch (_) {}
      if ((sessionData.duration_minutes || 0) >= 45) {
        await addXP(
          userId,
          XP_VALUES.FOCUS_SESSION_45_MIN,
          "45+ min focus session",
        );
      }
      db.updateConnectProfileStats(userId);
    }
  },

  loadDayNotes: async () => {
    try {
      const userId = getUserId();
      const rows = db.db.getAllSync<{ date: string; note_text: string }>(
        "SELECT date, note_text FROM day_notes WHERE user_id = ?",
        [userId],
      );
      const dayNotes: Record<string, string> = {};
      rows.forEach((r) => {
        dayNotes[r.date] = r.note_text;
      });
      set({ dayNotes });
    } catch (e) {
      console.warn("[Store] loadDayNotes failed:", e);
    }
  },

  saveDayNote: async (date, text) => {
    try {
      const userId = getUserId();
      const now = new Date().toISOString();
      const id = date;
      db.db.runSync(
        `INSERT OR REPLACE INTO day_notes (id, user_id, date, note_text, created_at, updated_at) VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM day_notes WHERE date = ? AND user_id = ?), ?), ?)`,
        [id, userId, date, text, date, userId, now, now],
      );
      set({ dayNotes: { ...get().dayNotes, [date]: text } });
      pushToCloud("day_notes", { id, date, note_text: text, updated_at: now });
    } catch (e) {}
  },

  importData: async (data: any) => {
    const userId = getUserId();
    if (!data || !data.version) throw new Error("Invalid backup file format");

    set({ isSyncing: true, syncError: false });
    try {
      const { tasks, habits, notes, settings, focusSessions } = data;

      if (tasks) {
        for (const t of tasks) await db.addTask({ ...t, user_id: userId });
      }
      if (habits) {
        for (const h of habits) await db.addHabit({ ...h, user_id: userId });
      }
      if (notes) {
        for (const n of notes) await db.addNote({ ...n, user_id: userId });
      }
      if (focusSessions) {
        for (const s of focusSessions)
          await db.addFocusSession({ ...s, user_id: userId });
      }
      if (settings) {
        db.saveUserSettings(userId, settings);
      }

      await get().syncFromCloud(); // Trigger bidirectional sync to push imported data to cloud
      set({ isSyncing: false });
    } catch (e) {
      set({ isSyncing: false, syncError: true });
      throw e;
    }
  },

  syncFromCloud: async (explicitSession?: any) => {
    const authState = useAuthStore.getState();
    if (authState.isGuest) {
      return {
        success: false,
        skipped: true,
        reason: "You are currently in guest mode. Sign in to synchronize your data with the cloud.",
      };
    }

    // Use the cached local session first to avoid a blocking network call
    let user = explicitSession?.user || authState.session?.user;

    if (!user) {
      // Last-resort: fetch from Supabase (slower, may fail offline)
      try {
        const { data } = await neonAuth.getSession();
        user = data?.user ?? null;
      } catch (e) {
        console.warn("[Sync] Could not get session:", e);
      }
    }

    if (!user) {
      console.log("[Sync] No authenticated user — skipping sync.");
      return {
        success: false,
        skipped: true,
        reason: "You are currently in guest mode. Sign in to synchronize your data with the cloud.",
      };
    }
    const userId = user.id;

    try {
      // Start sync — do NOT clear syncPartial here; it persists until a full success.
      // syncStatus drives the badge; keep 'partial' visible if previous run was partial.
      set({ isSyncing: true, syncStatus: 'syncing', syncError: false });

      // --- LOCAL DATA REPAIR ---
      try {
        db.db.runSync(
          "UPDATE tasks SET deleted_at = NULL WHERE deleted_at = '[]' OR deleted_at = '{}' OR deleted_at = 'null' OR deleted_at = ''",
        );
        db.db.runSync(
          "UPDATE notes SET deleted_at = NULL WHERE deleted_at = '[]' OR deleted_at = '{}' OR deleted_at = 'null' OR deleted_at = ''",
        );
        db.db.runSync(
          "UPDATE habits SET deleted_at = NULL WHERE deleted_at = '[]' OR deleted_at = '{}' OR deleted_at = 'null' OR deleted_at = ''",
        );
      } catch (e) {
        console.warn("[Sync] Local repair failed:", e);
      }

      // --- 0. MIGRATE GUEST DATA FIRST ---
      // If the user previously used the app as a guest, their SQLite records
      // are stored under user_id='guest'. We must rename them to the real
      // userId BEFORE reading local data, so the push step finds them.
      try {
        const guestTaskCount = db.getTasks("guest").length;
        const guestNotesCount = db.getNotes("guest").length;

        if (guestTaskCount > 0 || guestNotesCount > 0) {
          console.log(
            `[Sync] Migrating guest tasks (${guestTaskCount}) & notes (${guestNotesCount}) to user ${userId}`,
          );
          db.migrateGuestData("guest", userId);
        }
      } catch (e) {
        console.warn("[Sync] Guest data migration check failed:", e);
      }

      // --- DIAGNOSTIC LOGGING ---
      const localTaskCountForDiag = db.getTasks(userId).length;
      const guestTaskCountForDiag = db.getTasks("guest").length;
      console.log(
        `[Sync] Local tasks under userId (${userId}): ${localTaskCountForDiag}`,
      );
      console.log(
        `[Sync] Local tasks still under 'guest': ${guestTaskCountForDiag}`,
      );

      const [
        tasksData,
        habitsData,
        notesData,
        focusSessionsData,
        dayNotesData,
        subTasksData,
        settingsData,
      ] = await Promise.all([
        neonData.from("tasks").select("*").eq("user_id", userId),
        neonData.from("habits").select("*").eq("user_id", userId),
        neonData.from("notes").select("*").eq("user_id", userId),
        neonData.from("focus_sessions").select("*").eq("user_id", userId),
        neonData.from("day_notes").select("*").eq("user_id", userId),
        neonData.from("sub_tasks").select("*").eq("user_id", userId).then((r: any) => r, () => ({ data: [], error: null })),
        neonData
          .from("user_settings")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      console.log(`[Sync] Remote tasks count: ${tasksData.data?.length ?? 0}`);
      console.log(
        `[Sync] Remote habits count: ${habitsData.data?.length ?? 0}`,
      );

      const fetchErrors: string[] = [];
      if (tasksData.error) fetchErrors.push(`tasks: ${tasksData.error.message || 'fetch failed'}`);
      if (habitsData.error) fetchErrors.push(`habits: ${habitsData.error.message || 'fetch failed'}`);
      if (notesData.error) fetchErrors.push(`notes: ${notesData.error.message || 'fetch failed'}`);
      if (focusSessionsData.error) fetchErrors.push(`focus_sessions: ${focusSessionsData.error.message || 'fetch failed'}`);
      if (dayNotesData.error) fetchErrors.push(`day_notes: ${dayNotesData.error.message || 'fetch failed'}`);
      if (settingsData?.error) fetchErrors.push(`user_settings: ${settingsData.error.message || 'fetch failed'}`);

      if (fetchErrors.length > 0) {
        console.error("[Sync] Critical query errors:", fetchErrors);
        // 'failed' — required cloud queries did not return data; lastSyncedAt preserved.
        set({ isSyncing: false, syncStatus: 'failed', syncError: true, syncPartial: false });
        return {
          success: false,
          error: `Failed to retrieve cloud data: ${fetchErrors.join('; ')}`,
        };
      }

      const partialFailures: string[] = [];
      const counts = { tasks: 0, habits: 0, notes: 0, focus: 0 };

      // --- 1. BIDIRECTIONAL SYNC: PUSH LOCAL TO REMOTE ---
      // Push unsynced or newer local tasks to the cloud (batched for high performance)
      try {
        const localTasks = db.getTasks(userId);
        const tasksToPush = localTasks.filter((local) => {
          const remote = tasksData.data?.find((t) => t.id === local.id);
          return (
            !remote ||
            (local.updated_at &&
              remote.updated_at &&
              new Date(local.updated_at) > new Date(remote.updated_at))
          );
        });
        if (tasksToPush.length > 0) {
          console.log(`[Sync] Batch pushing ${tasksToPush.length} local tasks to cloud...`);
          const ok = await pushBatchToCloud("tasks", tasksToPush);
          if (!ok) partialFailures.push("tasks");
          else counts.tasks += tasksToPush.length;
        }
      } catch (e) {
        console.warn("[Sync] Push local tasks failed:", e);
        partialFailures.push("tasks");
      }

      // Push unsynced or newer local sub_tasks to the cloud (batched)
      try {
        const localSubTasks = db.db.getAllSync<any>(
          "SELECT * FROM sub_tasks WHERE user_id = ? AND deleted_at IS NULL",
          [userId]
        );
        const subTasksToPush = localSubTasks.filter((local) => {
          const remote = subTasksData?.data?.find((st: any) => st.id === local.id);
          return (
            !remote ||
            (local.updated_at &&
              remote.updated_at &&
              new Date(local.updated_at) > new Date(remote.updated_at))
          );
        });
        if (subTasksToPush.length > 0) {
          console.log(`[Sync] Batch pushing ${subTasksToPush.length} sub_tasks to cloud...`);
          await pushBatchToCloud("sub_tasks", subTasksToPush);
        }
      } catch (e) {
        console.warn("[Sync] Push local sub_tasks failed:", e);
      }

      // Push unsynced or newer local habits to the cloud (batched)
      try {
        const localHabits = await db.getHabits(userId);
        const habitsToPush = localHabits.filter((local) => {
          const remote = habitsData.data?.find((h) => h.id === local.id);
          return (
            !remote ||
            (local.updated_at &&
              remote.updated_at &&
              new Date(local.updated_at) > new Date(remote.updated_at))
          );
        });
        if (habitsToPush.length > 0) {
          console.log(`[Sync] Batch pushing ${habitsToPush.length} local habits to cloud...`);
          const ok = await pushBatchToCloud("habits", habitsToPush);
          if (!ok) partialFailures.push("habits");
          else counts.habits += habitsToPush.length;
        }
      } catch (e) {
        console.warn("[Sync] Push local habits failed:", e);
        partialFailures.push("habits");
      }

      // Push unsynced or newer local notes to the cloud
      try {
        const localNotes = await db.getNotes(userId);
        const { syncAudioToCloud } = await import('@/lib/audioStorage');
        const notesWithAudioChanged = new Set<string>();

        for (const local of localNotes) {
          let noteAudioUris: string[] = [];
          try {
            const rawAudioUris = (local as any).audio_uris;
            if (Array.isArray(rawAudioUris)) {
              noteAudioUris = rawAudioUris;
            } else if (typeof rawAudioUris === 'string' && rawAudioUris.startsWith('[')) {
              noteAudioUris = JSON.parse(rawAudioUris);
            }
          } catch (_) {}

          if (noteAudioUris.length > 0) {
            let hasAudioChange = false;
            const syncedUris = await Promise.all(
              noteAudioUris.map(async (uri) => {
                if (uri && (uri.startsWith('gw_audio_') || uri.startsWith('file://'))) {
                  try {
                    const cloudUrl = await syncAudioToCloud(uri, userId);
                    if (cloudUrl && cloudUrl !== uri) {
                      hasAudioChange = true;
                      return cloudUrl;
                    }
                  } catch (e) {
                    console.warn('[Sync] Audio cloud upload deferred:', e);
                    partialFailures.push('notes_audio');
                  }
                }
                return uri;
              })
            );

            if (hasAudioChange) {
              local.audio_uris = syncedUris;
              if (local.media_type === 'audio') {
                local.media_uri = syncedUris[0] || local.media_uri;
              }
              db.updateNote(local.id, {
                audio_uris: syncedUris,
                media_uri: local.media_uri,
              });
              notesWithAudioChanged.add(local.id);
            }
          }
        }

        const notesToPush = localNotes.filter((local) => {
          const remote = notesData.data?.find((n) => n.id === local.id);
          return (
            notesWithAudioChanged.has(local.id) ||
            !remote ||
            (local.updated_at &&
              remote.updated_at &&
              new Date(local.updated_at) > new Date(remote.updated_at))
          );
        });

        if (notesToPush.length > 0) {
          console.log(`[Sync] Batch pushing ${notesToPush.length} notes to cloud...`);
          const ok = await pushBatchToCloud("notes", notesToPush);
          if (!ok) partialFailures.push("notes");
          else counts.notes += notesToPush.length;
        }
      } catch (e) {
        console.warn("[Sync] Push local notes failed:", e);
        partialFailures.push("notes");
      }

      // Push unsynced local focus sessions to the cloud (batched)
      try {
        const localFocusSessions = await db.getFocusSessions(userId);
        const focusToPush = localFocusSessions.filter((local) => {
          const remote = focusSessionsData.data?.find((f) => f.id === local.id);
          return !remote;
        });
        if (focusToPush.length > 0) {
          console.log(`[Sync] Batch pushing ${focusToPush.length} focus sessions to cloud...`);
          const ok = await pushBatchToCloud("focus_sessions", focusToPush);
          if (!ok) partialFailures.push("focus_sessions");
          else counts.focus += focusToPush.length;
        }
      } catch (e) {
        console.warn("[Sync] Push local focus sessions failed:", e);
        partialFailures.push("focus_sessions");
      }

      // Push unsynced or newer local day notes to the cloud (batched)
      try {
        const rows = db.db.getAllSync<{
          id: string;
          date: string;
          note_text: string;
          created_at: string;
          updated_at: string;
        }>(
          "SELECT id, date, note_text, created_at, updated_at FROM day_notes WHERE user_id = ?",
          [userId],
        );
        const dayNotesToPush = rows.filter((local) => {
          const remote = dayNotesData.data?.find(
            (d) => d.id === local.id || d.date === local.date,
          );
          return (
            !remote ||
            (local.updated_at &&
              remote.updated_at &&
              new Date(local.updated_at) > new Date(remote.updated_at))
          );
        });
        if (dayNotesToPush.length > 0) {
          console.log(`[Sync] Batch pushing ${dayNotesToPush.length} day notes to cloud...`);
          const ok = await pushBatchToCloud("day_notes", dayNotesToPush);
          if (!ok) partialFailures.push("day_notes");
        }
      } catch (e) {
        console.warn("[Sync] Push local day notes failed:", e);
        partialFailures.push("day_notes");
      }

      // Push local settings to cloud if local is newer
      try {
        const localSettings = db.getUserSettings(userId);
        if (
          localSettings &&
          ((settingsData && !settingsData.data) ||
            new Date(localSettings.updated_at || 0) >
              new Date(settingsData.data.updated_at))
        ) {
          console.log(
            "[Sync] Pushing local settings (themes/accents) to cloud...",
          );
          const ok = await pushToCloud("user_settings", localSettings);
          if (!ok) partialFailures.push("user_settings");
        }
      } catch (e) {
        console.warn("[Sync] Push local settings failed:", e);
        partialFailures.push("user_settings");
      }

      // --- 2. BIDIRECTIONAL SYNC: HYDRATE LOCAL FROM REMOTE ---
      // Pre-index existing local rows into memory Maps for lightning-fast O(1) checks (eliminates 200+ sequential SQL queries)
      const localTasksRows = db.db.getAllSync<any>("SELECT * FROM tasks WHERE user_id = ? OR user_id = 'guest'", [userId]);
      const localTasksMap = new Map<string, any>(localTasksRows.map((t) => [t.id, t]));

      if (tasksData.data) {
        for (const remote of tasksData.data) {
          const local = localTasksMap.get(remote.id);
          const remoteDeletedAt =
            remote.deleted_at === "[]" ||
            remote.deleted_at === "{}" ||
            remote.deleted_at === "null" ||
            remote.deleted_at === ""
              ? null
              : remote.deleted_at;
          if (remoteDeletedAt) {
            // Deleted remotely: propagate deletion to local SQLite
            if (!local || !local.deleted_at) {
              db.db.runSync(
                "UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?",
                [
                  remoteDeletedAt,
                  remote.updated_at || remoteDeletedAt,
                  remote.id,
                ],
              );
            }
          } else {
            // Active remotely
            if (!local) {
              await db.addTask({ ...remote, user_id: userId });
            } else if (local.deleted_at) {
              // Deleted locally but active remotely: push local deletion to cloud
              const ok = await pushToCloud("tasks", {
                ...local,
                completed: Boolean(local.completed),
              });
              if (!ok) partialFailures.push("tasks_delete_resolution");
            } else if (
              new Date(remote.updated_at as string) >
              new Date(local.updated_at as string)
            ) {
              await db.addTask({ ...remote, user_id: userId });
            }
          }
        }
      }

      const localSubTasksRows = db.db.getAllSync<any>("SELECT * FROM sub_tasks WHERE user_id = ?", [userId]);
      const localSubTasksMap = new Map<string, any>(localSubTasksRows.map((st) => [st.id, st]));

      if (subTasksData?.data && Array.isArray(subTasksData.data)) {
        for (const remote of subTasksData.data) {
          const local = localSubTasksMap.get(remote.id);
          const remoteDeletedAt =
            remote.deleted_at === "[]" ||
            remote.deleted_at === "{}" ||
            remote.deleted_at === "null" ||
            remote.deleted_at === ""
              ? null
              : remote.deleted_at;
          if (remoteDeletedAt) {
            if (!local || !local.deleted_at) {
              db.db.runSync(
                "UPDATE sub_tasks SET deleted_at = ?, updated_at = ? WHERE id = ?",
                [remoteDeletedAt, remote.updated_at || remoteDeletedAt, remote.id],
              );
            }
          } else {
            if (!local) {
              db.db.runSync(
                "INSERT INTO sub_tasks (id, task_id, user_id, title, completed, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  remote.id,
                  remote.task_id,
                  userId,
                  remote.title || "",
                  remote.completed ? 1 : 0,
                  remote.order_index || 0,
                  remote.created_at || new Date().toISOString(),
                  remote.updated_at || new Date().toISOString(),
                ],
              );
            } else if (local.deleted_at) {
              const ok = await pushToCloud("sub_tasks", {
                ...local,
                completed: Boolean(local.completed),
              });
              if (!ok) partialFailures.push("sub_tasks_delete_resolution");
            } else if (
              new Date(remote.updated_at as string) >
              new Date(local.updated_at as string)
            ) {
              db.db.runSync(
                "UPDATE sub_tasks SET title = ?, completed = ?, order_index = ?, updated_at = ?, deleted_at = NULL WHERE id = ?",
                [
                  remote.title || "",
                  remote.completed ? 1 : 0,
                  remote.order_index || 0,
                  remote.updated_at || new Date().toISOString(),
                  remote.id,
                ],
              );
            }
          }
        }
      }

      const localHabitsRows = db.db.getAllSync<any>("SELECT * FROM habits WHERE user_id = ? OR user_id = 'guest'", [userId]);
      const localHabitsMap = new Map<string, any>(localHabitsRows.map((h) => [h.id, h]));

      if (habitsData.data) {
        for (const remote of habitsData.data) {
          const local = localHabitsMap.get(remote.id);
          const remoteDeletedAt =
            remote.deleted_at === "[]" ||
            remote.deleted_at === "{}" ||
            remote.deleted_at === "null" ||
            remote.deleted_at === ""
              ? null
              : remote.deleted_at;
          if (remoteDeletedAt) {
            // Deleted remotely: propagate deletion to local SQLite
            if (!local || !local.deleted_at) {
              db.db.runSync(
                "UPDATE habits SET deleted_at = ?, updated_at = ? WHERE id = ?",
                [
                  remoteDeletedAt,
                  remote.updated_at || remoteDeletedAt,
                  remote.id,
                ],
              );
            }
          } else {
            // Active remotely
            if (!local) {
              await db.addHabit({ ...remote, user_id: userId });
            } else if (local.deleted_at) {
              // Deleted locally but active remotely: push local deletion to cloud
              const ok = await pushToCloud("habits", {
                ...local,
                is_paused: Boolean(local.is_paused),
              });
              if (!ok) partialFailures.push("habits_delete_resolution");
            } else if (
              new Date(remote.updated_at as string) >
              new Date(local.updated_at as string)
            ) {
              await db.addHabit({ ...remote, user_id: userId });
            }
          }
        }
      }

      const localNotesRows = db.db.getAllSync<any>("SELECT * FROM notes WHERE user_id = ?", [userId]);
      const localNotesMap = new Map<string, any>(localNotesRows.map((n) => [n.id, n]));

      if (notesData.data) {
        for (const remote of notesData.data) {
          const local = localNotesMap.get(remote.id);
          const remoteDeletedAt =
            remote.deleted_at === "[]" ||
            remote.deleted_at === "{}" ||
            remote.deleted_at === "null" ||
            remote.deleted_at === ""
              ? null
              : remote.deleted_at;
          if (remoteDeletedAt) {
            // Deleted remotely: propagate deletion to local SQLite
            if (!local || !local.deleted_at) {
              db.db.runSync(
                "UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?",
                [
                  remoteDeletedAt,
                  remote.updated_at || remoteDeletedAt,
                  remote.id,
                ],
              );
            }
          } else {
            // Active remotely
            if (!local) {
              await db.addNote({ ...remote, user_id: userId });
            } else if (local.deleted_at) {
              // Deleted locally but active remotely: push local deletion to cloud
              const ok = await pushToCloud("notes", {
                ...local,
                is_locked: Boolean(local.is_locked),
                is_pinned: Boolean(local.is_pinned),
              });
              if (!ok) partialFailures.push("notes_delete_resolution");
            } else if (
              new Date(remote.updated_at as string) >
              new Date(local.updated_at as string)
            ) {
              await db.addNote({ ...remote, user_id: userId });
            }
          }
        }
      }

      // Hydrate settings safely
      if (settingsData.data) {
        const localSettings = db.getUserSettings(userId);
        if (
          !localSettings ||
          (settingsData.data.updated_at &&
            new Date(settingsData.data.updated_at) >
              new Date(localSettings.updated_at || 0))
        ) {
          // Normalize snake_case before saving locally
          db.saveUserSettings(userId, {
            theme: settingsData.data.theme || localSettings?.theme || 'light',
            accentColor: settingsData.data.accent_color || localSettings?.accentColor || '#007AFF',
            premiumThemeId: settingsData.data.premium_theme_id || localSettings?.premiumThemeId || 'default',
            notificationsEnabled: Boolean(settingsData.data.notifications_enabled),
            tasksLayout: settingsData.data.tasks_layout || 'list',
            habitsLayout: settingsData.data.habits_layout || 'grid',
            notesLayout: settingsData.data.notes_layout || 'grid',
            isUpdateBannerDismissed: Boolean(settingsData.data.is_update_banner_dismissed),
            defaultFocusDuration: settingsData.data.default_focus_duration || 25,
            dailyGoal: settingsData.data.daily_goal || 5,
            focusTimerActive: Boolean(settingsData.data.focus_timer_active),
            focusTimerTimeLeft: settingsData.data.focus_timer_time_left || 1500,
            focusTimerMode: settingsData.data.focus_timer_mode || 'Study',
            focusTimerDurationMinutes: settingsData.data.focus_timer_duration_minutes || 25,
            focusTimerSelectedTaskId: settingsData.data.focus_timer_selected_task_id || null,
            focusTimerStartTime: settingsData.data.focus_timer_start_time || null,
            defaultTaskPriority: settingsData.data.default_task_priority || 'Medium',
            defaultReminderTime: settingsData.data.default_reminder_time ?? 10,
            weekStartDay: settingsData.data.week_start_day || 'Monday',
            autoSortTasks: Boolean(settingsData.data.auto_sort_tasks),
            pomodoroFocusDuration: settingsData.data.pomodoro_focus_duration ?? 25,
            pomodoroBreakDuration: settingsData.data.pomodoro_break_duration ?? 5,
            pomodoroLongBreakDuration: settingsData.data.pomodoro_long_break_duration ?? 15,
            pomodoroAutoStartBreaks: Boolean(settingsData.data.pomodoro_auto_start_breaks),
            smartSuggestionsEnabled: Boolean(settingsData.data.smart_suggestions_enabled),
            offlineMode: Boolean(settingsData.data.offline_mode),
            faceIdEnabled: Boolean(settingsData.data.face_id_enabled),
            appPin: settingsData.data.app_pin || null,
            autoLockTimeout: settingsData.data.auto_lock_timeout || 0,
            updated_at: settingsData.data.updated_at,
          });
        }
      }

      // Sync focus sessions
      const localFocusRows = db.db.getAllSync<any>("SELECT * FROM focus_sessions WHERE user_id = ?", [userId]);
      const localFocusMap = new Map<string, any>(localFocusRows.map((f) => [f.id, f]));

      if (focusSessionsData.data) {
        for (const remote of focusSessionsData.data) {
          const local = localFocusMap.get(remote.id);
          if (!local) {
            db.db.runSync(
              "INSERT OR IGNORE INTO focus_sessions (id, user_id, duration_minutes, started_at, completed_at, task_id, mode, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [
                remote.id,
                userId,
                remote.duration_minutes || 0,
                remote.started_at ||
                  remote.created_at ||
                  new Date().toISOString(),
                remote.completed_at || null,
                remote.task_id || null,
                remote.mode || "Focus",
                remote.date ||
                  (remote.created_at
                    ? remote.created_at.split("T")[0]
                    : new Date().toISOString().split("T")[0]),
                remote.created_at || new Date().toISOString(),
                remote.updated_at || null,
              ],
            );
          }
        }
      }

      // Hydrate day notes from cloud
      const localDayNotesRows = db.db.getAllSync<any>("SELECT * FROM day_notes WHERE user_id = ?", [userId]);
      const localDayNotesMap = new Map<string, any>(localDayNotesRows.map((d) => [d.id || d.date, d]));

      if (dayNotesData.data) {
        for (const remote of dayNotesData.data) {
          const local = localDayNotesMap.get(remote.id) || localDayNotesMap.get(remote.date);
          if (
            !local ||
            (remote.updated_at &&
              new Date(remote.updated_at) > new Date(local.updated_at))
          ) {
            db.db.runSync(
              "INSERT OR REPLACE INTO day_notes (id, user_id, date, note_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
              [
                remote.id,
                userId,
                remote.date,
                remote.note_text,
                remote.created_at,
                remote.updated_at,
              ],
            );
          }
        }
      }

      // Sync achievements
      try {
        const { data: achievementsData } = await (neonData as any)
          .from("connect_achievements")
          .select("*")
          .eq("user_id", userId);

        if (achievementsData) {
          for (const remote of achievementsData) {
            const local = db.db.getFirstSync<any>(
              "SELECT * FROM connect_achievements WHERE achievement_key = ? AND user_id = ?",
              [remote.achievement_key, userId],
            );
            if (!local) {
              db.db.runSync(
                "INSERT INTO connect_achievements (id, user_id, achievement_key, unlocked_at, progress) VALUES (?, ?, ?, ?, ?)",
                [
                  remote.id,
                  userId,
                  remote.achievement_key,
                  remote.unlocked_at,
                  remote.progress,
                ],
              );
            }
          }
        }
      } catch (e) {
        console.warn("[Sync] Achievements sync failed:", e);
      }

      // Reload all into memory
      await Promise.all([
        get().loadAllTasks(),
        get().loadHabits(),
        get().loadNotes(),
        get().loadFocusSessions(),
        get().loadDayNotes(),
      ]);

      // Refresh Android home screen widgets (tasks, habits, focus, notes) with freshly loaded data
      try {
        const { syncAllWidgets } = require('@/lib/widgetSync');
        syncAllWidgets();
      } catch (_) {}

      // Sync settings separately via authoritative SettingsStore
      try {
        const { useSettingsStore } = require("./useSettingsStore");
        await useSettingsStore.getState().loadSettings();
      } catch (_) {}

      // Only treat core entity upload failures (tasks, habits, notes) as blocking full sync status.
      // Non-blocking background uploads (e.g. deferred local audio clips) do not prevent 'synced' state.
      const criticalFailures = Array.from(new Set(partialFailures)).filter(
        (f) => !['notes_audio', 'tasks_delete_resolution', 'sub_tasks_delete_resolution', 'habits_delete_resolution', 'notes_delete_resolution'].includes(f)
      );

      if (criticalFailures.length > 0) {
        set({
          isSyncing: false,
          syncStatus: 'partial',
          syncError: false,
          syncPartial: true,
          syncPartialFailures: criticalFailures,
        });
        db.updateConnectProfileStats(userId);
        console.warn("[Sync] Partial sync completed with critical upload failures:", criticalFailures);
        return {
          success: false,
          partial: true,
          partialFailures: criticalFailures,
          counts,
        };
      }

      // Full success — core required tables (tasks, habits, notes, focus, settings) synced!
      set({
        lastSyncedAt: new Date().toISOString(),
        isSyncing: false,
        syncStatus: 'synced',
        syncError: false,
        syncPartial: false,
        syncPartialFailures: [],
      });
      db.updateConnectProfileStats(userId);

      // Refresh and sync account rewards cross-device
      try {
        const { initializeAccountRewards } = require("@/lib/rewardsService");
        await initializeAccountRewards(userId);
      } catch (rwErr) {
        console.warn("[Sync] Account rewards sync failed:", rwErr);
      }

      console.log("[Sync] Bidirectional synchronization complete.");
      return {
        success: true,
        counts,
      };
    } catch (e: any) {
      console.error("[Sync] Failed:", e);
      // 'failed' — unexpected exception; lastSyncedAt preserved.
      set({ isSyncing: false, syncStatus: 'failed', syncError: true, syncPartial: false });
      // Do NOT show an Alert — offline usage should be silent and seamless.
      // The syncError flag and syncStatus are available in state for any UI indicator.
      return {
        success: false,
        error: e?.message || "Synchronization failed due to a network or server error.",
      };
    }
  },
}));

let syncInterval: any = null;
let reconcileInterval: any = null;
let appStateSub: any = null;
let onlineUnsub: null | (() => void) = null;

export const startSyncManager = () => {
  const handleSync = () => useStore.getState().syncFromCloud();
  appStateSub = RNAppState.addEventListener(
    "change",
    (s) => s === "active" && handleSync(),
  );
  syncInterval = setInterval(handleSync, 10 * 60 * 1000);

  // Periodic reconciliation: verify XP ledger + daily aggregates every 6 hours
  reconcileInterval = setInterval(() => {
    try {
      const { session, isGuest } = useAuthStore.getState();
      const userId = session?.user?.id;
      if (userId && !isGuest) {
        const { runReconciliation } = require("@/lib/analytics/AnalyticsEngine");
        const result = runReconciliation(userId);
        if (result.fixed > 0) {
          console.log(`[Reconciliation] Fixed ${result.fixed} data integrity issue(s).`);
        }
      }
    } catch (e) {
      console.warn("[Reconciliation] Failed:", e);
    }
  }, 6 * 60 * 60 * 1000);

  // Web: sync as soon as connectivity is restored (important for PWA offline-first).
  if (
    typeof window !== "undefined" &&
    typeof window.addEventListener === "function"
  ) {
    const onOnline = () => handleSync();
    window.addEventListener("online", onOnline);
    onlineUnsub = () => window.removeEventListener("online", onOnline);
  }

  handleSync();
};

export const stopSyncManager = () => {
  if (syncInterval) clearInterval(syncInterval);
  if (reconcileInterval) clearInterval(reconcileInterval);
  if (appStateSub) appStateSub.remove();
  if (onlineUnsub) onlineUnsub();
  onlineUnsub = null;
};
