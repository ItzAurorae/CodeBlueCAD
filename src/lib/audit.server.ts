const WEBHOOK_URL = "https://discord.com/api/webhooks/1543355327070867582/dKJwXqydC220qb3mowNtxCx5YivEFsaX_ZmqV0JgfXTVvrLhbgxHHCTH7qnnEOD6lxGv";

type ServerAuditEntry = {
  user_id?: string | null | undefined;
  actor_email?: string | null | undefined;
  actor_callsign?: string | null | undefined;
  action: string;
  entity_type?: string | null | undefined;
  entity_id?: string | null | undefined;
  details?: Record<string, unknown> | null | undefined;
};

const EMOJI_MAP: Record<string, string> = {
  auth: "\u{1F510}",
  discord: "\u{1F3AE}",
  system: "\u{1F527}",
};

function emojiFor(action: string): string {
  const prefix = action.split(".")[0] ?? "system";
  return EMOJI_MAP[prefix] ?? "\u{1F4CB}";
}

function colorFor(action: string): number {
  if (action.includes("fail") || action.includes("delete")) return 0xed4245;
  if (action.includes("create") || action.includes("signin") || action.includes("signup") || action.includes("join"))
    return 0x57f287;
  if (action.includes("update") || action.includes("signout")) return 0xfee75c;
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

export async function logServerAudit(entry: ServerAuditEntry): Promise<void> {
  try {
    await sendToDiscord(entry);
  } catch (err) {
    console.error("[audit:server] Discord webhook error:", err);
  }
}

async function sendToDiscord(entry: ServerAuditEntry): Promise<void> {
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
    console.error(`[audit:server] Discord returned ${res.status}: ${text}`);
  }
}
