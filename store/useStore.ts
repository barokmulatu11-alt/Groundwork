import * as db from '@/lib/db';
import { FocusSession, Habit, Note, Task } from '@/lib/db';
export { FocusSession, Habit, Note, Task };
import { supabase } from '@/lib/supabase';
import { create } from 'zustand';
import { AppState as RNAppState } from 'react-native';
import { useAuthStore } from './useAuthStore';

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
  
  syncFromCloud: () => Promise<void>;
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
    await supabase.from(table).upsert({ ...data, user_id: sessionData.session.user.id });
  } catch (e) {
    console.warn("[Cloud] Push failed:", e);
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
    }
  },

  updateTask: async (id, updates) => {
    await db.updateTask(id, updates);
    const updatedTasks = get().tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    set({ tasks: updatedTasks });
    const task = updatedTasks.find(t => t.id === id);
    if (task) pushToCloud('tasks', task);
  },

  deleteTask: async (id) => {
    await db.deleteTask(id);
    set({ tasks: get().tasks.filter(t => t.id !== id) });
  },

  toggleTask: async (id, currentStatus) => {
    const completed = !currentStatus;
    const completed_at = completed ? new Date().toISOString() : null;
    await db.updateTask(id, { completed, completed_at });
    const updatedTasks = get().tasks.map(t => t.id === id ? { ...t, completed, completed_at } : t);
    set({ tasks: updatedTasks });
    const task = updatedTasks.find(t => t.id === id);
    if (task) pushToCloud('tasks', task);
  },

  loadHabits: async () => {
    const userId = getUserId();
    const habits = await db.getHabits(userId);
    set({ habits: habits || [] });
  },

  addHabit: async (habitData) => {
    const userId = getUserId();
    const newHabit = await db.addHabit({ ...habitData, user_id: userId });
    if (newHabit) {
      set({ habits: [newHabit, ...get().habits] });
    }
  },

  toggleHabit: async (id, date) => {
    try {
      const habit = get().habits.find(h => h.id === id);
      if (!habit) return;
      const dates: string[] = JSON.parse(typeof habit.dates_completed === 'string' ? habit.dates_completed : '[]');
      const newDates = dates.includes(date) ? dates.filter(d => d !== date) : [...dates, date];
      const newStreak = newDates.length;
      const newBest = Math.max(habit.best_streak, newStreak);
      db.db.runSync(
        'UPDATE habits SET dates_completed = ?, streak = ?, best_streak = ? WHERE id = ?',
        [JSON.stringify(newDates), newStreak, newBest, id]
      );
      set({
        habits: get().habits.map(h =>
          h.id === id ? { ...h, dates_completed: JSON.stringify(newDates), streak: newStreak, best_streak: newBest } : h
        ),
      });
    } catch (e) {
      console.error('[Store] toggleHabit failed:', e);
    }
  },

  updateHabit: async (id, updates) => {
    try {
      const keys = Object.keys(updates).filter(k => k !== 'id');
      if (keys.length === 0) return;
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => (updates as any)[k]);
      db.db.runSync(`UPDATE habits SET ${setClause} WHERE id = ?`, [...values, id]);
      set({ habits: get().habits.map(h => h.id === id ? { ...h, ...updates } : h) });
    } catch (e) {}
  },

  deleteHabit: async (id) => {
    try {
      db.db.runSync('UPDATE habits SET deleted_at = ? WHERE id = ?', [new Date().toISOString(), id]);
      set({ habits: get().habits.filter(h => h.id !== id) });
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
    await db.deleteNote(id);
    set({ notes: get().notes.filter(n => n.id !== id) });
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
      const id = date; // use date as stable ID
      // @ts-ignore
      db.db.runSync(
        `INSERT OR REPLACE INTO day_notes (id, user_id, date, note_text, created_at, updated_at) VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM day_notes WHERE date = ? AND user_id = ?), ?), ?)`,
        [id, userId, date, text, date, userId, now, now]
      );
      set({ dayNotes: { ...get().dayNotes, [date]: text } });
    } catch (e) {}
  },

  importData: async (data: any) => {
    const userId = getUserId();
    
    // Validate
    if (!data || !data.version || !data.tasks || !data.habits || !data.notes) {
      throw new Error('Invalid backup file format');
    }

    set({ isSyncing: true, syncError: false });
    try {
      const { tasks, habits, notes, focusSessions, settings } = data;
      
      // Import Tasks
      const localTasks = await db.getTasks(userId);
      for (const remoteTask of tasks) {
        const localTask = localTasks.find(t => t.id === remoteTask.id);
        if (!localTask) {
          await db.addTask({ ...remoteTask, user_id: userId });
          pushToCloud('tasks', remoteTask);
        } else {
          const remoteTime = remoteTask.updated_at ? new Date(remoteTask.updated_at).getTime() : 0;
          const localTime = localTask.updated_at ? new Date(localTask.updated_at).getTime() : 0;
          if (remoteTime > localTime) {
            await db.updateTask(remoteTask.id, remoteTask);
            pushToCloud('tasks', remoteTask);
          }
        }
      }

      // Import Habits
      const localHabits = await db.getHabits(userId);
      for (const remoteHabit of habits) {
        const localHabit = localHabits.find(h => h.id === remoteHabit.id);
        if (!localHabit) {
          await db.addHabit({ ...remoteHabit, user_id: userId });
          pushToCloud('habits', remoteHabit);
        } else {
          const remoteTime = remoteHabit.updated_at ? new Date(remoteHabit.updated_at).getTime() : 0;
          const localTime = localHabit.updated_at ? new Date(localHabit.updated_at).getTime() : 0;
          if (remoteTime > localTime) {
            await db.updateHabit(remoteHabit.id, remoteHabit);
            pushToCloud('habits', remoteHabit);
          }
        }
      }

      // Import Notes
      const localNotes = await db.getNotes(userId);
      for (const remoteNote of notes) {
        const localNote = localNotes.find(n => n.id === remoteNote.id);
        if (!localNote) {
          await db.addNote({ ...remoteNote, user_id: userId });
          pushToCloud('notes', remoteNote);
        } else {
          const remoteTime = remoteNote.updated_at ? new Date(remoteNote.updated_at).getTime() : 0;
          const localTime = localNote.updated_at ? new Date(localNote.updated_at).getTime() : 0;
          if (remoteTime > localTime) {
            await db.updateNote(remoteNote.id, remoteNote);
            pushToCloud('notes', remoteNote);
          }
        }
      }

      // Import Settings
      if (settings) {
        const { useSettingsStore } = require('./useSettingsStore');
        const localSettings = useSettingsStore.getState();
        const remoteTime = settings.updated_at ? new Date(settings.updated_at).getTime() : 0;
        const localTime = localSettings.updated_at ? new Date(localSettings.updated_at).getTime() : 0;
        
        if (remoteTime > localTime) {
          db.saveUserSettings(userId, settings);
          useSettingsStore.getState().loadSettings();
          if (!localSettings.offlineMode) {
            const { loadSettings, saveSettings, setTheme, setAccentColor, ...serializableSettings } = settings;
            await supabase.auth.updateUser({ data: { settings: serializableSettings } });
          }
        }
      }

      // Reload
      await get().loadAllTasks();
      await get().loadHabits();
      await get().loadNotes();
      await get().loadFocusSessions();

      set({ isSyncing: false });
    } catch (e) {
      console.error('[Import] Failed to import data:', e);
      set({ isSyncing: false, syncError: true });
      throw e;
    }
  },

  syncFromCloud: async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) return;
    
    const userId = user.id;
    console.log('[Sync] Starting sync for user:', userId);
    
    try {
      set({ isSyncing: true, syncError: false });
      
      // Fetch all data from Supabase
      const [tasksData, habitsData, notesData, focusSessionsData] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', userId).is('deleted_at', null),
        supabase.from('habits').select('*').eq('user_id', userId).is('deleted_at', null),
        supabase.from('notes').select('*').eq('user_id', userId).is('deleted_at', null),
        supabase.from('focus_sessions').select('*').eq('user_id', userId),
      ]);
      
      // Sync tasks
      if (tasksData.data) {
        const localTasks = await db.getTasks(userId);
        const remoteTasks = tasksData.data;
        
        for (const remoteTask of remoteTasks) {
          const localTask = localTasks.find(t => t.id === remoteTask.id);
          
          if (!localTask) {
            // Remote task doesn't exist locally, insert it
            await db.addTask({
              id: remoteTask.id,
              title: remoteTask.title,
              date: remoteTask.date,
              time_block: remoteTask.time_block,
              priority: remoteTask.priority,
              note: remoteTask.note,
              reminder_time: remoteTask.reminder_time,
              order_index: remoteTask.order_index,
              completed: remoteTask.completed,
              completed_at: remoteTask.completed_at,
              user_id: userId,
              created_at: remoteTask.created_at,
              updated_at: remoteTask.updated_at,
            });
          } else {
            // Compare timestamps and keep the most recent
            const remoteTime = remoteTask.updated_at ? new Date(remoteTask.updated_at).getTime() : 0;
            const localTime = localTask.updated_at ? new Date(localTask.updated_at).getTime() : 0;
            
            if (remoteTime > localTime) {
              // Remote is newer, update local
              await db.updateTask(remoteTask.id, {
                title: remoteTask.title,
                date: remoteTask.date,
                time_block: remoteTask.time_block,
                priority: remoteTask.priority,
                note: remoteTask.note,
                reminder_time: remoteTask.reminder_time,
                order_index: remoteTask.order_index,
                completed: remoteTask.completed,
                completed_at: remoteTask.completed_at,
                updated_at: remoteTask.updated_at,
              });
            } else if (localTime > remoteTime) {
              // Local is newer, push to cloud
              pushToCloud('tasks', localTask);
            }
          }
        }
        
        // Push local tasks that don't exist remotely
        for (const localTask of localTasks) {
          const existsRemotely = remoteTasks.find(t => t.id === localTask.id);
          if (!existsRemotely) {
            pushToCloud('tasks', localTask);
          }
        }
      }
      
      // Sync habits
      if (habitsData.data) {
        const localHabits = await db.getHabits(userId);
        const remoteHabits = habitsData.data;
        
        for (const remoteHabit of remoteHabits) {
          const localHabit = localHabits.find(h => h.id === remoteHabit.id);
          
          if (!localHabit) {
            await db.addHabit({
              id: remoteHabit.id,
              title: remoteHabit.title,
              category: remoteHabit.category,
              difficulty: remoteHabit.difficulty,
              frequency: remoteHabit.frequency,
              dates_completed: remoteHabit.dates_completed,
              streak: remoteHabit.streak,
              best_streak: remoteHabit.best_streak,
              user_id: userId,
              created_at: remoteHabit.created_at,
              updated_at: remoteHabit.updated_at,
            });
          } else {
            const remoteTime = remoteHabit.updated_at ? new Date(remoteHabit.updated_at).getTime() : 0;
            const localTime = localHabit.updated_at ? new Date(localHabit.updated_at).getTime() : 0;
            
            if (remoteTime > localTime) {
              await db.updateHabit(remoteHabit.id, {
                title: remoteHabit.title,
                category: remoteHabit.category,
                difficulty: remoteHabit.difficulty,
                frequency: remoteHabit.frequency,
                dates_completed: remoteHabit.dates_completed,
                streak: remoteHabit.streak,
                best_streak: remoteHabit.best_streak,
                updated_at: remoteHabit.updated_at,
              });
            } else if (localTime > remoteTime) {
              pushToCloud('habits', localHabit);
            }
          }
        }
        
        for (const localHabit of localHabits) {
          const existsRemotely = remoteHabits.find(h => h.id === localHabit.id);
          if (!existsRemotely) {
            pushToCloud('habits', localHabit);
          }
        }
      }
      
      // Sync notes
      if (notesData.data) {
        const localNotes = await db.getNotes(userId);
        const remoteNotes = notesData.data;
        
        for (const remoteNote of remoteNotes) {
          const localNote = localNotes.find(n => n.id === remoteNote.id);
          
          if (!localNote) {
            await db.addNote({
              id: remoteNote.id,
              title: remoteNote.title,
              content: remoteNote.content,
              user_id: userId,
              created_at: remoteNote.created_at,
              updated_at: remoteNote.updated_at,
            });
          } else {
            const remoteTime = new Date(remoteNote.updated_at).getTime();
            const localTime = new Date(localNote.updated_at).getTime();
            
            if (remoteTime > localTime) {
              await db.updateNote(remoteNote.id, {
                title: remoteNote.title,
                content: remoteNote.content,
                updated_at: remoteNote.updated_at,
              });
            } else if (localTime > remoteTime) {
              pushToCloud('notes', localNote);
            }
          }
        }
        
        for (const localNote of localNotes) {
          const existsRemotely = remoteNotes.find(n => n.id === localNote.id);
          if (!existsRemotely) {
            pushToCloud('notes', localNote);
          }
        }
      }
      
      // Sync focus sessions (one-way from local to cloud for now)
      if (focusSessionsData.error === null) {
        const localSessions = await db.getFocusSessions(userId);
        for (const session of localSessions) {
          pushToCloud('focus_sessions', session);
        }
      }
      
      // Sync settings
      const remoteSettings = user.user_metadata?.settings;
      if (remoteSettings) {
        const { useSettingsStore } = require('./useSettingsStore');
        const localSettings = useSettingsStore.getState();
        const remoteTime = remoteSettings.updated_at ? new Date(remoteSettings.updated_at).getTime() : 0;
        const localTime = localSettings.updated_at ? new Date(localSettings.updated_at).getTime() : 0;
        
        if (remoteTime > localTime) {
          db.saveUserSettings(userId, remoteSettings);
          useSettingsStore.getState().loadSettings();
        } else if (localTime > remoteTime && !localSettings.offlineMode) {
          const { loadSettings, saveSettings, setTheme, setAccentColor, ...serializableSettings } = localSettings as any;
          await supabase.auth.updateUser({
            data: { settings: serializableSettings }
          });
        }
      }

      // Reload all data after sync
      await get().loadAllTasks();
      await get().loadHabits();
      await get().loadNotes();
      await get().loadFocusSessions();
      
      set({ lastSyncedAt: new Date().toISOString(), isSyncing: false, syncError: false });
      console.log('[Sync] Sync completed successfully');
    } catch (e) {
      console.error('[Sync] Sync failed:', e);
      set({ isSyncing: false, syncError: true });
      throw e;
    }
  }
}));

