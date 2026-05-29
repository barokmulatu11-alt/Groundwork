-- 1. Fix type mismatch (UUID vs TEXT) by casting auth.uid() to TEXT,
-- and add Admin management policies for tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can manage all tasks" ON tasks;

CREATE POLICY "Users can view their own tasks" ON tasks FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own tasks" ON tasks FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own tasks" ON tasks FOR DELETE USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can manage all tasks" ON tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- 2. Fix type mismatch and add Admin management policies for habits
DROP POLICY IF EXISTS "Users can view their own habits" ON habits;
DROP POLICY IF EXISTS "Users can insert their own habits" ON habits;
DROP POLICY IF EXISTS "Users can update their own habits" ON habits;
DROP POLICY IF EXISTS "Users can delete their own habits" ON habits;
DROP POLICY IF EXISTS "Admins can view all habits" ON habits;
DROP POLICY IF EXISTS "Admins can manage all habits" ON habits;

CREATE POLICY "Users can view their own habits" ON habits FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own habits" ON habits FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own habits" ON habits FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own habits" ON habits FOR DELETE USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can manage all habits" ON habits FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- 3. Fix type mismatch and add Admin management policies for sub_tasks
DROP POLICY IF EXISTS "Users can view their own sub_tasks" ON sub_tasks;
DROP POLICY IF EXISTS "Users can insert their own sub_tasks" ON sub_tasks;
DROP POLICY IF EXISTS "Users can update their own sub_tasks" ON sub_tasks;
DROP POLICY IF EXISTS "Users can delete their own sub_tasks" ON sub_tasks;
DROP POLICY IF EXISTS "Admins can view all sub_tasks" ON sub_tasks;
DROP POLICY IF EXISTS "Admins can manage all sub_tasks" ON sub_tasks;

CREATE POLICY "Users can view their own sub_tasks" ON sub_tasks FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own sub_tasks" ON sub_tasks FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own sub_tasks" ON sub_tasks FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own sub_tasks" ON sub_tasks FOR DELETE USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can manage all sub_tasks" ON sub_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- 4. Fix type mismatch and add Admin management policies for focus_sessions
DROP POLICY IF EXISTS "Users can view their own focus_sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can insert their own focus_sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can update their own focus_sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can delete their own focus_sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Admins can view all focus_sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Admins can manage all focus_sessions" ON focus_sessions;

CREATE POLICY "Users can view their own focus_sessions" ON focus_sessions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own focus_sessions" ON focus_sessions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own focus_sessions" ON focus_sessions FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own focus_sessions" ON focus_sessions FOR DELETE USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can manage all focus_sessions" ON focus_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- 5. Fix type mismatch and add Admin management policies for notes
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;
DROP POLICY IF EXISTS "Admins can view all notes" ON notes;
DROP POLICY IF EXISTS "Admins can manage all notes" ON notes;

CREATE POLICY "Users can view their own notes" ON notes FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own notes" ON notes FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own notes" ON notes FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own notes" ON notes FOR DELETE USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can manage all notes" ON notes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- 6. Fix type mismatch and add Admin management policies for note_tags
DROP POLICY IF EXISTS "Users can view their own note_tags" ON note_tags;
DROP POLICY IF EXISTS "Users can insert their own note_tags" ON note_tags;
DROP POLICY IF EXISTS "Users can delete their own note_tags" ON note_tags;
DROP POLICY IF EXISTS "Admins can manage all note_tags" ON note_tags;

CREATE POLICY "Users can view their own note_tags" ON note_tags FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own note_tags" ON note_tags FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own note_tags" ON note_tags FOR DELETE USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can manage all note_tags" ON note_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- 7. Fix type mismatch and add Admin management policies for day_notes
DROP POLICY IF EXISTS "Users can view their own day_notes" ON day_notes;
DROP POLICY IF EXISTS "Users can insert their own day_notes" ON day_notes;
DROP POLICY IF EXISTS "Users can update their own day_notes" ON day_notes;
DROP POLICY IF EXISTS "Users can delete their own day_notes" ON day_notes;
DROP POLICY IF EXISTS "Admins can manage all day_notes" ON day_notes;

CREATE POLICY "Users can view their own day_notes" ON day_notes FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own day_notes" ON day_notes FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own day_notes" ON day_notes FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can manage all day_notes" ON day_notes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- 8. Add Admin management policies for Connect tables
DROP POLICY IF EXISTS "Admins can manage all connect_profiles" ON public.connect_profiles;
CREATE POLICY "Admins can manage all connect_profiles" ON public.connect_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

DROP POLICY IF EXISTS "Admins can manage all connect_social_links" ON public.connect_social_links;
CREATE POLICY "Admins can manage all connect_social_links" ON public.connect_social_links FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

DROP POLICY IF EXISTS "Admins can manage all connect_achievements" ON public.connect_achievements;
CREATE POLICY "Admins can manage all connect_achievements" ON public.connect_achievements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

DROP POLICY IF EXISTS "Admins can manage all connect_xp_log" ON public.connect_xp_log;
CREATE POLICY "Admins can manage all connect_xp_log" ON public.connect_xp_log FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

DROP POLICY IF EXISTS "Admins can manage all connect_friendships" ON public.connect_friendships;
CREATE POLICY "Admins can manage all connect_friendships" ON public.connect_friendships FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

DROP POLICY IF EXISTS "Admins can manage all connect_friend_requests" ON public.connect_friend_requests;
CREATE POLICY "Admins can manage all connect_friend_requests" ON public.connect_friend_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

DROP POLICY IF EXISTS "Admins can manage all connect_blocks" ON public.connect_blocks;
CREATE POLICY "Admins can manage all connect_blocks" ON public.connect_blocks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

DROP POLICY IF EXISTS "Admins can manage all connect_follows" ON public.connect_follows;
CREATE POLICY "Admins can manage all connect_follows" ON public.connect_follows FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);
