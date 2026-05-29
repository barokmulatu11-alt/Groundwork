-- Comprehensive Database Setup Script (Profiles columns + Connect tables)
-- Paste and run this script in your Supabase SQL Editor.

-- 1. Update public.profiles table schema
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider TEXT;

-- Create partial unique index on username (only one account per username)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx 
  ON public.profiles (lower(username)) 
  WHERE username IS NOT NULL;

-- 2. Update the handle_new_user trigger function to safely handle metadata without overwrites
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    username,
    full_name, 
    avatar_url, 
    bio,
    settings,
    email, 
    provider, 
    role,
    updated_at
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name', 
      'Anonymous'
    ),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'bio',
    COALESCE(new.raw_user_meta_data->'settings', '{}'::jsonb),
    new.email,
    COALESCE(new.raw_app_meta_data->>'provider', 'email'),
    'user',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    provider = EXCLUDED.provider,
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_sync ON auth.users;
CREATE TRIGGER on_auth_user_sync
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Create Connect-related tables
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

-- Enable RLS on all tables
ALTER TABLE public.connect_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_blocks ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
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

-- Friendships Policies
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.connect_friendships;
CREATE POLICY "Users can view their own friendships"
  ON public.connect_friendships FOR SELECT
  USING (auth.uid()::text = user_id1 OR auth.uid()::text = user_id2);

DROP POLICY IF EXISTS "Users can manage their own friendships" ON public.connect_friendships;
CREATE POLICY "Users can manage their own friendships"
  ON public.connect_friendships FOR ALL
  USING (auth.uid()::text = user_id1 OR auth.uid()::text = user_id2);

-- Friend Requests Policies
DROP POLICY IF EXISTS "Users can view their own friend requests" ON public.connect_friend_requests;
CREATE POLICY "Users can view their own friend requests"
  ON public.connect_friend_requests FOR SELECT
  USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);

DROP POLICY IF EXISTS "Users can create friend requests" ON public.connect_friend_requests;
CREATE POLICY "Users can create friend requests"
  ON public.connect_friend_requests FOR INSERT
  WITH CHECK (auth.uid()::text = sender_id);

DROP POLICY IF EXISTS "Users can manage their own friend requests" ON public.connect_friend_requests;
CREATE POLICY "Users can manage their own friend requests"
  ON public.connect_friend_requests FOR ALL
  USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);

-- Blocks Policies
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.connect_blocks;
CREATE POLICY "Users can view their own blocks"
  ON public.connect_blocks FOR SELECT
  USING (auth.uid()::text = blocker_id);

DROP POLICY IF EXISTS "Users can manage their own blocks" ON public.connect_blocks;
CREATE POLICY "Users can manage their own blocks"
  ON public.connect_blocks FOR ALL
  USING (auth.uid()::text = blocker_id);

-- 5. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_connect_profiles_user_id ON public.connect_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_connect_achievements_user_id ON public.connect_achievements (user_id);
CREATE INDEX IF NOT EXISTS idx_connect_follows_follower ON public.connect_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_connect_follows_following ON public.connect_follows (following_id);
CREATE INDEX IF NOT EXISTS idx_connect_xp_log_user_id ON public.connect_xp_log (user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON public.connect_friendships (user_id1);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON public.connect_friendships (user_id2);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.connect_friend_requests (sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.connect_friend_requests (receiver_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.connect_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.connect_blocks (blocked_id);

-- 6. Setup storage bucket 'avatars' if not exists and its policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;
CREATE POLICY "Public avatar read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
