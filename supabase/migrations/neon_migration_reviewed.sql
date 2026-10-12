-- ==============================================================================
-- NEON MIGRATION: Reviewed Consolidated Schema for Groundwork (v2)
-- Generated from inspection of all 26 Supabase migrations
-- 
-- Key Security & Architecture Enforcements:
-- 1. Privilege Escalation Prevention:
--    - BEFORE INSERT OR UPDATE trigger on profiles prevents non-admins from setting or altering:
--      role, pro_status, pro_until, is_banned.
--    - RLS WITH CHECK clauses on profiles_insert_own and profiles_update_own.
--    - Legitimate admins (via public.is_admin()) retain full control.
-- 2. Transaction Architecture:
--    - Transaction control (BEGIN / COMMIT / ROLLBACK) is managed externally by the runner.
-- 3. Neon Auth Compatibility:
--    - User IDs are TEXT, compatible with Neon Auth (Better Auth) and UUIDs.
--    - auth.user_id() and auth.uid() return TEXT.
-- 4. Excluded Supabase Dependencies:
--    - Excluded storage.buckets / storage.objects (S3 object storage used).
--    - Excluded ALTER PUBLICATION supabase_realtime.
--    - Excluded triggers on non-existent auth.users.
-- 5. Complete RLS & Least-Privilege Grants:
--    - 100% of public tables have RLS ENABLED.
--    - anonymous: Zero access to private data.
--    - authenticated: Proper table grants to allow admin dashboard operations gated by RLS.
--    - PUBLIC: Revoked to prevent inherited permission leaks.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Auth Compatibility Schema & Helpers (Removed for Neon native auth)
-- ------------------------------------------------------------------------------

-- Ensure pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Core Profile & Admin Tables
-- ------------------------------------------------------------------------------

-- Profiles: id is TEXT to support Neon Auth (Better Auth) string IDs and existing UUIDs
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'owner')),
  pro_status BOOLEAN DEFAULT false,
  pro_until TIMESTAMPTZ,
  is_banned BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
  email TEXT,
  provider TEXT,
  bio TEXT,
  subscription_type TEXT,
  activation_date TIMESTAMPTZ,
  expiration_date TIMESTAMPTZ,
  latest_payment_request_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx 
  ON public.profiles (lower(username)) 
  WHERE username IS NOT NULL;

-- Admin check function with explicit search_path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Service role / JWT claim check
  IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.user_id()
      AND lower(trim(coalesce(role, ''))) IN ('admin', 'owner')
  );
END;
$$;

-- Privilege Escalation Guard Trigger
-- Guarantees ordinary users cannot create themselves as admin or grant themselves Pro access
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If executing as an admin or service_role, allow all operations
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- On INSERT by a non-admin: force default safe values regardless of what was provided
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NOT NULL AND NEW.role <> 'user' THEN
      RAISE EXCEPTION 'Privilege escalation rejected: non-admin cannot set role to %', NEW.role;
    END IF;
    IF NEW.pro_status IS NOT NULL AND NEW.pro_status = true THEN
      RAISE EXCEPTION 'Privilege escalation rejected: non-admin cannot grant pro_status';
    END IF;
    IF NEW.pro_until IS NOT NULL THEN
      RAISE EXCEPTION 'Privilege escalation rejected: non-admin cannot set pro_until';
    END IF;
    IF NEW.is_banned IS NOT NULL AND NEW.is_banned = true THEN
      RAISE EXCEPTION 'Invalid operation: non-admin cannot set is_banned';
    END IF;

    NEW.role := COALESCE(NEW.role, 'user');
    NEW.pro_status := COALESCE(NEW.pro_status, false);
    NEW.pro_until := NULL;
    NEW.is_banned := false;
    RETURN NEW;
  END IF;

  -- On UPDATE by a non-admin: prevent modifying any privileged fields
  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Privilege escalation rejected: non-admin cannot alter role from % to %', OLD.role, NEW.role;
    END IF;
    IF NEW.pro_status IS DISTINCT FROM OLD.pro_status THEN
      RAISE EXCEPTION 'Privilege escalation rejected: non-admin cannot alter pro_status';
    END IF;
    IF NEW.pro_until IS DISTINCT FROM OLD.pro_until THEN
      RAISE EXCEPTION 'Privilege escalation rejected: non-admin cannot alter pro_until';
    END IF;
    IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
      RAISE EXCEPTION 'Privilege escalation rejected: non-admin cannot alter is_banned';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- Feature Flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Reports (Bugs / Suggestions)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT, -- nullable for guest reports
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remote Config
CREATE TABLE IF NOT EXISTS public.remote_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions History
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);

