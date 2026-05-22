-- ================================================================
-- Blood-Connect | Migration: 20260523000002
-- Add rejection_notes to transfusion_requests
-- ================================================================

ALTER TABLE public.transfusion_requests
  ADD COLUMN IF NOT EXISTS rejection_notes TEXT;

COMMENT ON COLUMN public.transfusion_requests.rejection_notes
  IS 'Catatan alasan penolakan / darah tidak tersedia dari admin';

-- ================================================================
-- SELESAI ✓
-- ================================================================
