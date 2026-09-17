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
  | "bolo.update"
  | "bolo.delete"
  | "civilian.create"
  | "civilian.update"
  | "civilian.delete"
  | "vehicle.create"
  | "vehicle.update"
  | "vehicle.delete"
  | "weapon.create"
  | "weapon.update"
  | "weapon.delete"
  | "warrant.create"
  | "warrant.update"
  | "warrant.delete"
  | "citation.create"
  | "citation.update"
  | "citation.delete"
  | "incident.create"
  | "incident.update"
  | "incident.delete"
  | "unit.status"
  | "unit.update"
  | "settings.update";

export type AuditEntry = {
  action: AuditAction;
  entityType?: string | undefined;
  entityId?: string | undefined;
  details?: Record<string, unknown> | undefined;
  communityId?: string | null | undefined;
};

const WEBHOOK_URL = "https://discord.com/api/webhooks/1543355327070867582/dKJwXqydC220qb3mowNtxCx5YivEFsaX_ZmqV0JgfXTVvrLhbgxHHCTH7qnnEOD6lxGv";

async function sendToWebhook(entry: {
  action: string;
  actor_email?: string | null;
  actor_callsign?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "CodeBlueCAD Audit",
        embeds: [buildEmbed(entry)],
      }),
    });
  } catch (err) {
    console.error("[audit] Webhook send failed:", err);
  }
}

function emojiFor(action: string): string {
  const map: Record<string, string> = {
    auth: "\u{1F510}",
    community: "\u{1F3DB}\u{FE0F}",
    call: "\u{1F4E1}",
    bolo: "\u{26A0}\u{FE0F}",
    civilian: "\u{1F464}",
    vehicle: "\u{1F697}",
    weapon: "\u{1F52B}",
    warrant: "\u{1F4CB}",
    citation: "\u{1F4DD}",
    incident: "\u{1F4C4}",
    unit: "\u{1F46E}",
    settings: "\u{2699}\u{FE0F}",
    discord: "\u{1F3AE}",
  };
  const prefix = action.split(".")[0] ?? "system";
  return map[prefix] ?? "\u{1F4CB}";
}

function colorFor(action: string): number {
  if (action.includes("delete") || action.includes("fail")) return 0xed4245;
  if (action.includes("create") || action.includes("signin") || action.includes("signup") || action.includes("join"))
    return 0x57f287;
  if (action.includes("update") || action.includes("signout") || action.includes("status"))
    return 0xfee75c;
  return 0x5865f2;
}

function labelFor(action: string): string {
  const [category, verb] = action.split(".");
  if (!verb) return category;
  const verbMap: Record<string, string> = {
    signin: "Sign In", signup: "Sign Up", signout: "Sign Out", fail: "Failed",
    create: "Create", join: "Join", switch: "Switch", update: "Update",
    delete: "Delete", assign: "Assign", status: "Status Change",
  };
  const categoryMap: Record<string, string> = {
    auth: "Auth", community: "Community", call: "Call", bolo: "BOLO",
    civilian: "Civilian", vehicle: "Vehicle", weapon: "Weapon",
    warrant: "Warrant", citation: "Citation", incident: "Incident",
    unit: "Unit", settings: "Settings", discord: "Discord",
  };
  const cat = categoryMap[category ?? ""] ?? category;
  const v = verbMap[verb ?? ""] ?? verb;
  return `${cat} ${v}`;
}

function buildEmbed(entry: {
  action: string;
  actor_email?: string | null;
  actor_callsign?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
}): Record<string, unknown> {
  const fields: { name: string; value: string; inline: boolean }[] = [];

  if (entry.actor_callsign) {
    fields.push({ name: "Callsign", value: `\`${entry.actor_callsign}\``, inline: true });
  }
  if (entry.actor_email) {
    fields.push({ name: "User", value: entry.actor_email, inline: true });
  }
  if (entry.entity_type) {
    fields.push({ name: "Entity", value: entry.entity_type, inline: true });
  }
  if (entry.entity_id) {
    fields.push({ name: "Entity ID", value: `\`${entry.entity_id.slice(0, 8)}\``, inline: true });
  }

  if (entry.details && Object.keys(entry.details).length > 0) {
    const lines = Object.entries(entry.details).map(([k, v]) => {
      const val = typeof v === "string" ? v : JSON.stringify(v);
      const truncated = val.length > 200 ? val.slice(0, 200) + "\u2026" : val;
      return `${k}: ${truncated}`;
    });
    fields.push({
      name: "Extra",
      value: "```\n" + lines.join("\n") + "\n```",
      inline: false,
    });
  }

  return {
    title: `${emojiFor(entry.action)} ${labelFor(entry.action)}`,
    color: colorFor(entry.action),
    timestamp: new Date().toISOString(),
    fields: fields.length > 0 ? fields : undefined,
    footer: { text: "CodeBlueCAD API Audit" },
  };
}

/**
 * Log an audit event to the Discord webhook.
 * Used for client-side actions where we have the user's session.
 */
export function useAuditLogger() {
  const { user } = useAuth();
  const { active } = useCad();

  return async function log(entry: AuditEntry): Promise<void> {
    await sendToWebhook({
      action: entry.action,
      actor_email: user?.email ?? null,
      actor_callsign: active?.callsign ?? null,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      details: entry.details ?? null,
    });
  };
}

/**
 * Log audit events from pre-auth flows (sign in, sign up).
 */
export async function logAuditEvents(entries: AuditEntry[]): Promise<void> {
  for (const entry of entries) {
    await sendToWebhook({
      action: entry.action,
      details: entry.details ?? null,
    });
  }
}
