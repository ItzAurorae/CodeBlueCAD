import { createClient } from "npm:@supabase/supabase-js@2.115.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const WEBHOOK_URL =
  "https://discord.com/api/webhooks/1543355327070867582/dKJwXqydC220qb3mowNtxCx5YivEFsaX_ZmqV0JgfXTVvrLhbgxHHCTH7qnnEOD6lxGv";

const EMOJI_MAP: Record<string, string> = {
  auth: "🔐",
  community: "🏛️",
  call: "📡",
  bolo: "⚠️",
  civilian: "👤",
  vehicle: "🚗",
  weapon: "🔫",
  warrant: "📋",
  citation: "📝",
  incident: "📄",
  unit: "👮",
  settings: "⚙️",
  discord: "🎮",
  system: "🔧",
};

function emojiFor(action: string): string {
  const prefix = action.split(".")[0] ?? "system";
  return EMOJI_MAP[prefix] ?? "📋";
}

function colorFor(action: string): number {
  if (action.includes("delete") || action.includes("remove")) return 0xed4245;
  if (action.includes("create") || action.includes("join") || action.includes("signin") || action.includes("signup"))
    return 0x57f287;
  if (action.includes("update") || action.includes("status") || action.includes("signout")) return 0xfee75c;
  if (action.includes("panic")) return 0xed4245;
  return 0x5865f2;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

interface AuditPayload {
  community_id?: string | null;
  user_id?: string | null;
  actor_email?: string | null;
  actor_callsign?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = (await req.json()) as AuditPayload | AuditPayload[];

    // Normalize to array for batch processing
    const entries = Array.isArray(body) ? body : [body];

    // Insert all entries into audit_logs
    const rows = entries.map((e) => ({
      community_id: e.community_id ?? null,
      user_id: e.user_id ?? null,
      actor_email: e.actor_email ?? null,
      actor_callsign: e.actor_callsign ?? null,
      action: e.action,
      entity_type: e.entity_type ?? null,
      entity_id: e.entity_id ?? null,
      details: e.details ?? null,
      ip_address: e.ip_address ?? null,
    }));

    const { data: inserted, error: dbError } = await supabase
      .from("audit_logs")
      .insert(rows)
      .select("id, created_at, community_id, actor_email, actor_callsign, action, entity_type, entity_id, details");

    if (dbError) {
      console.error("[audit-webhook] DB insert error:", dbError.message);
      return new Response(JSON.stringify({ error: "Failed to store audit log" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Forward each entry to Discord webhook (best-effort, non-blocking)
    const webhookPromises = (inserted ?? []).map(async (log) => {
      const matchingPayload = entries.find(
        (e) => e.action === log.action && (e.entity_id ?? null) === (log.entity_id ?? null),
      );
      try {
        await sendToDiscord(log, matchingPayload?.community_id ?? null);
      } catch (err) {
        console.error("[audit-webhook] Discord webhook error:", err);
      }
    });

    await Promise.allSettled(webhookPromises);

    return new Response(JSON.stringify({ logged: (inserted ?? []).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[audit-webhook] Fatal:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function sendToDiscord(
  log: {
    id: string;
    created_at: string;
    community_id: string | null;
    actor_email: string | null;
    actor_callsign: string | null;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    details: Record<string, unknown> | null;
  },
  communityId: string | null,
) {
  const emoji = emojiFor(log.action);
  const color = colorFor(log.action);

  const fields: { name: string; value: string; inline: boolean }[] = [];

  if (log.actor_callsign) {
    fields.push({ name: "Callsign", value: `\`${log.actor_callsign}\``, inline: true });
  }
  if (log.actor_email) {
    fields.push({ name: "User", value: log.actor_email, inline: true });
  }
  if (log.entity_type) {
    fields.push({ name: "Entity", value: log.entity_type, inline: true });
  }
  if (log.entity_id) {
    fields.push({
      name: "Entity ID",
      value: `\`${log.entity_id.slice(0, 8)}\``,
      inline: true,
    });
  }

  // Format details as a readable code block
  let detailsText = "";
  if (log.details && Object.keys(log.details).length > 0) {
    const lines = Object.entries(log.details).map(([k, v]) => {
      const val = typeof v === "string" ? v : JSON.stringify(v);
      const truncated = val.length > 200 ? val.slice(0, 200) + "…" : val;
      return `${k}: ${truncated}`;
    });
    detailsText = "```\n" + lines.join("\n") + "\n```";
  }

  const embed: Record<string, unknown> = {
    title: `${emoji} ${log.action}`,
    color,
    timestamp: log.created_at,
    fields: fields.length > 0 ? fields : undefined,
    footer: { text: `Audit ID: ${log.id.slice(0, 8)}` },
  };

  if (detailsText) {
    embed["description"] = detailsText;
  }

  const payload = {
    username: "CodeBlueCAD Audit",
    embeds: [embed],
  };

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[audit-webhook] Discord returned ${res.status}: ${text}`);
  }
}
