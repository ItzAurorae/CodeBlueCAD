import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCad } from "@/lib/cad";

export type AuditAction =
  | "auth.signin"
  | "auth.signup"
  | "auth.signout"
  | "auth.discord.signin"
  | "auth.discord.fail"
  | "community.create"
  | "community.join"
  | "community.switch"
  | "call.create"
  | "call.update"
  | "call.delete"
  | "call.assign"
  | "bolo.create"
  | "bolo.delete"
  | "civilian.create"
  | "civilian.delete"
  | "vehicle.create"
  | "vehicle.delete"
  | "weapon.create"
  | "weapon.delete"
  | "warrant.create"
  | "warrant.delete"
  | "citation.create"
  | "citation.delete"
  | "incident.create"
  | "incident.delete"
  | "unit.status"
  | "unit.update"
  | "settings.update";

export type AuditEntry = {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  communityId?: string | null;
};

/**
 * Log an audit event directly to the database.
 * Used for client-side actions where we have the user's session.
 */
export function useAuditLogger() {
  const { user } = useAuth();
  const { active } = useCad();

  return async function log(entry: AuditEntry): Promise<void> {
    try {
      const { error } = await supabase.from("audit_logs").insert({
        community_id: entry.communityId ?? active?.community_id ?? null,
        user_id: user?.id ?? null,
        actor_email: user?.email ?? null,
        actor_callsign: active?.callsign ?? null,
        action: entry.action,
        entity_type: entry.entityType ?? null,
        entity_id: entry.entityId ?? null,
        details: entry.details ?? null,
      });
      if (error) {
        console.error("[audit] Failed to log:", error.message);
      }
    } catch (err) {
      console.error("[audit] Exception:", err);
    }
  };
}

/**
 * Log an audit event via the edge function (for server-side or batch events).
 * Also forwards to the Discord webhook.
 */
export async function logAuditViaEdgeFunction(entries: AuditEntry[]): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const user = session.session?.user;

  const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const anonKey =
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!supabaseUrl || !anonKey) return;

  try {
    const payload = entries.map((e) => ({
      community_id: e.communityId ?? null,
      user_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      actor_callsign: null,
      action: e.action,
      entity_type: e.entityType ?? null,
      entity_id: e.entityId ?? null,
      details: e.details ?? null,
    }));

    await fetch(`${supabaseUrl}/functions/v1/audit-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        Apikey: anonKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[audit] Edge function log failed:", err);
  }
}
