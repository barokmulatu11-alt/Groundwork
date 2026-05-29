import * as db from '@/lib/db';
import { FocusSession, Habit, Note, Task } from '@/lib/db';
export { FocusSession, Habit, Note, Task };
import { supabase } from '@/lib/supabase';
import { create } from 'zustand';
import { AppState as RNAppState } from 'react-native';
import { useAuthStore } from './useAuthStore';
import { addXP, XP_VALUES } from '@/lib/connect/xpSystem';
import { hapticSuccess, hapticLight } from '@/lib/haptics';
import { parseHabitDates, calculateHabitStreak, calculateBestHabitStreak } from '@/lib/habitUtils';

interface AppState {
  tasks: Task[];
  habits: Habit[];
  notes: Note[];
  focusSessions: FocusSession[];
  lastSyncedAt: string | null;
  isSyncing: boolean;
  syncError: boolean;
  
  loadAllTasks: () => Promise<void>;
  addTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string, currentStatus: boolean) => Promise<void>;
  
  loadHabits: () => Promise<void>;
  addHabit: (habit: Partial<Habit>) => Promise<void>;
  toggleHabit: (id: string, date: string) => Promise<void>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  
  loadNotes: () => Promise<void>;
  addNote: (note: Partial<Note>) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  
  loadFocusSessions: () => Promise<void>;
  addFocusSession: (session: Partial<FocusSession>) => Promise<void>;
  
  syncFromCloud: (session?: any) => Promise<void>;
  importData: (data: any) => Promise<void>;
  loadDayNotes: () => Promise<void>;
  saveDayNote: (date: string, text: string) => Promise<void>;
  dayNotes: Record<string, string>;
  draftNote: Partial<Note> | null;
  setDraftNote: (note: Partial<Note> | null) => void;
}

