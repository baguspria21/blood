-- ================================================================
-- Blood-Connect Palu | Migration: 010 — Proof Upload & 60-Day Cooldown
-- ================================================================

-- 1. Add proof_url column (URL of the donation certificate photo)
ALTER TABLE public.volunteer_donations
  ADD COLUMN IF NOT EXISTS proof_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.volunteer_donations.proof_url
  IS 'Public URL of the PMI/hospital donation certificate photo. Required before admin can mark session as done.';

-- 2. Add description column (if missing from early schema versions)
ALTER TABLE public.volunteer_donations
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

COMMENT ON COLUMN public.volunteer_donations.description
  IS 'Optional note from the volunteer when submitting a donation request.';

-- 3. Create donation-proofs storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'donation-proofs',
  'donation-proofs',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS policies for donation-proofs bucket
--    (Using DROP IF EXISTS + CREATE to avoid DO-block void return issues)

DROP POLICY IF EXISTS "donation_proofs_volunteer_upload" ON storage.objects;
CREATE POLICY "donation_proofs_volunteer_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'donation-proofs');

DROP POLICY IF EXISTS "donation_proofs_public_read" ON storage.objects;
CREATE POLICY "donation_proofs_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'donation-proofs');

DROP POLICY IF EXISTS "donation_proofs_admin_delete" ON storage.objects;
CREATE POLICY "donation_proofs_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'donation-proofs'
    AND public.is_admin()
  );

-- Confirm migration applied (keeps SQL Editor happy)
SELECT
  'Migration applied' AS status,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'volunteer_donations'
     AND column_name  IN ('proof_url', 'description')) AS new_columns_count;
