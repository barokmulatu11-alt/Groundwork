import * as SQLite from 'expo-sqlite';

export const APP_VERSION = '1.1.0';

export type SubTask = {
  id: string;
  task_id: string;
  user_id?: string;
  title: string;
  completed: boolean;
  order_index: number;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

export type Task = {
  id: string;
  user_id: string;
  title: string;
  time_block: string | null;
  date: string;
  completed: boolean;
  completed_at: string | null;
  priority: 'high' | 'medium' | 'low';
  note: string;
  reminder_time: string | null;
  reminder_offset: number | null;
  reminder_scheduled: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  order_index: number;
  sub_tasks?: SubTask[];
};

export type Habit = {
  id: string;
  user_id: string;
  title: string;
  streak: number;
  dates_completed: string; // JSON string
  category: string;
  difficulty: string;
  best_streak: number;
  frequency: string;
  is_paused: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_locked: boolean;
  media_uri: string | null;
  media_type: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
  is_pinned: boolean;
  folder: string;
  audio_uris: string[];
  drawing_uris: string[];
  image_uris: string[];
  deleted_at?: string | null;
};

export type FocusSession = {
  id: string;
  user_id: string;
  duration_minutes: number;
  mode: string;
  task_id?: string | null;
  completed_at?: string | null;
  date: string;
  created_at: string;
};

export const db = SQLite.openDatabaseSync('groundwork.db');

export function initDb() {
  // Add user_id column to existing tables if they don't have it (migration)
  try {
    db.execSync(`
      -- Add user_id to tasks if missing
      ALTER TABLE tasks ADD COLUMN user_id TEXT NOT NULL DEFAULT 'guest';
    `);
  } catch (e) {
    // Column likely already exists, ignore error
  }

  try {
    db.execSync(`
      -- Add user_id to sub_tasks if missing
      ALTER TABLE sub_tasks ADD COLUMN user_id TEXT NOT NULL DEFAULT 'guest';
    `);
  } catch (e) {
    // Column likely already exists, ignore error
  }

  try {
    db.execSync(`
      -- Add user_id to habits if missing
      ALTER TABLE habits ADD COLUMN user_id TEXT NOT NULL DEFAULT 'guest';
    `);
  } catch (e) {
    // Column likely already exists, ignore error
  }

  try {
    db.execSync(`
      -- Add user_id to habit_checkins if missing
      ALTER TABLE habit_checkins ADD COLUMN user_id TEXT NOT NULL DEFAULT 'guest';
    `);
  } catch (e) {
    // Column likely already exists, ignore error
  }

  try {
    db.execSync(`
      -- Add user_id to focus_sessions if missing
      ALTER TABLE focus_sessions ADD COLUMN user_id TEXT NOT NULL DEFAULT 'guest';
    `);
  } catch (e) {
    // Column likely already exists, ignore error
  }

  try {
    db.execSync(`
      -- Add user_id to notes if missing
      ALTER TABLE notes ADD COLUMN user_id TEXT NOT NULL DEFAULT 'guest';
    `);
  } catch (e) {
    // Column likely already exists, ignore error
  }

  try {
    db.execSync(`
      -- Add user_id to note_tags if missing
      ALTER TABLE note_tags ADD COLUMN user_id TEXT NOT NULL DEFAULT 'guest';
    `);
  } catch (e) {
    // Column likely already exists, ignore error
  }

  try {
    db.execSync(`
      -- Add user_id to day_notes if missing
      ALTER TABLE day_notes ADD COLUMN user_id TEXT NOT NULL DEFAULT 'guest';
    `);
  } catch (e) {
    // Column likely already exists, ignore error
  }

  try {
    db.execSync(`
      -- Add auto_lock_timeout to user_settings if missing
      ALTER TABLE user_settings ADD COLUMN auto_lock_timeout INTEGER DEFAULT 0;
    `);
  } catch (e) {
    // Column likely already exists, ignore error
  }

  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'guest',
      title TEXT NOT NULL,
      time_block TEXT,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      priority TEXT DEFAULT 'Medium',
      note TEXT DEFAULT '',
      reminder_time TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sub_tasks (
      id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'guest',
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'guest',
      title TEXT NOT NULL,
      streak INTEGER DEFAULT 0,
      dates_completed TEXT DEFAULT '[]',
      category TEXT DEFAULT 'All',
      difficulty TEXT DEFAULT 'Medium',
      best_streak INTEGER DEFAULT 0,
      frequency TEXT DEFAULT 'Daily',
      is_paused INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS habit_checkins (
      id TEXT PRIMARY KEY NOT NULL,
      habit_id TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'guest',
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT,
      FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'guest',
      duration_minutes INTEGER NOT NULL,
      mode TEXT NOT NULL,
      task_id TEXT,
      completed_at TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'guest',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_locked INTEGER DEFAULT 0,
      media_uri TEXT,
      media_type TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      is_pinned INTEGER DEFAULT 0,
      audio_uris TEXT DEFAULT '[]',
      drawing_uris TEXT DEFAULT '[]',
      image_uris TEXT DEFAULT '[]',
      folder TEXT DEFAULT 'General',
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS note_tags (
      id TEXT PRIMARY KEY NOT NULL,
      note_id TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'guest',
      tag TEXT NOT NULL,
      created_at TEXT,
      FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS day_notes (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'guest',
      date TEXT NOT NULL,
      note_text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY NOT NULL,
      theme TEXT DEFAULT 'light',
      notifications_enabled INTEGER DEFAULT 0,
      tasks_layout TEXT DEFAULT 'list',
      habits_layout TEXT DEFAULT 'grid',
      notes_layout TEXT DEFAULT 'grid',
      is_update_banner_dismissed INTEGER DEFAULT 0,
      default_focus_duration INTEGER DEFAULT 25,
      daily_goal INTEGER DEFAULT 5,
      focus_timer_active INTEGER DEFAULT 0,
      focus_timer_time_left INTEGER DEFAULT 1500,
      focus_timer_mode TEXT DEFAULT 'Study',
      focus_timer_duration_minutes INTEGER DEFAULT 25,
      focus_timer_selected_task_id TEXT,
      focus_timer_start_time INTEGER,
      default_task_priority TEXT DEFAULT 'Medium',
      default_reminder_time INTEGER DEFAULT 10,
      week_start_day TEXT DEFAULT 'Monday',
      auto_sort_tasks INTEGER DEFAULT 1,
      pomodoro_focus_duration INTEGER DEFAULT 25,
      pomodoro_break_duration INTEGER DEFAULT 5,
      pomodoro_long_break_duration INTEGER DEFAULT 15,
      pomodoro_auto_start_breaks INTEGER DEFAULT 0,
      smart_suggestions_enabled INTEGER DEFAULT 1,
      offline_mode INTEGER DEFAULT 0,
      face_id_enabled INTEGER DEFAULT 0,
      app_pin TEXT,
      auto_lock_timeout INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_sub_tasks_task_id ON sub_tasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_sub_tasks_user_id ON sub_tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
    CREATE INDEX IF NOT EXISTS idx_habit_checkins_user_id ON habit_checkins(user_id);
    CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_note_tags_user_id ON note_tags(user_id);
    CREATE INDEX IF NOT EXISTS idx_day_notes_user_id ON day_notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at);
  `);
  
  const addCol = (table: string, col: string, def: string) => {
    try { 
      const info = db.getAllSync<any>(`PRAGMA table_info(${table})`);
      const exists = info.some((c: any) => c.name === col);
      if (!exists) {
        db.execSync(`ALTER TABLE ${table} ADD COLUMN ${col} ${def};`);
        console.log(`[DB] Successfully added column ${col} to ${table}`);
      }
    } catch (e) {
      console.warn(`[DB] Note: Column ${col} in ${table} might already exist or table is missing:`, (e as any).message);
    }
  };

  // Add user_id columns to existing tables for migration
  addCol('tasks', 'user_id', "TEXT NOT NULL DEFAULT 'guest'");
  addCol('tasks', 'updated_at', "TEXT");
  addCol('tasks', 'deleted_at', "TEXT");
  
  addCol('sub_tasks', 'user_id', "TEXT NOT NULL DEFAULT 'guest'");
  addCol('sub_tasks', 'order_index', "INTEGER DEFAULT 0");
  addCol('sub_tasks', 'created_at', "TEXT");
  addCol('sub_tasks', 'updated_at', "TEXT");
  addCol('sub_tasks', 'deleted_at', "TEXT");
  
  addCol('habits', 'user_id', "TEXT NOT NULL DEFAULT 'guest'");
  addCol('habits', 'created_at', "TEXT");
  addCol('habits', 'updated_at', "TEXT");
  addCol('habits', 'deleted_at', "TEXT");
  
  addCol('focus_sessions', 'user_id', "TEXT NOT NULL DEFAULT 'guest'");
  addCol('focus_sessions', 'task_id', "TEXT");
  addCol('focus_sessions', 'completed_at', "TEXT");
  
  addCol('notes', 'user_id', "TEXT NOT NULL DEFAULT 'guest'");
  addCol('notes', 'deleted_at', "TEXT");
  
  addCol('day_notes', 'user_id', "TEXT NOT NULL DEFAULT 'guest'");
  addCol('day_notes', 'id', "TEXT PRIMARY KEY");

  // Standardize tables
  addCol('tasks', 'created_at', "TEXT DEFAULT CURRENT_TIMESTAMP");
  addCol('tasks', 'completed_at', "TEXT");
  addCol('tasks', 'priority', "TEXT DEFAULT 'Medium'");
  addCol('tasks', 'note', "TEXT DEFAULT ''");
  addCol('tasks', 'reminder_time', "TEXT");
  addCol('tasks', 'order_index', "INTEGER DEFAULT 0");
  
  addCol('notes', 'tags', "TEXT DEFAULT '[]'");
  addCol('notes', 'is_pinned', "INTEGER DEFAULT 0");
  addCol('notes', 'audio_uris', "TEXT DEFAULT '[]'");
  addCol('notes', 'drawing_uris', "TEXT DEFAULT '[]'");
  addCol('notes', 'image_uris', "TEXT DEFAULT '[]'");
  addCol('notes', 'folder', "TEXT DEFAULT 'General'");
  
  addCol('habits', 'category', "TEXT DEFAULT 'All'");
  addCol('habits', 'difficulty', "TEXT DEFAULT 'Medium'");
  addCol('habits', 'best_streak', "INTEGER DEFAULT 0");
  addCol('habits', 'frequency', "TEXT DEFAULT 'Daily'");
  addCol('habits', 'is_paused', "INTEGER DEFAULT 0");

  // User Settings additions
  addCol('user_settings', 'default_task_priority', "TEXT DEFAULT 'Medium'");
  addCol('user_settings', 'default_reminder_time', "INTEGER DEFAULT 10");
  addCol('user_settings', 'week_start_day', "TEXT DEFAULT 'Monday'");
  addCol('user_settings', 'auto_sort_tasks', "INTEGER DEFAULT 1");
  addCol('user_settings', 'pomodoro_focus_duration', "INTEGER DEFAULT 25");
  addCol('user_settings', 'pomodoro_break_duration', "INTEGER DEFAULT 5");
  addCol('user_settings', 'pomodoro_long_break_duration', "INTEGER DEFAULT 15");
  addCol('user_settings', 'pomodoro_auto_start_breaks', "INTEGER DEFAULT 0");
  addCol('user_settings', 'smart_suggestions_enabled', "INTEGER DEFAULT 1");
  addCol('user_settings', 'offline_mode', "INTEGER DEFAULT 0");
  addCol('user_settings', 'face_id_enabled', "INTEGER DEFAULT 0");
  addCol('user_settings', 'app_pin', "TEXT");
}


// --- TASKS ---
export function getTasks(userId: string = 'guest') {
  try {
    const tasks = db.getAllSync<any>('SELECT * FROM tasks WHERE user_id = ? AND deleted_at IS NULL ORDER BY order_index ASC', [userId]);
    return tasks.map(t => ({
      ...t,
      completed: Boolean(t.completed),
      sub_tasks: getSubTasksByTaskId(t.id, userId)
    })) as Task[];
  } catch (e) {
    return [];
  }
}

export function getTasksByDate(date: string, userId: string = 'guest'): Task[] {
  try {
    const tasks = db.getAllSync<any>('SELECT * FROM tasks WHERE date = ? AND user_id = ? AND deleted_at IS NULL ORDER BY order_index ASC', [date, userId]);
    return tasks.map(t => ({
      ...t,
      completed: Boolean(t.completed),
      sub_tasks: getSubTasksByTaskId(t.id, userId)
    })) as Task[];
  } catch (e) {
    return [];
  }
}

export function getTasksByDateRange(startDate: string, endDate: string, userId: string = 'guest'): Task[] {
  try {
    const tasks = db.getAllSync<any>(
      'SELECT * FROM tasks WHERE date >= ? AND date <= ? AND user_id = ? AND deleted_at IS NULL ORDER BY date ASC, order_index ASC',
      [startDate, endDate, userId]
    );
    return tasks.map(t => ({
      ...t,
      completed: Boolean(t.completed),
      sub_tasks: getSubTasksByTaskId(t.id, userId)
    })) as Task[];
  } catch (e) {
    return [];
  }
}

export function getOverdueTasks(userId: string = 'guest'): Task[] {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tasks = db.getAllSync<any>(
      'SELECT * FROM tasks WHERE date < ? AND completed = 0 AND user_id = ? AND deleted_at IS NULL ORDER BY date DESC, order_index ASC',
      [today, userId]
    );
    return tasks.map(t => ({
      ...t,
      completed: Boolean(t.completed),
      sub_tasks: getSubTasksByTaskId(t.id, userId)
    })) as Task[];
  } catch (e) {
    return [];
  }
}

export function addTask(task: Partial<Task>) {
  try {
    const id = task.id || Math.random().toString(36).substring(7);
    const created_at = new Date().toISOString();
    const updated_at = new Date().toISOString();
    const order_index = task.order_index ?? 0;
    const title = task.title || 'Untitled Task';
    const date = task.date || created_at.split('T')[0];
    const user_id = task.user_id || 'guest';

    db.runSync(
      `INSERT INTO tasks (id, user_id, title, date, time_block, priority, note, reminder_time, order_index, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        id,
        user_id,
        title,
        date,
        task.time_block || '',
        task.priority || 'Medium',
        task.note || '',
        task.reminder_time || null,
        order_index,
        created_at,
        updated_at,
      ]
    );
    return {
      id,
      user_id,
      title,
      date,
      time_block: task.time_block || '',
      priority: task.priority || 'Medium',
      note: task.note || '',
      reminder_time: task.reminder_time || null,
      reminder_offset: task.reminder_offset || null,
      reminder_scheduled: task.reminder_scheduled || false,
      order_index,
      completed: false,
      completed_at: null,
      created_at,
      updated_at,
      deleted_at: null,
      sub_tasks: [],
    } as Task;
  } catch (e) {
    console.error("[DB] addTask error:", e);
    return null;
  }
}

export function updateTask(id: string, updates: Partial<Task>) {
  try {
    const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'sub_tasks');
    if (keys.length === 0) return;
    
    const setClause = [...keys.map(k => `${k} = ?`), 'updated_at = ?'].join(', ');
    const values = keys.map(k => {
      const val = (updates as any)[k];
      if (typeof val === 'boolean') return val ? 1 : 0;
      return val;
    });
    db.runSync(`UPDATE tasks SET ${setClause} WHERE id = ?`, [...values, new Date().toISOString(), id]);
  } catch (e) {}
}

export function deleteTask(id: string) {
  try {
    db.runSync('UPDATE tasks SET deleted_at = ? WHERE id = ?', [new Date().toISOString(), id]);
  } catch (e) {}
}

export function reorderTasks(taskIds: string[]) {
  try {
    for (let i = 0; i < taskIds.length; i++) {
      db.runSync('UPDATE tasks SET order_index = ? WHERE id = ?', [i, taskIds[i]]);
    }
  } catch (e) {}
}

// --- SUB-TASKS ---
export function getSubTasksByTaskId(taskId: string, userId: string = 'guest'): SubTask[] {
  try {
    const subs = db.getAllSync<any>('SELECT * FROM sub_tasks WHERE task_id = ? AND user_id = ? AND deleted_at IS NULL', [taskId, userId]);
    return subs.map(s => ({ ...s, completed: Boolean(s.completed) }));
  } catch (e) {
    return [];
  }
}

export function createSubTask(taskId: string, title: string, userId: string = 'guest') {
  try {
    const id = Math.random().toString(36).substring(7);
    const created_at = new Date().toISOString();
    const updated_at = new Date().toISOString();
    db.runSync(
      'INSERT INTO sub_tasks (id, task_id, user_id, title, completed, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
      [id, taskId, userId, title, created_at, updated_at]
    );
    return { id, task_id: taskId, user_id: userId, title, completed: false, order_index: 0, created_at, updated_at, deleted_at: null } as SubTask;
  } catch (e) {
    return null;
  }
}

export function toggleSubTaskComplete(id: string) {
  try {
    const sub = db.getFirstSync<any>('SELECT completed FROM sub_tasks WHERE id = ?', [id]);
    if (!sub) return;
    db.runSync('UPDATE sub_tasks SET completed = ?, updated_at = ? WHERE id = ?', [sub.completed ? 0 : 1, new Date().toISOString(), id]);
  } catch (e) {}
}

export function deleteSubTask(id: string) {
  try {
    db.runSync('UPDATE sub_tasks SET deleted_at = ? WHERE id = ?', [new Date().toISOString(), id]);
  } catch (e) {}
}

export function getTaskStats(date: string, userId: string = 'guest') {
  try {
    const total = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM tasks WHERE date = ? AND user_id = ? AND deleted_at IS NULL', [date, userId])?.count || 0;
    const completed = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM tasks WHERE date = ? AND completed = 1 AND user_id = ? AND deleted_at IS NULL', [date, userId])?.count || 0;
    return { total, completed };
  } catch (e) {
    return { total: 0, completed: 0 };
  }
}

// --- HABITS ---
export function getHabits(userId: string = 'guest') {
  try {
    const habits = db.getAllSync<any>('SELECT * FROM habits WHERE user_id = ? AND deleted_at IS NULL', [userId]);
    return habits.map(h => ({ ...h, is_paused: Boolean(h.is_paused) })) as Habit[];
  } catch (e) {
    return [];
  }
}

export function addHabit(habit: Partial<Habit>) {
  const userId = habit.user_id || 'guest';
  const id = habit.id || Math.random().toString(36).substring(7);
  const created_at = habit.created_at || new Date().toISOString();
  const updated_at = new Date().toISOString();
  const dates_completed = habit.dates_completed || '[]';
  const streak = habit.streak || 0;
  const best_streak = habit.best_streak || 0;
  const category = habit.category || 'All';
  const difficulty = habit.difficulty || 'Medium';

  db.runSync(
    `INSERT INTO habits (id, user_id, title, frequency, dates_completed, streak, best_streak, category, difficulty, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, habit.title || '', habit.frequency || 'daily', dates_completed, streak, best_streak, category, difficulty, created_at, updated_at]
  );

  return {
    id,
    user_id: userId,
    title: habit.title || '',
    frequency: habit.frequency || 'daily',
    dates_completed,
    streak,
    best_streak,
    category,
    difficulty,
    created_at,
    updated_at,
  } as Habit;
}

export function updateHabit(id: string, updates: Partial<Habit>) {
  const updated_at = new Date().toISOString();
  const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'user_id' && k !== 'created_at');
  if (keys.length === 0) return;
  
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (updates as any)[k]);
  
  db.runSync(
    `UPDATE habits SET ${setClause}, updated_at = ? WHERE id = ?`,
    [...values, updated_at, id]
  );
}

// --- NOTES ---
export function getNotes(userId: string = 'guest') {
  try {
    const notes = db.getAllSync<any>('SELECT * FROM notes WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC', [userId]);
    return notes.map(n => ({
      ...n,
      is_locked: Boolean(n.is_locked),
      is_pinned: Boolean(n.is_pinned),
      audio_uris: JSON.parse(n.audio_uris || '[]'),
      drawing_uris: JSON.parse(n.drawing_uris || '[]'),
      image_uris: JSON.parse(n.image_uris || '[]'),
      tags: JSON.parse(n.tags || '[]')
    })) as Note[];
  } catch (e) {
    return [];
  }
}

export function addNote(note: Partial<Note>) {
  try {
    const id = Math.random().toString(36).substring(7);
    const now = new Date().toISOString();
    const title = note.title || 'Untitled Note';
    const user_id = note.user_id || 'guest';
    db.runSync(
      `INSERT INTO notes (id, user_id, title, content, is_locked, is_pinned, audio_uris, drawing_uris, image_uris, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user_id,
        title, 
        note.content || '', 
        note.is_locked ? 1 : 0, 
        note.is_pinned ? 1 : 0, 
        JSON.stringify(note.audio_uris || []), 
        JSON.stringify(note.drawing_uris || []), 
        JSON.stringify(note.image_uris || []), 
        JSON.stringify(note.tags || []),
        now, 
        now
      ]
    );
    return { 
      ...note, 
      id, 
      user_id,
      title,
      is_locked: !!note.is_locked, 
      is_pinned: !!note.is_pinned,
      audio_uris: note.audio_uris || [],
      drawing_uris: note.drawing_uris || [],
      image_uris: note.image_uris || [],
      tags: note.tags || [],
      created_at: now, 
      updated_at: now,
      folder: note.folder || 'General',
      deleted_at: null
    } as Note;
  } catch (e) {
    return null;
  }
}

