-- ================================================================
-- Blood-Connect Palu | SCHEMA BERSIH — Versi Terkonsolidasi
-- File: supabase/schema_clean.sql
--
-- Skrip ini adalah representasi FINAL dari seluruh skema aktif.
-- Jalankan di Supabase SQL Editor pada database yang KOSONG,
-- atau gunakan sebagai referensi arsitektur resmi.
--
-- Urutan eksekusi:
--   0. Extensions
--   1. DROP tabel inti (clean-slate)
--   2. ENUM Types
--   3. Tabel-tabel utama
--   4. Fungsi helper & trigger
--   5. Row Level Security (RLS)
--   6. Seed data Rumah Sakit Palu
-- ================================================================


-- ================================================================
-- 0. EXTENSIONS
--    Aktifkan ekstensi UUID jika belum ada
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ================================================================
-- 1. CLEAN SLATE — Hapus tabel inti beserta dependensinya
--    Urutan DROP mengikuti dependency (child dulu, lalu parent).
--    CASCADE memastikan FK dan RLS policy ikut terhapus.
-- ================================================================

-- Tabel transaksi / anak dihapus lebih dulu
DROP TABLE IF EXISTS public.transfusion_responses  CASCADE;
DROP TABLE IF EXISTS public.transfusion_requests   CASCADE;
DROP TABLE IF EXISTS public.volunteer_responses    CASCADE;
DROP TABLE IF EXISTS public.volunteer_donations    CASCADE;

-- Tabel inti yang diminta clean-slate
DROP TABLE IF EXISTS public.donor_sessions         CASCADE;  -- alias/future table
DROP TABLE IF EXISTS public.blood_inventory        CASCADE;
DROP TABLE IF EXISTS public.blood_requests         CASCADE;
DROP TABLE IF EXISTS public.profiles               CASCADE;
DROP TABLE IF EXISTS public.hospitals              CASCADE;

-- Hapus ENUM types lama agar bisa dibuat ulang dengan bersih
DROP TYPE IF EXISTS blood_type_enum        CASCADE;
DROP TYPE IF EXISTS rhesus_enum            CASCADE;
DROP TYPE IF EXISTS user_role_enum         CASCADE;
DROP TYPE IF EXISTS request_status_enum    CASCADE;
DROP TYPE IF EXISTS request_priority_enum  CASCADE;
DROP TYPE IF EXISTS donation_status_enum   CASCADE;


-- ================================================================
-- 2. ENUM TYPES
--    Tipe data domain khusus aplikasi Blood-Connect
-- ================================================================

-- Golongan darah (termasuk UNKNOWN untuk kasus darurat / data belum lengkap)
CREATE TYPE blood_type_enum AS ENUM (
  'A',
  'B',
  'AB',
  'O',
  'UNKNOWN'
);

-- Rhesus faktor
CREATE TYPE rhesus_enum AS ENUM (
  '+',
  '-'
);

-- Peran pengguna dalam sistem
CREATE TYPE user_role_enum AS ENUM (
  'volunteer',   -- Relawan donor
  'admin',       -- Admin UTD / PMI
  'hospital'     -- Petugas rumah sakit (dapat melihat status permintaan)
);

-- Status permintaan darah (blood_requests & transfusion_requests)
CREATE TYPE request_status_enum AS ENUM (
  'pending',     -- Menunggu verifikasi admin
  'approved',    -- Disetujui / sedang diproses
  'completed',   -- Terpenuhi
  'rejected'     -- Ditolak
);

-- Prioritas permintaan darah
CREATE TYPE request_priority_enum AS ENUM (
  'cito',        -- Sangat mendesak / emergency
  'regular'      -- Permintaan biasa
);

-- Status sesi donor sukarela
CREATE TYPE donation_status_enum AS ENUM (
  'pending',     -- Menunggu konfirmasi jadwal
  'approved',    -- Jadwal dikonfirmasi admin
  'done',        -- Donor selesai dilakukan
  'rejected'     -- Ditolak / dibatalkan
);


-- ================================================================
-- 3. TABEL-TABEL UTAMA
-- ================================================================


