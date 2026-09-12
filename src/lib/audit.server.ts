import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

const WEBHOOK_URL =
  process.env["DISCORD_AUDIT_WEBHOOK_URL"] ??
  "";

type ServerAuditEntry = {
  community_id?: string | null | undefined;
  user_id?: string | null | undefined;
  actor_email?: string | null | undefined;
  actor_callsign?: string | null | undefined;
  action: string;
  entity_type?: string | null | undefined;
  entity_id?: string | null | undefined;
  details?: Record<string, unknown> | null | undefined;
  ip_address?: string | null | undefined;
};

const EMOJI_MAP: Record<string, string> = {
  auth: "🔐",
  community: "🏛️",
  discord: "🎮",
  system: "🔧",
};

function emojiFor(action: string): string {
  const prefix = action.split(".")[0] ?? "system";
  return EMOJI_MAP[prefix] ?? "📋";
}

function colorFor(action: string): number {
  if (action.includes("fail") || action.includes("delete")) return 0xed4245;
  if (action.includes("create") || action.includes("signin") || action.includes("signup") || action.includes("join"))
    return 0x57f287;
  if (action.includes("update") || action.includes("signout")) return 0xfee75c;
  return 0x5865f2;
}

/**
 * Log a server-side audit event: stores in the database and forwards to Discord webhook.
 */
export async function logServerAudit(entry: ServerAuditEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      community_id: entry.community_id ?? null,
      user_id: entry.user_id ?? null,
      actor_email: entry.actor_email ?? null,
      actor_callsign: entry.actor_callsign ?? null,
      action: entry.action,
      entity_type: entry.entity_type ?? null,
      entity_id: entry.entity_id ?? null,
      details: (entry.details ?? null) as Json,
      ip_address: entry.ip_address ?? null,
    });
    if (error) {
      console.error("[audit:server] DB insert error:", error.message);
    }
  } catch (err) {
    console.error("[audit:server] DB exception:", err);
  }

  // Forward to Discord webhook (best-effort)
  try {
    await sendToDiscord(entry);
  } catch (err) {
    console.error("[audit:server] Discord webhook error:", err);
  }
}

async function sendToDiscord(entry: ServerAuditEntry): Promise<void> {
  const emoji = emojiFor(entry.action);
  const color = colorFor(entry.action);

  const fields: { name: string; value: string; inline: boolean }[] = [];

  if (entry.actor_callsign) {
    fields.push({ name: "Callsign", value: `\`${entry.actor_callsign}\``, inline: true });
  }
  if (entry.actor_email) {
    fields.push({ name: "User", value: entry.actor_email, inline: true });
  }
  if (entry.ip_address) {
    fields.push({ name: "IP", value: entry.ip_address, inline: true });
  }
  if (entry.entity_type) {
    fields.push({ name: "Entity", value: entry.entity_type, inline: true });
  }

  let detailsText = "";
  if (entry.details && Object.keys(entry.details).length > 0) {
    const lines = Object.entries(entry.details).map(([k, v]) => {
      const val = typeof v === "string" ? v : JSON.stringify(v);
      const truncated = val.length > 200 ? val.slice(0, 200) + "…" : val;
      return `${k}: ${truncated}`;
    });
    detailsText = "```\n" + lines.join("\n") + "\n```";
  }

  const embed: Record<string, unknown> = {
    title: `${emoji} ${entry.action}`,
    color,
    timestamp: new Date().toISOString(),
    fields: fields.length > 0 ? fields : undefined,
  };

  if (detailsText) {
    embed["description"] = detailsText;
  }

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "CodeBlueCAD Audit",
      embeds: [embed],
    }),
  });
}