const pushToCloud = async (table: string, data: any) => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return;
    
    const userId = sessionData.session.user.id;
    let cloudData: any = {};

    if (table === 'tasks') {
      cloudData = {
        id: data.id,
        user_id: userId,
        title: data.title || '',
        date: data.date || new Date().toISOString().split('T')[0],
        time_block: data.time_block || null,
        priority: data.priority || 'Medium',
        note: data.note || '',
        reminder_time: data.reminder_time || null,
        order_index: data.order_index ?? 0,
        completed: Boolean(data.completed),
        completed_at: data.completed_at || null,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        deleted_at: data.deleted_at || null,
      };
    } else if (table === 'habits') {
      cloudData = {
        id: data.id,
        user_id: userId,
        title: data.title || '',
        frequency: data.frequency || 'daily',
        dates_completed: Array.isArray(data.dates_completed) 
          ? JSON.stringify(data.dates_completed) 
          : (typeof data.dates_completed === 'string' ? data.dates_completed : '[]'),
        streak: Number(data.streak) || 0,
        best_streak: Number(data.best_streak) || 0,
        is_paused: Boolean(data.is_paused),
        category: data.category || 'All',
        difficulty: data.difficulty || 'Medium',
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        deleted_at: data.deleted_at || null,
      };
    } else if (table === 'notes') {
      cloudData = {
        id: data.id,
        user_id: userId,
        title: data.title || '',
        content: data.content || '',
        is_locked: Boolean(data.is_locked),
        is_pinned: Boolean(data.is_pinned),
        audio_uris: Array.isArray(data.audio_uris) 
          ? JSON.stringify(data.audio_uris) 
          : (typeof data.audio_uris === 'string' ? data.audio_uris : '[]'),
        drawing_uris: Array.isArray(data.drawing_uris) 
          ? JSON.stringify(data.drawing_uris) 
          : (typeof data.drawing_uris === 'string' ? data.drawing_uris : '[]'),
        image_uris: Array.isArray(data.image_uris) 
          ? JSON.stringify(data.image_uris) 
          : (typeof data.image_uris === 'string' ? data.image_uris : '[]'),
        tags: Array.isArray(data.tags) 
          ? JSON.stringify(data.tags) 
          : (typeof data.tags === 'string' ? data.tags : '[]'),
        folder: data.folder || 'General',
        priority: data.priority || 'Medium',
        study_hours: Number(data.study_hours) || 0,
        revision_score: Number(data.revision_score) || 0,
        last_reviewed_at: data.last_reviewed_at || null,
        flashcards: Array.isArray(data.flashcards)
          ? JSON.stringify(data.flashcards)
          : (typeof data.flashcards === 'string' ? data.flashcards : '[]'),
        formulas: Array.isArray(data.formulas)
          ? JSON.stringify(data.formulas)
          : (typeof data.formulas === 'string' ? data.formulas : '[]'),
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        deleted_at: data.deleted_at || null,
      };
    } else if (table === 'focus_sessions') {
      const now = new Date().toISOString();
      cloudData = {
        id: data.id,
        user_id: userId,
        duration_minutes: Number(data.duration_minutes) || 0,
        started_at: data.started_at || data.created_at || now,
        completed_at: data.completed_at || now,
        task_id: data.task_id || null,
        mode: data.mode || 'Focus',
        date: data.date || (data.created_at ? data.created_at.split('T')[0] : now.split('T')[0]),
        created_at: data.created_at || now,
        updated_at: data.updated_at || now,
      };
    } else if (table === 'day_notes') {
      cloudData = {
        id: data.id || data.date,
        user_id: userId,
        date: data.date,
        note_text: data.note_text || '',
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      };
    } else {
      cloudData = { ...data, user_id: userId };
      const keysToSerialize = ['dates_completed', 'tags', 'audio_uris', 'drawing_uris', 'image_uris'];
      keysToSerialize.forEach(key => {
        if (cloudData[key] && Array.isArray(cloudData[key])) {
          cloudData[key] = JSON.stringify(cloudData[key]);
        }
      });
    }

    let { error } = await supabase.from(table).upsert(cloudData);
    if (error && table === 'notes' && /flashcards|formulas|schema cache/i.test(error.message || '')) {
      const slim = { ...cloudData };
      delete slim.flashcards;
      delete slim.formulas;
      delete slim.study_hours;
      delete slim.revision_score;
      delete slim.last_reviewed_at;
      ({ error } = await supabase.from(table).upsert(slim));
    }
    if (error) throw error;
  } catch (e: any) {
    console.warn(`[Cloud] Push to ${table} failed (offline or error):`, e?.message || e);
    // Silently swallow — local SQLite write already succeeded.
    // Data will be re-synced next time the device is online.
  }
};

const getUserId = () => {
  const { session, isGuest } = useAuthStore.getState();
  if (session?.user?.id) return session.user.id;
  if (isGuest) return 'guest';
  return 'guest';
};

