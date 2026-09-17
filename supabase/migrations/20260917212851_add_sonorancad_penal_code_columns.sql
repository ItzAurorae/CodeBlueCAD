/*
# Add SonoranCAD-compatible columns to penal_codes

## Summary
Adds the columns needed to match SonoranCAD's CSV/JSON penal code format:
  code, type, title, bondType, jailTime, bondAmount

## Modified Tables
### penal_codes
- ADD COLUMN type text (charge type, e.g. "Felony", "Misdemeanor", "Infraction")
- ADD COLUMN bond_type text (bond/bail type, e.g. "State Bail Bond", "Personal Recognizance")
- ADD COLUMN jail_time text (human-readable jail time, e.g. "5-10 Years")
- ADD COLUMN bond_amount numeric DEFAULT 0 (bond/bail amount in dollars)
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'penal_codes' AND column_name = 'type') THEN
    ALTER TABLE public.penal_codes ADD COLUMN type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'penal_codes' AND column_name = 'bond_type') THEN
    ALTER TABLE public.penal_codes ADD COLUMN bond_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'penal_codes' AND column_name = 'jail_time') THEN
    ALTER TABLE public.penal_codes ADD COLUMN jail_time text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'penal_codes' AND column_name = 'bond_amount') THEN
    ALTER TABLE public.penal_codes ADD COLUMN bond_amount numeric NOT NULL DEFAULT 0;
  END IF;
END $$;
