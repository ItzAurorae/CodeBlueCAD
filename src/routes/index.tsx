import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Database,
  FileText,
  Radio,
  Shield,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CodeBlueCAD — Emergency Services Computer-Aided Dispatch" },
      {
        name: "description",
        content:
          "Built for first responders. Manage calls, records, BOLOs and incidents in one modern, community-based CAD terminal for police, sheriff, EMS and fire.",
      },
      { property: "og:title", content: "CodeBlueCAD — Emergency Services Dispatch" },
      {
        property: "og:description",
        content:
          "A modern, community-based CAD terminal for police, sheriff, EMS and fire departments.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Radio,
    title: "Live Dispatch Board",
    body: "Real-time call management with priority levels, unit assignment, and status tracking. Never miss a beat in the field.",
  },
  {
    icon: TriangleAlert,
    title: "BOLO Alerts",
    body: "Be On The Lookout alerts for vehicles and persons of interest. Instant notifications across your entire department.",
  },
  {
    icon: Database,
    title: "Records Database",
    body: "Comprehensive civilian, vehicle, weapon, and warrant records. Search by name, plate, or DL number in seconds.",
  },
  {
    icon: FileText,
    title: "Citations & Incidents",
    body: "Issue citations and create detailed incident reports with involved parties, officers, and evidence tracking.",
  },
  {
    icon: Users,
    title: "Community System",
    body: "Join or create emergency services communities. One account, multiple departments. Perfect for roleplay and real operations.",
  },
  {
    icon: BadgeCheck,
    title: "Unit Status Management",
    body: "Track officer availability in real-time. Available, busy, en route, on scene, or panic — all at a glance.",
  },
];

const steps = [
  {
    n: "01",
    title: "Create Your Account",
    body: "Sign up in seconds with just an email and display name.",
  },
  {
    n: "02",
    title: "Join a Community",
    body: "Enter a community code to join an existing department, or create your own.",
  },
  {
    n: "03",
    title: "Start Dispatching",
    body: "Access the full CAD terminal — calls, records, BOLOs, and more.",
  },
];

function Landing() {
  const { session } = useAuth();
  const primaryTo = session ? "/cad/dispatch" : "/auth";
  const primaryLabel = session ? "Open CAD Terminal" : "Login / Signup";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
              <Shield className="size-4" />
            </span>
            <span className="font-display text-base font-bold">CodeBlueCAD</span>
          </Link>
          <Link
            to={primaryTo}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {primaryLabel} <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <section className="grid-backdrop border-b border-border/70">
        <div className="mx-auto max-w-4xl px-5 py-24 text-center sm:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" /> v1.0 Now Available
          </span>
          <h1 className="mt-7 font-display text-4xl font-bold leading-[1.05] sm:text-6xl">
            Emergency Services
            <span className="mt-1 block text-gradient-blue">Computer-Aided Dispatch</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Built for first responders. CodeBlueCAD is a modern, community-based CAD terminal for
            police, sheriff, EMS, and fire departments. Manage calls, records, BOLOs, and incidents —
            all in one place.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={primaryTo}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {primaryLabel} <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center rounded-md border border-border bg-card px-6 py-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              Sign In
            </Link>
          </div>

          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-border/70 pt-10">
            {[
              ["4,200+", "Active Officers"],
              ["180+", "Communities"],
              ["99.9%", "Uptime"],
            ].map(([value, label]) => (
              <div key={label}>
                <div className="font-display text-2xl font-bold text-primary sm:text-3xl">
                  {value}
                </div>
                <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24">
        <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
          Everything You Need
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          A complete CAD terminal for modern emergency services
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/25">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-surface/60">
        <div className="mx-auto max-w-5xl px-5 py-24">
          <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">How It Works</h2>
          <p className="mt-3 text-center text-muted-foreground">Get up and running in minutes</p>
          <ol className="mt-12 grid gap-6 sm:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="rounded-xl border border-border bg-card p-6">
                <span className="font-mono text-sm text-primary">{s.n}</span>
                <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Ready to Dispatch?</h2>
        <p className="mt-3 text-muted-foreground">
          Join thousands of officers using CodeBlueCAD for their daily operations.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to={primaryTo}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {primaryLabel} <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center rounded-md border border-border bg-card px-6 py-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            Sign In
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>CodeBlueCAD v1.0.0 — Emergency Services CAD Platform</span>
          <div className="flex items-center gap-4">
            <Link to="/api-docs" className="hover:text-foreground">
              API Docs
            </Link>
            <span>Not affiliated with any government agency.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
