-- Add Admin Access for Analytics and Moderation

-- ALLOW ADMINS TO VIEW ALL TASKS
CREATE POLICY "Admins can view all tasks"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- ALLOW ADMINS TO VIEW ALL HABITS
CREATE POLICY "Admins can view all habits"
  ON habits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- ALLOW ADMINS TO VIEW ALL SUB_TASKS
CREATE POLICY "Admins can view all sub_tasks"
  ON sub_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- ALLOW ADMINS TO VIEW ALL NOTES
CREATE POLICY "Admins can view all notes"
  ON notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- ALLOW ADMINS TO VIEW ALL FOCUS_SESSIONS
CREATE POLICY "Admins can view all focus_sessions"
  ON focus_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );
