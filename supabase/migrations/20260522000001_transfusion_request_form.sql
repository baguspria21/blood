-- ================================================================
-- Blood-Connect | Migration: 20260522000001 — Transfusion Request Form
-- Tabel untuk Formulir "Permintaan Darah Untuk Transfusi"
-- Sesuai format surat RSUD TORA BELO / rumah sakit umum daerah
--
-- Jalankan via Supabase SQL Editor atau: npx supabase db push
-- ================================================================

-- ----------------------------------------------------------------
-- 1. TABLE: transfusion_requests
--    Mencatat semua field dari formulir "Permintaan Darah Untuk Transfusi"
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transfusion_requests (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identitas Rumah Sakit / Pemohon ──────────────────────────
  requesting_hospital   TEXT,                           -- Nama RS yang meminta
  bagian                TEXT,                           -- Bagian / Ward
  kelas                 TEXT,                           -- Kelas pasien (I, II, III, VIP)
  no_reg                TEXT,                           -- Nomor registrasi
  requesting_doctor     TEXT,                           -- Nama dokter yang meminta

  -- ── Data Pasien ───────────────────────────────────────────────
  patient_name          TEXT              NOT NULL,
  spouse_name           TEXT,                           -- Nama Suami / Istri
  birth_date            DATE,
  age_years             INTEGER,                        -- Umur (tahun)
  age_months            INTEGER,                        -- Umur (bulan)
  address               TEXT,                           -- Alamat / Rumah
  contact_phone         TEXT              NOT NULL,     -- Nomor kontak penanggung jawab
  request_date          DATE              NOT NULL DEFAULT CURRENT_DATE,
  needed_date           DATE,                           -- Tgl diperlukan

  -- ── Klinis / Diagnosa ─────────────────────────────────────────
  diagnosis             TEXT,
  transfusion_reason    TEXT,                           -- Alasan transfusi
  hemoglobin            DECIMAL(5,2),                  -- Hb (g/%) e.g. 6.9
  has_previous_transfusion  BOOLEAN       DEFAULT FALSE,
  had_reaction          BOOLEAN           DEFAULT FALSE,
  reaction_date         DATE,                           -- Kapan reaksi terjadi
  symptoms_1            TEXT,                           -- Gejala 1
  symptoms_2            TEXT,                           -- Gejala 2

  -- ── Uji Coombs ───────────────────────────────────────────────
  coombs_test           BOOLEAN           DEFAULT FALSE,
  coombs_date           DATE,
  coombs_result         TEXT,

  -- ── Khusus Wanita ─────────────────────────────────────────────
  pregnancy_count       INTEGER,                        -- Jumlah kehamilan
  abortion_count        INTEGER,                        -- Pernah abortus
  hemolytic_disease     BOOLEAN           DEFAULT FALSE,-- Penyakit hemolitik bayi

  -- ── Permintaan Darah Lengkap (Whole Blood) ───────────────────
  wb_fresh_volume       INTEGER,                        -- Segar < 48 jam (cc)
  wb_new_volume         INTEGER,                        -- Baru < 6 hari (cc)
  wb_regular_volume     INTEGER,                        -- Biasa (cc)

  -- ── Red Cells Concentrate / Packed Cells (PRC) ───────────────
  prc_fresh_volume      INTEGER,                        -- Segar (cc)
  prc_regular_volume    INTEGER,                        -- Biasa (cc)
  prc_washed_volume     INTEGER,                        -- Cuci (cc)

  -- ── Plasma ───────────────────────────────────────────────────
  plasma_regular_volume INTEGER,                        -- Plasma biasa (cc)
  plasma_ffp_volume     INTEGER,                        -- Fresh Frozen Plasma / FFP (cc)

  -- ── Faktor Pembekuan ──────────────────────────────────────────
  factor_thrombocyte_bags     INTEGER,                  -- Trombosit Concentrate (kantong)
  factor_cryoprecipitate_bags INTEGER,                  -- Cryoprecipitate AHV (kantong)
  factor_buffycoat_bags       INTEGER,                  -- Buffy coat granulocyte (kantong)
  factor_other                TEXT,                     -- Lain-lain

  -- ── Golongan Darah & Rhesus ───────────────────────────────────
  blood_type            blood_type_enum,
  rhesus                rhesus_enum,

  -- ── Referensi & Bukti ─────────────────────────────────────────
  hospital_id           UUID              REFERENCES public.hospitals(id),
  proof_url             TEXT,                           -- URL foto surat pengantar
  status                request_status_enum NOT NULL DEFAULT 'pending',
  admin_notes           TEXT,

  -- ── Timestamps ────────────────────────────────────────────────
  created_at            TIMESTAMPTZ       DEFAULT NOW(),
  updated_at            TIMESTAMPTZ       DEFAULT NOW()
);

