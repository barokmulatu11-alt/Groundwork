-- ============================================================
-- DEFINITIVE SCHEMA & RLS FIX — Run this ONCE in Supabase SQL Editor
-- https://supabase.com/dashboard/project/yevrsmlwmegovfwdxpjw/sql
-- ============================================================

-- ============================================================
-- PART 1: ENSURE ALL ADMIN & SYSTEM TABLES EXIST
-- ============================================================

-- 1. PROFILES (UUID)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'owner')),
  pro_status BOOLEAN DEFAULT false,
  pro_until TIMESTAMPTZ,
  is_banned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure profiles has settings, email, provider columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider TEXT;

-- 2. FEATURE_FLAGS (UUID)
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ANNOUNCEMENTS (UUID)
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, warning, maintenance
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 4. REPORTS (UUID)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  type TEXT NOT NULL, -- bug, suggestion, problem
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, resolved, dismissed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REMOTE_CONFIG
CREATE TABLE IF NOT EXISTS public.remote_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SUBSCRIPTIONS (UUID)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  plan TEXT NOT NULL, -- basic, pro, lifetime
  status TEXT NOT NULL, -- active, expired, cancelled
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. USER_NOTIFICATIONS (UUID)
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, success, warning
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PART 2: ENSURE ALL PRODUCTIVITY BASE TABLES EXIST (TEXT keys)
-- ============================================================

-- 8. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time_block TEXT,
  priority TEXT DEFAULT 'Medium',
  note TEXT,
  reminder_time TEXT,
  order_index INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  deleted_at TEXT
);

-- 9. SUB_TASKS
CREATE TABLE IF NOT EXISTS public.sub_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  deleted_at TEXT
);

-- 10. HABITS
CREATE TABLE IF NOT EXISTS public.habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  frequency TEXT DEFAULT 'daily',
  dates_completed TEXT DEFAULT '[]',
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  is_paused BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  deleted_at TEXT
);

-- 11. HABIT_CHECKINS
CREATE TABLE IF NOT EXISTS public.habit_checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  habit_id TEXT NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text)
);

-- 12. FOCUS_SESSIONS
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  task_id TEXT REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text)
);

-- 13. NOTES
CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  content TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  audio_uris TEXT DEFAULT '[]',
  drawing_uris TEXT DEFAULT '[]',
  image_uris TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  deleted_at TEXT
);

-- 14. NOTE_TAGS
CREATE TABLE IF NOT EXISTS public.note_tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  note_id TEXT NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

-- 15. DAY_NOTES
CREATE TABLE IF NOT EXISTS public.day_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  note_text TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text)
);

-- ============================================================
-- PART 3: ENSURE ALL SOCIAL/CONNECT TABLES EXIST
-- ============================================================

CREATE TABLE IF NOT EXISTS public.connect_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT NULL,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  productivity_category TEXT DEFAULT 'General',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tasks_completed_count INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  focus_hours INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.connect_social_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.connect_achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.connect_follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT connect_follows_unique UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS public.connect_xp_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.connect_friendships (
  id TEXT PRIMARY KEY,
  user_id1 TEXT NOT NULL,
  user_id2 TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT connect_friendships_users_unique UNIQUE(user_id1, user_id2)
);

