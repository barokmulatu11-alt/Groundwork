-- Fix RLS admin lookup policies by casting auth.uid() to TEXT
-- Run this in your Supabase SQL Editor to restore admin views and analytics!

-- 1. PROFILES
DROP POLICY IF EXISTS "Profiles are manageable by admins" ON profiles;
CREATE POLICY "Profiles are manageable by admins" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 2. TASKS
DROP POLICY IF EXISTS "Admins can manage all tasks" ON tasks;
CREATE POLICY "Admins can manage all tasks" ON tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 3. HABITS
DROP POLICY IF EXISTS "Admins can manage all habits" ON habits;
CREATE POLICY "Admins can manage all habits" ON habits FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 4. SUB_TASKS
DROP POLICY IF EXISTS "Admins can manage all sub_tasks" ON sub_tasks;
CREATE POLICY "Admins can manage all sub_tasks" ON sub_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 5. FOCUS_SESSIONS
DROP POLICY IF EXISTS "Admins can manage all focus_sessions" ON focus_sessions;
CREATE POLICY "Admins can manage all focus_sessions" ON focus_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 6. NOTES
DROP POLICY IF EXISTS "Admins can manage all notes" ON notes;
CREATE POLICY "Admins can manage all notes" ON notes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 7. NOTE_TAGS
DROP POLICY IF EXISTS "Admins can manage all note_tags" ON note_tags;
CREATE POLICY "Admins can manage all note_tags" ON note_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 8. DAY_NOTES
DROP POLICY IF EXISTS "Admins can manage all day_notes" ON day_notes;
CREATE POLICY "Admins can manage all day_notes" ON day_notes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 9. HABIT_CHECKINS
DROP POLICY IF EXISTS "Admins can manage all habit_checkins" ON habit_checkins;
CREATE POLICY "Admins can manage all habit_checkins" ON habit_checkins FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 10. USER_NOTIFICATIONS
DROP POLICY IF EXISTS "Admins can manage all user_notifications" ON user_notifications;
CREATE POLICY "Admins can manage all user_notifications" ON user_notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 11. REPORTS
DROP POLICY IF EXISTS "Reports are manageable by admins" ON reports;
CREATE POLICY "Reports are manageable by admins" ON reports FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 12. ANNOUNCEMENTS
DROP POLICY IF EXISTS "Announcements are manageable by admins" ON announcements;
CREATE POLICY "Announcements are manageable by admins" ON announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 13. FEATURE_FLAGS
DROP POLICY IF EXISTS "Flags are manageable by admins" ON feature_flags;
CREATE POLICY "Flags are manageable by admins" ON feature_flags FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 14. REMOTE_CONFIG
DROP POLICY IF EXISTS "Config is manageable by admins" ON remote_config;
CREATE POLICY "Config is manageable by admins" ON remote_config FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 15. SUBSCRIPTIONS
DROP POLICY IF EXISTS "Subscriptions are manageable by admins" ON subscriptions;
CREATE POLICY "Subscriptions are manageable by admins" ON subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 16. CONNECT_PROFILES
DROP POLICY IF EXISTS "Admins can manage all connect_profiles" ON public.connect_profiles;
CREATE POLICY "Admins can manage all connect_profiles" ON public.connect_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 17. CONNECT_SOCIAL_LINKS
DROP POLICY IF EXISTS "Admins can manage all connect_social_links" ON public.connect_social_links;
CREATE POLICY "Admins can manage all connect_social_links" ON public.connect_social_links FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 18. CONNECT_ACHIEVEMENTS
DROP POLICY IF EXISTS "Admins can manage all connect_achievements" ON public.connect_achievements;
CREATE POLICY "Admins can manage all connect_achievements" ON public.connect_achievements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 19. CONNECT_XP_LOG
DROP POLICY IF EXISTS "Admins can manage all connect_xp_log" ON public.connect_xp_log;
CREATE POLICY "Admins can manage all connect_xp_log" ON public.connect_xp_log FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 20. CONNECT_FRIENDSHIPS
DROP POLICY IF EXISTS "Admins can manage all connect_friendships" ON public.connect_friendships;
CREATE POLICY "Admins can manage all connect_friendships" ON public.connect_friendships FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 21. CONNECT_FRIEND_REQUESTS
DROP POLICY IF EXISTS "Admins can manage all connect_friend_requests" ON public.connect_friend_requests;
CREATE POLICY "Admins can manage all connect_friend_requests" ON public.connect_friend_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 22. CONNECT_BLOCKS
DROP POLICY IF EXISTS "Admins can manage all connect_blocks" ON public.connect_blocks;
CREATE POLICY "Admins can manage all connect_blocks" ON public.connect_blocks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);

-- 23. CONNECT_FOLLOWS
DROP POLICY IF EXISTS "Admins can manage all connect_follows" ON public.connect_follows;
CREATE POLICY "Admins can manage all connect_follows" ON public.connect_follows FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('admin', 'owner'))
);
