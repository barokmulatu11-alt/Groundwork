-- Migration: Connect Profiles and related tables
-- Date: 2026-05-19

-- 1. Create connect_profiles table
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

-- 2. Create connect_social_links table
CREATE TABLE IF NOT EXISTS public.connect_social_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create connect_achievements table
CREATE TABLE IF NOT EXISTS public.connect_achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0
);

-- 4. Create connect_follows table (legacy but still in schema)
CREATE TABLE IF NOT EXISTS public.connect_follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT connect_follows_unique UNIQUE(follower_id, following_id)
);

-- 5. Create connect_xp_log table
CREATE TABLE IF NOT EXISTS public.connect_xp_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.connect_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_xp_log ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.connect_profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.connect_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.connect_profiles;
CREATE POLICY "Users can insert their own profile" ON public.connect_profiles FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.connect_profiles;
CREATE POLICY "Users can update their own profile" ON public.connect_profiles FOR UPDATE USING (auth.uid()::text = user_id);

-- Social Links Policies
DROP POLICY IF EXISTS "Social links are viewable by everyone" ON public.connect_social_links;
CREATE POLICY "Social links are viewable by everyone" ON public.connect_social_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own social links" ON public.connect_social_links;
CREATE POLICY "Users can manage their own social links" ON public.connect_social_links FOR ALL USING (auth.uid()::text = user_id);

-- Achievements Policies
DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON public.connect_achievements;
CREATE POLICY "Achievements are viewable by everyone" ON public.connect_achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own achievements" ON public.connect_achievements;
CREATE POLICY "Users can manage their own achievements" ON public.connect_achievements FOR ALL USING (auth.uid()::text = user_id);

-- Follows Policies
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.connect_follows;
CREATE POLICY "Follows are viewable by everyone" ON public.connect_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own follows" ON public.connect_follows;
CREATE POLICY "Users can manage their own follows" ON public.connect_follows FOR ALL USING (auth.uid()::text = follower_id);

-- XP Log Policies
DROP POLICY IF EXISTS "Users can view their own XP logs" ON public.connect_xp_log;
CREATE POLICY "Users can view their own XP logs" ON public.connect_xp_log FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert their own XP logs" ON public.connect_xp_log;
CREATE POLICY "Users can insert their own XP logs" ON public.connect_xp_log FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_connect_profiles_user_id ON public.connect_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_connect_achievements_user_id ON public.connect_achievements (user_id);
CREATE INDEX IF NOT EXISTS idx_connect_follows_follower ON public.connect_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_connect_follows_following ON public.connect_follows (following_id);
CREATE INDEX IF NOT EXISTS idx_connect_xp_log_user_id ON public.connect_xp_log (user_id);
