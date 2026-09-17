/*
# Enhance CAD: Penal codes, call dispositions, citation payment status, realtime

## Summary
Adds a penal_codes lookup table, a call_dispositions column on calls,
a payment_status column on citations, and enables realtime on all
remaining entity tables (civilians, vehicles, weapons, warrants,
citations, incidents).

## New Tables
### penal_codes
Community-scoped lookup table for penal code references.
- id (uuid, pk)
- community_id (uuid, fk → communities)
- code (text, e.g. "VC-23152(a)")
- title (text, e.g. "DUI — Alcohol/Drugs")
- category (text, e.g. "vehicle", "criminal", "civil")
- fine_min (numeric, default 0)
- fine_max (numeric, default 0)
- jail_time_max (text, nullable, e.g. "6 months")
- points (int, default 0 — license points)
- created_by (uuid, default auth.uid())
- created_at (timestamptz, default now())

## Modified Tables
### calls
- ADD COLUMN disposition text (nullable, default null)
  Used to record the call outcome (e.g. "arrest_made", "report_filed", "unfounded", "assisted")

### citations
- ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid'
  Values: 'unpaid', 'paid', 'contested', 'dismissed'
- ADD COLUMN penal_code text (nullable)
  Optional reference to a penal code entry

## Security
- penal_codes: RLS enabled, community-member-scoped CRUD (same pattern as all other entity tables)
- No changes to existing table RLS policies

## Realtime
- Adds civilians, vehicles, weapons, warrants, citations, incidents
  to the supabase_realtime publication so all EntityPanel pages get live updates.
*/

-- 1. penal_codes table
CREATE TABLE IF NOT EXISTS public.penal_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'vehicle',
  fine_min numeric NOT NULL DEFAULT 0,
  fine_max numeric NOT NULL DEFAULT 0,
  jail_time_max text,
  points int NOT NULL DEFAULT 0,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.penal_codes TO authenticated;
GRANT ALL ON public.penal_codes TO service_role;
ALTER TABLE public.penal_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "penal_codes_member_read" ON public.penal_codes;
CREATE POLICY "penal_codes_member_read"
ON public.penal_codes FOR SELECT TO authenticated
USING (public.is_member(community_id));

DROP POLICY IF EXISTS "penal_codes_member_insert" ON public.penal_codes;
CREATE POLICY "penal_codes_member_insert"
ON public.penal_codes FOR INSERT TO authenticated
WITH CHECK (public.is_member(community_id));

DROP POLICY IF EXISTS "penal_codes_member_update" ON public.penal_codes;
CREATE POLICY "penal_codes_member_update"
ON public.penal_codes FOR UPDATE TO authenticated
USING (public.is_member(community_id))
WITH CHECK (public.is_member(community_id));

DROP POLICY IF EXISTS "penal_codes_member_delete" ON public.penal_codes;
CREATE POLICY "penal_codes_member_delete"
ON public.penal_codes FOR DELETE TO authenticated
USING (public.is_member(community_id));

-- 2. Add disposition column to calls
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calls' AND column_name = 'disposition') THEN
    ALTER TABLE public.calls ADD COLUMN disposition text;
  END IF;
END $$;

-- 3. Add payment_status and penal_code columns to citations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'payment_status') THEN
    ALTER TABLE public.citations ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citations' AND column_name = 'penal_code') THEN
    ALTER TABLE public.citations ADD COLUMN penal_code text;
  END IF;
END $$;

-- 4. Enable realtime on all remaining entity tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.civilians;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weapons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.warrants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.citations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.penal_codes;

-- 5. Index for penal code lookups by community
CREATE INDEX IF NOT EXISTS idx_penal_codes_community ON public.penal_codes(community_id);
CREATE INDEX IF NOT EXISTS idx_calls_community_status ON public.calls(community_id, status);
CREATE INDEX IF NOT EXISTS idx_citations_payment_status ON public.citations(payment_status);
