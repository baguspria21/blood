-- ================================================================
-- Blood-Connect | Migration: 20260602000001
-- DIPROSES Stage — Estimated Pickup Time
-- ================================================================
-- Adds:
--   1. estimated_pickup_time (TIMESTAMPTZ) → transfusion_requests
--      Set by Admin when responding (DIPROSES stage). Displayed to
--      the hospital so they know when to send someone to pick up the blood.
--   2. unavailable_notes (TEXT) → transfusion_requests
--      Stores a structured JSON-like text of items marked "Tidak Tersedia"
--      by the admin, separate from rejection_notes for clarity.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Estimated pickup time (when blood will be ready for collection)
-- ----------------------------------------------------------------
ALTER TABLE public.transfusion_requests
  ADD COLUMN IF NOT EXISTS estimated_pickup_time TIMESTAMPTZ;

COMMENT ON COLUMN public.transfusion_requests.estimated_pickup_time
  IS 'Estimasi waktu pengambilan darah — diisi Admin saat status transisi ke DIPROSES (approved). Ditampilkan ke RS agar bisa mempersiapkan petugas pengambil.';

-- ================================================================
-- SELESAI ✓
--   ✓ transfusion_requests.estimated_pickup_time added
-- ================================================================
