ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discord_id text,
  ADD COLUMN IF NOT EXISTS discord_username text,
  ADD COLUMN IF NOT EXISTS discord_avatar_url text,
  ADD COLUMN IF NOT EXISTS discord_linked_at timestamp with time zone;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_discord_id_key ON public.profiles (discord_id) WHERE discord_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.role_rank(_role text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(_role, 'officer'))
    WHEN 'owner' THEN 40
    WHEN 'admin' THEN 30
    WHEN 'supervisor' THEN 20
    WHEN 'officer' THEN 10
    ELSE 5
  END;
$$;

CREATE OR REPLACE FUNCTION public.my_role(_community_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.communities c WHERE c.id = _community_id AND c.owner_id = auth.uid())
      THEN 'owner'
    ELSE (SELECT m.role FROM public.community_members m
          WHERE m.community_id = _community_id AND m.user_id = auth.uid() LIMIT 1)
  END;
$$;

CREATE OR REPLACE FUNCTION public.has_min_role(_community_id uuid, _min text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.my_role(_community_id) IS NOT NULL
     AND public.role_rank(public.my_role(_community_id)) >= public.role_rank(_min);
$$;

REVOKE ALL ON FUNCTION public.role_rank(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.my_role(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.has_min_role(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.my_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_min_role(uuid, text) TO authenticated;

-- Admins manage members
DROP POLICY IF EXISTS members_update_admin ON public.community_members;
CREATE POLICY members_update_admin ON public.community_members
  FOR UPDATE TO authenticated
  USING (public.has_min_role(community_id, 'admin'))
  WITH CHECK (public.has_min_role(community_id, 'admin'));

DROP POLICY IF EXISTS members_delete_admin ON public.community_members;
CREATE POLICY members_delete_admin ON public.community_members
  FOR DELETE TO authenticated
  USING (public.has_min_role(community_id, 'admin'));

-- Deletion restricted to supervisors and above
DROP POLICY IF EXISTS civilians_member_delete ON public.civilians;
CREATE POLICY civilians_member_delete ON public.civilians FOR DELETE TO authenticated
  USING (public.has_min_role(community_id, 'supervisor'));

DROP POLICY IF EXISTS vehicles_member_delete ON public.vehicles;
CREATE POLICY vehicles_member_delete ON public.vehicles FOR DELETE TO authenticated
  USING (public.has_min_role(community_id, 'supervisor'));

DROP POLICY IF EXISTS weapons_member_delete ON public.weapons;
CREATE POLICY weapons_member_delete ON public.weapons FOR DELETE TO authenticated
  USING (public.has_min_role(community_id, 'supervisor'));

DROP POLICY IF EXISTS warrants_member_delete ON public.warrants;
CREATE POLICY warrants_member_delete ON public.warrants FOR DELETE TO authenticated
  USING (public.has_min_role(community_id, 'supervisor'));

DROP POLICY IF EXISTS citations_member_delete ON public.citations;
CREATE POLICY citations_member_delete ON public.citations FOR DELETE TO authenticated
  USING (public.has_min_role(community_id, 'supervisor'));

DROP POLICY IF EXISTS incidents_member_delete ON public.incidents;
CREATE POLICY incidents_member_delete ON public.incidents FOR DELETE TO authenticated
  USING (public.has_min_role(community_id, 'supervisor'));

DROP POLICY IF EXISTS bolos_member_delete ON public.bolos;
CREATE POLICY bolos_member_delete ON public.bolos FOR DELETE TO authenticated
  USING (public.has_min_role(community_id, 'supervisor'));

DROP POLICY IF EXISTS calls_member_delete ON public.calls;
CREATE POLICY calls_member_delete ON public.calls FOR DELETE TO authenticated
  USING (public.has_min_role(community_id, 'supervisor'));