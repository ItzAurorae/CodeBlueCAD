/*
# Add Discord profile columns and role-based access control functions

## What this does
1. Adds Discord identity columns to the `profiles` table so we can store
   the user's Discord ID, username, avatar, and link timestamp.
2. Creates SQL helper functions (`role_rank`, `my_role`, `has_min_role`)
   in the `private` schema so they can be used in RLS policies without
   being callable by the `anon` role.
3. Replaces the existing `is_member`-based DELETE policies on all
   content tables with `has_min_role(..., 'supervisor')` policies so
   only supervisors and above can delete records.
4. Adds admin-level UPDATE and DELETE policies on `community_members`
   so admins can manage their community's roster.
5. Revokes excess `anon` privileges — this is a signed-in app, so the
   `anon` role should not have CRUD access to any table.
6. Removes the old `public` schema copies of these functions if they
   were created by a previous partial migration.

## New columns on `profiles`
- `discord_id` (text, unique where non-null) — the user's Discord ID
- `discord_username` (text) — their Discord username
- `discord_avatar_url` (text) — CDN URL to their Discord avatar
- `discord_linked_at` (timestamptz) — when they linked their Discord

## New functions (private schema)
- `private.role_rank(role text)` — maps role names to numeric ranks
- `private.my_role(community_id uuid)` — returns the caller's role in a community
- `private.has_min_role(community_id uuid, min_role text)` — checks the caller meets a minimum role

## Policy changes
- `community_members`: admin-only UPDATE and DELETE
- All content tables (bolos, calls, civilians, vehicles, weapons,
  warrants, citations, incidents): DELETE restricted to supervisor+
- Revokes anon CRUD on all tables — authenticated-only access
*/

-- 1. Discord columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discord_id text,
  ADD COLUMN IF NOT EXISTS discord_username text,
  ADD COLUMN IF NOT EXISTS discord_avatar_url text,
  ADD COLUMN IF NOT EXISTS discord_linked_at timestamp with time zone;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_discord_id_key
  ON public.profiles (discord_id) WHERE discord_id IS NOT NULL;

-- 2. Private schema for role helpers
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.role_rank(_role text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE lower(coalesce(_role, 'officer'))
    WHEN 'owner' THEN 40 WHEN 'admin' THEN 30 WHEN 'supervisor' THEN 20
    WHEN 'officer' THEN 10 ELSE 5 END;
$$;

CREATE OR REPLACE FUNCTION private.my_role(_community_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.communities c WHERE c.id = _community_id AND c.owner_id = auth.uid())
      THEN 'owner'
    ELSE (SELECT m.role FROM public.community_members m
          WHERE m.community_id = _community_id AND m.user_id = auth.uid() LIMIT 1)
  END;
$$;

CREATE OR REPLACE FUNCTION private.has_min_role(_community_id uuid, _min text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.my_role(_community_id) IS NOT NULL
     AND private.role_rank(private.my_role(_community_id)) >= private.role_rank(_min);
$$;

REVOKE EXECUTE ON FUNCTION private.my_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.has_min_role(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.role_rank(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.my_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_min_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.role_rank(text) TO authenticated, service_role;

-- 3. Clean up any old public-schema copies from partial migrations
DROP FUNCTION IF EXISTS public.has_min_role(uuid, text);
DROP FUNCTION IF EXISTS public.my_role(uuid);
DROP FUNCTION IF EXISTS public.role_rank(text);

-- 4. Admin-level member management policies
DROP POLICY IF EXISTS members_update_admin ON public.community_members;
CREATE POLICY members_update_admin ON public.community_members FOR UPDATE TO authenticated
  USING (private.has_min_role(community_id, 'admin'))
  WITH CHECK (private.has_min_role(community_id, 'admin'));

DROP POLICY IF EXISTS members_delete_admin ON public.community_members;
CREATE POLICY members_delete_admin ON public.community_members FOR DELETE TO authenticated
  USING (private.has_min_role(community_id, 'admin'));

-- 5. Supervisor-level delete policies on all content tables
DROP POLICY IF EXISTS bolos_member_delete ON public.bolos;
CREATE POLICY bolos_member_delete ON public.bolos FOR DELETE TO authenticated
  USING (private.has_min_role(community_id, 'supervisor'));

DROP POLICY IF EXISTS calls_member_delete ON public.calls;
CREATE POLICY calls_member_delete ON public.calls FOR DELETE TO authenticated
  USING (private.has_min_role(community_id, 'supervisor'));

DROP POLICY IF EXISTS civilians_member_delete ON public.civilians;
CREATE POLICY civilians_member_delete ON public.civilians FOR DELETE TO authenticated
  USING (private.has_min_role(community_id, 'supervisor'));

DROP POLICY IF EXISTS vehicles_member_delete ON public.vehicles;
CREATE POLICY vehicles_member_delete ON public.vehicles FOR DELETE TO authenticated
  USING (private.has_min_role(community_id, 'supervisor'));

DROP POLICY IF EXISTS weapons_member_delete ON public.weapons;
CREATE POLICY weapons_member_delete ON public.weapons FOR DELETE TO authenticated
  USING (private.has_min_role(community_id, 'supervisor'));

DROP POLICY IF EXISTS warrants_member_delete ON public.warrants;
CREATE POLICY warrants_member_delete ON public.warrants FOR DELETE TO authenticated
  USING (private.has_min_role(community_id, 'supervisor'));

DROP POLICY IF EXISTS citations_member_delete ON public.citations;
CREATE POLICY citations_member_delete ON public.citations FOR DELETE TO authenticated
  USING (private.has_min_role(community_id, 'supervisor'));

DROP POLICY IF EXISTS incidents_member_delete ON public.incidents;
CREATE POLICY incidents_member_delete ON public.incidents FOR DELETE TO authenticated
  USING (private.has_min_role(community_id, 'supervisor'));

-- 6. Revoke anon privileges — this is a signed-in app
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.profiles FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.communities FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.community_members FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.calls FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.bolos FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.civilians FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.vehicles FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.weapons FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.warrants FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.citations FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.incidents FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.audit_logs FROM anon;
