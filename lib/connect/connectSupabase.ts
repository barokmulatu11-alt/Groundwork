import { supabase } from '../supabase';

/*
  Execute the following SQL in your Supabase SQL Editor to create the Connect tables and RLS policies:

  CREATE TABLE IF NOT EXISTS connect_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    productivity_category TEXT DEFAULT 'General',
    joined_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS connect_social_links (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS connect_achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    achievement_key TEXT NOT NULL,
    unlocked_at TEXT NOT NULL,
    progress INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS connect_friendships (
    id TEXT PRIMARY KEY,
    user_id1 TEXT NOT NULL,
    user_id2 TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT connect_friendships_users_unique UNIQUE(user_id1, user_id2)
  );

  CREATE TABLE IF NOT EXISTS connect_friend_requests (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT connect_friend_requests_unique UNIQUE(sender_id, receiver_id)
  );

  CREATE TABLE IF NOT EXISTS connect_blocks (
    id TEXT PRIMARY KEY,
    blocker_id TEXT NOT NULL,
    blocked_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT connect_blocks_unique UNIQUE(blocker_id, blocked_id)
  );

  CREATE TABLE IF NOT EXISTS connect_xp_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    xp_amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON connect_profiles (user_id);
  CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON connect_achievements (user_id);
  CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON connect_friendships (user_id1);
  CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON connect_friendships (user_id2);
  CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON connect_friend_requests (sender_id);
  CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON connect_friend_requests (receiver_id);
  CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON connect_blocks (blocker_id);
  CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON connect_blocks (blocked_id);
  CREATE INDEX IF NOT EXISTS idx_xp_log_user_id ON connect_xp_log (user_id);

  ALTER TABLE connect_profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE connect_social_links ENABLE ROW LEVEL SECURITY;
  ALTER TABLE connect_achievements ENABLE ROW LEVEL SECURITY;
  ALTER TABLE connect_friendships ENABLE ROW LEVEL SECURITY;
  ALTER TABLE connect_friend_requests ENABLE ROW LEVEL SECURITY;
  ALTER TABLE connect_blocks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE connect_xp_log ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can read all profiles" ON connect_profiles FOR SELECT USING (true);
  CREATE POLICY "Users can only edit their own profile" ON connect_profiles FOR ALL USING (auth.uid()::text = user_id);

  CREATE POLICY "Users can read all achievements" ON connect_achievements FOR SELECT USING (true);
  CREATE POLICY "Users can only edit their own achievements" ON connect_achievements FOR ALL USING (auth.uid()::text = user_id);
  
  CREATE POLICY "Anyone can read social links" ON connect_social_links FOR SELECT USING (true);
  CREATE POLICY "Users can manage their own social links" ON connect_social_links FOR ALL USING (auth.uid()::text = user_id);
  
  CREATE POLICY "Users can view their own friendships" ON connect_friendships FOR SELECT USING (auth.uid()::text = user_id1 OR auth.uid()::text = user_id2);
  CREATE POLICY "Users can manage their own friendships" ON connect_friendships FOR ALL USING (auth.uid()::text = user_id1 OR auth.uid()::text = user_id2);

  CREATE POLICY "Users can view their own friend requests" ON connect_friend_requests FOR SELECT USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);
  CREATE POLICY "Users can create friend requests" ON connect_friend_requests FOR INSERT WITH CHECK (auth.uid()::text = sender_id);
  CREATE POLICY "Users can manage their own friend requests" ON connect_friend_requests FOR ALL USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);

  CREATE POLICY "Users can view their own blocks" ON connect_blocks FOR SELECT USING (auth.uid()::text = blocker_id);
  CREATE POLICY "Users can manage their own blocks" ON connect_blocks FOR ALL USING (auth.uid()::text = blocker_id);

  CREATE POLICY "Users can read all xp logs" ON connect_xp_log FOR SELECT USING (true);
  CREATE POLICY "Users can manage their own xp logs" ON connect_xp_log FOR ALL USING (auth.uid()::text = user_id);
*/

export { supabase };