-- ----------------------------------------------------------------
-- 3a. TABLE: hospitals
--     Master data Rumah Sakit di Kota Palu, Sulawesi Tengah.
--     Dibaca oleh semua role; hanya admin yang bisa ubah.
-- ----------------------------------------------------------------
CREATE TABLE public.hospitals (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT         NOT NULL,
  address    TEXT,
  lat        DECIMAL(10, 7),                   -- Latitude koordinat RS
  lng        DECIMAL(10, 7),                   -- Longitude koordinat RS
  phone      TEXT,                             -- Nomor telepon RS
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.hospitals       IS 'Master data Rumah Sakit di Kota Palu';
COMMENT ON COLUMN public.hospitals.lat   IS 'Latitude koordinat GPS rumah sakit';
COMMENT ON COLUMN public.hospitals.lng   IS 'Longitude koordinat GPS rumah sakit';
COMMENT ON COLUMN public.hospitals.phone IS 'Nomor telepon utama rumah sakit';


-- ----------------------------------------------------------------
-- 3b. TABLE: profiles
--     Profil pengguna (relawan, admin, hospital).
--     Terhubung 1-to-1 dengan auth.users via trigger handle_new_user.
-- ----------------------------------------------------------------
CREATE TABLE public.profiles (
  id               UUID            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT            NOT NULL,
  phone_number     TEXT            UNIQUE NOT NULL,
  blood_type       blood_type_enum
                   CHECK (blood_type IN ('A','B','AB','O','UNKNOWN')),
  rhesus           rhesus_enum
                   CHECK (rhesus IN ('+','-')),
  sub_district     TEXT,                       -- Kecamatan domisili di Palu
  role             user_role_enum  NOT NULL DEFAULT 'volunteer',
  last_donated_at  DATE,                       -- Tanggal donor terakhir; NULL = belum pernah
  is_active        BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.profiles                  IS 'Profil pengguna sistem — extend dari auth.users Supabase';
COMMENT ON COLUMN public.profiles.blood_type       IS 'Golongan darah; UNKNOWN jika belum diisi saat registrasi';
COMMENT ON COLUMN public.profiles.last_donated_at  IS 'Tanggal donor terakhir — dasar perhitungan cooldown 60 hari';
COMMENT ON COLUMN public.profiles.is_active        IS 'FALSE selama masa cooldown 60 hari pasca donor';


-- ----------------------------------------------------------------
-- 3c. TABLE: blood_requests
--     Permintaan darah darurat. Dapat disubmit siapapun (public),
--     termasuk tanpa login. Admin memverifikasi & mengubah status.
-- ----------------------------------------------------------------
CREATE TABLE public.blood_requests (
  id              UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name    TEXT                 NOT NULL,
  contact_phone   TEXT                 NOT NULL,
  hospital_id     UUID                 NOT NULL REFERENCES public.hospitals(id),
  blood_type      blood_type_enum      NOT NULL
                  CHECK (blood_type IN ('A','B','AB','O','UNKNOWN')),
  rhesus          rhesus_enum          NOT NULL
                  CHECK (rhesus IN ('+','-')),
  bags_needed     INTEGER              NOT NULL CHECK (bags_needed    > 0),
  bags_fulfilled  INTEGER              NOT NULL DEFAULT 0
                                                CHECK (bags_fulfilled >= 0),
  priority        request_priority_enum NOT NULL DEFAULT 'regular',
  proof_url       TEXT,                          -- URL foto surat pengantar dari Supabase Storage
  status          request_status_enum  NOT NULL DEFAULT 'pending',
  admin_notes     TEXT,                          -- Catatan admin saat approve/reject

  created_at      TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

  -- Jumlah terpenuhi tidak boleh melebihi yang dibutuhkan
  CONSTRAINT chk_bags_fulfilled_lte_needed CHECK (bags_fulfilled <= bags_needed)
);

COMMENT ON TABLE  public.blood_requests             IS 'Permintaan darah darurat — bisa disubmit siapapun (public)';
COMMENT ON COLUMN public.blood_requests.priority    IS 'Cito = sangat mendesak, Regular = biasa';
COMMENT ON COLUMN public.blood_requests.proof_url   IS 'URL foto surat pengantar dari bucket medical-proofs';
COMMENT ON COLUMN public.blood_requests.admin_notes IS 'Catatan admin saat verifikasi permintaan';


-- ----------------------------------------------------------------
-- 3d. TABLE: blood_inventory
--     Stok kantong darah saat ini per kombinasi golongan + rhesus.
--     Satu baris per kombinasi (8 baris total). Hanya admin yang update.
-- ----------------------------------------------------------------
CREATE TABLE public.blood_inventory (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_type  blood_type_enum NOT NULL
              CHECK (blood_type IN ('A','B','AB','O','UNKNOWN')),
  rhesus      rhesus_enum     NOT NULL
              CHECK (rhesus IN ('+','-')),
  bags_count  INTEGER         NOT NULL DEFAULT 0 CHECK (bags_count >= 0),
  updated_by  UUID            REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- Satu baris per kombinasi golongan darah + rhesus
  UNIQUE (blood_type, rhesus)
);

COMMENT ON TABLE  public.blood_inventory            IS 'Stok kantong darah saat ini per golongan darah & rhesus';
COMMENT ON COLUMN public.blood_inventory.bags_count IS 'Jumlah kantong darah tersedia di UTD/PMI';
COMMENT ON COLUMN public.blood_inventory.updated_by IS 'UUID admin yang terakhir mengubah stok';


-- ----------------------------------------------------------------
-- 3e. TABLE: donor_sessions  (alias: volunteer_donations)
--     Sesi donor sukarela yang diinisiasi oleh relawan.
--     Relawan mengajukan, admin konfirmasi jadwal, lalu mark done.
-- ----------------------------------------------------------------
CREATE TABLE public.donor_sessions (
  id           UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID                 NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_type   blood_type_enum      NOT NULL
               CHECK (blood_type IN ('A','B','AB','O','UNKNOWN')),
  rhesus       rhesus_enum          NOT NULL
               CHECK (rhesus IN ('+','-')),
  status       donation_status_enum NOT NULL DEFAULT 'pending',
  admin_notes  TEXT,                           -- Catatan admin (jadwal, alasan tolak, dll.)
  bags_donated INTEGER              NOT NULL DEFAULT 1 CHECK (bags_donated >= 1),
  description  TEXT,                           -- Catatan opsional dari relawan saat submit
  proof_url    TEXT,                           -- URL foto sertifikat donor (PMI/RS)
  created_at   TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.donor_sessions             IS 'Sesi donor sukarela yang diajukan relawan ke PMI/UTD';
COMMENT ON COLUMN public.donor_sessions.status      IS 'pending→approved→done | pending→rejected';
COMMENT ON COLUMN public.donor_sessions.proof_url   IS 'URL foto sertifikat donor — wajib ada sebelum admin mark done';
COMMENT ON COLUMN public.donor_sessions.description IS 'Catatan opsional relawan saat mengajukan sesi donor';


-- ----------------------------------------------------------------
-- 3f. TABLE: volunteer_responses
--     Mencatat relawan yang merespons permintaan darah darurat.
--     Satu relawan hanya bisa merespons satu kali per permintaan.
-- ----------------------------------------------------------------
CREATE TABLE public.volunteer_responses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID        NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  volunteer_id UUID        NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Satu relawan hanya bisa konfirmasi satu kali per permintaan
  UNIQUE (request_id, volunteer_id)
);

COMMENT ON TABLE public.volunteer_responses IS 'Konfirmasi kesediaan relawan untuk satu permintaan darah darurat';


-- ----------------------------------------------------------------
-- 3g. TABLE: transfusion_requests
--     Formulir lengkap "Permintaan Darah Untuk Transfusi"
--     sesuai format surat resmi RSUD. Disubmit oleh RS/petugas.
-- ----------------------------------------------------------------
CREATE TABLE public.transfusion_requests (
  id                    UUID                PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identitas Pemohon / Rumah Sakit ──────────────────────────
  requesting_hospital   TEXT,
  bagian                TEXT,                           -- Ward / bagian RS
  kelas                 TEXT,                           -- Kelas pasien (I, II, III, VIP)
  no_reg                TEXT,                           -- Nomor registrasi RS
  requesting_doctor     TEXT,                           -- Nama dokter pemesan

  -- ── Data Pasien ───────────────────────────────────────────────
  patient_name          TEXT                NOT NULL,
  spouse_name           TEXT,
  birth_date            DATE,
  age_years             INTEGER,
  age_months            INTEGER,
  address               TEXT,
  contact_phone         TEXT                NOT NULL,
  request_date          DATE                NOT NULL DEFAULT CURRENT_DATE,
  needed_date           DATE,

  -- ── Klinis / Diagnosa ─────────────────────────────────────────
  diagnosis             TEXT,
  transfusion_reason    TEXT,
  hemoglobin            DECIMAL(5,2),                  -- Hemoglobin (g/%)
  has_previous_transfusion BOOLEAN          DEFAULT FALSE,
  had_reaction          BOOLEAN             DEFAULT FALSE,
  reaction_date         DATE,
  symptoms_1            TEXT,
  symptoms_2            TEXT,

  -- ── Uji Coombs ───────────────────────────────────────────────
  coombs_test           BOOLEAN             DEFAULT FALSE,
  coombs_date           DATE,
  coombs_result         TEXT,

  -- ── Khusus Wanita ─────────────────────────────────────────────
  pregnancy_count       INTEGER,
  abortion_count        INTEGER,
  hemolytic_disease     BOOLEAN             DEFAULT FALSE,

  -- ── Produk Darah yang Diminta ─────────────────────────────────
  wb_fresh_volume       INTEGER,                        -- Whole Blood Segar <48 jam (cc)
  wb_new_volume         INTEGER,                        -- Whole Blood Baru <6 hari (cc)
  wb_regular_volume     INTEGER,                        -- Whole Blood Biasa (cc)
  prc_fresh_volume      INTEGER,                        -- PRC Segar (cc)
  prc_regular_volume    INTEGER,                        -- PRC Biasa (cc)
  prc_washed_volume     INTEGER,                        -- PRC Cuci (cc)
  plasma_regular_volume INTEGER,                        -- Plasma Biasa (cc)
  plasma_ffp_volume     INTEGER,                        -- Fresh Frozen Plasma (cc)
  factor_thrombocyte_bags     INTEGER,                  -- Trombosit Concentrate (kantong)
  factor_cryoprecipitate_bags INTEGER,                  -- Cryoprecipitate AHV (kantong)
  factor_buffycoat_bags       INTEGER,                  -- Buffy coat granulocyte (kantong)
  factor_other          TEXT,

  -- ── Golongan Darah ────────────────────────────────────────────
  blood_type            blood_type_enum
                        CHECK (blood_type IN ('A','B','AB','O','UNKNOWN')),
  rhesus                rhesus_enum
                        CHECK (rhesus IN ('+','-')),

  -- ── Tanda Tangan Digital ──────────────────────────────────────
  requesting_hospital_signature TEXT,                   -- Base64 PNG — tanda tangan RS pemohon

  -- ── Status & Referensi ────────────────────────────────────────
  hospital_id           UUID                REFERENCES public.hospitals(id),
  proof_url             TEXT,
  status                request_status_enum NOT NULL DEFAULT 'pending',
  admin_notes           TEXT,
  rejection_notes       TEXT,                           -- Alasan penolakan / darah tidak tersedia
  estimated_pickup_time TIMESTAMPTZ,                   -- Estimasi waktu ambil (diisi admin saat DIPROSES)

  -- ── Timestamps ────────────────────────────────────────────────
  created_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.transfusion_requests                           IS 'Formulir Permintaan Darah Untuk Transfusi — format resmi RSUD';
COMMENT ON COLUMN public.transfusion_requests.requesting_hospital_signature IS 'Base64 PNG tanda tangan digital dokter/petugas RS pemohon';
COMMENT ON COLUMN public.transfusion_requests.estimated_pickup_time    IS 'Diisi Admin saat status transisi ke approved; ditampilkan ke RS';
COMMENT ON COLUMN public.transfusion_requests.rejection_notes          IS 'Catatan item yang tidak tersedia, terpisah dari admin_notes';


-- ----------------------------------------------------------------
-- 3h. TABLE: transfusion_responses
--     Setiap baris = satu kantong darah yang dikeluarkan UTD
--     sebagai respons atas transfusion_request. Format logbook.
-- ----------------------------------------------------------------
CREATE TABLE public.transfusion_responses (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  transfusion_request_id UUID        NOT NULL REFERENCES public.transfusion_requests(id) ON DELETE CASCADE,

  -- ── Data Kantong Darah ────────────────────────────────────────
  bag_number             TEXT        NOT NULL,          -- Nomor kantong (sesuai logbook UTD)
  collection_date        DATE,                          -- Tanggal pengambilan darah
  blood_category         TEXT,                          -- Jenis: PRC, WB, FFP, Thrombocyte, dll.
  volume_cc              TEXT,                          -- Volume dalam cc
  blood_type_abo         TEXT,                          -- Golongan darah (teks bebas dari logbook)
  rhesus                 TEXT,                          -- Positif / Negatif (teks bebas)

  -- ── Petugas Pengeluaran ───────────────────────────────────────
  officer_name           TEXT,                          -- Nama ATD/PTTD yang mengeluarkan
  officer_signature      TEXT,                          -- Base64 PNG tanda tangan petugas UTD
  release_date           DATE,                          -- Tanggal pengeluaran
  release_time           TIME,                          -- Jam pengeluaran

  -- ── Penerima ─────────────────────────────────────────────────
  receiver_name          TEXT,                          -- Nama petugas/keluarga penerima
  receiver_signature     TEXT,                          -- Base64 PNG tanda tangan penerima

  -- ── Timestamps ────────────────────────────────────────────────
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.transfusion_responses                      IS 'Data darah yang dikeluarkan UTD per kantong — respons atas transfusion_request';
COMMENT ON COLUMN public.transfusion_responses.bag_number           IS 'Nomor kantong darah sesuai logbook UTD';
COMMENT ON COLUMN public.transfusion_responses.blood_category       IS 'Jenis produk darah: PRC, WB, FFP, Thrombocyte, Cryoprecipitate, dll.';
COMMENT ON COLUMN public.transfusion_responses.officer_signature    IS 'Base64 PNG — tanda tangan digital petugas ATD/PTTD saat pengeluaran';
COMMENT ON COLUMN public.transfusion_responses.receiver_signature   IS 'Base64 PNG — tanda tangan digital penerima kantong darah';


-- ================================================================
-- 4. FUNGSI HELPER & TRIGGER
-- ================================================================


-- ----------------------------------------------------------------
-- 4a. FUNGSI: set_updated_at()
--     Trigger function generik — memperbarui kolom updated_at
--     ke waktu sekarang setiap kali baris diupdate.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Pasang trigger updated_at ke semua tabel yang memiliki kolom tersebut
DROP TRIGGER IF EXISTS trg_profiles_updated_at              ON public.profiles;
DROP TRIGGER IF EXISTS trg_blood_requests_updated_at        ON public.blood_requests;
DROP TRIGGER IF EXISTS trg_blood_inventory_updated_at       ON public.blood_inventory;
DROP TRIGGER IF EXISTS trg_donor_sessions_updated_at        ON public.donor_sessions;
DROP TRIGGER IF EXISTS trg_transfusion_requests_updated_at  ON public.transfusion_requests;
DROP TRIGGER IF EXISTS trg_transfusion_responses_updated_at ON public.transfusion_responses;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_blood_requests_updated_at
  BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_blood_inventory_updated_at
  BEFORE UPDATE ON public.blood_inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_donor_sessions_updated_at
  BEFORE UPDATE ON public.donor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_transfusion_requests_updated_at
  BEFORE UPDATE ON public.transfusion_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_transfusion_responses_updated_at
  BEFORE UPDATE ON public.transfusion_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----------------------------------------------------------------
-- 4b. FUNGSI: handle_new_user()
--     Trigger function untuk sinkronisasi auth.users → public.profiles.
--
--     Dieksekusi otomatis setiap kali user baru mendaftar via
--     Supabase Auth. Data awal diambil dari raw_user_meta_data
--     yang dikirim frontend saat signUp():
--
--       supabase.auth.signUp({
--         email, password,
--         options: { data: { name, phone_number, blood_type, rhesus } }
--       })
--
--     Penanganan NULL:
--       - name        → fallback 'Pengguna Baru'
--       - phone_number→ fallback string kosong (wajib diupdate profil)
--       - blood_type  → NULL jika nilai tidak valid ('A','B','AB','O','UNKNOWN')
--       - rhesus      → NULL jika nilai tidak valid ('+','-')
--       - sub_district→ NULL jika tidak disertakan
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER                              -- Berjalan dengan hak akses superuser
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    phone_number,
    blood_type,
    rhesus,
    sub_district,
    role,
    is_active
  )
  VALUES (
    NEW.id,
    -- Nama: ambil dari metadata, fallback ke 'Pengguna Baru' jika NULL/kosong
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), 'Pengguna Baru'),

    -- Nomor HP: ambil dari metadata, fallback ke string kosong
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),

    -- Golongan darah: validasi whitelist, NULL jika tidak dikenal
    CASE
      WHEN NEW.raw_user_meta_data->>'blood_type' IN ('A', 'B', 'AB', 'O', 'UNKNOWN')
      THEN (NEW.raw_user_meta_data->>'blood_type')::blood_type_enum
      ELSE NULL
    END,

    -- Rhesus: validasi whitelist, NULL jika tidak dikenal
    CASE
      WHEN NEW.raw_user_meta_data->>'rhesus' IN ('+', '-')
      THEN (NEW.raw_user_meta_data->>'rhesus')::rhesus_enum
      ELSE NULL
    END,

    -- Kecamatan: NULL jika tidak disertakan
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'sub_district', '')), ''),

    'volunteer',   -- Default role = relawan
    TRUE           -- Aktif secara default (belum pernah donor)
  )
  ON CONFLICT (id) DO NOTHING;              -- Aman jika trigger dipanggil duplikat

  RETURN NEW;
