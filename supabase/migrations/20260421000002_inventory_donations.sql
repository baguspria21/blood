-- ================================================================
-- Blood-Connect Palu | Migration: 002 — Inventory & Volunteer Donations
-- File: supabase/migrations/20260421000002_inventory_donations.sql
--
-- Run via Supabase SQL Editor
-- ================================================================

-- ----------------------------------------------------------------
-- 1. ENUM: volunteer donation status
-- ----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE donation_status_enum AS ENUM ('pending', 'approved', 'done', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 2. TABLE: blood_inventory
-- Tracks current blood stock per type + rhesus
-- ================================================================
CREATE TABLE IF NOT EXISTS public.blood_inventory (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_type  blood_type_enum NOT NULL,
  rhesus      rhesus_enum     NOT NULL,
  bags_count  INTEGER         NOT NULL DEFAULT 0 CHECK (bags_count >= 0),
  updated_by  UUID            REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ     DEFAULT NOW(),

  -- One row per blood_type + rhesus combination
  UNIQUE (blood_type, rhesus)
);

COMMENT ON TABLE  public.blood_inventory IS 'Stok kantong darah saat ini per golongan darah & rhesus';
COMMENT ON COLUMN public.blood_inventory.bags_count IS 'Jumlah kantong darah tersedia';

-- Seed all 8 combinations with 0 stock
INSERT INTO public.blood_inventory (blood_type, rhesus, bags_count) VALUES
  ('A',  '+', 0), ('A',  '-', 0),
  ('B',  '+', 0), ('B',  '-', 0),
  ('AB', '+', 0), ('AB', '-', 0),
  ('O',  '+', 0), ('O',  '-', 0)
ON CONFLICT (blood_type, rhesus) DO NOTHING;


-- ================================================================
-- 3. TABLE: volunteer_donations
-- Tracks volunteer-initiated donation sessions
-- ================================================================
CREATE TABLE IF NOT EXISTS public.volunteer_donations (
  id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id    UUID                NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_type      blood_type_enum     NOT NULL,
  rhesus          rhesus_enum         NOT NULL,
  status          donation_status_enum NOT NULL DEFAULT 'pending',
  admin_notes     TEXT,
  bags_donated    INTEGER             NOT NULL DEFAULT 1 CHECK (bags_donated >= 1),
  created_at      TIMESTAMPTZ         DEFAULT NOW(),
  updated_at      TIMESTAMPTZ         DEFAULT NOW()
);

COMMENT ON TABLE  public.volunteer_donations IS 'Sesi donor sukarela yang diinisiasi oleh relawan';
COMMENT ON COLUMN public.volunteer_donations.status IS 'pending = menunggu, approved = dijadwalkan, done = selesai, rejected = ditolak';


-- ================================================================
-- 4. RLS POLICIES
-- ================================================================

-- blood_inventory: Admin can update; everyone can read
ALTER TABLE public.blood_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view inventory"
  ON public.blood_inventory FOR SELECT
  USING (true);

CREATE POLICY "Admins can update inventory"
  ON public.blood_inventory FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert inventory"
  ON public.blood_inventory FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- volunteer_donations: Volunteers can insert (own); Admins can see/update all; Volunteers can see own
ALTER TABLE public.volunteer_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers can insert own donations"
  ON public.volunteer_donations FOR INSERT
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "Volunteers can view own donations"
  ON public.volunteer_donations FOR SELECT
  USING (
    auth.uid() = volunteer_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update donations"
  ON public.volunteer_donations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete donations"
  ON public.volunteer_donations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ================================================================
-- 5. AUTO-UPDATE updated_at trigger for volunteer_donations
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_volunteer_donations_updated_at ON public.volunteer_donations;
CREATE TRIGGER trg_volunteer_donations_updated_at
  BEFORE UPDATE ON public.volunteer_donations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_blood_inventory_updated_at ON public.blood_inventory;
CREATE TRIGGER trg_blood_inventory_updated_at
  BEFORE UPDATE ON public.blood_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
