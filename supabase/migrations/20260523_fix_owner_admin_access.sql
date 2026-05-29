-- Fix admin/owner dashboard access after profiles SELECT tightening
-- Uses text casts (matches is_admin()) and normalizes role casing

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = auth.uid()::text
      AND lower(trim(coalesce(role, ''))) IN ('admin', 'owner')
  );
END;
$$;

-- Ensure SELECT policy works for own row + admins/owners
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id::text = auth.uid()::text
    OR public.is_admin()
  );

-- Admins/owners can still manage via existing FOR ALL policy; refresh it to use updated is_admin
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