let syncInterval: ReturnType<typeof setInterval> | null = null;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: any = null;
let isManagerStarted = false;

export const startSyncManager = () => {
  if (isManagerStarted) return;
  isManagerStarted = true;

  const handleSync = async () => {
    const { useSettingsStore } = require('./useSettingsStore');
    const { offlineMode } = useSettingsStore.getState();
    const { isSyncing, syncFromCloud } = useStore.getState();
    
    if (offlineMode || isSyncing) return;
    
    try {
      await syncFromCloud();
      
      const { useSessionStore } = require('./useSessionStore');
      await useSessionStore.getState().syncSessions();
    } catch (e) {
      // Retry in 60 seconds on failure
      if (retryTimeout) clearTimeout(retryTimeout);
      retryTimeout = setTimeout(handleSync, 60000);
    }
  };

  // Sync when app comes to foreground
  appStateSubscription = RNAppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      handleSync();
    }
  });

  // Sync periodically every 15 minutes while app is active
  syncInterval = setInterval(handleSync, 15 * 60 * 1000);
  
  // Initial sync on start
  handleSync();
};

export const stopSyncManager = () => {
  if (syncInterval) clearInterval(syncInterval);
  if (retryTimeout) clearTimeout(retryTimeout);
  if (appStateSubscription) appStateSubscription.remove();
  
  syncInterval = null;
  retryTimeout = null;
  appStateSubscription = null;
  isManagerStarted = false;
};