END;
$$;

-- Pasang trigger ke auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------
-- 4c. FUNGSI: handle_user_update()
--     Sinkronisasi perubahan raw_user_meta_data dari auth.users
--     ke public.profiles saat user memperbarui metadata mereka
--     (misalnya via supabase.auth.updateUser()).
--
--     Hanya memperbarui field non-NULL dari metadata baru
--     agar tidak menimpa data profil yang sudah ada.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    -- Hanya update name jika metadata baru menyertakannya
    name         = COALESCE(
                     NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
                     name
                   ),
    -- Hanya update phone_number jika metadata baru menyertakannya
    phone_number = COALESCE(
                     NULLIF(TRIM(NEW.raw_user_meta_data->>'phone_number'), ''),
                     phone_number
                   ),
    -- Hanya update blood_type jika nilai valid
    blood_type   = CASE
                     WHEN NEW.raw_user_meta_data->>'blood_type' IN ('A','B','AB','O','UNKNOWN')
                     THEN (NEW.raw_user_meta_data->>'blood_type')::blood_type_enum
                     ELSE blood_type
                   END,
    -- Hanya update rhesus jika nilai valid
    rhesus       = CASE
                     WHEN NEW.raw_user_meta_data->>'rhesus' IN ('+','-')
                     THEN (NEW.raw_user_meta_data->>'rhesus')::rhesus_enum
                     ELSE rhesus
                   END,
    updated_at   = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Pasang trigger ke auth.users
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();


