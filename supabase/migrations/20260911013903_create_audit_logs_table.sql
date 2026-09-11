/*
# Create audit_logs table

1. New Tables
- `audit_logs`
  - `id` (uuid, primary key, default gen_random_uuid())
  - `community_id` (uuid, nullable — null for global events like auth/discord)
  - `user_id` (uuid, nullable — the acting user's id)
  - `actor_email` (text, nullable — the acting user's email for display)
  - `actor_callsign` (text, nullable — the acting user's callsign at time of event)
  - `action` (text, not null — e.g. "call.create", "bolo.delete", "auth.signin", "community.join")
  - `entity_type` (text, nullable — e.g. "call", "bolo", "civilian", "community")
  - `entity_id` (text, nullable — the id of the affected entity, stored as text for flexibility)
  - `details` (jsonb, nullable — structured key/value details of the event)
  - `ip_address` (text, nullable — request IP if available)
  - `created_at` (timestamptz, default now())

2. New Indexes
- `idx_audit_logs_community_id` on `community_id` for filtering by community
- `idx_audit_logs_created_at` on `created_at DESC` for chronological listing
- `idx_audit_logs_action` on `action` for filtering by event type
- `idx_audit_logs_user_id` on `user_id` for filtering by actor

3. Security
- Enable RLS on `audit_logs`.
- Members of a community can read audit logs for their community.
- Users can read their own audit logs (community_id IS NULL events).
- Only authenticated users can insert (the application writes audit entries from the client
  using the supabase client, which carries the user's session; the edge function also inserts
  using the service role key for server-side events).
- No UPDATE or DELETE — audit logs are immutable append-only.

4. Notes
- The `audit_logs` table is intentionally append-only. UPDATE and DELETE policies
  are denied (no policies created for those commands), so even authenticated users
  cannot modify or remove entries once written.
- `community_id` is nullable to support global events (sign-in, sign-up, Discord OAuth)
  that happen outside the context of a specific community.
*/

CREATE TABLE IF NOT EXISTS audit_logs (
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_community_id ON audit_logs (community_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Members can read audit logs for communities they belong to
DROP POLICY IF EXISTS "audit_member_read" ON audit_logs;
CREATE POLICY "audit_member_read"
ON audit_logs FOR SELECT
TO authenticated
USING (
  community_id IS NOT NULL AND is_member(community_id)
);

-- Users can read their own global (non-community) audit logs
DROP POLICY IF EXISTS "audit_self_read" ON audit_logs;
CREATE POLICY "audit_self_read"
ON audit_logs FOR SELECT
TO authenticated
USING (
  community_id IS NULL AND user_id = auth.uid()
);

-- Authenticated users can insert audit entries
-- The RLS ensures they can only insert for themselves (user_id = auth.uid())
DROP POLICY IF EXISTS "audit_insert" ON audit_logs;
CREATE POLICY "audit_insert"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- No UPDATE or DELETE policies: audit logs are immutable
