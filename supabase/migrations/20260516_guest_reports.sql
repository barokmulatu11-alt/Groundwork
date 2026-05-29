-- Allow anyone (including guests) to submit reports
ALTER TABLE reports ALTER COLUMN user_id DROP NOT NULL;

-- Enable RLS on reports if not already enabled
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy for inserting reports (anyone can submit)
DROP POLICY IF EXISTS "Anyone can submit a report" ON reports;
CREATE POLICY "Anyone can submit a report"
  ON reports FOR INSERT
  WITH CHECK (true);

-- Policy for viewing reports (only the owner or admin)
DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'owner')
  ));

-- Ensure notifications table is also accessible
DROP POLICY IF EXISTS "Users can view their own notifications" ON user_notifications;
CREATE POLICY "Users can view their own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);
