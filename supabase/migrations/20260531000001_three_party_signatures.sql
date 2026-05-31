-- ================================================================
-- Blood-Connect | Migration: 20260531000001
-- Three-Party Signatures
-- ================================================================
-- Adds:
--   1. requesting_hospital_signature (TEXT) → transfusion_requests
--      Captured by the hospital on their request form.
--   2. officer_signature (TEXT)            → transfusion_responses
--      Captured by the PMI officer when releasing blood.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Hospital signature on the initial request
-- ----------------------------------------------------------------
ALTER TABLE public.transfusion_requests
  ADD COLUMN IF NOT EXISTS requesting_hospital_signature TEXT;

COMMENT ON COLUMN public.transfusion_requests.requesting_hospital_signature
  IS 'Base64 PNG — digital signature of the requesting hospital/doctor captured at form submission time.';

-- ----------------------------------------------------------------
-- 2. PMI officer signature on each blood-bag response row
-- ----------------------------------------------------------------
ALTER TABLE public.transfusion_responses
  ADD COLUMN IF NOT EXISTS officer_signature TEXT;

COMMENT ON COLUMN public.transfusion_responses.officer_signature
  IS 'Base64 PNG — digital signature of the PMI/ATD officer releasing the blood bag.';

-- ================================================================
-- SELESAI ✓
--   ✓ transfusion_requests.requesting_hospital_signature added
--   ✓ transfusion_responses.officer_signature added
-- ================================================================
