/*
# Extend CAD system with BOLOs, weapons, citations, incidents, penal codes, and call logs

This migration adds six new tables to the existing Sentinel CAD schema, bringing
LinesPoliceCAD-style features (dashboard analytics, penal code lookup, BOLO alerts,
weapon records, citations, and incident reports) into the SonoranCAD-style dispatch
console. All operational data is shared across the department (authenticated CRUD),
matching the existing pattern.

## 1. New Tables (created in dependency order)

### penal_codes (created first — citations references it)
Lookup table of penal code violations.
- `id` (uuid, pk)
- `code` (text) e.g. "PC 245(a)(1)"
- `title` (text) e.g. "Assault with a Deadly Weapon"
- `category` (text) felony / misdemeanor / infraction
- `fine_amount` (numeric) default fine
- `bail_amount` (numeric) default bail
- `description` (text)
- `created_at` (timestamptz)

### bolos
Be-On-The-Lookout alerts for persons, vehicles, or items.
- `id` (uuid, pk)
- `bolo_type` (text) person / vehicle / item / other
- `title` (text) short description
- `description` (text) details
- `plate` (text) for vehicle BOLOs
- `subject_name` (text) for person BOLOs
- `priority` (int) 1-3
- `status` (text) active / cancelled
- `created_by` (uuid, fk -> profiles)
- `created_at` (timestamptz)

### weapons
Weapon registration records.
- `id` (uuid, pk)
- `serial_number` (text)
- `model` (text) e.g. Glock 17
- `manufacturer` (text)
- `caliber` (text)
- `weapon_type` (text) pistol / rifle / shotgun / other
- `owner_name` (text)
- `registration_status` (text) registered / unregistered / stolen
- `notes` (text)
- `created_at` (timestamptz)

### citations
Citation / ticket records issued to civilians.
- `id` (uuid, pk)
- `citation_number` (bigint, auto sequence)
- `civilian_name` (text)
- `officer_name` (text)
- `violation` (text) penal code title
- `penal_code_id` (uuid, fk -> penal_codes, nullable)
- `fine_amount` (numeric)
- `court_date` (date)
- `status` (text) pending / paid / contested / dismissed
- `location` (text)
- `notes` (text)
- `created_by` (uuid, fk -> profiles)
- `created_at` (timestamptz)

### incidents
Incident / arrest reports filed by officers.
- `id` (uuid, pk)
- `incident_number` (bigint, auto sequence)
- `title` (text)
- `incident_type` (text) arrest / incident / field-contact / use-of-force
- `status` (text) draft / submitted / approved / rejected
- `summary` (text)
- `involved_parties` (text) names of involved persons
- `location` (text)
- `evidence` (text) evidence collected
- `officer_name` (text)
- `created_by` (uuid, fk -> profiles)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### call_logs
Timeline entries attached to calls (dispatch notes / radio log).
- `id` (uuid, pk)
- `call_id` (uuid, fk -> calls, cascade)
- `author_name` (text)
- `message` (text)
- `log_type` (text) note / status-change / assignment / radio
- `created_at` (timestamptz)

## 2. Security

RLS enabled on all new tables. All policies scoped `TO authenticated` with full
CRUD (USING true / WITH CHECK true) since this is shared department operational
data, matching the existing pattern for calls, units, civilians, vehicles, warrants.

## 3. Notes

1. `citation_number` and `incident_number` use dedicated sequences for stable,
   incrementing human-facing numbers.
2. Indexes added on commonly filtered columns.
3. Penal codes are seeded with a starter set of common violations.
*/

-- penal_codes (created first because citations references it)
CREATE TABLE IF NOT EXISTS penal_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'misdemeanor',
  fine_amount numeric(10,2) NOT NULL DEFAULT 0,
  bail_amount numeric(10,2) NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE penal_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read penal_codes" ON penal_codes;
CREATE POLICY "read penal_codes" ON penal_codes FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert penal_codes" ON penal_codes;
CREATE POLICY "insert penal_codes" ON penal_codes FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update penal_codes" ON penal_codes;
CREATE POLICY "update penal_codes" ON penal_codes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete penal_codes" ON penal_codes;
CREATE POLICY "delete penal_codes" ON penal_codes FOR DELETE
  TO authenticated USING (true);

