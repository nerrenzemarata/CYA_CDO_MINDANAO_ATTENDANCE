-- Run this in the Supabase SQL Editor to set up your database

CREATE TABLE IF NOT EXISTS members (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  unit           TEXT        NOT NULL CHECK (unit IN ('USTP', 'XU', 'Staffer', 'UC', 'Butuan')),
  name           TEXT        NOT NULL,
  contact_number TEXT        NOT NULL DEFAULT '',
  june4_status   TEXT        NOT NULL DEFAULT 'riding' CHECK (june4_status IN ('riding', 'not_going')),
  june7_status   TEXT        NOT NULL DEFAULT 'riding' CHECK (june7_status IN ('riding', 'not_going')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast unit filtering
CREATE INDEX IF NOT EXISTS idx_members_unit ON members (unit);

-- Enable Row Level Security (RLS)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Allow all operations from anon key (adjust this for production!)
CREATE POLICY "Allow all for anon" ON members
  FOR ALL
  USING (true)
  WITH CHECK (true);
