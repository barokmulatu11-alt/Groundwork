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
  addTask: (task: Partial<Task>) => Promise<GateResult>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string, currentStatus: boolean) => Promise<void>;

  loadHabits: () => Promise<void>;
  addHabit: (habit: Partial<Habit>) => Promise<GateResult>;
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
        notifications_enabled: data.notificationsEnabled ? 1 : 0,
        tasks_layout: data.tasksLayout || "list",
        habits_layout: data.habitsLayout || "grid",
        notes_layout: data.notesLayout || "grid",
        is_update_banner_dismissed: data.isUpdateBannerDismissed ? 1 : 0,
        default_focus_duration: data.defaultFocusDuration || 25,
        daily_goal: data.dailyGoal || 5,
        focus_timer_active: data.focusTimerActive ? 1 : 0,
        focus_timer_time_left: data.focusTimerTimeLeft || 1500,
        focus_timer_mode: data.focusTimerMode || "Study",
        focus_timer_duration_minutes: data.focusTimerDurationMinutes || 25,
        focus_timer_selected_task_id: data.focusTimerSelectedTaskId || null,
        focus_timer_start_time: data.focusTimerStartTime || null,
        default_task_priority: data.defaultTaskPriority || "Medium",
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

const getUserId = () => {
  const { session, isGuest } = useAuthStore.getState();
  if (session?.user?.id) return session.user.id;
  if (isGuest) return "guest";
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
  },

  addTask: async (taskData) => {
    const gate = canAddTask();
    if (!gate.allowed) return gate;

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
      db.updateConnectProfileStats(userId);
      // Track analytics event
      try { trackTask.created(newTask.id, newTask.title || "", newTask.priority); } catch (_) {}
    }
    return { allowed: true };
  },

  updateTask: async (id, updates) => {
    await db.updateTask(id, updates);
    const updatedTasks = get().tasks.map((t) =>
      t.id === id ? { ...t, ...updates } : t,
    );
    set({ tasks: updatedTasks });
    const task = updatedTasks.find((t) => t.id === id);
    if (task) {
      pushToCloud("tasks", task);
      db.updateConnectProfileStats(task.user_id || getUserId());
    }
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
  },

  addHabit: async (habitData) => {
    const gate = canAddHabit();
    if (!gate.allowed) return gate;

    const userId = getUserId();
    const newHabit = await db.addHabit({ ...habitData, user_id: userId });
    if (newHabit) {
      set({ habits: [newHabit, ...get().habits] });
      pushToCloud("habits", newHabit);
      // Track analytics event
      try { trackHabit.created(newHabit.id, newHabit.title || "", newHabit.frequency); } catch (_) {}
    }
    return { allowed: true };
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
      pushToCloud("habits", updatedHabit);
    } catch (e) {}
  },

  deleteHabit: async (id) => {
    try {
      const now = new Date().toISOString();
      const habit = get().habits.find((h) => h.id === id);
      db.db.runSync(
        "UPDATE habits SET deleted_at = ?, updated_at = ? WHERE id = ?",
        [now, now, id],
      );
      set({ habits: get().habits.filter((h) => h.id !== id) });
      // Soft delete in cloud — pass full object so pushToCloud has all required fields
      if (habit) {
        pushToCloud("habits", { ...habit, deleted_at: now, updated_at: now });
      } else {
        pushToCloud("habits", { id, deleted_at: now, updated_at: now });
      }
    } catch (e) {}
  },

  loadNotes: async () => {
    const userId = getUserId();
    const notes = await db.getNotes(userId);
    set({ notes: notes || [] });
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
    // Use the cached local session first to avoid a blocking network call
    let user = explicitSession?.user || useAuthStore.getState().session?.user;

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

      // --- LOCAL & SUPABASE CLOUD REPAIR ---
      // Repair any items on local SQLite & Supabase that were accidentally soft-deleted
      // by the corrupted local deleted_at values (like '[]', 'null', or '{}')
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

        await Promise.all([
          neonData
            .from("tasks")
            .update({ deleted_at: null })
            .in("deleted_at", ["[]", "{}", "null", ""])
            .eq("user_id", userId),
          neonData
            .from("notes")
            .update({ deleted_at: null })
            .in("deleted_at", ["[]", "{}", "null", ""])
            .eq("user_id", userId),
          neonData
            .from("habits")
            .update({ deleted_at: null })
            .in("deleted_at", ["[]", "{}", "null", ""])
            .eq("user_id", userId),
        ]);
      } catch (e) {
        console.warn("[Sync] Cloud/Local repair failed:", e);
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
        settingsData,
      ] = await Promise.all([
        neonData.from("tasks").select("*").eq("user_id", userId),
        neonData.from("habits").select("*").eq("user_id", userId),
        neonData.from("notes").select("*").eq("user_id", userId),
        neonData.from("focus_sessions").select("*").eq("user_id", userId),
        neonData.from("day_notes").select("*").eq("user_id", userId),
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
      // Push unsynced or newer local tasks to the cloud
      try {
        const localTasks = db.getTasks(userId);
        console.log(
          `[Sync] Pushing ${localTasks.length} local tasks to cloud...`,
        );
        for (const local of localTasks) {
          const remote = tasksData.data?.find((t) => t.id === local.id);
          if (
            !remote ||
            (local.updated_at &&
              remote.updated_at &&
              new Date(local.updated_at) > new Date(remote.updated_at))
          ) {
            const ok = await pushToCloud("tasks", local);
            if (!ok) partialFailures.push("tasks");
            else counts.tasks++;
          }
        }
      } catch (e) {
        console.warn("[Sync] Push local tasks failed:", e);
        partialFailures.push("tasks");
      }

      // Push unsynced or newer local habits to the cloud
      try {
        const localHabits = await db.getHabits(userId);
        console.log(
          `[Sync] Pushing ${localHabits.length} local habits to cloud...`,
        );
        for (const local of localHabits) {
          const remote = habitsData.data?.find((h) => h.id === local.id);
          if (
            !remote ||
            (local.updated_at &&
              remote.updated_at &&
              new Date(local.updated_at) > new Date(remote.updated_at))
          ) {
            const ok = await pushToCloud("habits", local);
            if (!ok) partialFailures.push("habits");
            else counts.habits++;
          }
        }
      } catch (e) {
        console.warn("[Sync] Push local habits failed:", e);
        partialFailures.push("habits");
      }

      // Push unsynced or newer local notes to the cloud
      try {
        const localNotes = await db.getNotes(userId);
        const { syncAudioToCloud } = await import('@/lib/audioStorage');
        for (const local of localNotes) {
          // Check if any audio URIs need cloud sync
          let noteAudioUris: string[] = [];
          try {
            const rawAudioUris = (local as any).audio_uris;
            if (Array.isArray(rawAudioUris)) {
              noteAudioUris = rawAudioUris;
            } else if (typeof rawAudioUris === 'string' && rawAudioUris.startsWith('[')) {
              noteAudioUris = JSON.parse(rawAudioUris);
            }
          } catch (_) {}

          let hasAudioChange = false;
          if (noteAudioUris.length > 0) {
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
              // Update local note record safely
              db.updateNote(local.id, {
                audio_uris: syncedUris,
                media_uri: local.media_uri,
              });
            }
          }

          const remote = notesData.data?.find((n) => n.id === local.id);
          if (
            hasAudioChange ||
            !remote ||
            (local.updated_at &&
              remote.updated_at &&
              new Date(local.updated_at) > new Date(remote.updated_at))
          ) {
            const ok = await pushToCloud("notes", local);
            if (!ok) partialFailures.push("notes");
            else counts.notes++;
          }
        }
      } catch (e) {
        console.warn("[Sync] Push local notes failed:", e);
        partialFailures.push("notes");
      }

      // Push unsynced local focus sessions to the cloud
      try {
        const localFocusSessions = await db.getFocusSessions(userId);
        for (const local of localFocusSessions) {
          const remote = focusSessionsData.data?.find((f) => f.id === local.id);
          if (!remote) {
            const ok = await pushToCloud("focus_sessions", local);
            if (!ok) partialFailures.push("focus_sessions");
            else counts.focus++;
          }
        }
      } catch (e) {
        console.warn("[Sync] Push local focus sessions failed:", e);
        partialFailures.push("focus_sessions");
      }

      // Push unsynced or newer local day notes to the cloud
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
        for (const local of rows) {
          const remote = dayNotesData.data?.find(
            (d) => d.id === local.id || d.date === local.date,
          );
          if (
            !remote ||
            (local.updated_at &&
              remote.updated_at &&
              new Date(local.updated_at) > new Date(remote.updated_at))
          ) {
            const ok = await pushToCloud("day_notes", local);
            if (!ok) partialFailures.push("day_notes");
          }
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
      if (tasksData.data) {
        for (const remote of tasksData.data) {
          const local = db.db.getFirstSync<any>(
            "SELECT * FROM tasks WHERE id = ?",
            [remote.id],
          );
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

      if (habitsData.data) {
        for (const remote of habitsData.data) {
          const local = db.db.getFirstSync<any>(
            "SELECT * FROM habits WHERE id = ?",
            [remote.id],
          );
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

      if (notesData.data) {
        for (const remote of notesData.data) {
          const local = db.db.getFirstSync<any>(
            "SELECT * FROM notes WHERE id = ?",
            [remote.id],
          );
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
              db.addNote({ ...remote, user_id: userId });
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

      // Hydrate settings
      if (settingsData.data) {
        const localSettings = db.getUserSettings(userId);
        if (
          !localSettings ||
          new Date(settingsData.data.updated_at) >
            new Date(localSettings.updated_at || 0)
        ) {
          db.saveUserSettings(userId, settingsData.data);
        }
      }

      // Sync focus sessions
      if (focusSessionsData.data) {
        for (const remote of focusSessionsData.data) {
          const local = db.db.getFirstSync<any>(
            "SELECT * FROM focus_sessions WHERE id = ?",
            [remote.id],
          );
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
      if (dayNotesData.data) {
        for (const remote of dayNotesData.data) {
          const local = db.db.getFirstSync<any>(
            "SELECT * FROM day_notes WHERE id = ? OR date = ?",
            [remote.id, remote.date],
          );
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

      // Sync settings separately
      if (settingsData && settingsData.data) {
        const { useSettingsStore } = require("./useSettingsStore");
        // Update local store state directly if data is present
        useSettingsStore.setState({ ...settingsData.data });
      }

      if (partialFailures.length > 0) {
        const uniqueFailures = Array.from(new Set(partialFailures));
        // 'partial' — ≥1 required upload failed.
        // CRITICAL: Do NOT overwrite lastSyncedAt; keep the last fully successful timestamp.
        // syncError stays false because data was fetched successfully; only uploads failed.
        set({
          isSyncing: false,
          syncStatus: 'partial',
          syncError: false,
          syncPartial: true,
          syncPartialFailures: uniqueFailures,
        });
        db.updateConnectProfileStats(userId);
        console.warn("[Sync] Partial sync completed with upload failures:", uniqueFailures);
        return {
          success: false,
          partial: true,
          partialFailures: uniqueFailures,
          counts,
        };
      }

      // Full success — every required operation (fetch + all uploads + conflict resolution) succeeded.
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
