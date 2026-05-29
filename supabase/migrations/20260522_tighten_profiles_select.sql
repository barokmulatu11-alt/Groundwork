-- Tighten profiles SELECT: own row + admin/owner can read all
-- profiles.id is UUID — compare with auth.uid() directly (not text = uuid)

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id::text = auth.uid()::text
    OR public.is_admin()
  );
