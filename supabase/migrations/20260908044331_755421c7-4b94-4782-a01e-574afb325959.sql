CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Officer',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities TO authenticated;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  department text NOT NULL DEFAULT 'police',
  callsign text NOT NULL DEFAULT '1-ADAM-12',
  rank text NOT NULL DEFAULT 'Officer',
  role text NOT NULL DEFAULT 'officer',
  status text NOT NULL DEFAULT 'off_duty',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_member(_community_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.community_members m WHERE m.community_id = _community_id AND m.user_id = auth.uid());
$$;

CREATE POLICY "communities_read" ON public.communities FOR SELECT TO authenticated USING (true);
CREATE POLICY "communities_create" ON public.communities FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "communities_update_owner" ON public.communities FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "communities_delete_owner" ON public.communities FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "members_read" ON public.community_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_member(community_id));
CREATE POLICY "members_join_self" ON public.community_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_update_self" ON public.community_members FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_leave_self" ON public.community_members FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities ON DELETE CASCADE,
  code text NOT NULL DEFAULT '10-70',
  title text NOT NULL,
  description text,
  location text NOT NULL DEFAULT 'Unknown',
  priority int NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'pending',
  assigned_units text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bolos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'person',
  title text NOT NULL,
  description text,
  plate text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.civilians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  dob date,
  address text,
  gender text,
  license_status text NOT NULL DEFAULT 'valid',
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities ON DELETE CASCADE,
  plate text NOT NULL,
  model text,
  color text,
  owner_name text,
  registration text NOT NULL DEFAULT 'valid',
  insurance text NOT NULL DEFAULT 'valid',
  stolen boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.weapons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities ON DELETE CASCADE,
  serial text NOT NULL,
  type text,
  registered_to text,
  status text NOT NULL DEFAULT 'registered',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.warrants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities ON DELETE CASCADE,
  subject_name text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities ON DELETE CASCADE,
  civilian_name text NOT NULL,
  violation text NOT NULL,
  fine numeric NOT NULL DEFAULT 0,
  officer_name text,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  involved text,
  officer_name text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['calls','bolos','civilians','vehicles','weapons','warrants','citations','incidents'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s_member_read" ON public.%I FOR SELECT TO authenticated USING (public.is_member(community_id))', t, t);
    EXECUTE format('CREATE POLICY "%s_member_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_member(community_id))', t, t);
    EXECUTE format('CREATE POLICY "%s_member_update" ON public.%I FOR UPDATE TO authenticated USING (public.is_member(community_id)) WITH CHECK (public.is_member(community_id))', t, t);
    EXECUTE format('CREATE POLICY "%s_member_delete" ON public.%I FOR DELETE TO authenticated USING (public.is_member(community_id))', t, t);
  END LOOP;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bolos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_members;