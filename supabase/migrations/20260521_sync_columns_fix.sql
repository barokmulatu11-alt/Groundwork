-- ============================================================
-- SCHEMA ALIGNMENT FIX FOR SYNCING
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yevrsmlwmegovfwdxpjw/sql
-- ============================================================

-- 1. ALIGN HABITS TABLE
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'All';
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Medium';

-- 2. ALIGN NOTES TABLE
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT 'General';

-- 3. ALIGN FOCUS_SESSIONS TABLE
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'Focus';
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS date TEXT;

-- Make started_at nullable in focus_sessions to support client-side sync without violating non-null constraints
ALTER TABLE public.focus_sessions ALTER COLUMN started_at DROP NOT NULL;
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS updated_at TEXT DEFAULT (now()::text);

-- Re-apply RLS permissions check to make sure they are correct
GRANT ALL ON TABLE public.habits TO authenticated;
GRANT ALL ON TABLE public.notes TO authenticated;
GRANT ALL ON TABLE public.focus_sessions TO authenticated;