COMMENT ON TABLE  public.transfusion_requests IS 'Formulir Permintaan Darah Untuk Transfusi — mengikuti format surat resmi rumah sakit (RSUD Tora Belo)';
COMMENT ON COLUMN public.transfusion_requests.wb_fresh_volume         IS 'Whole Blood Segar < 48 jam, dalam cc';
COMMENT ON COLUMN public.transfusion_requests.wb_new_volume           IS 'Whole Blood Baru < 6 hari, dalam cc';
COMMENT ON COLUMN public.transfusion_requests.wb_regular_volume       IS 'Whole Blood Biasa, dalam cc';
COMMENT ON COLUMN public.transfusion_requests.prc_fresh_volume        IS 'PRC / Packed Red Cells Segar, dalam cc';
COMMENT ON COLUMN public.transfusion_requests.prc_regular_volume      IS 'PRC Biasa, dalam cc';
COMMENT ON COLUMN public.transfusion_requests.prc_washed_volume       IS 'PRC Cuci, dalam cc';
COMMENT ON COLUMN public.transfusion_requests.plasma_regular_volume   IS 'Plasma Biasa, dalam cc';
COMMENT ON COLUMN public.transfusion_requests.plasma_ffp_volume       IS 'Fresh Frozen Plasma (FFP), dalam cc';
COMMENT ON COLUMN public.transfusion_requests.factor_thrombocyte_bags IS 'Trombosit Concentrate, jumlah kantong';
COMMENT ON COLUMN public.transfusion_requests.factor_cryoprecipitate_bags IS 'Cryoprecipitate AHV, jumlah kantong';
COMMENT ON COLUMN public.transfusion_requests.factor_buffycoat_bags   IS 'Buffy coat granulocyte concentrate, jumlah kantong';


-- ----------------------------------------------------------------
-- 2. AUTO-UPDATE updated_at trigger
-- ----------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_transfusion_requests_updated_at ON public.transfusion_requests;

CREATE TRIGGER trg_transfusion_requests_updated_at
  BEFORE UPDATE ON public.transfusion_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ----------------------------------------------------------------
ALTER TABLE public.transfusion_requests ENABLE ROW LEVEL SECURITY;

-- Siapapun (anon) bisa membuat permintaan transfusi
DROP POLICY IF EXISTS "transfusion_requests_public_insert" ON public.transfusion_requests;
CREATE POLICY "transfusion_requests_public_insert"
  ON public.transfusion_requests FOR INSERT
  WITH CHECK (true);

-- Siapapun bisa baca (untuk halaman tracking)
DROP POLICY IF EXISTS "transfusion_requests_public_select" ON public.transfusion_requests;
CREATE POLICY "transfusion_requests_public_select"
  ON public.transfusion_requests FOR SELECT
  USING (true);

-- Hanya admin yang bisa update (approve/reject)
DROP POLICY IF EXISTS "transfusion_requests_admin_update" ON public.transfusion_requests;
CREATE POLICY "transfusion_requests_admin_update"
  ON public.transfusion_requests FOR UPDATE
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

-- Hanya admin yang bisa hapus
DROP POLICY IF EXISTS "transfusion_requests_admin_delete" ON public.transfusion_requests;
CREATE POLICY "transfusion_requests_admin_delete"
  ON public.transfusion_requests FOR DELETE
  USING (public.is_admin());


-- ================================================================
-- SELESAI ✓
--
-- Ringkasan yang dibuat:
--   ✓ Tabel transfusion_requests dengan ~35 kolom
--   ✓ Trigger auto-update updated_at
--   ✓ RLS policies (public insert+select, admin update+delete)
--
-- Berikutnya:
--   Jalankan di Supabase SQL Editor atau via npx supabase db push
-- ================================================================