-- ------------------------------------------------------------------------------
-- 2. Productivity & Sync Tables (Offline-first client aligned)
-- ------------------------------------------------------------------------------

-- Tasks
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

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON public.tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON public.tasks(deleted_at);

-- Sub Tasks
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

CREATE INDEX IF NOT EXISTS idx_sub_tasks_user_id ON public.sub_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_task_id ON public.sub_tasks(task_id);

-- Habits
CREATE TABLE IF NOT EXISTS public.habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  frequency TEXT DEFAULT 'daily',
  dates_completed TEXT DEFAULT '[]',
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  is_paused BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT 'All',
  difficulty TEXT DEFAULT 'Medium',
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_deleted_at ON public.habits(deleted_at);

-- Habit Checkins
CREATE TABLE IF NOT EXISTS public.habit_checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  habit_id TEXT NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE INDEX IF NOT EXISTS idx_habit_checkins_user_id ON public.habit_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_habit_id ON public.habit_checkins(habit_id);

-- Focus Sessions
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  task_id TEXT REFERENCES public.tasks(id) ON DELETE SET NULL,
  mode TEXT DEFAULT 'Focus',
  date TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON public.focus_sessions(user_id);

-- Notes
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
  folder TEXT DEFAULT 'General',
  priority TEXT DEFAULT 'Medium',
  study_hours REAL DEFAULT 0,
  revision_score INTEGER DEFAULT 0,
  last_reviewed_at TEXT,
  flashcards TEXT DEFAULT '[]',
  formulas TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON public.notes(deleted_at);

-- Note Tags
CREATE TABLE IF NOT EXISTS public.note_tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  note_id TEXT NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE INDEX IF NOT EXISTS idx_note_tags_user_id ON public.note_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON public.note_tags(note_id);

-- Day Notes
CREATE TABLE IF NOT EXISTS public.day_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  note_text TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  CONSTRAINT day_notes_user_date_unique UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_day_notes_user_id ON public.day_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_day_notes_date ON public.day_notes(date);

-- ------------------------------------------------------------------------------
-- 3. Connect Community & Social Tables
-- ------------------------------------------------------------------------------

-- Connect Profiles
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

CREATE INDEX IF NOT EXISTS idx_connect_profiles_user_id ON public.connect_profiles (user_id);

-- Connect Social Links
CREATE TABLE IF NOT EXISTS public.connect_social_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connect Achievements
CREATE TABLE IF NOT EXISTS public.connect_achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_connect_achievements_user_id ON public.connect_achievements (user_id);

-- Connect Follows
CREATE TABLE IF NOT EXISTS public.connect_follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT connect_follows_unique UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_connect_follows_follower ON public.connect_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_connect_follows_following ON public.connect_follows (following_id);

-- Connect XP Log
CREATE TABLE IF NOT EXISTS public.connect_xp_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connect_xp_log_user_id ON public.connect_xp_log (user_id);

