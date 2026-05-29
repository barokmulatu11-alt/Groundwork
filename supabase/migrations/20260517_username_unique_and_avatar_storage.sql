-- ============================================================
-- Migration: Username uniqueness + Avatar cloud storage setup
-- ============================================================

-- 1. Ensure username column exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Add UNIQUE constraint on username (only one account per username)
--    Use a partial unique index so NULL usernames don't conflict
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx 
  ON public.profiles (lower(username)) 
  WHERE username IS NOT NULL;

-- 3. Create Supabase Storage bucket for avatars (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 4. Storage RLS: anyone can read avatars (they're public)
DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;
CREATE POLICY "Public avatar read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 5. Storage RLS: users can only upload/update their own avatar
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. Fix the handle_new_user trigger to NEVER overwrite user-set data
--    with empty/null OAuth metadata. The key rules:
--    - On first INSERT (new user): use metadata values
--    - On UPDATE (login): only update email/provider. NEVER touch username, avatar_url,
--      bio, or settings — these are user-owned fields protected from OAuth overwrites.
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
    -- Only update email and provider (system fields)
    email = EXCLUDED.email,
    provider = EXCLUDED.provider,
    updated_at = NOW()
    -- username, full_name, avatar_url, bio, settings are NEVER touched on re-login.
    -- Users set these themselves via edit-profile. OAuth metadata is untrusted for these fields.
  ;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
