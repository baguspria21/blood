-- ================================================================
-- Blood-Connect Palu | Migration: 001 Initial Schema
-- File: supabase/migrations/20260421000001_initial_schema.sql
--
-- Jalankan via Supabase CLI:
--   npx supabase db push
--
-- Atau paste langsung ke Supabase SQL Editor
-- ================================================================

-- ----------------------------------------------------------------
-- 0. EXTENSIONS
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- 1. ENUM TYPES
-- ----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE blood_type_enum     AS ENUM ('A', 'B', 'AB', 'O');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rhesus_enum         AS ENUM ('+', '-');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role_enum      AS ENUM ('volunteer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE request_status_enum AS ENUM ('pending', 'approved', 'completed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 2. TABLE: hospitals
-- Master data RS di Kota Palu
-- ================================================================
CREATE TABLE IF NOT EXISTS public.hospitals (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  address    TEXT,
  lat        DECIMAL(10, 7),            -- Latitude
  lng        DECIMAL(10, 7),            -- Longitude
  phone      TEXT,                      -- Nomor telepon RS
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  public.hospitals        IS 'Master data Rumah Sakit di Kota Palu';
COMMENT ON COLUMN public.hospitals.lat   IS 'Latitude koordinat RS';
COMMENT ON COLUMN public.hospitals.lng   IS 'Longitude koordinat RS';


-- ================================================================
-- 3. TABLE: profiles
-- Profil relawan & admin. Terhubung 1-to-1 dengan auth.users.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT            NOT NULL,
  phone_number     TEXT            UNIQUE NOT NULL,
  blood_type       blood_type_enum,
  rhesus           rhesus_enum,
  sub_district     TEXT,                          -- Kecamatan di Palu
  role             user_role_enum  NOT NULL DEFAULT 'volunteer',
  last_donated_at  DATE,                          -- Untuk cooldown 90 hari
  is_active        BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ     DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE  public.profiles                  IS 'Profil relawan & admin. Extend dari auth.users';
COMMENT ON COLUMN public.profiles.last_donated_at  IS 'Tanggal donor terakhir. NULL = belum pernah donor';
COMMENT ON COLUMN public.profiles.is_active        IS 'FALSE selama masa cooldown 90 hari';


-- ================================================================
-- 4. TABLE: blood_requests
-- Permintaan darah darurat dari pemohon (tanpa login)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id              UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name    TEXT                 NOT NULL,
  contact_phone   TEXT                 NOT NULL,
  hospital_id     UUID                 NOT NULL REFERENCES public.hospitals(id),
  blood_type      blood_type_enum      NOT NULL,
  rhesus          rhesus_enum          NOT NULL,
  bags_needed     INTEGER              NOT NULL CHECK (bags_needed  > 0),
  bags_fulfilled  INTEGER              NOT NULL DEFAULT 0 CHECK (bags_fulfilled >= 0),
  proof_url       TEXT,                           -- URL foto surat dari Supabase Storage
  status          request_status_enum  NOT NULL DEFAULT 'pending',
  admin_notes     TEXT,                           -- Catatan admin saat approve/reject
  created_at      TIMESTAMPTZ          DEFAULT NOW(),
  updated_at      TIMESTAMPTZ          DEFAULT NOW(),

  CONSTRAINT bags_fulfilled_lte_needed CHECK (bags_fulfilled <= bags_needed)
);

COMMENT ON TABLE  public.blood_requests              IS 'Permintaan darah darurat. Bisa disubmit siapapun (public)';
COMMENT ON COLUMN public.blood_requests.proof_url    IS 'URL foto surat pengantar RS dari bucket medical-proofs';
COMMENT ON COLUMN public.blood_requests.admin_notes  IS 'Catatan admin saat verifikasi';


-- ================================================================
-- 5. TABLE: volunteer_responses
-- Mencatat relawan yang merespon permintaan
-- ================================================================
CREATE TABLE IF NOT EXISTS public.volunteer_responses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID        NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  volunteer_id UUID        NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,
  responded_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (request_id, volunteer_id)   -- 1 relawan hanya bisa respon 1x per request
);

COMMENT ON TABLE public.volunteer_responses IS 'Konfirmasi kesediaan relawan untuk satu permintaan darah';


-- ================================================================
-- 6. HELPER FUNCTIONS & TRIGGERS
-- ================================================================