-- Connect Friendships
CREATE TABLE IF NOT EXISTS public.connect_friendships (
  id TEXT PRIMARY KEY,
  user_id1 TEXT NOT NULL,
  user_id2 TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT connect_friendships_users_unique UNIQUE(user_id1, user_id2)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON public.connect_friendships (user_id1);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON public.connect_friendships (user_id2);

-- Connect Friend Requests
CREATE TABLE IF NOT EXISTS public.connect_friend_requests (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT connect_friend_requests_unique UNIQUE(sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.connect_friend_requests (sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.connect_friend_requests (receiver_id);

-- Connect Blocks
CREATE TABLE IF NOT EXISTS public.connect_blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT connect_blocks_unique UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.connect_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.connect_blocks (blocked_id);

-- ------------------------------------------------------------------------------
-- 4. Pro Analytics & Payment Requests
-- ------------------------------------------------------------------------------

-- Pro Analytics
CREATE TABLE IF NOT EXISTS public.pro_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  event TEXT NOT NULL,
  feature TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pro_analytics_user_id ON public.pro_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_analytics_event ON public.pro_analytics(event);
CREATE INDEX IF NOT EXISTS idx_pro_analytics_created ON public.pro_analytics(created_at DESC);

-- Analytics Events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON public.analytics_events(timestamp);

-- Analytics Daily Aggregates
CREATE TABLE IF NOT EXISTS public.analytics_daily_aggregates (
  date DATE NOT NULL,
  user_id TEXT NOT NULL,
  tasks_created INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  habits_completed INTEGER DEFAULT 0,
  focus_minutes INTEGER DEFAULT 0,
  notes_created INTEGER DEFAULT 0,
  notes_viewed INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  focus_sessions INTEGER DEFAULT 0,
  PRIMARY KEY (date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_user_id ON public.analytics_daily_aggregates(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON public.analytics_daily_aggregates(date);

-- Analytics Realtime Cache
CREATE TABLE IF NOT EXISTS public.analytics_realtime_cache (
  user_id TEXT PRIMARY KEY,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  weekly_tasks_completed INTEGER DEFAULT 0,
  weekly_habits_completed INTEGER DEFAULT 0,
  weekly_focus_minutes INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  productivity_score INTEGER DEFAULT 0
);

-- Analytics Reports
CREATE TABLE IF NOT EXISTS public.analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, report_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_analytics_reports_user_id ON public.analytics_reports(user_id);

-- Payment Requests
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reference_code TEXT NOT NULL UNIQUE,
  payment_method TEXT NOT NULL,
  plan TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  transaction_id TEXT,
  payment_note TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_reference ON public.payment_requests(reference_code);

-- ------------------------------------------------------------------------------
-- 5. Helper Routines & Triggers
-- ------------------------------------------------------------------------------

-- Realtime Cache Refresh Function
CREATE OR REPLACE FUNCTION public.refresh_analytics_realtime_cache(p_user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_week_ago DATE;
  v_weekly_tasks INTEGER;
  v_weekly_habits INTEGER;
  v_weekly_focus INTEGER;
  v_current_streak INTEGER;
  v_best_streak INTEGER;
  v_productivity_score INTEGER;
BEGIN
  v_week_ago := CURRENT_DATE - INTERVAL '7 days';
  
  SELECT 
    COALESCE(SUM(tasks_completed), 0),
    COALESCE(SUM(habits_completed), 0),
    COALESCE(SUM(focus_minutes), 0)
  INTO v_weekly_tasks, v_weekly_habits, v_weekly_focus
  FROM public.analytics_daily_aggregates
  WHERE user_id = p_user_id AND date >= v_week_ago;
  
  SELECT streak_days INTO v_current_streak
  FROM public.analytics_daily_aggregates
  WHERE user_id = p_user_id
  ORDER BY date DESC
  LIMIT 1;
  
  SELECT MAX(streak_days) INTO v_best_streak
  FROM public.analytics_daily_aggregates
  WHERE user_id = p_user_id;
  
  v_productivity_score := LEAST(100, 
    LEAST(50, v_weekly_tasks * 5) + 
    LEAST(25, v_weekly_habits * 5) + 
    LEAST(25, v_weekly_focus / 30 * 5)
  );
  
  INSERT INTO public.analytics_realtime_cache (
    user_id, updated_at, weekly_tasks_completed, weekly_habits_completed,
    weekly_focus_minutes, current_streak, best_streak, productivity_score
  ) VALUES (
    p_user_id, NOW(), v_weekly_tasks, v_weekly_habits, v_weekly_focus,
    COALESCE(v_current_streak, 0), COALESCE(v_best_streak, 0), v_productivity_score
  )
  ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW(),
    weekly_tasks_completed = EXCLUDED.weekly_tasks_completed,
    weekly_habits_completed = EXCLUDED.weekly_habits_completed,
    weekly_focus_minutes = EXCLUDED.weekly_focus_minutes,
    current_streak = EXCLUDED.current_streak,
    best_streak = EXCLUDED.best_streak,
    productivity_score = EXCLUDED.productivity_score;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_wrapper_refresh_analytics_realtime_cache()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_analytics_realtime_cache(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_realtime_cache_after_aggregate ON public.analytics_daily_aggregates;
CREATE TRIGGER trg_update_realtime_cache_after_aggregate
AFTER INSERT OR UPDATE ON public.analytics_daily_aggregates
FOR EACH ROW
EXECUTE FUNCTION public.trg_wrapper_refresh_analytics_realtime_cache();

-- Privileged Cleanup Routine (Restricted Execution)
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.analytics_events 
  WHERE timestamp < (NOW() - INTERVAL '2 years')::TEXT;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. Enable Row Level Security (RLS) on ALL Exposed Tables
-- ------------------------------------------------------------------------------

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
ALTER TABLE public.pro_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_realtime_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 7. Define Precise RLS Policies
-- ------------------------------------------------------------------------------

-- Profiles: Own user can view/update their unprivileged fields; Admins can manage all
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.user_id()
    AND (role IS NULL OR role = 'user')
    AND (pro_status IS NULL OR pro_status = false)
    AND pro_until IS NULL
    AND (is_banned IS NULL OR is_banned = false)
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.user_id() AND is_banned = false)
  WITH CHECK (
    id = auth.user_id() 
    AND is_banned = false
    AND role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.user_id())
    AND pro_status IS NOT DISTINCT FROM (SELECT p.pro_status FROM public.profiles p WHERE p.id = auth.user_id())
    AND pro_until IS NOT DISTINCT FROM (SELECT p.pro_until FROM public.profiles p WHERE p.id = auth.user_id())
    AND is_banned IS NOT DISTINCT FROM (SELECT p.is_banned FROM public.profiles p WHERE p.id = auth.user_id())
  );

DROP POLICY IF EXISTS "profiles_admin_manage" ON public.profiles;
CREATE POLICY "profiles_admin_manage" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Feature Flags & Announcements & Remote Config (Public read, Admin manage)
DROP POLICY IF EXISTS "flags_select_all" ON public.feature_flags;
CREATE POLICY "flags_select_all" ON public.feature_flags FOR SELECT USING (true);
DROP POLICY IF EXISTS "flags_admin_manage" ON public.feature_flags;
CREATE POLICY "flags_admin_manage" ON public.feature_flags FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "announcements_select_active" ON public.announcements;
CREATE POLICY "announcements_select_active" ON public.announcements FOR SELECT USING (is_active = true OR public.is_admin());
DROP POLICY IF EXISTS "announcements_admin_manage" ON public.announcements;
CREATE POLICY "announcements_admin_manage" ON public.announcements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "config_select_all" ON public.remote_config;
CREATE POLICY "config_select_all" ON public.remote_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "config_admin_manage" ON public.remote_config;
CREATE POLICY "config_admin_manage" ON public.remote_config FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Reports (Guests + Users can submit; user views own, Admin manages all)
DROP POLICY IF EXISTS "reports_insert_any" ON public.reports;
CREATE POLICY "reports_insert_any" ON public.reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "reports_select_own_or_admin" ON public.reports;
CREATE POLICY "reports_select_own_or_admin" ON public.reports FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "reports_admin_manage" ON public.reports;
CREATE POLICY "reports_admin_manage" ON public.reports FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Subscriptions (User views own, Admin manages all)
DROP POLICY IF EXISTS "subscriptions_select_own_or_admin" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own_or_admin" ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "subscriptions_admin_manage" ON public.subscriptions;
CREATE POLICY "subscriptions_admin_manage" ON public.subscriptions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- User Notifications (User views/marks read own, Admin manages all)
DROP POLICY IF EXISTS "notifications_select_own" ON public.user_notifications;
CREATE POLICY "notifications_select_own" ON public.user_notifications FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "notifications_update_own" ON public.user_notifications;
CREATE POLICY "notifications_update_own" ON public.user_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.user_id())
  WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "notifications_admin_manage" ON public.user_notifications;
CREATE POLICY "notifications_admin_manage" ON public.user_notifications FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Productivity Tables: Tasks
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin())
  WITH CHECK (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

-- Sub Tasks
DROP POLICY IF EXISTS "sub_tasks_select" ON public.sub_tasks;
CREATE POLICY "sub_tasks_select" ON public.sub_tasks FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "sub_tasks_insert" ON public.sub_tasks;
CREATE POLICY "sub_tasks_insert" ON public.sub_tasks FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.user_id() 
    AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.user_id = auth.user_id())
  );

DROP POLICY IF EXISTS "sub_tasks_update" ON public.sub_tasks;
CREATE POLICY "sub_tasks_update" ON public.sub_tasks FOR UPDATE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin())
  WITH CHECK (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "sub_tasks_delete" ON public.sub_tasks;
CREATE POLICY "sub_tasks_delete" ON public.sub_tasks FOR DELETE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

-- Habits
DROP POLICY IF EXISTS "habits_select" ON public.habits;
CREATE POLICY "habits_select" ON public.habits FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "habits_insert" ON public.habits;
CREATE POLICY "habits_insert" ON public.habits FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "habits_update" ON public.habits;
CREATE POLICY "habits_update" ON public.habits FOR UPDATE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin())
  WITH CHECK (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "habits_delete" ON public.habits;
CREATE POLICY "habits_delete" ON public.habits FOR DELETE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

-- Habit Checkins
DROP POLICY IF EXISTS "habit_checkins_select" ON public.habit_checkins;
CREATE POLICY "habit_checkins_select" ON public.habit_checkins FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "habit_checkins_insert" ON public.habit_checkins;
CREATE POLICY "habit_checkins_insert" ON public.habit_checkins FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.user_id() 
    AND EXISTS (SELECT 1 FROM public.habits h WHERE h.id = habit_id AND h.user_id = auth.user_id())
  );

DROP POLICY IF EXISTS "habit_checkins_update" ON public.habit_checkins;
CREATE POLICY "habit_checkins_update" ON public.habit_checkins FOR UPDATE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin())
  WITH CHECK (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "habit_checkins_delete" ON public.habit_checkins;
CREATE POLICY "habit_checkins_delete" ON public.habit_checkins FOR DELETE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

-- Focus Sessions
DROP POLICY IF EXISTS "focus_sessions_select" ON public.focus_sessions;
CREATE POLICY "focus_sessions_select" ON public.focus_sessions FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "focus_sessions_insert" ON public.focus_sessions;
CREATE POLICY "focus_sessions_insert" ON public.focus_sessions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.user_id() 
    AND (task_id IS NULL OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.user_id = auth.user_id()))
  );

DROP POLICY IF EXISTS "focus_sessions_update" ON public.focus_sessions;
CREATE POLICY "focus_sessions_update" ON public.focus_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin())
  WITH CHECK (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "focus_sessions_delete" ON public.focus_sessions;
CREATE POLICY "focus_sessions_delete" ON public.focus_sessions FOR DELETE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

-- Notes
DROP POLICY IF EXISTS "notes_select" ON public.notes;
CREATE POLICY "notes_select" ON public.notes FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "notes_insert" ON public.notes;
CREATE POLICY "notes_insert" ON public.notes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "notes_update" ON public.notes;
CREATE POLICY "notes_update" ON public.notes FOR UPDATE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin())
  WITH CHECK (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "notes_delete" ON public.notes;
CREATE POLICY "notes_delete" ON public.notes FOR DELETE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

-- Note Tags
DROP POLICY IF EXISTS "note_tags_select" ON public.note_tags;
CREATE POLICY "note_tags_select" ON public.note_tags FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "note_tags_insert" ON public.note_tags;
CREATE POLICY "note_tags_insert" ON public.note_tags FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "note_tags_delete" ON public.note_tags;
CREATE POLICY "note_tags_delete" ON public.note_tags FOR DELETE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

-- Day Notes
DROP POLICY IF EXISTS "day_notes_select" ON public.day_notes;
CREATE POLICY "day_notes_select" ON public.day_notes FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "day_notes_insert" ON public.day_notes;
CREATE POLICY "day_notes_insert" ON public.day_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "day_notes_update" ON public.day_notes;
CREATE POLICY "day_notes_update" ON public.day_notes FOR UPDATE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin())
  WITH CHECK (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "day_notes_delete" ON public.day_notes;
CREATE POLICY "day_notes_delete" ON public.day_notes FOR DELETE TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

-- Connect Community Directory & Social
DROP POLICY IF EXISTS "connect_profiles_select" ON public.connect_profiles;
CREATE POLICY "connect_profiles_select" ON public.connect_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "connect_profiles_insert" ON public.connect_profiles;
CREATE POLICY "connect_profiles_insert" ON public.connect_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "connect_profiles_update" ON public.connect_profiles;
CREATE POLICY "connect_profiles_update" ON public.connect_profiles FOR UPDATE TO authenticated USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "social_links_select" ON public.connect_social_links;
CREATE POLICY "social_links_select" ON public.connect_social_links FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "social_links_manage" ON public.connect_social_links;
CREATE POLICY "social_links_manage" ON public.connect_social_links FOR ALL TO authenticated USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "achievements_select" ON public.connect_achievements;
CREATE POLICY "achievements_select" ON public.connect_achievements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "achievements_manage" ON public.connect_achievements;
CREATE POLICY "achievements_manage" ON public.connect_achievements FOR ALL TO authenticated USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "follows_select" ON public.connect_follows;
CREATE POLICY "follows_select" ON public.connect_follows FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "follows_manage" ON public.connect_follows;
CREATE POLICY "follows_manage" ON public.connect_follows FOR ALL TO authenticated USING (follower_id = auth.user_id());

DROP POLICY IF EXISTS "xp_log_select" ON public.connect_xp_log;
CREATE POLICY "xp_log_select" ON public.connect_xp_log FOR SELECT TO authenticated USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "xp_log_insert" ON public.connect_xp_log;
CREATE POLICY "xp_log_insert" ON public.connect_xp_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "friendships_select" ON public.connect_friendships;
CREATE POLICY "friendships_select" ON public.connect_friendships FOR SELECT TO authenticated
  USING (user_id1 = auth.user_id() OR user_id2 = auth.user_id());

DROP POLICY IF EXISTS "friendships_manage" ON public.connect_friendships;
CREATE POLICY "friendships_manage" ON public.connect_friendships FOR ALL TO authenticated
  USING (user_id1 = auth.user_id() OR user_id2 = auth.user_id());

DROP POLICY IF EXISTS "friend_requests_select" ON public.connect_friend_requests;
CREATE POLICY "friend_requests_select" ON public.connect_friend_requests FOR SELECT TO authenticated
  USING (sender_id = auth.user_id() OR receiver_id = auth.user_id());

DROP POLICY IF EXISTS "friend_requests_insert" ON public.connect_friend_requests;
CREATE POLICY "friend_requests_insert" ON public.connect_friend_requests FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.user_id());

