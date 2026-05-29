-- Migration to add missing columns in tasks, habits, and notes tables to align with client-side SQLite database.

-- 1. ALIGN TASKS TABLE
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reminder_time TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_at TEXT;

-- 2. ALIGN HABITS TABLE
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'daily';
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT (now()::text);
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS deleted_at TEXT;

-- 3. ALIGN NOTES TABLE
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS audio_uris TEXT DEFAULT '[]';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS drawing_uris TEXT DEFAULT '[]';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS image_uris TEXT DEFAULT '[]';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '[]';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS deleted_at TEXT;

-- Re-apply RLS permissions checks to guarantee operations are allowed
GRANT ALL ON TABLE public.tasks TO authenticated;
GRANT ALL ON TABLE public.habits TO authenticated;
GRANT ALL ON TABLE public.notes TO authenticated;
