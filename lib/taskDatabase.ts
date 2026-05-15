import { db } from './db';

export interface Task {
  id: string;
  title: string;
  note: string;
  date: string;
  time_block: string | null;
  completed: boolean;
  completed_at: string | null;
  priority: 'low' | 'medium' | 'high';
  reminder_offset: number | null;
  reminder_scheduled: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  sub_tasks?: SubTask[];
}

export interface SubTask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  order_index: number;
  created_at: string;
}

export interface TaskInput extends Partial<Task> {
  title: string;
  date: string;
}

export interface SubTaskInput extends Partial<SubTask> {
  task_id: string;
  title: string;
}

// Ensure booleans are converted to/from SQLite integers
const parseTask = (row: any): Task => ({
  ...row,
  completed: Boolean(row.completed),
  reminder_scheduled: Boolean(row.reminder_scheduled),
});

const parseSubTask = (row: any): SubTask => ({
  ...row,
  completed: Boolean(row.completed),
});

export const initTaskDatabase = () => {
  // Initialization only creates tables if they don't exist
  db.execSync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      note TEXT DEFAULT '',
      date TEXT NOT NULL,
      time_block TEXT DEFAULT NULL,
      completed INTEGER DEFAULT 0,
      completed_at TEXT DEFAULT NULL,
      priority TEXT DEFAULT 'medium',
      reminder_offset INTEGER DEFAULT NULL,
      reminder_scheduled INTEGER DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sub_tasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_day_notes (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks (date);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks (completed);
    CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON sub_tasks (task_id);
  `);
};

export const getTasksByDate = (date: string): Task[] => {
  const tasks = db.getAllSync('SELECT * FROM tasks WHERE date = ? ORDER BY order_index ASC', [date]) as any[];
  return tasks.map(parseTask).map(task => ({
    ...task,
    sub_tasks: getSubTasksByTaskId(task.id)
  }));
};

export const getTasksByDateRange = (startDate: string, endDate: string): Task[] => {
  const tasks = db.getAllSync(
    'SELECT * FROM tasks WHERE date >= ? AND date <= ? ORDER BY date ASC, order_index ASC',
    [startDate, endDate]
  ) as any[];
  return tasks.map(parseTask);
};

export const getTaskById = (id: string): Task | null => {
  const task = db.getFirstSync('SELECT * FROM tasks WHERE id = ?', [id]) as any;
  if (!task) return null;
  return {
    ...parseTask(task),
    sub_tasks: getSubTasksByTaskId(id)
  };
};

export const createTask = (task: TaskInput): Task => {
  const id = task.id || Date.now().toString();
  const now = new Date().toISOString();
  
  db.runSync(
    `INSERT INTO tasks (
      id, title, note, date, time_block, completed, priority, 
      reminder_offset, reminder_scheduled, order_index, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      task.title,
      task.note || '',
      task.date,
      task.time_block || null,
      task.completed ? 1 : 0,
      task.priority || 'medium',
      task.reminder_offset || null,
      task.reminder_scheduled ? 1 : 0,
      task.order_index || 0,
      now,
      now
    ]
  );
  
  return getTaskById(id)!;
};

export const updateTask = (id: string, updates: Partial<Task>) => {
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => {
    const val = (updates as any)[k];
    if (typeof val === 'boolean') return val ? 1 : 0;
    return val;
  });
  
  db.runSync(`UPDATE tasks SET ${setClause}, updated_at = ? WHERE id = ?`, [...values, new Date().toISOString(), id]);
};

export const deleteTask = (id: string) => {
  db.runSync('DELETE FROM tasks WHERE id = ?', [id]);
};

export const toggleTaskComplete = (id: string) => {
  const task = getTaskById(id);
  if (!task) return;
  
  const newCompleted = !task.completed;
  const completedAt = newCompleted ? new Date().toISOString() : null;
  
  db.runSync(
    'UPDATE tasks SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?',
    [newCompleted ? 1 : 0, completedAt, new Date().toISOString(), id]
  );
};

export const reorderTasks = (taskIds: string[]) => {
  for (let i = 0; i < taskIds.length; i++) {
    db.runSync('UPDATE tasks SET order_index = ?, updated_at = ? WHERE id = ?', [i, new Date().toISOString(), taskIds[i]]);
  }
};

export const getSubTasksByTaskId = (taskId: string): SubTask[] => {
  const subs = db.getAllSync('SELECT * FROM sub_tasks WHERE task_id = ? ORDER BY order_index ASC', [taskId]) as any[];
  return subs.map(parseSubTask);
};

export const createSubTask = (subTask: SubTaskInput): SubTask => {
  const id = subTask.id || Date.now().toString();
  const now = new Date().toISOString();
  
  db.runSync(
    `INSERT INTO sub_tasks (id, task_id, title, completed, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      subTask.task_id,
      subTask.title,
      subTask.completed ? 1 : 0,
      subTask.order_index || 0,
      now
    ]
  );
  
  const res = db.getFirstSync('SELECT * FROM sub_tasks WHERE id = ?', [id]) as any;
  return parseSubTask(res);
};

export const toggleSubTaskComplete = (id: string) => {
  const sub = db.getFirstSync('SELECT completed FROM sub_tasks WHERE id = ?', [id]) as any;
  if (!sub) return;
  db.runSync('UPDATE sub_tasks SET completed = ? WHERE id = ?', [sub.completed ? 0 : 1, id]);
};

export const deleteSubTask = (id: string) => {
  db.runSync('DELETE FROM sub_tasks WHERE id = ?', [id]);
};

export const getTaskStats = (date: string) => {
  const total = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM tasks WHERE date = ?', [date])?.count || 0;
  const completed = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM tasks WHERE date = ? AND completed = 1', [date])?.count || 0;
  return { total, completed };
};

export const getOverdueTasks = (): Task[] => {
  const today = new Date().toISOString().split('T')[0];
  const tasks = db.getAllSync('SELECT * FROM tasks WHERE date < ? AND completed = 0 ORDER BY date DESC, order_index ASC', [today]) as any[];
  return tasks.map(parseTask);
};

// Initialize DB on file load
initTaskDatabase();