DROP POLICY IF EXISTS "friend_requests_manage" ON public.connect_friend_requests;
CREATE POLICY "friend_requests_manage" ON public.connect_friend_requests FOR ALL TO authenticated
  USING (sender_id = auth.user_id() OR receiver_id = auth.user_id());

DROP POLICY IF EXISTS "blocks_select" ON public.connect_blocks;
CREATE POLICY "blocks_select" ON public.connect_blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.user_id());

DROP POLICY IF EXISTS "blocks_manage" ON public.connect_blocks;
CREATE POLICY "blocks_manage" ON public.connect_blocks FOR ALL TO authenticated
  USING (blocker_id = auth.user_id());

-- Pro Analytics
DROP POLICY IF EXISTS "pro_analytics_insert" ON public.pro_analytics;
CREATE POLICY "pro_analytics_insert" ON public.pro_analytics FOR INSERT
  WITH CHECK (user_id = auth.user_id() OR user_id = 'guest');

DROP POLICY IF EXISTS "pro_analytics_admin_select" ON public.pro_analytics;
CREATE POLICY "pro_analytics_admin_select" ON public.pro_analytics FOR SELECT TO authenticated
  USING (public.is_admin());

-- Analytics Events
DROP POLICY IF EXISTS "analytics_events_select" ON public.analytics_events;
CREATE POLICY "analytics_events_select" ON public.analytics_events FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "analytics_events_insert" ON public.analytics_events;
CREATE POLICY "analytics_events_insert" ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.user_id());