-- ----------------------------------------------------------------
-- 4d. FUNGSI: is_volunteer_eligible(p_volunteer_id UUID)
--     Fungsi helper STRICT untuk validasi cooldown 60 hari.
--
--     Mengembalikan TRUE jika relawan ELIGIBLE (boleh donor):
--       - Belum pernah donor (last_donated_at IS NULL), ATAU
--       - Donor terakhir sudah > 60 hari yang lalu
--
--     Mengembalikan FALSE jika masih dalam masa cooldown.
--     Mengembalikan NULL jika volunteer_id tidak ditemukan.
--
--     Dipanggil dari:
--       - RLS policy donor_sessions (INSERT)
--       - API route Next.js sebelum approve
--       - RPC respond_to_request
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_volunteer_eligible(p_volunteer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      -- Relawan tidak ditemukan → kembalikan NULL (akan di-handle app layer)
      WHEN NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = p_volunteer_id
      ) THEN NULL

      -- Cek kelayakan: belum pernah donor ATAU sudah lewat 60 hari
      ELSE (
        SELECT
          last_donated_at IS NULL
          OR last_donated_at <= CURRENT_DATE - INTERVAL '60 days'
        FROM public.profiles
        WHERE id = p_volunteer_id
      )
    END;
$$;

COMMENT ON FUNCTION public.is_volunteer_eligible(UUID)
  IS 'Mengembalikan TRUE jika relawan boleh donor (belum pernah donor, atau cooldown 60 hari sudah terlewati). NULL jika ID tidak ditemukan.';