-- 6a. Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at       ON public.profiles;
DROP TRIGGER IF EXISTS trg_blood_requests_updated_at ON public.blood_requests;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_blood_requests_updated_at
  BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----------------------------------------------------------------
-- 6b. AUTO-CREATE PROFILE ON SIGN UP  ← Trigger utama
--
-- Setiap kali user baru mendaftar via Supabase Auth,
-- fungsi ini otomatis membuat baris di tabel profiles.
--
-- Data awal diambil dari raw_user_meta_data yang dikirim
-- saat signUp() di frontend:
--   supabase.auth.signUp({ email, password, options: { data: { name, phone_number } } })
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER                        -- Berjalan dengan hak superuser
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
    COALESCE(NEW.raw_user_meta_data->>'name', 'Pengguna Baru'),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    -- blood_type & rhesus akan diisi user setelah verifikasi email,
    -- atau bisa langsung dikirim dari frontend via metadata
    CASE
      WHEN NEW.raw_user_meta_data->>'blood_type' IN ('A','B','AB','O')
      THEN (NEW.raw_user_meta_data->>'blood_type')::blood_type_enum
      ELSE NULL
    END,
    CASE
      WHEN NEW.raw_user_meta_data->>'rhesus' IN ('+','-')
      THEN (NEW.raw_user_meta_data->>'rhesus')::rhesus_enum
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'sub_district',
    'volunteer',   -- Default role = volunteer
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;           -- Aman jika dipanggil duplikat

  RETURN NEW;
END;
$$;

-- Pasang trigger ke auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------
-- 6c. RESPOND TO REQUEST (RPC untuk relawan konfirmasi)
--
-- Dipanggil dari Next.js:
--   supabase.rpc('respond_to_request', { p_request_id, p_volunteer_id })
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
  -- 1. Cek permintaan ada dan sudah disetujui
  SELECT * INTO v_request
    FROM public.blood_requests
    WHERE id = p_request_id AND status = 'approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false,
      'message', 'Permintaan tidak ditemukan atau belum disetujui.');
  END IF;

  -- 2. Cek apakah sudah terpenuhi
  IF v_request.bags_fulfilled >= v_request.bags_needed THEN
    RETURN jsonb_build_object('success', false,
      'message', 'Permintaan darah sudah terpenuhi. Terima kasih!');
  END IF;

  -- 3. Cek duplikasi respon
  IF EXISTS (
    SELECT 1 FROM public.volunteer_responses
    WHERE request_id = p_request_id AND volunteer_id = p_volunteer_id
  ) THEN
    RETURN jsonb_build_object('success', false,
      'message', 'Anda sudah merespons permintaan ini sebelumnya.');
  END IF;

  -- 4. Catat respon
  INSERT INTO public.volunteer_responses (request_id, volunteer_id)
    VALUES (p_request_id, p_volunteer_id);

  -- 5. Update jumlah kantong & status
  UPDATE public.blood_requests
    SET
      bags_fulfilled = bags_fulfilled + 1,
      status = CASE
        WHEN bags_fulfilled + 1 >= bags_needed THEN 'completed'::request_status_enum
        ELSE status
      END
    WHERE id = p_request_id;

  -- 6. Catat tanggal donor & nonaktifkan relawan (cooldown 90 hari)
  UPDATE public.profiles
    SET
      last_donated_at = CURRENT_DATE,
      is_active       = FALSE
    WHERE id = p_volunteer_id;

  -- 7. Ambil info RS untuk dikembalikan ke relawan
  SELECT * INTO v_hospital
    FROM public.hospitals WHERE id = v_request.hospital_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Terima kasih! Silakan menuju RS segera.',
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
-- 7. ROW LEVEL SECURITY (RLS)
-- ================================================================
ALTER TABLE public.hospitals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_responses ENABLE ROW LEVEL SECURITY;

-- Helper: Apakah user yang login adalah admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ---------------------------------------------------------------
-- 7a. RLS: hospitals
-- Siapapun (termasuk anon) bisa READ.
-- Hanya admin yang bisa INSERT/UPDATE/DELETE.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "hospitals_public_read"    ON public.hospitals;
DROP POLICY IF EXISTS "hospitals_admin_all"      ON public.hospitals;

CREATE POLICY "hospitals_public_read"
  ON public.hospitals FOR SELECT
  USING (true);

