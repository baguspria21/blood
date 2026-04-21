-- ============================================================
-- Blood-Connect Palu | Supabase Storage Setup
-- Run ini di SQL Editor SETELAH schema.sql
-- ============================================================
-- CATATAN: Bucket dibuat via Supabase Dashboard atau SQL berikut.
-- Dashboard: Storage > New Bucket > Name: "medical-proofs" > Public: ON
-- ============================================================

-- Membuat bucket 'medical-proofs'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-proofs',
  'medical-proofs',
  true,              -- Public: file bisa diakses langsung via URL
  5242880,           -- Max 5MB per file (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE RLS POLICIES
-- ============================================================

-- 1. Siapapun (anon) bisa upload bukti medis ke folder 'proofs/'
--    Format path: proofs/{uuid-request}/{filename}
CREATE POLICY "medical_proofs_public_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'medical-proofs'
    AND (storage.foldername(name))[1] = 'proofs'
  );

-- 2. Siapapun bisa membaca/mengakses file (karena bucket public)
CREATE POLICY "medical_proofs_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'medical-proofs');

-- 3. Hanya admin yang bisa menghapus file
CREATE POLICY "medical_proofs_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'medical-proofs'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- CARA PENGGUNAAN DI NEXT.JS (Referensi)
-- ============================================================
--
-- import { createClient } from '@supabase/supabase-js'
--
-- const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
--
-- async function uploadProof(file: File, requestId: string) {
--   const fileExt = file.name.split('.').pop()
--   const filePath = `proofs/${requestId}/${Date.now()}.${fileExt}`
--
--   const { data, error } = await supabase.storage
--     .from('medical-proofs')
--     .upload(filePath, file, {
--       cacheControl: '3600',
--       upsert: false,
--     })
--
--   if (error) throw error
--
--   // Dapatkan public URL
--   const { data: { publicUrl } } = supabase.storage
--     .from('medical-proofs')
--     .getPublicUrl(filePath)
--
--   return publicUrl  // Simpan ini ke kolom proof_url pada blood_requests
-- }