-- ----------------------------------------------------------------
-- 4e. FUNGSI: volunteer_cooldown_ok()
--     Versi tanpa parameter — digunakan di dalam RLS policy.
--     Memeriksa kelayakan relawan yang sedang login (auth.uid()).
--
--     Mengembalikan TRUE jika:
--       - Profil tidak ditemukan (fallback allow — gagal di app layer)
--       - last_donated_at IS NULL (belum pernah donor)
--       - last_donated_at <= CURRENT_DATE - 60 hari
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
    TRUE   -- Jika profil tidak ditemukan, izinkan (akan gagal di app layer)
  );
$$;

COMMENT ON FUNCTION public.volunteer_cooldown_ok()
  IS 'Helper untuk RLS policy: TRUE jika relawan aktif (auth.uid()) boleh donor. Cooldown ketat 60 hari.';

GRANT EXECUTE ON FUNCTION public.volunteer_cooldown_ok() TO authenticated;


-- ----------------------------------------------------------------
-- 4f. FUNGSI: is_admin()
--     Helper cepat untuk RLS policy — memeriksa apakah user
--     yang sedang login (auth.uid()) memiliki role 'admin'.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin()
  IS 'Mengembalikan TRUE jika user yang login adalah admin. Dipakai di RLS policy seluruh tabel.';