CREATE POLICY "hospitals_admin_all"
  ON public.hospitals FOR ALL
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------
-- 7b. RLS: profiles
-- User hanya bisa read/write profil miliknya sendiri.
-- Admin bisa membaca semua profil (untuk dashboard).
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_self_read"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_read"  ON public.profiles;

-- User membaca profil sendiri
CREATE POLICY "profiles_self_read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Trigger handle_new_user sudah insert otomatis.
-- Ini policy tambahan jika insert manual diperlukan.
CREATE POLICY "profiles_self_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User edit profil sendiri
CREATE POLICY "profiles_self_update"
  ON public.profiles FOR UPDATE
  USING      (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin bisa baca semua profil
CREATE POLICY "profiles_admin_read"
  ON public.profiles FOR SELECT
  USING (public.is_admin());


-- ---------------------------------------------------------------
-- 7c. RLS: blood_requests
-- Publik (anon) bisa INSERT dan SELECT (untuk halaman tracking).
-- Hanya admin yang bisa UPDATE (approve/reject) dan DELETE.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "requests_public_insert"  ON public.blood_requests;
DROP POLICY IF EXISTS "requests_public_select"  ON public.blood_requests;
DROP POLICY IF EXISTS "requests_admin_update"   ON public.blood_requests;
DROP POLICY IF EXISTS "requests_admin_delete"   ON public.blood_requests;

-- Siapapun bisa membuat permintaan darah
CREATE POLICY "requests_public_insert"
  ON public.blood_requests FOR INSERT
  WITH CHECK (true);

-- Siapapun bisa baca (untuk halaman tracking real-time)
CREATE POLICY "requests_public_select"
  ON public.blood_requests FOR SELECT
  USING (true);

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
-- 7d. RLS: volunteer_responses
-- Relawan insert respons mereka sendiri.
-- Admin dan relawan pemilik bisa READ.
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


-- ================================================================
-- 8. SEED DATA: Rumah Sakit di Kota Palu, Sulawesi Tengah
-- Koordinat diverifikasi dari Google Maps
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


-- ================================================================
-- 9. STORAGE BUCKET: medical-proofs
--
-- CATATAN: Bucket TIDAK bisa dibuat via pure SQL di Supabase.
-- Gunakan salah satu cara berikut:
--
-- CARA A (Direkomendasikan): Via Supabase Dashboard
--   1. Buka: Storage → New Bucket
--   2. Name: medical-proofs
--   3. Public bucket: ON
--   4. File size limit: 5242880 (5MB)
--   5. Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf
--
-- CARA B: Via Supabase Management API (jalankan di terminal):
--   curl -X POST https://<project>.supabase.co/storage/v1/bucket \
--     -H "Authorization: Bearer <service_role_key>" \
--     -H "Content-Type: application/json" \
--     -d '{"id":"medical-proofs","name":"medical-proofs","public":true}'
-- ================================================================

-- Policy Storage (dijalankan SETELAH bucket dibuat):

-- Siapapun bisa upload ke folder proofs/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'medical_proofs_public_upload'
  ) THEN
    CREATE POLICY "medical_proofs_public_upload"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'medical-proofs'
        AND (storage.foldername(name))[1] = 'proofs'
      );
  END IF;
END $$;

-- Siapapun bisa baca (bucket public)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'medical_proofs_public_read'
  ) THEN
    CREATE POLICY "medical_proofs_public_read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'medical-proofs');
  END IF;
END $$;

-- Hanya admin yang bisa hapus file bukti
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'medical_proofs_admin_delete'
  ) THEN
    CREATE POLICY "medical_proofs_admin_delete"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'medical-proofs'
        AND public.is_admin()
      );
  END IF;
END $$;


-- ================================================================
-- SELESAI ✓
--
-- Ringkasan yang dibuat:
--   ✓ 4 Tabel: hospitals, profiles, blood_requests, volunteer_responses
--   ✓ 4 ENUM types
--   ✓ Trigger auto-create profile saat user baru daftar
--   ✓ RPC respond_to_request untuk konfirmasi relawan
--   ✓ RLS policies untuk semua tabel
--   ✓ 8 Seed data RS di Kota Palu
--   ✓ Instruksi Storage bucket medical-proofs
--
-- Berikutnya: Buat admin pertama dengan cara:
--   UPDATE public.profiles SET role = 'admin'
--   WHERE phone_number = '08xxxx'; -- setelah admin mendaftar
-- ================================================================