-- bolos
CREATE TABLE IF NOT EXISTS bolos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bolo_type text NOT NULL DEFAULT 'person',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  plate text NOT NULL DEFAULT '',
  subject_name text NOT NULL DEFAULT '',
  priority int NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'active',
  created_by uuid DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bolos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read bolos" ON bolos;
CREATE POLICY "read bolos" ON bolos FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert bolos" ON bolos;
CREATE POLICY "insert bolos" ON bolos FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update bolos" ON bolos;
CREATE POLICY "update bolos" ON bolos FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete bolos" ON bolos;
CREATE POLICY "delete bolos" ON bolos FOR DELETE
  TO authenticated USING (true);

-- weapons
CREATE TABLE IF NOT EXISTS weapons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  manufacturer text NOT NULL DEFAULT '',
  caliber text NOT NULL DEFAULT '',
  weapon_type text NOT NULL DEFAULT 'pistol',
  owner_name text NOT NULL DEFAULT '',
  registration_status text NOT NULL DEFAULT 'registered',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE weapons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read weapons" ON weapons;
CREATE POLICY "read weapons" ON weapons FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert weapons" ON weapons;
CREATE POLICY "insert weapons" ON weapons FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update weapons" ON weapons;
CREATE POLICY "update weapons" ON weapons FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete weapons" ON weapons;
CREATE POLICY "delete weapons" ON weapons FOR DELETE
  TO authenticated USING (true);

-- citation sequence
CREATE SEQUENCE IF NOT EXISTS citation_number_seq START 5001;

-- citations
CREATE TABLE IF NOT EXISTS citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citation_number bigint NOT NULL DEFAULT nextval('citation_number_seq'),
  civilian_name text NOT NULL DEFAULT '',
  officer_name text NOT NULL DEFAULT '',
  violation text NOT NULL DEFAULT '',
  penal_code_id uuid REFERENCES penal_codes(id) ON DELETE SET NULL,
  fine_amount numeric(10,2) NOT NULL DEFAULT 0,
  court_date date,
  status text NOT NULL DEFAULT 'pending',
  location text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE citations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read citations" ON citations;
CREATE POLICY "read citations" ON citations FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert citations" ON citations;
CREATE POLICY "insert citations" ON citations FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update citations" ON citations;
CREATE POLICY "update citations" ON citations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete citations" ON citations;
CREATE POLICY "delete citations" ON citations FOR DELETE
  TO authenticated USING (true);

-- incident sequence
CREATE SEQUENCE IF NOT EXISTS incident_number_seq START 2001;

-- incidents
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number bigint NOT NULL DEFAULT nextval('incident_number_seq'),
  title text NOT NULL DEFAULT '',
  incident_type text NOT NULL DEFAULT 'incident',
  status text NOT NULL DEFAULT 'draft',
  summary text NOT NULL DEFAULT '',
  involved_parties text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  evidence text NOT NULL DEFAULT '',
  officer_name text NOT NULL DEFAULT '',
  created_by uuid DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read incidents" ON incidents;
CREATE POLICY "read incidents" ON incidents FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert incidents" ON incidents;
CREATE POLICY "insert incidents" ON incidents FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update incidents" ON incidents;
CREATE POLICY "update incidents" ON incidents FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete incidents" ON incidents;
CREATE POLICY "delete incidents" ON incidents FOR DELETE
  TO authenticated USING (true);

-- call_logs
CREATE TABLE IF NOT EXISTS call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  log_type text NOT NULL DEFAULT 'note',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read call_logs" ON call_logs;
CREATE POLICY "read call_logs" ON call_logs FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert call_logs" ON call_logs;
CREATE POLICY "insert call_logs" ON call_logs FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update call_logs" ON call_logs;
CREATE POLICY "update call_logs" ON call_logs FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete call_logs" ON call_logs;
CREATE POLICY "delete call_logs" ON call_logs FOR DELETE
  TO authenticated USING (true);

-- indexes
CREATE INDEX IF NOT EXISTS idx_bolos_status ON bolos(status);
CREATE INDEX IF NOT EXISTS idx_weapons_serial ON weapons(serial_number);
CREATE INDEX IF NOT EXISTS idx_citations_status ON citations(status);
CREATE INDEX IF NOT EXISTS idx_citations_created ON citations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_call ON call_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_penal_codes_code ON penal_codes(code);

