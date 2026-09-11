import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield,
  ArrowLeft,
  Radio,
  TriangleAlert,
  Database,
  FileText,
  Users,
  Webhook,
  Gamepad2,
  ScrollText,
} from "lucide-react";

export const Route = createFileRoute("/api-docs")({
  head: () => ({
    meta: [
      { title: "API Reference — CodeBlueCAD" },
      {
        name: "description",
        content:
          "Full API reference for CodeBlueCAD — endpoints, audit logging, Discord OAuth, and data schemas.",
      },
    ],
  }),
  ssr: false,
  component: ApiDocsPage,
});

const endpoints = [
  {
    method: "GET",
    path: "/api/public/discord/start",
    description:
      "Redirects the user to Discord's OAuth consent screen to begin Discord sign-in.",
    auth: "None",
    returns: "302 redirect to Discord OAuth",
  },
  {
    method: "GET",
    path: "/api/public/discord/callback",
    description:
      "Discord OAuth callback endpoint. Exchanges the authorization code for a Discord session, creates or links the Supabase account, and redirects to /auth/discord to finish sign-in.",
    auth: "None (called by Discord)",
    returns: "302 redirect to /auth/discord?token_hash=... or /auth?discord_error=...",
  },
  {
    method: "POST",
    path: "/functions/v1/audit-webhook",
    description:
      "Accepts one or more audit entries, stores them in the audit_logs table, and forwards each entry to the Discord audit webhook as a rich embed.",
    auth: "Supabase anon key (Apikey header)",
    body: `{ "action": "call.create", "entity_type": "call", "details": { "title": "..." } }`,
    returns: `{ "logged": 1 }`,
  },
];

const auditActions = [
  { action: "auth.signin", description: "User signed in with email/password" },
  { action: "auth.signup", description: "New account created via email" },
  { action: "auth.signout", description: "User signed out" },
  { action: "auth.discord.signin", description: "User signed in via Discord OAuth" },
  { action: "auth.discord.fail", description: "Discord sign-in failed" },
  { action: "community.create", description: "A new community was created" },
  { action: "community.join", description: "User joined a community via join code" },
  { action: "community.switch", description: "User switched active community" },
  { action: "call.create", description: "A dispatch call was created" },
  { action: "call.update", description: "A call's status or details were changed" },
  { action: "call.delete", description: "A call was cleared from the board" },
  { action: "call.assign", description: "A unit was assigned to or detached from a call" },
  { action: "bolo.create", description: "A BOLO alert was posted" },
  { action: "bolo.delete", description: "A BOLO was removed" },
  { action: "civilian.create", description: "A civilian record was created" },
  { action: "civilian.delete", description: "A civilian record was deleted" },
  { action: "vehicle.create", description: "A vehicle registration was added" },
  { action: "vehicle.delete", description: "A vehicle record was deleted" },
  { action: "weapon.create", description: "A firearm registration was added" },
  { action: "weapon.delete", description: "A firearm record was deleted" },
  { action: "warrant.create", description: "A warrant was issued" },
  { action: "warrant.delete", description: "A warrant was removed" },
  { action: "citation.create", description: "A citation was issued" },
  { action: "citation.delete", description: "A citation was deleted" },
  { action: "incident.create", description: "An incident report was filed" },
  { action: "incident.delete", description: "An incident report was deleted" },
  { action: "unit.status", description: "A unit changed their duty status" },
  { action: "settings.update", description: "User updated their profile or unit settings" },
];

const tables = [
  { name: "profiles", description: "User display name, avatar, and creation date" },
  { name: "communities", description: "Department communities with join codes" },
  {
    name: "community_members",
    description: "User membership in communities (callsign, rank, department, status)",
  },
  { name: "calls", description: "Dispatch calls with priority, status, and assigned units" },
  { name: "bolos", description: "Be On The Lookout alerts for persons/vehicles" },
  {
    name: "civilians",
    description: "Civilian records (name, DOB, license status, address)",
  },
  { name: "vehicles", description: "Vehicle registrations (plate, model, stolen flag)" },
  { name: "weapons", description: "Firearm registrations (serial, type, status)" },
  { name: "warrants", description: "Warrants with subject, reason, and status" },
  { name: "citations", description: "Issued citations with violation and fine amount" },
  { name: "incidents", description: "Narrative incident reports" },
  { name: "audit_logs", description: "Immutable append-only audit trail for all actions" },
];

