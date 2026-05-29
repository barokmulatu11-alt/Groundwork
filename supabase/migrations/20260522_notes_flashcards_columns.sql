-- Align public.notes with mobile SQLite schema (flashcards, formulas, study fields)
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT 'General';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS study_hours REAL DEFAULT 0;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS revision_score INTEGER DEFAULT 0;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS last_reviewed_at TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS flashcards TEXT DEFAULT '[]';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS formulas TEXT DEFAULT '[]';
