CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,
  user_id uuid,
  actor_email text,
  actor_callsign text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_community_id ON public.audit_logs (community_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_member_read" ON public.audit_logs;
CREATE POLICY "audit_member_read" ON public.audit_logs FOR SELECT TO authenticated
USING (community_id IS NOT NULL AND public.is_member(community_id));

DROP POLICY IF EXISTS "audit_self_read" ON public.audit_logs;
CREATE POLICY "audit_self_read" ON public.audit_logs FOR SELECT TO authenticated
USING (community_id IS NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "audit_insert" ON public.audit_logs;
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());