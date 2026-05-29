-- Update profiles table to include missing identity fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider TEXT;

-- Create or update the function to handle user synchronization
-- This function extracts metadata from auth.users (including Google profiles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    avatar_url, 
    email, 
    provider, 
    role,
    updated_at
  )
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name', 
      'Anonymous'
    ),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    COALESCE(new.raw_app_meta_data->>'provider', 'email'),
    'user',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    email = EXCLUDED.email,
    provider = EXCLUDED.provider,
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists for both INSERT and UPDATE
-- This guarantees that even if a profile wasn't created at signup, it will be created/updated at login
DROP TRIGGER IF EXISTS on_auth_user_sync ON auth.users;
CREATE TRIGGER on_auth_user_sync
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill existing users into the profiles table if they are missing
INSERT INTO public.profiles (id, full_name, avatar_url, email, provider, role, created_at, updated_at)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'Anonymous'),
  raw_user_meta_data->>'avatar_url',
  email,
  COALESCE(raw_app_meta_data->>'provider', 'email'),
  'user',
  created_at,
  updated_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;
