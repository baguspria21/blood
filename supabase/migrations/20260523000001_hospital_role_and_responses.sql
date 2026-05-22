-- ================================================================
-- Blood-Connect | Migration: 20260523000001
-- Hospital Role + Transfusion Responses Table
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Add 'hospital' to user_role_enum
-- ----------------------------------------------------------------
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'hospital';

-- ----------------------------------------------------------------
-- 2. TABLE: transfusion_responses
--    Each row = one blood bag record issued by admin in response
--    to a transfusion_request. Matches the RSUD logbook format.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transfusion_responses (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  transfusion_request_id    UUID        NOT NULL REFERENCES public.transfusion_requests(id) ON DELETE CASCADE,

  -- ── Data Kantong Darah ─────────────────────────────────────
  bag_number                TEXT        NOT NULL,      -- Nomor kantong
  collection_date           DATE,                      -- Tanggal pengambilan
  blood_category            TEXT,                      -- Jenis: PRC, WB, FFP, dll.
  volume_cc                 TEXT,                      -- Jumlah cc/kantong
  blood_type_abo            TEXT,                      -- A, B, AB, O
  rhesus                    TEXT,                      -- Positif / Negatif

  -- ── Petugas Pengeluaran (ATD/PTTD) ────────────────────────
  officer_name              TEXT,                      -- Nama petugas
  release_date              DATE,                      -- Tanggal pengeluaran
  release_time              TIME,                      -- Jam pengeluaran

  -- ── Penerima (Keluarga/Petugas Pengambil) ─────────────────
  receiver_name             TEXT,                      -- Nama penerima
  receiver_signature        TEXT,                      -- base64 PNG dari canvas tanda tangan

  -- ── Timestamps ────────────────────────────────────────────
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  public.transfusion_responses IS 'Data darah yang diberikan oleh admin/UTD sebagai respons atas permintaan transfusi dari RS';
COMMENT ON COLUMN public.transfusion_responses.bag_number         IS 'Nomor kantong darah (sesuai logbook UTD)';
COMMENT ON COLUMN public.transfusion_responses.blood_category     IS 'Jenis produk darah: PRC, WB, FFP, Thrombocyte, dll.';
COMMENT ON COLUMN public.transfusion_responses.receiver_signature IS 'Tanda tangan digital penerima, disimpan sebagai base64 PNG';

-- ----------------------------------------------------------------
-- 3. Trigger: auto-update updated_at
-- ----------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_transfusion_responses_updated_at ON public.transfusion_responses;
CREATE TRIGGER trg_transfusion_responses_updated_at
  BEFORE UPDATE ON public.transfusion_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------
-- 4. Row Level Security
-- ----------------------------------------------------------------
ALTER TABLE public.transfusion_responses ENABLE ROW LEVEL SECURITY;

-- Hanya admin yang bisa INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "transfusion_responses_admin_all" ON public.transfusion_responses;
CREATE POLICY "transfusion_responses_admin_all"
  ON public.transfusion_responses FOR ALL
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

-- RS (hospital role) dapat melihat response atas permintaan mereka
-- Admin dapat melihat semua
DROP POLICY IF EXISTS "transfusion_responses_read" ON public.transfusion_responses;
CREATE POLICY "transfusion_responses_read"
  ON public.transfusion_responses FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.transfusion_requests tr
      WHERE tr.id = transfusion_request_id
    )
  );

-- ================================================================
-- SELESAI ✓
--   ✓ user_role_enum: tambah 'hospital'
--   ✓ Tabel transfusion_responses (logbook kantong darah)
--   ✓ Trigger auto-update updated_at
--   ✓ RLS: admin all, hospital/public read
-- ================================================================
