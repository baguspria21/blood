-- ================================================================
-- Blood-Connect Palu | Migration: 010 — Proof Upload & 60-Day Cooldown
-- File: supabase/migrations/20260613000001_proof_upload_and_cooldown.sql
--
-- Changes:
--   1. Adds 'proof_url' column to volunteer_donations
--      (the URL of the official donation certificate uploaded by the volunteer)
--   2. Adds 'description' column to volunteer_donations (if not already present)
--   3. Cooldown logic has moved to 60 days (enforced in application layer).
--      The last_donated_at column on profiles is unchanged — only set after
--      admin marks a session as 'done' AND proof_url is populated.
--
-- Run via Supabase SQL Editor or: npx supabase db push
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Add proof_url column to volunteer_donations
--    Stores the Supabase Storage public URL of the donation
--    certificate photo uploaded by the volunteer after donating.
-- ----------------------------------------------------------------
ALTER TABLE public.volunteer_donations
  ADD COLUMN IF NOT EXISTS proof_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.volunteer_donations.proof_url
  IS 'Public URL of the PMI/hospital donation certificate photo uploaded by the volunteer. Required before admin can mark session as done.';

-- ----------------------------------------------------------------
-- 2. Add description column to volunteer_donations (if missing)
--    Some early schema versions may not have this column.
-- ----------------------------------------------------------------
ALTER TABLE public.volunteer_donations
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

COMMENT ON COLUMN public.volunteer_donations.description
  IS 'Optional note from the volunteer when submitting a donation request (e.g. availability time).';

-- ----------------------------------------------------------------
-- 3. Storage bucket: donation-proofs
--    Separate bucket for volunteer donation certificates
--    (distinct from the existing medical-proofs bucket for blood requests).
--    Create via Supabase Dashboard → Storage → New Bucket, or run below.
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'donation-proofs',
  'donation-proofs',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 4. Storage RLS policies for donation-proofs bucket
-- ----------------------------------------------------------------

-- Authenticated volunteers can upload their own proof
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'donation_proofs_volunteer_upload'
  ) THEN
    CREATE POLICY "donation_proofs_volunteer_upload"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'donation-proofs'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- Anyone can read (public bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'donation_proofs_public_read'
  ) THEN
    CREATE POLICY "donation_proofs_public_read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'donation-proofs');
  END IF;
END $$;

-- Only admins can delete proof files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'donation_proofs_admin_delete'
  ) THEN
    CREATE POLICY "donation_proofs_admin_delete"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'donation-proofs'
        AND public.is_admin()
      );
  END IF;
END $$;

-- ================================================================
-- SELESAI ✓
--
-- Ringkasan:
--   ✓ proof_url column added to volunteer_donations
--   ✓ description column added to volunteer_donations (idempotent)
--   ✓ donation-proofs storage bucket created
--   ✓ Storage RLS policies set
--
-- Catatan Logika Cooldown:
--   - Cooldown DIUBAH dari 90 hari → 60 hari (di application layer)
--   - last_donated_at hanya di-set setelah:
--     (a) Volunteer mengunggah bukti donor (proof_url terisi)
--     (b) Admin mengklik "Selesai" untuk session tersebut
-- ================================================================