CREATE TABLE IF NOT EXISTS public.connect_friend_requests (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT connect_friend_requests_unique UNIQUE(sender_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS public.connect_blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT connect_blocks_unique UNIQUE(blocker_id, blocked_id)
);

-- ============================================================
-- PART 4: ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remote_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.connect_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_blocks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 5: RECURSION-FREE ROLE CHECK FUNCTION (SECURITY DEFINER)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = auth.uid()::text AND role IN ('admin', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PART 6: APPLY RLS POLICIES USING RECURSION-FREE ADMIN CHECK
-- ============================================================

-- 1. PROFILES
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are manageable by admins" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Users can update their own profiles" ON public.profiles FOR UPDATE USING (id::text = auth.uid()::text) WITH CHECK (id::text = auth.uid()::text);

-- 2. TASKS
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can manage all tasks" ON public.tasks;

CREATE POLICY "Users can view their own tasks" ON public.tasks FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert their own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own tasks" ON public.tasks FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own tasks" ON public.tasks FOR DELETE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all tasks" ON public.tasks FOR ALL TO authenticated USING (public.is_admin());

-- 3. HABITS
DROP POLICY IF EXISTS "Users can view their own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can insert their own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can update their own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can delete their own habits" ON public.habits;
DROP POLICY IF EXISTS "Admins can manage all habits" ON public.habits;

CREATE POLICY "Users can view their own habits" ON public.habits FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert their own habits" ON public.habits FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own habits" ON public.habits FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own habits" ON public.habits FOR DELETE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all habits" ON public.habits FOR ALL TO authenticated USING (public.is_admin());

-- 4. SUB_TASKS
DROP POLICY IF EXISTS "Users can view their own sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Users can insert their own sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Users can update their own sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Users can delete their own sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Admins can manage all sub_tasks" ON public.sub_tasks;

CREATE POLICY "Users can view their own sub_tasks" ON public.sub_tasks FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert their own sub_tasks" ON public.sub_tasks FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own sub_tasks" ON public.sub_tasks FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own sub_tasks" ON public.sub_tasks FOR DELETE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all sub_tasks" ON public.sub_tasks FOR ALL TO authenticated USING (public.is_admin());

-- 5. FOCUS_SESSIONS
DROP POLICY IF EXISTS "Users can view their own focus_sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Users can insert their own focus_sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Users can update their own focus_sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Users can delete their own focus_sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Admins can manage all focus_sessions" ON public.focus_sessions;

CREATE POLICY "Users can view their own focus_sessions" ON public.focus_sessions FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert their own focus_sessions" ON public.focus_sessions FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own focus_sessions" ON public.focus_sessions FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own focus_sessions" ON public.focus_sessions FOR DELETE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all focus_sessions" ON public.focus_sessions FOR ALL TO authenticated USING (public.is_admin());

-- 6. NOTES
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
DROP POLICY IF EXISTS "Admins can manage all notes" ON public.notes;

CREATE POLICY "Users can view their own notes" ON public.notes FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert their own notes" ON public.notes FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all notes" ON public.notes FOR ALL TO authenticated USING (public.is_admin());

-- 7. NOTE_TAGS
DROP POLICY IF EXISTS "Users can view their own note_tags" ON public.note_tags;
DROP POLICY IF EXISTS "Users can insert their own note_tags" ON public.note_tags;
DROP POLICY IF EXISTS "Users can delete their own note_tags" ON public.note_tags;
DROP POLICY IF EXISTS "Admins can manage all note_tags" ON public.note_tags;

CREATE POLICY "Users can view their own note_tags" ON public.note_tags FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert their own note_tags" ON public.note_tags FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own note_tags" ON public.note_tags FOR DELETE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all note_tags" ON public.note_tags FOR ALL TO authenticated USING (public.is_admin());

-- 8. DAY_NOTES
DROP POLICY IF EXISTS "Users can view their own day_notes" ON public.day_notes;
DROP POLICY IF EXISTS "Users can insert their own day_notes" ON public.day_notes;
DROP POLICY IF EXISTS "Users can update their own day_notes" ON public.day_notes;
DROP POLICY IF EXISTS "Users can delete their own day_notes" ON public.day_notes;
DROP POLICY IF EXISTS "Admins can manage all day_notes" ON public.day_notes;

CREATE POLICY "Users can view their own day_notes" ON public.day_notes FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert their own day_notes" ON public.day_notes FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own day_notes" ON public.day_notes FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all day_notes" ON public.day_notes FOR ALL TO authenticated USING (public.is_admin());

-- 9. HABIT_CHECKINS
DROP POLICY IF EXISTS "Users can manage their own habit_checkins" ON public.habit_checkins;
DROP POLICY IF EXISTS "Users can view their own habit_checkins" ON public.habit_checkins;
DROP POLICY IF EXISTS "Users can insert their own habit_checkins" ON public.habit_checkins;
DROP POLICY IF EXISTS "Users can update their own habit_checkins" ON public.habit_checkins;
DROP POLICY IF EXISTS "Users can delete their own habit_checkins" ON public.habit_checkins;
DROP POLICY IF EXISTS "Admins can manage all habit_checkins" ON public.habit_checkins;

CREATE POLICY "Users can manage their own habit_checkins" ON public.habit_checkins FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all habit_checkins" ON public.habit_checkins FOR ALL TO authenticated USING (public.is_admin());

-- 10. USER_NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can manage their own user_notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Admins can manage all user_notifications" ON public.user_notifications;

CREATE POLICY "Users can manage their own user_notifications" ON public.user_notifications FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all user_notifications" ON public.user_notifications FOR ALL TO authenticated USING (public.is_admin());

-- 11. REPORTS
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Reports are manageable by admins" ON public.reports;

CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Reports are manageable by admins" ON public.reports FOR ALL TO authenticated USING (public.is_admin());

-- 12. ANNOUNCEMENTS
DROP POLICY IF EXISTS "Announcements are viewable by everyone" ON public.announcements;
DROP POLICY IF EXISTS "Announcements are manageable by admins" ON public.announcements;

CREATE POLICY "Announcements are viewable by everyone" ON public.announcements FOR SELECT USING (is_active = true);
CREATE POLICY "Announcements are manageable by admins" ON public.announcements FOR ALL TO authenticated USING (public.is_admin());

-- 13. FEATURE_FLAGS
DROP POLICY IF EXISTS "Flags are viewable by everyone" ON public.feature_flags;
DROP POLICY IF EXISTS "Flags are manageable by admins" ON public.feature_flags;

CREATE POLICY "Flags are viewable by everyone" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "Flags are manageable by admins" ON public.feature_flags FOR ALL TO authenticated USING (public.is_admin());

-- 14. REMOTE_CONFIG
DROP POLICY IF EXISTS "Config is viewable by everyone" ON public.remote_config;
DROP POLICY IF EXISTS "Config is manageable by admins" ON public.remote_config;

CREATE POLICY "Config is viewable by everyone" ON public.remote_config FOR SELECT USING (true);
CREATE POLICY "Config is manageable by admins" ON public.remote_config FOR ALL TO authenticated USING (public.is_admin());

-- 15. SUBSCRIPTIONS
DROP POLICY IF EXISTS "Subscriptions are manageable by admins" ON public.subscriptions;

CREATE POLICY "Subscriptions are manageable by admins" ON public.subscriptions FOR ALL TO authenticated USING (public.is_admin());

-- 16. CONNECT_PROFILES
DROP POLICY IF EXISTS "Admins can manage all connect_profiles" ON public.connect_profiles;
DROP POLICY IF EXISTS "Users can view their own connect profile" ON public.connect_profiles;
DROP POLICY IF EXISTS "Users can manage their own connect_profile" ON public.connect_profiles;

CREATE POLICY "Users can view their own connect profile" ON public.connect_profiles FOR SELECT USING (true);
CREATE POLICY "Users can manage their own connect_profile" ON public.connect_profiles FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all connect_profiles" ON public.connect_profiles FOR ALL TO authenticated USING (public.is_admin());

-- 17. CONNECT_SOCIAL_LINKS
DROP POLICY IF EXISTS "Admins can manage all connect_social_links" ON public.connect_social_links;
DROP POLICY IF EXISTS "Social links are viewable by everyone" ON public.connect_social_links;
DROP POLICY IF EXISTS "Users can manage their own social links" ON public.connect_social_links;

CREATE POLICY "Social links are viewable by everyone" ON public.connect_social_links FOR SELECT USING (true);
CREATE POLICY "Users can manage their own social links" ON public.connect_social_links FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all connect_social_links" ON public.connect_social_links FOR ALL TO authenticated USING (public.is_admin());

-- 18. CONNECT_ACHIEVEMENTS
DROP POLICY IF EXISTS "Admins can manage all connect_achievements" ON public.connect_achievements;
DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON public.connect_achievements;
DROP POLICY IF EXISTS "Users can manage their own achievements" ON public.connect_achievements;

CREATE POLICY "Achievements are viewable by everyone" ON public.connect_achievements FOR SELECT USING (true);
CREATE POLICY "Users can manage their own achievements" ON public.connect_achievements FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all connect_achievements" ON public.connect_achievements FOR ALL TO authenticated USING (public.is_admin());

-- 19. CONNECT_XP_LOG
DROP POLICY IF EXISTS "Admins can manage all connect_xp_log" ON public.connect_xp_log;
DROP POLICY IF EXISTS "Users can view their own XP logs" ON public.connect_xp_log;
DROP POLICY IF EXISTS "Users can insert their own XP logs" ON public.connect_xp_log;

CREATE POLICY "Users can view their own XP logs" ON public.connect_xp_log FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert their own XP logs" ON public.connect_xp_log FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all connect_xp_log" ON public.connect_xp_log FOR ALL TO authenticated USING (public.is_admin());

-- 20. CONNECT_FRIENDSHIPS
DROP POLICY IF EXISTS "Admins can manage all connect_friendships" ON public.connect_friendships;
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.connect_friendships;
DROP POLICY IF EXISTS "Users can manage their own friendships" ON public.connect_friendships;

CREATE POLICY "Users can view their own friendships" ON public.connect_friendships FOR SELECT USING (auth.uid()::text = user_id1::text OR auth.uid()::text = user_id2::text);
CREATE POLICY "Users can manage their own friendships" ON public.connect_friendships FOR ALL USING (auth.uid()::text = user_id1::text OR auth.uid()::text = user_id2::text);
CREATE POLICY "Admins can manage all connect_friendships" ON public.connect_friendships FOR ALL TO authenticated USING (public.is_admin());

-- 21. CONNECT_FRIEND_REQUESTS
DROP POLICY IF EXISTS "Admins can manage all connect_friend_requests" ON public.connect_friend_requests;
DROP POLICY IF EXISTS "Users can view their own friend requests" ON public.connect_friend_requests;

CREATE POLICY "Users can view their own friend requests" ON public.connect_friend_requests FOR SELECT USING (auth.uid()::text = sender_id::text OR auth.uid()::text = receiver_id::text);
CREATE POLICY "Admins can manage all connect_friend_requests" ON public.connect_friend_requests FOR ALL TO authenticated USING (public.is_admin());

-- 22. CONNECT_BLOCKS
DROP POLICY IF EXISTS "Admins can manage all connect_blocks" ON public.connect_blocks;

CREATE POLICY "Admins can manage all connect_blocks" ON public.connect_blocks FOR ALL TO authenticated USING (public.is_admin());

-- 23. CONNECT_FOLLOWS
DROP POLICY IF EXISTS "Admins can manage all connect_follows" ON public.connect_follows;
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.connect_follows;
DROP POLICY IF EXISTS "Users can manage their own follows" ON public.connect_follows;

CREATE POLICY "Follows are viewable by everyone" ON public.connect_follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON public.connect_follows FOR ALL USING (auth.uid()::text = follower_id::text);
CREATE POLICY "Admins can manage all connect_follows" ON public.connect_follows FOR ALL TO authenticated USING (public.is_admin());
