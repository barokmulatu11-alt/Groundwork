-- Add bio and settings columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Update the handle_new_user trigger function to include username, bio, and settings sync
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
    username = COALESCE(new.raw_user_meta_data->>'username', profiles.username),
    full_name = COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', profiles.full_name),
    avatar_url = COALESCE(new.raw_user_meta_data->>'avatar_url', profiles.avatar_url),
    bio = COALESCE(new.raw_user_meta_data->>'bio', profiles.bio),
    settings = COALESCE(new.raw_user_meta_data->'settings', profiles.settings),
    email = EXCLUDED.email,
    provider = EXCLUDED.provider,
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