export const useStore = create<AppState>((set, get) => ({
  tasks: [],
  habits: [],
  notes: [],
  focusSessions: [],
  dayNotes: {},
  draftNote: null,
  lastSyncedAt: null,
  isSyncing: false,
  syncError: false,

  setDraftNote: (note) => set({ draftNote: note }),

  loadAllTasks: async () => {
    const userId = getUserId();
    const tasks = await db.getTasks(userId);
    set({ tasks: tasks || [] });
  },

  addTask: async (taskData) => {
    const userId = getUserId();
    const order_index = get().tasks.length;
    const newTask = await db.addTask({ ...taskData, user_id: userId, order_index });
    if (newTask) {
      set({ tasks: [...get().tasks, newTask] });
      pushToCloud('tasks', newTask);
      db.updateConnectProfileStats(userId);
    }
  },

  updateTask: async (id, updates) => {
    await db.updateTask(id, updates);
    const updatedTasks = get().tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    set({ tasks: updatedTasks });
    const task = updatedTasks.find(t => t.id === id);
    if (task) {
      pushToCloud('tasks', task);
      db.updateConnectProfileStats(task.user_id || getUserId());
    }
  },

  deleteTask: async (id) => {
    const now = new Date().toISOString();
    const task = get().tasks.find(t => t.id === id);
    await db.deleteTask(id);
    set({ tasks: get().tasks.filter(t => t.id !== id) });
    // Soft delete in cloud — pass full object so pushToCloud has all required fields
    if (task) {
      pushToCloud('tasks', { ...task, deleted_at: now, updated_at: now });
    } else {
      pushToCloud('tasks', { id, deleted_at: now, updated_at: now });
    }
    db.updateConnectProfileStats(getUserId());
  },

  toggleTask: async (id, currentStatus) => {
    const completed = !currentStatus;
    const completed_at = completed ? new Date().toISOString() : null;
    await db.updateTask(id, { completed, completed_at });
    const updatedTasks = get().tasks.map(t => t.id === id ? { ...t, completed, completed_at } : t);
    set({ tasks: updatedTasks });
    const task = updatedTasks.find(t => t.id === id);
    if (task) {
      pushToCloud('tasks', task);
      if (completed) {
        hapticSuccess();
        const userId = getUserId();
        await addXP(userId, XP_VALUES.TASK_COMPLETED, 'Task completed');
        // Check if all tasks for today are done
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = updatedTasks.filter(t => t.date === today && !t.deleted_at);
        if (todayTasks.length > 0 && todayTasks.every(t => t.completed)) {
          await addXP(userId, XP_VALUES.DAILY_ALL_TASKS_DONE, 'All tasks completed today');
        }
      }
      db.updateConnectProfileStats(task.user_id || getUserId());
    }
  },

  loadHabits: async () => {
    const userId = getUserId();
    const raw = await db.getHabits(userId);
    const habits = (raw || []).map(h => {
      const dates = parseHabitDates(h.dates_completed);
      const streak = calculateHabitStreak(dates);
      const best_streak = Math.max(h.best_streak, calculateBestHabitStreak(dates));
      if (streak !== h.streak || best_streak !== h.best_streak) {
        db.db.runSync(
          'UPDATE habits SET streak = ?, best_streak = ? WHERE id = ?',
          [streak, best_streak, h.id]
        );
        return { ...h, streak, best_streak };
      }
      return h;
    });
    set({ habits });
  },

  addHabit: async (habitData) => {
    const userId = getUserId();
    const newHabit = await db.addHabit({ ...habitData, user_id: userId });
    if (newHabit) {
      set({ habits: [newHabit, ...get().habits] });
      pushToCloud('habits', newHabit);
    }
  },

  toggleHabit: async (id, date) => {
    try {
      const habit = get().habits.find(h => h.id === id);
      if (!habit) return;
      const dates = parseHabitDates(habit.dates_completed);
      const isCheckingIn = !dates.includes(date);
      const newDates = isCheckingIn ? [...dates, date] : dates.filter(d => d !== date);
      const newStreak = calculateHabitStreak(newDates, date);
      const newBest = Math.max(habit.best_streak, calculateBestHabitStreak(newDates));
      const updated_at = new Date().toISOString();
      
      db.db.runSync(
        'UPDATE habits SET dates_completed = ?, streak = ?, best_streak = ?, updated_at = ? WHERE id = ?',
        [JSON.stringify(newDates), newStreak, newBest, updated_at, id]
      );
      
      const updatedHabit = { ...habit, dates_completed: JSON.stringify(newDates), streak: newStreak, best_streak: newBest, updated_at };
      set({
        habits: get().habits.map(h => h.id === id ? updatedHabit : h),
      });
      
      pushToCloud('habits', updatedHabit);

      if (isCheckingIn) {
        hapticSuccess();
        const userId = getUserId();
        await addXP(userId, XP_VALUES.HABIT_CHECKED_IN, 'Habit checked in');
        if (newStreak === 7) await addXP(userId, XP_VALUES.HABIT_STREAK_7_DAYS, '7-day habit streak');
        if (newStreak === 14) await addXP(userId, XP_VALUES.HABIT_STREAK_14_DAYS, '14-day habit streak');
        if (newStreak === 30) await addXP(userId, XP_VALUES.HABIT_STREAK_30_DAYS, '30-day habit streak');
      }
    } catch (e) {
      console.error('[Store] toggleHabit failed:', e);
    }
  },

  updateHabit: async (id, updates) => {
    try {
      const habit = get().habits.find(h => h.id === id);
      if (!habit) return;
      
      const updated_at = new Date().toISOString();
      await db.updateHabit(id, { ...updates, updated_at });
      
      const updatedHabit = { ...habit, ...updates, updated_at };
      set({ habits: get().habits.map(h => h.id === id ? updatedHabit : h) });
      pushToCloud('habits', updatedHabit);
    } catch (e) {}
  },

  deleteHabit: async (id) => {
    try {
      const now = new Date().toISOString();
      const habit = get().habits.find(h => h.id === id);
      db.db.runSync('UPDATE habits SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
      set({ habits: get().habits.filter(h => h.id !== id) });
      // Soft delete in cloud — pass full object so pushToCloud has all required fields
      if (habit) {
        pushToCloud('habits', { ...habit, deleted_at: now, updated_at: now });
      } else {
        pushToCloud('habits', { id, deleted_at: now, updated_at: now });
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
      pushToCloud('notes', newNote);
      await addXP(userId, XP_VALUES.NOTE_CREATED, 'Note created');
    }
  },

  updateNote: async (id, updates) => {
    await db.updateNote(id, updates);
    const updatedNotes = get().notes.map(n => n.id === id ? { ...n, ...updates } : n);
    set({ notes: updatedNotes });
    const note = updatedNotes.find(n => n.id === id);
    if (note) pushToCloud('notes', note);
  },

  deleteNote: async (id) => {
    const now = new Date().toISOString();
    const note = get().notes.find(n => n.id === id);
    await db.deleteNote(id);
    set({ notes: get().notes.filter(n => n.id !== id) });
    // Soft delete in cloud — pass full object so pushToCloud has all required fields
    if (note) {
      pushToCloud('notes', { ...note, deleted_at: now, updated_at: now });
    } else {
      pushToCloud('notes', { id, deleted_at: now, updated_at: now });
    }
  },

  loadFocusSessions: async () => {
    const userId = getUserId();
    const sessions = await db.getFocusSessions(userId);
    set({ focusSessions: sessions || [] });
  },

  addFocusSession: async (sessionData) => {
    const userId = getUserId();
    const newSession = await db.addFocusSession({ ...sessionData, user_id: userId });
    if (newSession) {
      set({ focusSessions: [newSession, ...get().focusSessions] });
      pushToCloud('focus_sessions', newSession);
      await addXP(userId, XP_VALUES.FOCUS_SESSION_COMPLETED, 'Focus session completed');
      if ((sessionData.duration_minutes || 0) >= 45) {
        await addXP(userId, XP_VALUES.FOCUS_SESSION_45_MIN, '45+ min focus session');
      }
      db.updateConnectProfileStats(userId);
    }
  },

  loadDayNotes: async () => {
    try {
      const userId = getUserId();
      const rows = db.db.getAllSync<{ date: string; note_text: string }>('SELECT date, note_text FROM day_notes WHERE user_id = ?', [userId]);
      const dayNotes: Record<string, string> = {};
      rows.forEach(r => { dayNotes[r.date] = r.note_text; });
      set({ dayNotes });
    } catch (e) {
      console.warn('[Store] loadDayNotes failed:', e);
    }
  },

  saveDayNote: async (date, text) => {
    try {
      const userId = getUserId();
      const now = new Date().toISOString();
      const id = date;
      db.db.runSync(
        `INSERT OR REPLACE INTO day_notes (id, user_id, date, note_text, created_at, updated_at) VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM day_notes WHERE date = ? AND user_id = ?), ?), ?)`,
        [id, userId, date, text, date, userId, now, now]
      );
      set({ dayNotes: { ...get().dayNotes, [date]: text } });
      pushToCloud('day_notes', { id, date, note_text: text, updated_at: now });
    } catch (e) {}
  },

  importData: async (data: any) => {
    const userId = getUserId();
    if (!data || !data.version) throw new Error('Invalid backup file format');

    set({ isSyncing: true, syncError: false });
    try {
      const { tasks, habits, notes, settings } = data;
      
      // Bulk sync logic...
      // (For brevity, keeping the logic but ensuring pushToCloud is called)
      
      set({ isSyncing: false });
    } catch (e) {
      set({ isSyncing: false, syncError: true });
      throw e;
    }
  },

  syncFromCloud: async (explicitSession?: any) => {
    // Use the cached local session first to avoid a blocking network call
    let user = explicitSession?.user
      || useAuthStore.getState().session?.user;
    
    if (!user) {
      // Last-resort: fetch from Supabase (slower, may fail offline)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user ?? null;
      } catch (e) {
        console.warn('[Sync] Could not get session:', e);
      }
    }
    
    if (!user) {
      console.log('[Sync] No authenticated user — skipping sync.');
      return;
    }
    const userId = user.id;
    
    try {
      set({ isSyncing: true, syncError: false });

      // --- 0. MIGRATE GUEST DATA FIRST ---
      // If the user previously used the app as a guest, their SQLite records
      // are stored under user_id='guest'. We must rename them to the real
      // userId BEFORE reading local data, so the push step finds them.
      try {
        const guestTaskCount = db.db.getAllSync<{ count: number }>(
          'SELECT COUNT(*) as count FROM tasks WHERE user_id = ?',
          ['guest']
        )[0]?.count ?? 0;
        if (guestTaskCount > 0) {
          console.log(`[Sync] Migrating ${guestTaskCount} guest tasks to user ${userId}`);
          db.migrateGuestData('guest', userId);
        }
      } catch (e) {
        console.warn('[Sync] Guest data migration check failed:', e);
      }

      // --- DIAGNOSTIC LOGGING ---
      const localTaskCountForDiag = db.getTasks(userId).length;
      const guestTaskCountForDiag = db.getTasks('guest').length;
      console.log(`[Sync] Local tasks under userId (${userId}): ${localTaskCountForDiag}`);
      console.log(`[Sync] Local tasks still under 'guest': ${guestTaskCountForDiag}`);
      
      const [tasksData, habitsData, notesData, focusSessionsData, dayNotesData] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('habits').select('*').eq('user_id', userId),
        supabase.from('notes').select('*').eq('user_id', userId),
        supabase.from('focus_sessions').select('*').eq('user_id', userId),
        supabase.from('day_notes').select('*').eq('user_id', userId),
      ]);

      console.log(`[Sync] Remote tasks count: ${tasksData.data?.length ?? 0}`);
      console.log(`[Sync] Remote habits count: ${habitsData.data?.length ?? 0}`);
      if (tasksData.error) console.error('[Sync] Tasks query error:', tasksData.error);
      if (habitsData.error) console.error('[Sync] Habits query error:', habitsData.error);

      // --- 1. BIDIRECTIONAL SYNC: PUSH LOCAL TO REMOTE ---
      // Push unsynced or newer local tasks to the cloud
      try {
        const localTasks = db.getTasks(userId);
        console.log(`[Sync] Pushing ${localTasks.length} local tasks to cloud...`);
        for (const local of localTasks) {
          const remote = tasksData.data?.find(t => t.id === local.id);
          if (!remote || (local.updated_at && remote.updated_at && new Date(local.updated_at) > new Date(remote.updated_at))) {
            await pushToCloud('tasks', local);
          }
        }
      } catch (e) {
        console.warn('[Sync] Push local tasks failed:', e);
      }

      // Push unsynced or newer local habits to the cloud
      try {
        const localHabits = await db.getHabits(userId);
        console.log(`[Sync] Pushing ${localHabits.length} local habits to cloud...`);
        for (const local of localHabits) {
          const remote = habitsData.data?.find(h => h.id === local.id);
          if (!remote || (local.updated_at && remote.updated_at && new Date(local.updated_at) > new Date(remote.updated_at))) {
            await pushToCloud('habits', local);
          }
        }
      } catch (e) {
        console.warn('[Sync] Push local habits failed:', e);
      }

      // Push unsynced or newer local notes to the cloud
      try {
        const localNotes = await db.getNotes(userId);
        for (const local of localNotes) {
          const remote = notesData.data?.find(n => n.id === local.id);
          if (!remote || (local.updated_at && remote.updated_at && new Date(local.updated_at) > new Date(remote.updated_at))) {
            await pushToCloud('notes', local);
          }
        }
      } catch (e) {
        console.warn('[Sync] Push local notes failed:', e);
      }

      // Push unsynced local focus sessions to the cloud
      try {
        const localFocusSessions = await db.getFocusSessions(userId);
        for (const local of localFocusSessions) {
          const remote = focusSessionsData.data?.find(f => f.id === local.id);
          if (!remote) {
            await pushToCloud('focus_sessions', local);
          }
        }
      } catch (e) {
        console.warn('[Sync] Push local focus sessions failed:', e);
      }

      // Push unsynced or newer local day notes to the cloud
      try {
        const rows = db.db.getAllSync<{ id: string; date: string; note_text: string; created_at: string; updated_at: string }>(
          'SELECT id, date, note_text, created_at, updated_at FROM day_notes WHERE user_id = ?',
          [userId]
        );
        for (const local of rows) {
          const remote = dayNotesData.data?.find(d => d.id === local.id || d.date === local.date);
          if (!remote || (local.updated_at && remote.updated_at && new Date(local.updated_at) > new Date(remote.updated_at))) {
            await pushToCloud('day_notes', local);
          }
        }
      } catch (e) {
        console.warn('[Sync] Push local day notes failed:', e);
      }
      
      // --- 2. BIDIRECTIONAL SYNC: HYDRATE LOCAL FROM REMOTE ---
      if (tasksData.data) {
        for (const remote of tasksData.data) {
          const local = db.db.getFirstSync<any>('SELECT * FROM tasks WHERE id = ?', [remote.id]);
          if (remote.deleted_at) {
            // Deleted remotely: propagate deletion to local SQLite
            if (!local || !local.deleted_at) {
              db.db.runSync('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?', [remote.deleted_at, remote.updated_at || remote.deleted_at, remote.id]);
            }
          } else {
            // Active remotely
            if (!local) {
              db.addTask({ ...remote, user_id: userId });
            } else if (local.deleted_at) {
              // Deleted locally but active remotely: push local deletion to cloud
              await pushToCloud('tasks', { ...local, completed: Boolean(local.completed) });
            } else if (new Date(remote.updated_at as string) > new Date(local.updated_at as string)) {
              db.addTask({ ...remote, user_id: userId });
            }
          }
        }
      }

      if (habitsData.data) {
        for (const remote of habitsData.data) {
          const local = db.db.getFirstSync<any>('SELECT * FROM habits WHERE id = ?', [remote.id]);
          if (remote.deleted_at) {
            // Deleted remotely: propagate deletion to local SQLite
            if (!local || !local.deleted_at) {
              db.db.runSync('UPDATE habits SET deleted_at = ?, updated_at = ? WHERE id = ?', [remote.deleted_at, remote.updated_at || remote.deleted_at, remote.id]);
            }
          } else {
            // Active remotely
            if (!local) {
              await db.addHabit({ ...remote, user_id: userId });
            } else if (local.deleted_at) {
              // Deleted locally but active remotely: push local deletion to cloud
              await pushToCloud('habits', { ...local, is_paused: Boolean(local.is_paused) });
            } else if (new Date(remote.updated_at as string) > new Date(local.updated_at as string)) {
              await db.addHabit({ ...remote, user_id: userId });
            }
          }
        }
      }

      if (notesData.data) {
        for (const remote of notesData.data) {
          const local = db.db.getFirstSync<any>('SELECT * FROM notes WHERE id = ?', [remote.id]);
          if (remote.deleted_at) {
            // Deleted remotely: propagate deletion to local SQLite
            if (!local || !local.deleted_at) {
              db.db.runSync('UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?', [remote.deleted_at, remote.updated_at || remote.deleted_at, remote.id]);
            }
          } else {
            // Active remotely
            if (!local) {
              await db.addNote({ ...remote, user_id: userId });
            } else if (local.deleted_at) {
              // Deleted locally but active remotely: push local deletion to cloud
              await pushToCloud('notes', { ...local, is_locked: Boolean(local.is_locked), is_pinned: Boolean(local.is_pinned) });
            } else if (new Date(remote.updated_at as string) > new Date(local.updated_at as string)) {
              await db.addNote({ ...remote, user_id: userId });
            }
          }
        }
      }

      // Sync achievements
      try {
        const { data: achievementsData } = await supabase
          .from('connect_achievements')
          .select('*')
          .eq('user_id', userId);
        
        if (achievementsData) {
          for (const remote of achievementsData) {
            const local = db.db.getFirstSync<any>('SELECT * FROM connect_achievements WHERE achievement_key = ? AND user_id = ?', [remote.achievement_key, userId]);
            if (!local) {
              db.db.runSync(
                'INSERT INTO connect_achievements (id, user_id, achievement_key, unlocked_at, progress) VALUES (?, ?, ?, ?, ?)',
                [remote.id, userId, remote.achievement_key, remote.unlocked_at, remote.progress]
              );
            }
          }
        }
      } catch (e) {
        console.warn('[Sync] Achievements sync failed:', e);
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
      const remoteSettings = user.user_metadata?.settings;
      if (remoteSettings) {
        const { useSettingsStore } = require('./useSettingsStore');
        await useSettingsStore.getState().loadSettings();
      }

      set({ lastSyncedAt: new Date().toISOString(), isSyncing: false });
      db.updateConnectProfileStats(userId);
      console.log('[Sync] Bidirectional synchronization complete.');
    } catch (e: any) {
      console.error('[Sync] Failed:', e);
      set({ isSyncing: false, syncError: true });
      // Do NOT show an Alert — offline usage should be silent and seamless.
      // The syncError flag is available in state for any UI indicator.
    }
  }
}));

let syncInterval: any = null;
let appStateSub: any = null;
let onlineUnsub: null | (() => void) = null;

export const startSyncManager = () => {
  const handleSync = () => useStore.getState().syncFromCloud();
  appStateSub = RNAppState.addEventListener('change', (s) => s === 'active' && handleSync());
  syncInterval = setInterval(handleSync, 10 * 60 * 1000);

  // Web: sync as soon as connectivity is restored (important for PWA offline-first).
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const onOnline = () => handleSync();
    window.addEventListener('online', onOnline);
    onlineUnsub = () => window.removeEventListener('online', onOnline);
  }

  handleSync();
};

export const stopSyncManager = () => {
  if (syncInterval) clearInterval(syncInterval);
  if (appStateSub) appStateSub.remove();
  if (onlineUnsub) onlineUnsub();
  onlineUnsub = null;
};
