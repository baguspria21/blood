-- ============================================================
-- Blood-Connect Palu | Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- for coordinates (Point type)

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE blood_type_enum AS ENUM ('A', 'B', 'AB', 'O');
CREATE TYPE rhesus_enum AS ENUM ('+', '-');
CREATE TYPE user_role_enum AS ENUM ('volunteer', 'admin');
CREATE TYPE request_status_enum AS ENUM ('pending', 'approved', 'completed', 'rejected');

-- ============================================================
-- TABLE: hospitals
-- Master data RS di Palu
-- ============================================================
CREATE TABLE hospitals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  coordinates GEOGRAPHY(POINT, 4326), -- PostGIS point (lat, long)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data RS di Palu
INSERT INTO hospitals (name, address, coordinates) VALUES
  ('RSUD Undata',     'Jl. Thalua Konchi, Palu Timur',        ST_GeogFromText('SRID=4326;POINT(119.8931 -0.8917)')),
  ('RS Anutapura',    'Jl. Chairil Anwar No.17, Palu',        ST_GeogFromText('SRID=4326;POINT(119.8658 -0.8927)')),
  ('RS Wirabuana',    'Jl. Tanjung Manimbaya, Palu',          ST_GeogFromText('SRID=4326;POINT(119.8723 -0.9021)')),
  ('RS Bhayangkara',  'Jl. Rajawali No.1, Palu Barat',        ST_GeogFromText('SRID=4326;POINT(119.8602 -0.9019)')),
  ('RS Woodward',     'Jl. Kemiri No.64, Palu',               ST_GeogFromText('SRID=4326;POINT(119.8688 -0.8957)'));

-- ============================================================
-- TABLE: profiles
-- Extends Supabase auth.users (volunteers & admins)
-- ============================================================
CREATE TABLE profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  phone_number     TEXT UNIQUE NOT NULL,
  blood_type       blood_type_enum,
  rhesus           rhesus_enum,
  sub_district     TEXT,  -- Kecamatan di Palu
  role             user_role_enum NOT NULL DEFAULT 'volunteer',
  last_donated_at  DATE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on profile changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: blood_requests
-- Permintaan darah dari pemohon (tanpa login)
-- ============================================================
CREATE TABLE blood_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name    TEXT NOT NULL,
  contact_phone   TEXT NOT NULL,
  hospital_id     UUID NOT NULL REFERENCES hospitals(id),
  blood_type      blood_type_enum NOT NULL,
  rhesus          rhesus_enum NOT NULL,
  bags_needed     INTEGER NOT NULL CHECK (bags_needed > 0),
  bags_fulfilled  INTEGER NOT NULL DEFAULT 0 CHECK (bags_fulfilled >= 0),
  proof_url       TEXT,                   -- URL dari Supabase Storage
  status          request_status_enum NOT NULL DEFAULT 'pending',
  admin_notes     TEXT,                   -- Catatan dari admin (opsional)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT bags_fulfilled_lte_needed CHECK (bags_fulfilled <= bags_needed)
);

CREATE TRIGGER blood_requests_updated_at
  BEFORE UPDATE ON blood_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: volunteer_responses
-- Mencatat relawan yang merespon permintaan
-- ============================================================
CREATE TABLE volunteer_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  responded_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(request_id, volunteer_id) -- Relawan hanya bisa respon 1x per request
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE hospitals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_responses ENABLE ROW LEVEL SECURITY;

-- Helper function: cek apakah user adalah admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------
-- RLS: hospitals (read-only untuk publik)
-- -------------------------------------------------------
CREATE POLICY "hospitals_public_read"
  ON hospitals FOR SELECT
  USING (true);

CREATE POLICY "hospitals_admin_manage"
  ON hospitals FOR ALL
  USING (is_admin());

-- -------------------------------------------------------
-- RLS: blood_requests
-- Siapapun (anon) dapat INSERT. Hanya admin yang bisa UPDATE/SELECT all.
-- Pemohon bisa baca request mereka sendiri via tracking (publik berdasarkan ID).
-- -------------------------------------------------------