-- Seed penal codes
INSERT INTO penal_codes (code, title, category, fine_amount, bail_amount, description) VALUES
  ('PC 187', 'Murder', 'felony', 0, 50000, 'Unlawful killing of a human being with malice aforethought.'),
  ('PC 245(a)(1)', 'Assault with a Deadly Weapon', 'felony', 0, 25000, 'Assault upon another person with a deadly weapon.'),
  ('PC 211', 'Robbery', 'felony', 0, 30000, 'Taking personal property from another by force or fear.'),
  ('PC 459', 'Burglary', 'felony', 0, 20000, 'Entering a structure with intent to commit theft or felony.'),
  ('PC 207', 'Kidnapping', 'felony', 0, 35000, 'Forcibly taking another person against their will.'),
  ('PC 215(a)', 'Carjacking', 'felony', 0, 25000, 'Taking a vehicle from another person by force or fear.'),
  ('PC 236-237', 'False Imprisonment', 'felony', 0, 15000, 'Unlawful restraint of another person''s personal liberty.'),
  ('PC 242', 'Battery', 'misdemeanor', 500, 5000, 'Unlawful use of force or violence against another person.'),
  ('PC 243(e)(1)', 'Domestic Battery', 'misdemeanor', 750, 10000, 'Battery against a spouse, cohabitant, or family member.'),
  ('PC 647(b)', 'Prostitution', 'misdemeanor', 500, 2500, 'Engaging in or soliciting prostitution.'),
  ('PC 451', 'Arson', 'felony', 0, 30000, 'Maliciously setting fire to a structure, land, or property.'),
  ('PC 182', 'Conspiracy', 'felony', 0, 15000, 'Two or more persons agreeing to commit a crime.'),
  ('PC 288(a)', 'Lewd Acts with a Minor', 'felony', 0, 40000, 'Lewd or lascivious acts with a child under 14.'),
  ('PC 311', 'Obscene Material', 'felony', 0, 10000, 'Possession or distribution of obscene material.'),
  ('PC 594', 'Vandalism', 'misdemeanor', 1000, 5000, 'Maliciously defacing or destroying property.'),
  ('PC 496(a)', 'Receiving Stolen Property', 'felony', 0, 10000, 'Knowingly receiving property known to be stolen.'),
  ('PC 653m', 'Harassing Phone Calls', 'misdemeanor', 250, 1000, 'Making repeated harassing or threatening phone calls.'),
  ('PC 148(a)(1)', 'Resisting Arrest', 'misdemeanor', 750, 5000, 'Willfully resisting, delaying, or obstructing an officer.'),
  ('VC 23152(a)', 'DUI', 'misdemeanor', 2000, 10000, 'Driving under the influence of alcohol or drugs.'),
  ('VC 23152(b)', 'DUI Over 0.08', 'misdemeanor', 2000, 10000, 'Driving with BAC of 0.08% or higher.'),
  ('VC 20002(a)', 'Hit and Run', 'misdemeanor', 1000, 5000, 'Leaving the scene of an accident without stopping.'),
  ('VC 10851(a)', 'Grand Theft Auto', 'felony', 0, 20000, 'Taking or driving a vehicle without owner consent.'),
  ('VC 4000(a)', 'No Registration', 'infraction', 250, 0, 'Driving a vehicle without valid registration.'),
  ('VC 16028(a)', 'No Insurance', 'infraction', 200, 0, 'Driving without proof of financial responsibility.'),
  ('VC 22349(a)', 'Speeding Over 65', 'infraction', 355, 0, 'Driving in excess of 65 mph on a highway.'),
  ('VC 21453(a)', 'Red Light Violation', 'infraction', 490, 0, 'Failure to stop at a red traffic signal.'),
  ('VC 21950(a)', 'Failure to Yield to Pedestrian', 'infraction', 238, 0, 'Failure to yield right-of-way to a pedestrian.'),
  ('HS 11350', 'Simple Possession of Controlled Substance', 'misdemeanor', 500, 5000, 'Unlawful possession of a controlled substance.'),
  ('HS 11351', 'Possession for Sale', 'felony', 0, 20000, 'Possession of a controlled substance for sale.'),
  ('HS 11377', 'Possession of Methamphetamine', 'misdemeanor', 500, 5000, 'Unlawful possession of methamphetamine.')
ON CONFLICT DO NOTHING;
