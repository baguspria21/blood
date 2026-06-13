-- ================================================================
-- Blood-Connect Palu | Migration: 012 — Cooldown Policy Fixes
-- ================================================================
-- Fixes two gaps that allowed volunteers to bypass the 60-day cooldown:
--
-- 1. Replaces the original permissive INSERT policy on volunteer_donations
--    with one that calls volunteer_cooldown_ok() to block inserts when the
--    volunteer is still within their 60-day recovery window.
--
-- 2. Adds a profiles UPDATE policy for admins so the service-role call in
--    the API route is not the only write path (defence in depth).
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Ensure the cooldown helper exists (idempotent)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.volunteer_cooldown_ok()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT
        last_donated_at IS NULL
        OR last_donated_at <= CURRENT_DATE - INTERVAL '60 days'
      FROM public.profiles
      WHERE id = auth.uid()
    ),
    true  -- If profile not found, allow (will fail at app layer)
  );
$$;

GRANT EXECUTE ON FUNCTION public.volunteer_cooldown_ok() TO authenticated;

-- ----------------------------------------------------------------
-- 2. Replace the permissive INSERT policy on volunteer_donations
--    The old policy ("Volunteers can insert own donations") only checked
--    auth.uid() = volunteer_id but NOT the 60-day cooldown.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Volunteers can insert own donations"       ON public.volunteer_donations;
DROP POLICY IF EXISTS "volunteer_donations_cooldown_insert"       ON public.volunteer_donations;

CREATE POLICY "volunteer_donations_cooldown_insert"
  ON public.volunteer_donations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = volunteer_id
    AND public.volunteer_cooldown_ok()
  );

-- ----------------------------------------------------------------
-- 3. Add a missing admin UPDATE policy for profiles
--    Without this, the app must use the service-role client to write
--    last_donated_at to a volunteer's profile row (which it now does),
--    but this policy is good defence-in-depth.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;

CREATE POLICY "profiles_admin_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------
-- 4. Verify
-- ----------------------------------------------------------------
SELECT
  'Policies applied' AS status,
  policyname,
  tablename
FROM pg_policies
WHERE tablename IN ('volunteer_donations', 'profiles')
  AND policyname IN (
    'volunteer_donations_cooldown_insert',
    'profiles_admin_update'
  )
ORDER BY tablename, policyname;