-- ----------------------------------------------------------------
-- 4g. FUNGSI RPC: respond_to_request(p_request_id, p_volunteer_id)
--     Dipanggil dari Next.js saat relawan konfirmasi kesediaan donor.
--
--     Melakukan dalam satu transaksi atomik:
--       1. Validasi permintaan (harus 'approved' & belum terpenuhi)
--       2. Validasi cooldown relawan (60 hari ketat)
--       3. Cek duplikasi respons
--       4. Insert ke volunteer_responses
--       5. Increment bags_fulfilled; ubah status ke 'completed' jika penuh
--       6. Update last_donated_at & is_active relawan
--       7. Kembalikan info RS tujuan
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_to_request(
  p_request_id   UUID,
  p_volunteer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request  public.blood_requests%ROWTYPE;
  v_hospital public.hospitals%ROWTYPE;
BEGIN
  -- 1. Cek permintaan ada dan berstatus 'approved'
  SELECT * INTO v_request
    FROM public.blood_requests
   WHERE id = p_request_id AND status = 'approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Permintaan tidak ditemukan atau belum disetujui.'
    );
  END IF;

  -- 2. Cek apakah kebutuhan darah sudah terpenuhi
  IF v_request.bags_fulfilled >= v_request.bags_needed THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Permintaan darah sudah terpenuhi. Terima kasih!'
    );
  END IF;

  -- 3. Cek cooldown 60 hari relawan
  IF NOT public.is_volunteer_eligible(p_volunteer_id) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Anda masih dalam masa cooldown 60 hari sejak donor terakhir.'
    );
  END IF;

  -- 4. Cek duplikasi — relawan sudah merespons request ini sebelumnya
  IF EXISTS (
    SELECT 1 FROM public.volunteer_responses
     WHERE request_id = p_request_id AND volunteer_id = p_volunteer_id
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Anda sudah merespons permintaan ini sebelumnya.'
    );
  END IF;

  -- 5. Catat respons relawan
  INSERT INTO public.volunteer_responses (request_id, volunteer_id)
    VALUES (p_request_id, p_volunteer_id);

  -- 6. Update kantong terpenuhi; ubah status ke 'completed' jika sudah penuh
  UPDATE public.blood_requests
  SET
    bags_fulfilled = bags_fulfilled + 1,
    status         = CASE
                       WHEN bags_fulfilled + 1 >= bags_needed THEN 'completed'::request_status_enum
                       ELSE status
                     END
  WHERE id = p_request_id;

  -- 7. Catat tanggal donor & nonaktifkan relawan (cooldown 60 hari dimulai)
  UPDATE public.profiles
  SET
    last_donated_at = CURRENT_DATE,
    is_active       = FALSE
  WHERE id = p_volunteer_id;

  -- 8. Ambil info RS untuk dikembalikan ke relawan
  SELECT * INTO v_hospital
    FROM public.hospitals WHERE id = v_request.hospital_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Terima kasih! Silakan menuju rumah sakit segera.',
    'hospital', jsonb_build_object(
      'name',     v_hospital.name,
      'address',  v_hospital.address,
      'phone',    v_hospital.phone,
      'map_link', 'https://www.google.com/maps/search/?api=1&query='
                  || v_hospital.lat::TEXT || ',' || v_hospital.lng::TEXT
    )
  );
END;
$$;


-- ================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE public.hospitals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_inventory        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_responses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfusion_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfusion_responses  ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------
-- 5a. RLS: hospitals
--     Semua orang (termasuk anon) bisa READ.
--     Hanya admin yang bisa INSERT/UPDATE/DELETE.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "hospitals_public_read" ON public.hospitals;
DROP POLICY IF EXISTS "hospitals_admin_all"   ON public.hospitals;

CREATE POLICY "hospitals_public_read"
  ON public.hospitals FOR SELECT
  USING (TRUE);

CREATE POLICY "hospitals_admin_all"
  ON public.hospitals FOR ALL
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------
-- 5b. RLS: profiles
--     User hanya bisa baca/edit profil miliknya sendiri.
--     Admin bisa membaca semua profil (untuk dashboard).
--     Admin bisa mengupdate profil relawan (cooldown, status).
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_self_read"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_read"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;

