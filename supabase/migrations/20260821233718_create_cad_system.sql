/*
# Computer-Aided Dispatch (CAD) System schema

Creates the full data model for a department dispatch console: officer profiles,
on-duty units, calls for service, unit assignments, and the records database
(civilians, vehicles, warrants). All operational data is shared across every
signed-in member of the department (a collaborative dispatch picture), while each
officer manages their own profile.

## 1. New Tables

### profiles
Officer identity linked to the auth account.
- `id` (uuid, pk, = auth.users.id)
- `name` (text) full name
- `badge_number` (text) badge / ID number
- `rank` (text) e.g. Officer, Sergeant, Dispatcher
- `department` (text) e.g. Police, Sheriff, EMS, Fire
- `callsign` (text) default radio callsign
- `created_at` (timestamptz)

### units
An officer currently on duty with a live status.
- `id` (uuid, pk)
- `profile_id` (uuid, fk -> profiles) owner officer
- `callsign` (text) radio callsign for this shift
- `officer_name` (text) denormalized name for quick display
- `unit_type` (text) patrol / k9 / swat / ems / fire / traffic
- `status` (text) available / busy / enroute / onscene / panic / offduty
- `location` (text) last reported location
- `created_at`, `updated_at` (timestamptz)

### calls
A call for service (911 / dispatch job).
- `id` (uuid, pk)
- `call_number` (bigint, auto sequence) human-facing incident number
- `title` (text) short summary
- `call_type` (text) e.g. Traffic Stop, Robbery, Medical
- `priority` (int) 1 (high) .. 3 (low)
- `status` (text) pending / active / closed
- `location` (text)
- `description` (text)
- `caller_name` (text)
- `postal` (text) optional postal/zone code
- `created_by` (uuid, fk -> profiles)
- `created_at`, `closed_at` (timestamptz)

### call_assignments
Which units are attached to a call (many-to-many).
- `id` (uuid, pk)
- `call_id` (uuid, fk -> calls, cascade)
- `unit_id` (uuid, fk -> units, cascade)
- `created_at` (timestamptz)
- unique(call_id, unit_id)

### civilians
Person records for lookups.
- `id` (uuid, pk)
- `first_name`, `last_name` (text)
- `dob` (date)
- `gender` (text)
- `address` (text)
- `license_status` (text) valid / suspended / revoked / none
- `flags` (text) free-text alerts (e.g. "Armed and dangerous")
- `created_at` (timestamptz)

### vehicles
Vehicle registration records.
- `id` (uuid, pk)
- `plate` (text) license plate
- `model` (text)
- `color` (text)
- `owner_name` (text)
- `registration_status` (text) valid / expired / none
- `insurance_status` (text) valid / expired / none
- `stolen` (boolean)
- `notes` (text)
- `created_at` (timestamptz)

### warrants
Outstanding / historical warrants.
- `id` (uuid, pk)
- `subject_name` (text)
- `reason` (text)
- `status` (text) active / served / expired
- `issued_by` (text)
- `created_at` (timestamptz)

## 2. Security

RLS is enabled on every table. This app requires sign-in, so all policies are
scoped `TO authenticated`.

1. Operational data (units, calls, call_assignments, civilians, vehicles,
   warrants) is intentionally shared across the whole department, so authenticated
   officers get full CRUD (USING true / WITH CHECK true). This is a collaborative
   dispatch console, not owner-isolated data.
2. Profiles are readable by any authenticated officer (needed to show who is on
   duty), but an officer may only insert/update/delete their own profile row
   (auth.uid() = id).

## 3. Notes

1. `call_number` uses a dedicated sequence so every incident gets a stable,
   incrementing human-facing number.
2. Indexes are added on the columns dispatch queries filter/search on most:
   call status, unit status, and the name/plate lookup columns.
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  badge_number text NOT NULL DEFAULT '',
  rank text NOT NULL DEFAULT 'Officer',
  department text NOT NULL DEFAULT 'Police',
  callsign text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read all profiles" ON profiles;
CREATE POLICY "read all profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert own profile" ON profiles;
CREATE POLICY "insert own profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update own profile" ON profiles;
CREATE POLICY "update own profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete own profile" ON profiles;
CREATE POLICY "delete own profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- units
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  callsign text NOT NULL DEFAULT '',
  officer_name text NOT NULL DEFAULT '',
  unit_type text NOT NULL DEFAULT 'patrol',
  status text NOT NULL DEFAULT 'available',
  location text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read units" ON units;
CREATE POLICY "read units" ON units FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert units" ON units;
CREATE POLICY "insert units" ON units FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update units" ON units;
CREATE POLICY "update units" ON units FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete units" ON units;
CREATE POLICY "delete units" ON units FOR DELETE
  TO authenticated USING (true);

-- calls
CREATE SEQUENCE IF NOT EXISTS call_number_seq START 1001;

CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_number bigint NOT NULL DEFAULT nextval('call_number_seq'),
  title text NOT NULL DEFAULT '',
  call_type text NOT NULL DEFAULT 'General',
  priority int NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'pending',
  location text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  caller_name text NOT NULL DEFAULT '',
  postal text NOT NULL DEFAULT '',
  created_by uuid DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read calls" ON calls;
CREATE POLICY "read calls" ON calls FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert calls" ON calls;
CREATE POLICY "insert calls" ON calls FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update calls" ON calls;
CREATE POLICY "update calls" ON calls FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete calls" ON calls;
CREATE POLICY "delete calls" ON calls FOR DELETE
  TO authenticated USING (true);

-- call_assignments
CREATE TABLE IF NOT EXISTS call_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (call_id, unit_id)
);

ALTER TABLE call_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read assignments" ON call_assignments;
CREATE POLICY "read assignments" ON call_assignments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert assignments" ON call_assignments;
CREATE POLICY "insert assignments" ON call_assignments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update assignments" ON call_assignments;
CREATE POLICY "update assignments" ON call_assignments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete assignments" ON call_assignments;
CREATE POLICY "delete assignments" ON call_assignments FOR DELETE
  TO authenticated USING (true);

-- civilians
CREATE TABLE IF NOT EXISTS civilians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  dob date,
  gender text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  license_status text NOT NULL DEFAULT 'valid',
  flags text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE civilians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read civilians" ON civilians;
CREATE POLICY "read civilians" ON civilians FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert civilians" ON civilians;
CREATE POLICY "insert civilians" ON civilians FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update civilians" ON civilians;
CREATE POLICY "update civilians" ON civilians FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete civilians" ON civilians;
CREATE POLICY "delete civilians" ON civilians FOR DELETE
  TO authenticated USING (true);

-- vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  registration_status text NOT NULL DEFAULT 'valid',
  insurance_status text NOT NULL DEFAULT 'valid',
  stolen boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read vehicles" ON vehicles;
CREATE POLICY "read vehicles" ON vehicles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert vehicles" ON vehicles;
CREATE POLICY "insert vehicles" ON vehicles FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update vehicles" ON vehicles;
CREATE POLICY "update vehicles" ON vehicles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete vehicles" ON vehicles;
CREATE POLICY "delete vehicles" ON vehicles FOR DELETE
  TO authenticated USING (true);

-- warrants
CREATE TABLE IF NOT EXISTS warrants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  issued_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE warrants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read warrants" ON warrants;
CREATE POLICY "read warrants" ON warrants FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert warrants" ON warrants;
CREATE POLICY "insert warrants" ON warrants FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update warrants" ON warrants;
CREATE POLICY "update warrants" ON warrants FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete warrants" ON warrants;
CREATE POLICY "delete warrants" ON warrants FOR DELETE
  TO authenticated USING (true);

-- indexes
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_assignments_call ON call_assignments(call_id);
CREATE INDEX IF NOT EXISTS idx_assignments_unit ON call_assignments(unit_id);
CREATE INDEX IF NOT EXISTS idx_civilians_last_name ON civilians(last_name);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_warrants_subject ON warrants(subject_name);
