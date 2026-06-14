-- ================================================================
-- Blood-Connect | Migration: 20260614000001
-- Add user_id to transfusion_requests for hospital data isolation
--
-- This column links each transfusion request to the Supabase Auth
-- user who submitted it, enabling application-level filtering so
-- each hospital account sees ONLY its own requests.
--
-- NOTE: Existing rows will have user_id = NULL (they remain visible
-- to admins but will not appear in hospital portal queries that
-- filter by .eq('user_id', user.id). This is intentional.
-- ================================================================

ALTER TABLE public.transfusion_requests
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.transfusion_requests.user_id
  IS 'Supabase Auth user ID of the hospital account that submitted this request. Used for application-level data isolation.';

-- Index for fast per-user lookups (dashboard, status, deskripsi pages)
CREATE INDEX IF NOT EXISTS idx_transfusion_requests_user_id
  ON public.transfusion_requests (user_id);

-- ================================================================
-- SELESAI ✓
--   ✓ transfusion_requests.user_id (UUID, nullable, FK → auth.users)
--   ✓ Index on user_id for query performance
-- ================================================================
