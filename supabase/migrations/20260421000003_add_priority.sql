-- ================================================================
-- Blood-Connect Palu | Migration: 003 — Add Priority Field
-- File: supabase/migrations/20260421000003_add_priority.sql
-- ================================================================

-- 1. Create the new ENUM type for priority
DO $$ BEGIN
  CREATE TYPE request_priority_enum AS ENUM ('cito', 'regular');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add the column to the blood_requests table
ALTER TABLE public.blood_requests 
ADD COLUMN IF NOT EXISTS priority request_priority_enum NOT NULL DEFAULT 'regular';

COMMENT ON COLUMN public.blood_requests.priority IS 'Prioritas permintaan: Cito (sangat mendesak) atau Regular';
