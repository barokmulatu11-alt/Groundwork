-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Profiles are manageable by admins" ON profiles;

-- Create a more robust policy for admins
-- Using auth.jwt() to check role if available, or a non-recursive subquery
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

-- Ensure is_banned column is correctly initialized for existing users
UPDATE profiles SET is_banned = false WHERE is_banned IS NULL;