-- Publik dapat membuat request (tanpa login)
CREATE POLICY "blood_requests_public_insert"
  ON blood_requests FOR INSERT
  WITH CHECK (true);

-- Publik dapat membaca data request tertentu (untuk halaman tracking)
CREATE POLICY "blood_requests_public_read"
  ON blood_requests FOR SELECT
  USING (true);

-- Hanya admin yang dapat mengubah status request (approve/reject)
CREATE POLICY "blood_requests_admin_update"
  ON blood_requests FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Hanya admin yang dapat hapus
CREATE POLICY "blood_requests_admin_delete"
  ON blood_requests FOR DELETE
  USING (is_admin());

-- -------------------------------------------------------
-- RLS: profiles
-- Setiap user hanya bisa melihat & mengedit profil sendiri.
-- Admin dapat melihat semua profil.
-- -------------------------------------------------------
CREATE POLICY "profiles_owner_read"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "profiles_owner_update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_owner_insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- -------------------------------------------------------
-- RLS: volunteer_responses
-- Relawan dapat insert response mereka sendiri.
-- Admin dapat melihat semua respons.
-- -------------------------------------------------------
CREATE POLICY "volunteer_responses_owner_insert"
  ON volunteer_responses FOR INSERT
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "volunteer_responses_admin_read"
  ON volunteer_responses FOR SELECT
  USING (is_admin() OR auth.uid() = volunteer_id);

-- ============================================================
-- DATABASE FUNCTION: Respond to blood request (untuk relawan)
-- Dipanggil dari GET /api/v1/volunteer/respond/:request_id
-- ============================================================
CREATE OR REPLACE FUNCTION respond_to_request(
  p_request_id UUID,
  p_volunteer_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_request blood_requests%ROWTYPE;
  v_profile profiles%ROWTYPE;
BEGIN
  -- Cek jika request ada dan statusnya approved
  SELECT * INTO v_request FROM blood_requests
    WHERE id = p_request_id AND status = 'approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request tidak ditemukan atau belum disetujui.');
  END IF;

  -- Cek jika sudah terpenuhi
  IF v_request.bags_fulfilled >= v_request.bags_needed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permintaan darah sudah terpenuhi.');
  END IF;

  -- Cek jika relawan sudah merespons sebelumnya
  IF EXISTS (SELECT 1 FROM volunteer_responses WHERE request_id = p_request_id AND volunteer_id = p_volunteer_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda sudah merespons permintaan ini.');
  END IF;

  -- Insert response
  INSERT INTO volunteer_responses (request_id, volunteer_id) VALUES (p_request_id, p_volunteer_id);

  -- Update bags_fulfilled
  UPDATE blood_requests
    SET bags_fulfilled = bags_fulfilled + 1,
        status = CASE WHEN bags_fulfilled + 1 >= bags_needed THEN 'completed' ELSE status END
    WHERE id = p_request_id;

  -- Update last_donated_at dan non-aktifkan cooldown (90 hari)
  UPDATE profiles
    SET last_donated_at = CURRENT_DATE,
        is_active = FALSE
    WHERE id = p_volunteer_id;

  -- Ambil data hospital untuk dikembalikan ke relawan
  SELECT h.name, h.address,
    'https://www.google.com/maps/search/?api=1&query=' ||
    ST_Y(h.coordinates::geometry) || ',' || ST_X(h.coordinates::geometry) AS map_link
  INTO v_profile
  FROM hospitals h
  WHERE h.id = v_request.hospital_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Terima kasih! Silakan menuju RS.',
    'hospital', (
      SELECT jsonb_build_object(
        'name', h.name,
        'address', h.address,
        'map_link', 'https://www.google.com/maps/search/?api=1&query=' ||
          ST_Y(h.coordinates::geometry) || ',' || ST_X(h.coordinates::geometry)
      )
      FROM hospitals h WHERE h.id = v_request.hospital_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