export function updateNote(id: string, updates: Partial<Note>) {
  try {
    const now = new Date().toISOString();
    const keys = Object.keys(updates).filter(k => k !== 'id');
    if (keys.length === 0) return;
    
    const setClause = [...keys.map(k => `${k} = ?`), 'updated_at = ?'].join(', ');
    const values = keys.map(k => {
      const val = (updates as any)[k];
      if (Array.isArray(val)) return JSON.stringify(val);
      if (typeof val === 'boolean') return val ? 1 : 0;
      return val;
    });
    db.runSync(`UPDATE notes SET ${setClause} WHERE id = ?`, [...values, now, id]);
  } catch (e) {}
}

export function deleteNote(id: string) {
  try {
    db.runSync('UPDATE notes SET deleted_at = ? WHERE id = ?', [new Date().toISOString(), id]);
  } catch (e) {}
}

// --- FOCUS ---
export function getFocusSessions(userId: string = 'guest') {
  try {
    return db.getAllSync<FocusSession>('SELECT * FROM focus_sessions WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  } catch (e) {
    return [];
  }
}

export function addFocusSession(session: Partial<FocusSession>) {
  try {
    const id = Math.random().toString(36).substring(7);
    const now = new Date().toISOString();
    const duration_minutes = session.duration_minutes || 0;
    const mode = session.mode || 'Focus';
    const date = session.date || now.split('T')[0];
    const user_id = session.user_id || 'guest';

    db.runSync(
      `INSERT INTO focus_sessions (id, user_id, duration_minutes, mode, task_id, completed_at, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user_id, duration_minutes, mode, session.task_id || null, session.completed_at || null, date, now]
    );
    return { ...session, id, user_id, duration_minutes, mode, task_id: session.task_id || null, completed_at: session.completed_at || null, date, created_at: now } as FocusSession;
  } catch (e) {
    return null;
  }
}

export function clearLocalData(userId: string) {
  try {
    db.runSync('DELETE FROM tasks WHERE user_id = ?', [userId]);
    db.runSync('DELETE FROM sub_tasks WHERE user_id = ?', [userId]);
    db.runSync('DELETE FROM habits WHERE user_id = ?', [userId]);
    db.runSync('DELETE FROM habit_checkins WHERE user_id = ?', [userId]);
    db.runSync('DELETE FROM focus_sessions WHERE user_id = ?', [userId]);
    db.runSync('DELETE FROM notes WHERE user_id = ?', [userId]);
    db.runSync('DELETE FROM note_tags WHERE user_id = ?', [userId]);
    db.runSync('DELETE FROM day_notes WHERE user_id = ?', [userId]);
    db.runSync('DELETE FROM user_settings WHERE user_id = ?', [userId]);
    console.log(`[DB] Cleared all local data for user_id: ${userId}`);
  } catch (e) {
    console.error('[DB] Error clearing local data:', e);
  }
}

export function migrateGuestData(guestUserId: string, newUserId: string) {
  try {
    db.runSync('UPDATE tasks SET user_id = ? WHERE user_id = ?', [newUserId, guestUserId]);
    db.runSync('UPDATE sub_tasks SET user_id = ? WHERE user_id = ?', [newUserId, guestUserId]);
    db.runSync('UPDATE habits SET user_id = ? WHERE user_id = ?', [newUserId, guestUserId]);
    db.runSync('UPDATE habit_checkins SET user_id = ? WHERE user_id = ?', [newUserId, guestUserId]);
    db.runSync('UPDATE focus_sessions SET user_id = ? WHERE user_id = ?', [newUserId, guestUserId]);
    db.runSync('UPDATE notes SET user_id = ? WHERE user_id = ?', [newUserId, guestUserId]);
    db.runSync('UPDATE note_tags SET user_id = ? WHERE user_id = ?', [newUserId, guestUserId]);
    db.runSync('UPDATE day_notes SET user_id = ? WHERE user_id = ?', [newUserId, guestUserId]);
    db.runSync('UPDATE user_settings SET user_id = ? WHERE user_id = ?', [newUserId, guestUserId]);
    console.log(`[DB] Migrated guest data from ${guestUserId} to ${newUserId}`);
  } catch (e) {
    console.error('[DB] Error migrating guest data:', e);
  }
}

export function getUserSettings(userId: string) {
  try {
    const result = db.getFirstSync<any>('SELECT * FROM user_settings WHERE user_id = ?', [userId]);
    if (result) {
      return {
        theme: result.theme || 'light',
        notificationsEnabled: !!result.notifications_enabled,
        tasksLayout: result.tasks_layout || 'list',
        habitsLayout: result.habits_layout || 'grid',
        notesLayout: result.notes_layout || 'grid',
        isUpdateBannerDismissed: !!result.is_update_banner_dismissed,
        defaultFocusDuration: result.default_focus_duration || 25,
        dailyGoal: result.daily_goal || 5,
        focusTimerActive: !!result.focus_timer_active,
        focusTimerTimeLeft: result.focus_timer_time_left || 1500,
        focusTimerMode: result.focus_timer_mode || 'Study',
        focusTimerDurationMinutes: result.focus_timer_duration_minutes || 25,
        focusTimerSelectedTaskId: result.focus_timer_selected_task_id || null,
        focusTimerStartTime: result.focus_timer_start_time || null,
        defaultTaskPriority: result.default_task_priority || 'Medium',
        defaultReminderTime: result.default_reminder_time ?? 10,
        weekStartDay: result.week_start_day || 'Monday',
        autoSortTasks: !!result.auto_sort_tasks,
        pomodoroFocusDuration: result.pomodoro_focus_duration ?? 25,
        pomodoroBreakDuration: result.pomodoro_break_duration ?? 5,
        pomodoroLongBreakDuration: result.pomodoro_long_break_duration ?? 15,
        pomodoroAutoStartBreaks: !!result.pomodoro_auto_start_breaks,
        smartSuggestionsEnabled: !!result.smart_suggestions_enabled,
        offlineMode: !!result.offline_mode,
        faceIdEnabled: !!result.face_id_enabled,
        appPin: result.app_pin || null,
        autoLockTimeout: result.auto_lock_timeout || 0,
        updated_at: result.updated_at || null,
      };
    }
    return null;
  } catch (e) {
    console.error('[DB] Error getting user settings:', e);
    return null;
  }
}

export function saveUserSettings(userId: string, settings: any) {
  try {
    const now = new Date().toISOString();
    db.runSync(
      `INSERT OR REPLACE INTO user_settings 
       (user_id, theme, notifications_enabled, tasks_layout, habits_layout, notes_layout, 
        is_update_banner_dismissed, default_focus_duration, daily_goal, focus_timer_active, 
        focus_timer_time_left, focus_timer_mode, focus_timer_duration_minutes, focus_timer_selected_task_id, 
        focus_timer_start_time, default_task_priority, default_reminder_time, week_start_day, 
        auto_sort_tasks, pomodoro_focus_duration, pomodoro_break_duration, pomodoro_long_break_duration, 
        pomodoro_auto_start_breaks, smart_suggestions_enabled, offline_mode, face_id_enabled, app_pin, auto_lock_timeout, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        settings.theme || 'light',
        settings.notificationsEnabled ? 1 : 0,
        settings.tasksLayout || 'list',
        settings.habitsLayout || 'grid',
        settings.notesLayout || 'grid',
        settings.isUpdateBannerDismissed ? 1 : 0,
        settings.defaultFocusDuration || 25,
        settings.dailyGoal || 5,
        settings.focusTimerActive ? 1 : 0,
        settings.focusTimerTimeLeft || 1500,
        settings.focusTimerMode || 'Study',
        settings.focusTimerDurationMinutes || 25,
        settings.focusTimerSelectedTaskId || null,
        settings.focusTimerStartTime || null,
        settings.defaultTaskPriority || 'Medium',
        settings.defaultReminderTime ?? 10,
        settings.weekStartDay || 'Monday',
        settings.autoSortTasks ? 1 : 0,
        settings.pomodoroFocusDuration ?? 25,
        settings.pomodoroBreakDuration ?? 5,
        settings.pomodoroLongBreakDuration ?? 15,
        settings.pomodoroAutoStartBreaks ? 1 : 0,
        settings.smartSuggestionsEnabled ? 1 : 0,
        settings.offlineMode ? 1 : 0,
        settings.faceIdEnabled ? 1 : 0,
        settings.appPin || null,
        settings.autoLockTimeout || 0,
        now
      ]
    );
    console.log(`[DB] Saved settings for user_id: ${userId}`);
  } catch (e) {
    console.error('[DB] Error saving user settings:', e);
  }
}
