-- ================================================================
-- Enable Supabase Realtime on Connect tables
-- Run this in your Supabase SQL Editor to activate live updates.
-- ================================================================

-- Enable Realtime publication for friend requests and friendships
-- so that postgres_changes subscriptions in the app fire correctly.
ALTER PUBLICATION supabase_realtime ADD TABLE public.connect_friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connect_friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connect_blocks;

-- Also ensure RLS policies allow the authenticated user to SELECT
-- their own friend requests (required for Realtime to deliver events)
DROP POLICY IF EXISTS "Users can view their own friend requests" ON public.connect_friend_requests;
CREATE POLICY "Users can view their own friend requests"
  ON public.connect_friend_requests FOR SELECT
  USING (
    auth.uid()::text = sender_id OR auth.uid()::text = receiver_id
  );

DROP POLICY IF EXISTS "Users can insert friend requests" ON public.connect_friend_requests;
CREATE POLICY "Users can insert friend requests"
  ON public.connect_friend_requests FOR INSERT
  WITH CHECK (auth.uid()::text = sender_id);

DROP POLICY IF EXISTS "Users can delete their own friend requests" ON public.connect_friend_requests;
CREATE POLICY "Users can delete their own friend requests"
  ON public.connect_friend_requests FOR DELETE
  USING (
    auth.uid()::text = sender_id OR auth.uid()::text = receiver_id
  );

-- Friendships: both parties can view and manage
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.connect_friendships;
CREATE POLICY "Users can view their own friendships"
  ON public.connect_friendships FOR SELECT
  USING (
    auth.uid()::text = user_id1 OR auth.uid()::text = user_id2
  );

DROP POLICY IF EXISTS "Users can manage their own friendships" ON public.connect_friendships;
CREATE POLICY "Users can manage their own friendships"
  ON public.connect_friendships FOR ALL
  USING (
    auth.uid()::text = user_id1 OR auth.uid()::text = user_id2
  );
