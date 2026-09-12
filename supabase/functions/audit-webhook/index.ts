const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const WEBHOOK_URL = "https://discord.com/api/webhooks/1543355327070867582/dKJwXqydC220qb3mowNtxCx5YivEFsaX_ZmqV0JgfXTVvrLhbgxHHCTH7qnnEOD6lxGv";

const EMOJI_MAP: Record<string, string> = {
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
  system: "\u{1F527}",
};

function emojiFor(action: string): string {
  const prefix = action.split(".")[0] ?? "system";
  return EMOJI_MAP[prefix] ?? "\u{1F4CB}";
}

function colorFor(action: string): number {
  if (action.includes("delete") || action.includes("remove") || action.includes("fail"))
    return 0xed4245;
  if (
    action.includes("create") ||
    action.includes("join") ||
    action.includes("signin") ||
    action.includes("signup")
  )
    return 0x57f287;
  if (action.includes("update") || action.includes("status") || action.includes("signout"))
    return 0xfee75c;
  if (action.includes("panic")) return 0xed4245;
  return 0x5865f2;
}

function labelFor(action: string): string {
  const [category, verb] = action.split(".");
  if (!verb) return category;
  const verbMap: Record<string, string> = {
    signin: "Sign In",
    signup: "Sign Up",
    signout: "Sign Out",
    fail: "Failed",
    create: "Create",
    join: "Join",
    switch: "Switch",
    update: "Update",
    delete: "Delete",
    assign: "Assign",
    status: "Status Change",
  };
  const categoryMap: Record<string, string> = {
    auth: "Auth",
    community: "Community",
    call: "Call",
    bolo: "BOLO",
    civilian: "Civilian",
    vehicle: "Vehicle",
    weapon: "Weapon",
    warrant: "Warrant",
    citation: "Citation",
    incident: "Incident",
    unit: "Unit",
    settings: "Settings",
    discord: "Discord",
  };
  const cat = categoryMap[category ?? ""] ?? category;
  const v = verbMap[verb ?? ""] ?? verb;
  return `${cat} ${v}`;
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
    const body = (await req.json()) as AuditPayload | AuditPayload[];
    const entries = Array.isArray(body) ? body : [body];

    const webhookPromises = entries.map((entry) => sendToDiscord(entry));
    await Promise.allSettled(webhookPromises);

    return new Response(JSON.stringify({ logged: entries.length }), {
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

async function sendToDiscord(entry: AuditPayload): Promise<void> {
  const emoji = emojiFor(entry.action);
  const color = colorFor(entry.action);
  const label = labelFor(entry.action);

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
    fields.push({
      name: "Entity ID",
      value: `\`${entry.entity_id.slice(0, 8)}\``,
      inline: true,
    });
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

  const embed: Record<string, unknown> = {
    title: `${emoji} ${label}`,
    color,
    timestamp: new Date().toISOString(),
    fields: fields.length > 0 ? fields : undefined,
    footer: { text: "CodeBlueCAD API Audit" },
  };

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "CodeBlueCAD Audit",
        embeds: [embed],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[audit-webhook] Discord returned ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error("[audit-webhook] Discord fetch error:", err);
  }
}
