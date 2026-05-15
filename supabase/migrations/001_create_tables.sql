-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time_block TEXT,
  priority TEXT DEFAULT 'Medium',
  note TEXT,
  reminder_time TEXT,
  order_index INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- RLS Policies for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- SUB_TASKS TABLE
CREATE TABLE IF NOT EXISTS sub_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- RLS Policies for sub_tasks
ALTER TABLE sub_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sub_tasks"
  ON sub_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sub_tasks"
  ON sub_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sub_tasks"
  ON sub_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sub_tasks"
  ON sub_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- HABITS TABLE
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  frequency TEXT DEFAULT 'daily',
  dates_completed TEXT DEFAULT '[]',
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  is_paused BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- RLS Policies for habits
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own habits"
  ON habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits"
  ON habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
  ON habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
  ON habits FOR DELETE
  USING (auth.uid() = user_id);

-- HABIT_CHECKINS TABLE
CREATE TABLE IF NOT EXISTS habit_checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- RLS Policies for habit_checkins
ALTER TABLE habit_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own habit_checkins"
  ON habit_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habit_checkins"
  ON habit_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit_checkins"
  ON habit_checkins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit_checkins"
  ON habit_checkins FOR DELETE
  USING (auth.uid() = user_id);

-- FOCUS_SESSIONS TABLE
CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- RLS Policies for focus_sessions
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own focus_sessions"
  ON focus_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own focus_sessions"
  ON focus_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus_sessions"
  ON focus_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus_sessions"
  ON focus_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- NOTES TABLE
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  audio_uris TEXT DEFAULT '[]',
  drawing_uris TEXT DEFAULT '[]',
  image_uris TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- RLS Policies for notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- NOTE_TAGS TABLE
CREATE TABLE IF NOT EXISTS note_tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- RLS Policies for note_tags
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own note_tags"
  ON note_tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own note_tags"
  ON note_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own note_tags"
  ON note_tags FOR DELETE
  USING (auth.uid() = user_id);

-- DAY_NOTES TABLE
CREATE TABLE IF NOT EXISTS day_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL UNIQUE,
  note_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- RLS Policies for day_notes
ALTER TABLE day_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own day_notes"
  ON day_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own day_notes"
  ON day_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own day_notes"
  ON day_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own day_notes"
  ON day_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_user_id ON sub_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_task_id ON sub_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_deleted_at ON habits(deleted_at);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_user_id ON habit_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_habit_id ON habit_checkins(habit_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_note_tags_user_id ON note_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_day_notes_user_id ON day_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_day_notes_date ON day_notes(date);