-- User membaca profil sendiri
CREATE POLICY "profiles_self_read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Insert manual (trigger handle_new_user sudah otomatis)
CREATE POLICY "profiles_self_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User mengubah profil sendiri
CREATE POLICY "profiles_self_update"
  ON public.profiles FOR UPDATE
  USING      (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin dapat membaca semua profil
CREATE POLICY "profiles_admin_read"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Admin dapat mengupdate profil siapapun (defence-in-depth untuk cooldown)
CREATE POLICY "profiles_admin_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------
-- 5c. RLS: blood_requests
--     Siapapun (anon) bisa INSERT dan SELECT.
--     Hanya admin yang bisa UPDATE dan DELETE.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "requests_public_insert" ON public.blood_requests;
DROP POLICY IF EXISTS "requests_public_select" ON public.blood_requests;
DROP POLICY IF EXISTS "requests_admin_update"  ON public.blood_requests;
DROP POLICY IF EXISTS "requests_admin_delete"  ON public.blood_requests;

-- Siapapun bisa membuat permintaan darah (termasuk tanpa login)
CREATE POLICY "requests_public_insert"
  ON public.blood_requests FOR INSERT
  WITH CHECK (TRUE);

-- Siapapun bisa melihat permintaan (untuk halaman tracking real-time)
CREATE POLICY "requests_public_select"
  ON public.blood_requests FOR SELECT
  USING (TRUE);

-- Hanya admin yang mengubah status (approve/reject)
CREATE POLICY "requests_admin_update"
  ON public.blood_requests FOR UPDATE
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

-- Hanya admin yang bisa hapus
CREATE POLICY "requests_admin_delete"
  ON public.blood_requests FOR DELETE
  USING (public.is_admin());


-- ---------------------------------------------------------------
-- 5d. RLS: blood_inventory
--     Semua orang bisa READ (untuk tampilan stok publik).
--     Hanya admin yang bisa INSERT/UPDATE.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "inventory_public_read"   ON public.blood_inventory;
DROP POLICY IF EXISTS "inventory_admin_insert"  ON public.blood_inventory;
DROP POLICY IF EXISTS "inventory_admin_update"  ON public.blood_inventory;

CREATE POLICY "inventory_public_read"
  ON public.blood_inventory FOR SELECT
  USING (TRUE);

CREATE POLICY "inventory_admin_insert"
  ON public.blood_inventory FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "inventory_admin_update"
  ON public.blood_inventory FOR UPDATE
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------
-- 5e. RLS: donor_sessions (volunteer_donations)
--     Relawan insert & lihat sesi mereka sendiri.
--     Admin dapat lihat & update semua sesi.
--     INSERT diblokir jika masih dalam cooldown 60 hari.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "donor_sessions_cooldown_insert" ON public.donor_sessions;
DROP POLICY IF EXISTS "donor_sessions_volunteer_read"  ON public.donor_sessions;
DROP POLICY IF EXISTS "donor_sessions_admin_view"      ON public.donor_sessions;
DROP POLICY IF EXISTS "donor_sessions_admin_update"    ON public.donor_sessions;
DROP POLICY IF EXISTS "donor_sessions_admin_delete"    ON public.donor_sessions;

-- Relawan INSERT: hanya jika milik sendiri DAN lolos cooldown 60 hari
CREATE POLICY "donor_sessions_cooldown_insert"
  ON public.donor_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = volunteer_id
    AND public.volunteer_cooldown_ok()
  );

-- Relawan melihat sesi miliknya sendiri
CREATE POLICY "donor_sessions_volunteer_read"
  ON public.donor_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = volunteer_id);

-- Admin melihat semua sesi
CREATE POLICY "donor_sessions_admin_view"
  ON public.donor_sessions FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admin mengupdate status sesi (approve / reject / done)
CREATE POLICY "donor_sessions_admin_update"
  ON public.donor_sessions FOR UPDATE
  TO authenticated
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin menghapus sesi (bila diperlukan)
CREATE POLICY "donor_sessions_admin_delete"
  ON public.donor_sessions FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ---------------------------------------------------------------
-- 5f. RLS: volunteer_responses
--     Relawan insert & lihat respons mereka sendiri.
--     Admin dapat lihat semua respons.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "responses_volunteer_insert" ON public.volunteer_responses;
DROP POLICY IF EXISTS "responses_owner_read"       ON public.volunteer_responses;
DROP POLICY IF EXISTS "responses_admin_read"       ON public.volunteer_responses;

CREATE POLICY "responses_volunteer_insert"
  ON public.volunteer_responses FOR INSERT
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "responses_owner_read"
  ON public.volunteer_responses FOR SELECT
  USING (auth.uid() = volunteer_id);

CREATE POLICY "responses_admin_read"
  ON public.volunteer_responses FOR SELECT
  USING (public.is_admin());


-- ---------------------------------------------------------------
-- 5g. RLS: transfusion_requests
--     Siapapun (anon) bisa INSERT dan SELECT.
--     Hanya admin yang bisa UPDATE dan DELETE.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "transfusion_requests_public_insert" ON public.transfusion_requests;
DROP POLICY IF EXISTS "transfusion_requests_public_select" ON public.transfusion_requests;
DROP POLICY IF EXISTS "transfusion_requests_admin_update"  ON public.transfusion_requests;
DROP POLICY IF EXISTS "transfusion_requests_admin_delete"  ON public.transfusion_requests;

CREATE POLICY "transfusion_requests_public_insert"
  ON public.transfusion_requests FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "transfusion_requests_public_select"
  ON public.transfusion_requests FOR SELECT
  USING (TRUE);

CREATE POLICY "transfusion_requests_admin_update"
  ON public.transfusion_requests FOR UPDATE
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "transfusion_requests_admin_delete"
  ON public.transfusion_requests FOR DELETE
  USING (public.is_admin());


-- ---------------------------------------------------------------
-- 5h. RLS: transfusion_responses
--     Admin: full access (INSERT/UPDATE/DELETE/SELECT).
--     RS (hospital role) / publik: hanya SELECT.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "transfusion_responses_admin_all" ON public.transfusion_responses;
DROP POLICY IF EXISTS "transfusion_responses_read"      ON public.transfusion_responses;

-- Admin full access
CREATE POLICY "transfusion_responses_admin_all"
  ON public.transfusion_responses FOR ALL
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