-- Analytics Aggregates & Cache & Reports
DROP POLICY IF EXISTS "daily_aggregates_select" ON public.analytics_daily_aggregates;
CREATE POLICY "daily_aggregates_select" ON public.analytics_daily_aggregates FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "realtime_cache_select" ON public.analytics_realtime_cache;
CREATE POLICY "realtime_cache_select" ON public.analytics_realtime_cache FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "analytics_reports_select" ON public.analytics_reports;
CREATE POLICY "analytics_reports_select" ON public.analytics_reports FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "analytics_reports_admin_manage" ON public.analytics_reports;
CREATE POLICY "analytics_reports_admin_manage" ON public.analytics_reports FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Payment Requests
DROP POLICY IF EXISTS "payment_requests_select" ON public.payment_requests;
CREATE POLICY "payment_requests_select" ON public.payment_requests FOR SELECT TO authenticated
  USING (user_id = auth.user_id() OR public.is_admin());

DROP POLICY IF EXISTS "payment_requests_insert" ON public.payment_requests;
CREATE POLICY "payment_requests_insert" ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "payment_requests_admin_manage" ON public.payment_requests;
CREATE POLICY "payment_requests_admin_manage" ON public.payment_requests FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. Precise Role Grants (Least Privilege & Admin Dashboard Operations Enabled)
-- ------------------------------------------------------------------------------