function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
              <Shield className="size-4" />
            </span>
            <span className="font-display text-base font-bold">CodeBlueCAD</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        <h1 className="font-display text-3xl font-bold">API Reference</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete documentation of CodeBlueCAD's API system, Discord OAuth flow, audit logging
          infrastructure, and database schema.
        </p>

        <section className="mt-10 space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="size-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Endpoints</h2>
          </div>
          <div className="space-y-3">
            {endpoints.map((ep) => (
              <div
                key={`${ep.method}-${ep.path}`}
                className="rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded px-2 py-0.5 font-mono text-xs font-bold bg-primary/15 text-primary ring-1 ring-primary/25">
                    {ep.method}
                  </span>
                  <code className="font-mono text-sm text-foreground">{ep.path}</code>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{ep.description}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  <span className="text-muted-foreground">
                    Auth: <span className="font-medium text-foreground">{ep.auth}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Returns: <span className="font-mono text-foreground">{ep.returns}</span>
                  </span>
                </div>
                {"body" in ep && ep.body && (
                  <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">
                    {ep.body}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="size-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Discord OAuth Flow</h2>
          </div>
          <ol className="space-y-3">
            {[
              "User clicks 'Continue with Discord' on the sign-in page, which navigates to /api/public/discord/start.",
              "The start endpoint redirects to Discord's OAuth consent screen with scopes: identify, email, guilds.join.",
              "After consent, Discord redirects back to /api/public/discord/callback with an authorization code.",
              "The callback exchanges the code for a Discord access token, fetches the user's Discord profile, and verifies their email.",
              "If valid, the server creates or updates a Supabase account, optionally joins the Discord guild via bot token, and generates a magic link session.",
              "The user is redirected to /auth/discord with a token hash, which verifies the OTP and opens the CAD terminal.",
              "Every step is logged to the audit system and forwarded to the Discord webhook.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 rounded-lg border border-border bg-card p-4">
                <span className="font-mono text-sm text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10 space-y-4">
          <div className="flex items-center gap-2">
            <ScrollText className="size-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Audit Log Actions</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Every action in CodeBlueCAD is logged to the{" "}
            <code className="font-mono text-foreground">audit_logs</code> table and forwarded to a
            Discord webhook in real time. Logs are immutable and append-only.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium text-muted-foreground">Action</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                {auditActions.map((a) => (
                  <tr key={a.action} className="border-b border-border/50 last:border-0">
                    <td className="p-3 font-mono text-xs text-primary">{a.action}</td>
                    <td className="p-3 text-muted-foreground">{a.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="size-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Database Schema</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {tables.map((t) => (
              <div key={t.name} className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-mono text-sm font-semibold text-foreground">{t.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <div className="flex items-center gap-2">
            <Webhook className="size-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Webhook Integration</h2>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Audit events are forwarded to a Discord channel webhook as rich embeds. Each embed
              includes the action type, acting user, callsign, entity details, and a timestamp.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                {
                  label: "Green",
                  desc: "create / signin / join",
                  color: "bg-success/15 text-success ring-success/30",
                },
                {
                  label: "Yellow",
                  desc: "update / signout",
                  color: "bg-warning/15 text-warning ring-warning/30",
                },
                {
                  label: "Red",
                  desc: "delete / fail",
                  color: "bg-destructive/15 text-destructive ring-destructive/30",
                },
                {
                  label: "Blue",
                  desc: "other",
                  color: "bg-primary/15 text-primary ring-primary/30",
                },
              ].map((c) => (
                <span
                  key={c.label}
                  className={`rounded px-2.5 py-1 text-xs font-medium ring-1 ${c.color}`}
                >
                  {c.label}: {c.desc}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
