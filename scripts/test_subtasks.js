const Database = require('better-sqlite3');
const db = new Database(':memory:');

db.exec(`
  CREATE TABLE tasks (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'guest',
    title TEXT NOT NULL,
    time_block TEXT,
    due_time TEXT,
    date TEXT,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    priority TEXT DEFAULT 'medium',
    note TEXT,
    reminder_time TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
  );
  CREATE TABLE sub_tasks (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'guest',
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
  );
`);

// Create a task
const taskId = 'task_123';
const userId = 'c29cb0ce-4c80-44c4-a13f-6f70473afc3b';
db.prepare('INSERT INTO tasks (id, user_id, title, date, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
  taskId, userId, 'My Test Task', '2026-10-22', 'medium', new Date().toISOString(), new Date().toISOString()
);

// Now simulate db.updateTask with checklist items!
const updates = {
  title: 'My Test Task',
  note: '',
  priority: 'medium',
  date: '2026-10-22',
  due_time: null,
  time_block: null,
  sub_tasks: [
    { id: 'st_1', task_id: taskId, title: 'Item 1', completed: false, order_index: 0 },
    { id: 'st_2', task_id: taskId, title: 'Item 2', completed: false, order_index: 1 }
  ]
};

const taskRow = db.prepare('SELECT user_id FROM tasks WHERE id = ?').get(taskId);
console.log('taskRow:', taskRow);

const currentSubs = db.prepare('SELECT id FROM sub_tasks WHERE task_id = ? AND deleted_at IS NULL').all(taskId);
const currentIds = new Set(currentSubs.map(s => s.id));
const incomingIds = new Set();
const now = new Date().toISOString();

for (let i = 0; i < updates.sub_tasks.length; i++) {
  const st = updates.sub_tasks[i];
  const stTitle = typeof st === 'string' ? st : (st?.title || '');
  if (!stTitle.trim()) continue;
  const subId = (typeof st === 'object' && st.id) ? st.id : Math.random().toString(36).substring(7);
  const completed = (typeof st === 'object' && st.completed) ? 1 : 0;
  const orderIndex = (typeof st === 'object' && typeof st.order_index === 'number') ? st.order_index : i;
  incomingIds.add(subId);

  const existing = db.prepare('SELECT id FROM sub_tasks WHERE id = ?').get(subId);
  if (existing) {
    db.prepare('UPDATE sub_tasks SET title = ?, completed = ?, order_index = ?, updated_at = ?, deleted_at = NULL WHERE id = ?')
      .run(stTitle.trim(), completed, orderIndex, now, subId);
  } else {
    db.prepare('INSERT INTO sub_tasks (id, task_id, user_id, title, completed, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(subId, taskId, taskRow.user_id, stTitle.trim(), completed, orderIndex, now, now);
  }
}

const savedSubs = db.prepare('SELECT * FROM sub_tasks WHERE task_id = ?').all(taskId);
console.log('Saved subtasks in DB:', savedSubs);

const retrievedSubs = db.prepare(
  "SELECT * FROM sub_tasks WHERE task_id = ? AND (user_id = ? OR user_id = 'guest' OR ? = 'guest') AND deleted_at IS NULL ORDER BY order_index ASC"
).all(taskId, userId, userId);
console.log('Retrieved via getSubTasksByTaskId:', retrievedSubs);