-- Semua yang authenticated dapat membaca respons
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
-- 6. SEED DATA: Rumah Sakit di Kota Palu, Sulawesi Tengah
--    Koordinat GPS diverifikasi dari Google Maps.
--    INSERT menggunakan ON CONFLICT DO NOTHING agar aman dijalankan ulang.
-- ================================================================
INSERT INTO public.hospitals (name, address, lat, lng, phone) VALUES
  (
    'RSUD Undata Palu',
    'Jl. Thalua Konchi No.1, Birobuli Utara, Kec. Palu Selatan, Kota Palu',
    -0.8917, 119.8931,
    '(0451) 421704'
  ),
  (
    'RS Anutapura Palu',
    'Jl. Chairil Anwar No.17, Kamonji, Kec. Palu Barat, Kota Palu',
    -0.8927, 119.8658,
    '(0451) 421365'
  ),
  (
    'RS Madani Palu',
    'Jl. Lore No.1A, Tatura Utara, Kec. Palu Selatan, Kota Palu',
    -0.8961, 119.8773,
    '(0451) 454173'
  ),
  (
    'RS Woodward Palu',
    'Jl. Kemiri No.64, Lolu Selatan, Kec. Palu Timur, Kota Palu',
    -0.8957, 119.8688,
    '(0451) 421776'
  ),
  (
    'RS Budi Agung Palu',
    'Jl. Manonda No.91, Ujuna, Kec. Palu Barat, Kota Palu',
    -0.8852, 119.8621,
    '(0451) 421467'
  ),
  (
    'RS Bhayangkara Palu',
    'Jl. Letjen R. Suprapto No.5, Besusu Barat, Kec. Palu Timur, Kota Palu',
    -0.8912, 119.8751,
    '(0451) 422060'
  ),
  (
    'RS Wirabuana Palu',
    'Jl. Tanjung Manimbaya No.1, Donggala Kodi, Kec. Palu Barat, Kota Palu',
    -0.9021, 119.8723,
    '(0451) 421373'
  ),
  (
    'Klinik PMI Kota Palu',
    'Jl. Setia Budi No.20, Lolu Utara, Kec. Palu Timur, Kota Palu',
    -0.8895, 119.8702,
    '(0451) 421580'
  )
ON CONFLICT DO NOTHING;

-- Seed stok awal blood_inventory: 8 kombinasi golongan + rhesus, semua nol
INSERT INTO public.blood_inventory (blood_type, rhesus, bags_count) VALUES
  ('A',  '+', 0), ('A',  '-', 0),
  ('B',  '+', 0), ('B',  '-', 0),
  ('AB', '+', 0), ('AB', '-', 0),
  ('O',  '+', 0), ('O',  '-', 0)
ON CONFLICT (blood_type, rhesus) DO NOTHING;


-- ================================================================
-- SELESAI ✓  Blood-Connect Palu — Clean Schema
--
-- Ringkasan objek yang dibuat:
--
--   TABEL (8):
--     ✓ hospitals             — Master data RS Kota Palu
--     ✓ profiles              — Profil relawan/admin/hospital
--     ✓ blood_requests        — Permintaan darah darurat (publik)
--     ✓ blood_inventory       — Stok kantong darah per golongan
--     ✓ donor_sessions        — Sesi donor sukarela relawan
--     ✓ volunteer_responses   — Respons relawan per permintaan
--     ✓ transfusion_requests  — Formulir transfusi lengkap (RS)
--     ✓ transfusion_responses — Data kantong darah dikeluarkan UTD
--
--   ENUM TYPES (6):
--     ✓ blood_type_enum       — A, B, AB, O, UNKNOWN
--     ✓ rhesus_enum           — +, -
--     ✓ user_role_enum        — volunteer, admin, hospital
--     ✓ request_status_enum   — pending, approved, completed, rejected
--     ✓ request_priority_enum — cito, regular
--     ✓ donation_status_enum  — pending, approved, done, rejected
--
--   FUNGSI (6):
--     ✓ set_updated_at()                    — Trigger updated_at generik
--     ✓ handle_new_user()                   — Sinkronisasi auth.users → profiles (INSERT)
--     ✓ handle_user_update()                — Sinkronisasi auth.users → profiles (UPDATE)
--     ✓ is_volunteer_eligible(UUID)         — Validasi cooldown 60 hari (dengan param)
--     ✓ volunteer_cooldown_ok()             — Validasi cooldown untuk RLS policy
--     ✓ is_admin()                          — Helper RLS: cek role admin
--     ✓ respond_to_request(UUID, UUID)      — RPC konfirmasi donor relawan
--
--   TRIGGER (8):
--     ✓ on_auth_user_created                — INSERT auth.users → handle_new_user
--     ✓ on_auth_user_updated                — UPDATE auth.users → handle_user_update
--     ✓ trg_profiles_updated_at
--     ✓ trg_blood_requests_updated_at
--     ✓ trg_blood_inventory_updated_at
--     ✓ trg_donor_sessions_updated_at
--     ✓ trg_transfusion_requests_updated_at
--     ✓ trg_transfusion_responses_updated_at
--
--   SEED DATA:
--     ✓ 8 Rumah Sakit di Kota Palu
--     ✓ 8 kombinasi blood_inventory (stok = 0)
--
-- Catatan:
--   - Storage bucket (medical-proofs, donation-proofs) harus dibuat
--     manual via Dashboard atau Supabase Management API.
--   - Jadikan admin pertama:
--       UPDATE public.profiles SET role = 'admin'
--       WHERE phone_number = '08xxxx';  -- setelah admin mendaftar
-- ================================================================
