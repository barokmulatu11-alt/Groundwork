-- Migration: Friends System Setup
-- Date: 2026-05-18

-- 1. Create connect_friendships table
CREATE TABLE IF NOT EXISTS public.connect_friendships (
  id TEXT PRIMARY KEY,
  user_id1 TEXT NOT NULL,
  user_id2 TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT connect_friendships_users_unique UNIQUE(user_id1, user_id2)
);

-- 2. Create connect_friend_requests table
CREATE TABLE IF NOT EXISTS public.connect_friend_requests (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT connect_friend_requests_unique UNIQUE(sender_id, receiver_id)
);

-- 3. Create connect_blocks table
CREATE TABLE IF NOT EXISTS public.connect_blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT connect_blocks_unique UNIQUE(blocker_id, blocked_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.connect_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_blocks ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- connect_friendships Policies
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.connect_friendships;
CREATE POLICY "Users can view their own friendships"
  ON public.connect_friendships FOR SELECT
  USING (auth.uid()::text = user_id1 OR auth.uid()::text = user_id2);

DROP POLICY IF EXISTS "Users can manage their own friendships" ON public.connect_friendships;
CREATE POLICY "Users can manage their own friendships"
  ON public.connect_friendships FOR ALL
  USING (auth.uid()::text = user_id1 OR auth.uid()::text = user_id2);

-- connect_friend_requests Policies
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

-- connect_blocks Policies
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.connect_blocks;
CREATE POLICY "Users can view their own blocks"
  ON public.connect_blocks FOR SELECT
  USING (auth.uid()::text = blocker_id);

DROP POLICY IF EXISTS "Users can manage their own blocks" ON public.connect_blocks;
CREATE POLICY "Users can manage their own blocks"
  ON public.connect_blocks FOR ALL
  USING (auth.uid()::text = blocker_id);

-- 6. Create Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON public.connect_friendships (user_id1);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON public.connect_friendships (user_id2);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.connect_friend_requests (sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.connect_friend_requests (receiver_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.connect_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.connect_blocks (blocked_id);
