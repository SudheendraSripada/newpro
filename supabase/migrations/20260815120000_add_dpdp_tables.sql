-- Add DPDP consent and rights request tables
-- Run on Supabase (Postgres). Requires CREATE EXTENSION privileges for gen_random_uuid.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.dpdp_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_address text,
  purposes jsonb,
  consented boolean,
  raw_payload jsonb
);

CREATE INDEX IF NOT EXISTS idx_dpdp_consents_created_at ON public.dpdp_consents(created_at);

CREATE TABLE IF NOT EXISTS public.dpdp_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text,
  email text,
  request_type text,
  details text,
  status text DEFAULT 'received',
  raw_payload jsonb
);

CREATE INDEX IF NOT EXISTS idx_dpdp_requests_email ON public.dpdp_requests(email);
CREATE INDEX IF NOT EXISTS idx_dpdp_requests_created_at ON public.dpdp_requests(created_at);