-- REVOKE ALL from PUBLIC to prevent inherited permission leaks
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC;

-- Ensure schema usage
GRANT USAGE ON SCHEMA public TO authenticated, anonymous;

-- ANONYMOUS ROLE: Strictly read-only for public config/flags, write-only for reports/guest events
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anonymous;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anonymous;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anonymous;

GRANT SELECT ON public.feature_flags TO anonymous;
GRANT SELECT ON public.announcements TO anonymous;
GRANT SELECT ON public.remote_config TO anonymous;
GRANT INSERT ON public.reports TO anonymous;
GRANT INSERT ON public.pro_analytics TO anonymous;

-- AUTHENTICATED ROLE:
-- All tables with admin policies require table-level grants so that PostgREST queries can reach RLS.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM authenticated;

-- Productivity data (Full user CRUD gated by user_id = auth.user_id())
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sub_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.focus_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_notes TO authenticated;

-- Profiles & Community data (Protected by trigger + RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.connect_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_social_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_follows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_xp_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_friendships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_friend_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_blocks TO authenticated;

-- Admin-managed tables (Table grants enabled so admin RLS policies can execute)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remote_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_reports TO authenticated;

-- Analytics Events & Caches
GRANT SELECT, INSERT ON public.pro_analytics TO authenticated;
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT SELECT ON public.analytics_daily_aggregates TO authenticated;
GRANT SELECT ON public.analytics_realtime_cache TO authenticated;

-- Sequences & Functions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_analytics_realtime_cache(TEXT) TO authenticated;

-- Privileged functions: Explicitly revoked from public, anon, authenticated
REVOKE EXECUTE ON FUNCTION public.cleanup_old_analytics_events() FROM PUBLIC, authenticated, anonymous;
