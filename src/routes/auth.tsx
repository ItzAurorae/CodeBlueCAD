import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, Shield, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAuditViaEdgeFunction } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CodeBlueCAD" },
      {
        name: "description",
        content:
          "Sign in or create your CodeBlueCAD account to access the emergency services dispatch terminal.",
      },
      { property: "og:title", content: "Sign in — CodeBlueCAD" },
      {
        property: "og:description",
        content: "Access your department's CAD terminal: calls, records, BOLOs and incidents.",
      },
    ],
  }),
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/cad/dispatch", replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    const message = new URLSearchParams(window.location.search).get("discord_error");
    if (message) {
      toast.error(message);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || "Officer" },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
        toast.success("Account created");
        void logAuditViaEdgeFunction([
          { action: "auth.signup", details: { email, display_name: displayName || "Officer" } },
        ]);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        void logAuditViaEdgeFunction([{ action: "auth.signin", details: { email } }]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function handleDiscord() {
    setBusy(true);
    window.location.href = "/api/public/discord/start";
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_460px]">
      <div className="grid-backdrop relative hidden flex-col justify-between border-r border-border/70 p-10 lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
            <Shield className="size-4.5" />
          </span>
          <span className="font-display text-base font-bold">CodeBlueCAD</span>
        </Link>
        <div>
          <p className="max-w-xl font-display text-2xl font-medium leading-snug">
            “Built for first responders. Designed for the field. Trusted by departments
            nationwide.”
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["A", "B", "C", "D"].map((l) => (
                <span
                  key={l}
                  className="flex size-7 items-center justify-center rounded-full border border-border bg-secondary text-[11px] text-muted-foreground"
                >
                  {l}
                </span>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              4,200+ officers across 180 communities
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          CodeBlueCAD v1.0.0 — Emergency Services CAD Platform
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
              <Shield className="size-4.5" />
            </span>
            <span className="font-display text-base font-bold">CodeBlueCAD</span>
          </Link>

          <h1 className="text-center font-display text-2xl font-bold">Welcome to CodeBlueCAD</h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground">
            Emergency Services CAD Platform
          </p>

          {checkEmail ? (
            <div className="mt-8 rounded-lg border border-border bg-card p-5 text-center">
              <Mail className="mx-auto size-6 text-primary" />
              <h2 className="mt-3 font-display text-base font-semibold">Check your email</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a confirmation link to {email}. Click it to activate your account, then sign
                in.
              </p>
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => {
                  setCheckEmail(false);
                  setMode("signin");
                }}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-2 gap-1 rounded-lg border border-border bg-secondary/50 p-1">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`rounded-md py-2 text-sm font-medium transition-colors ${
                    mode === "signin"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`rounded-md py-2 text-sm font-medium transition-colors ${
                    mode === "signup"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="displayName">Display name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Off. J. Rivera"
                      required
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@department.gov"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : mode === "signin" ? (
                    <Mail className="size-4" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                  {mode === "signin" ? "Sign In with Email" : "Create Account"}
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or{" "}
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleDiscord}
                disabled={busy}
              >
                <DiscordIcon className="size-4" />
                Continue with Discord
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.438 3a13.9 13.9 0 0 0-.617 1.27 18.4 18.4 0 0 0-5.65 0A13.9 13.9 0 0 0 8.552 3 19.74 19.74 0 0 0 3.67 4.371C.556 8.98-.286 13.474.135 17.906a19.9 19.9 0 0 0 5.993 3.04c.472-.65.892-1.34 1.253-2.065a12.9 12.9 0 0 1-1.972-.95c.166-.122.328-.25.484-.38a14.2 14.2 0 0 0 12.214 0c.158.135.32.262.484.38a12.9 12.9 0 0 1-1.975.95c.36.724.78 1.414 1.252 2.064a19.85 19.85 0 0 0 5.997-3.039c.5-5.123-.844-9.578-3.548-13.537ZM8.02 15.207c-1.183 0-2.157-1.086-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.21 0 2.176 1.096 2.157 2.42 0 1.334-.955 2.42-2.157 2.42Zm7.96 0c-1.183 0-2.157-1.086-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.21 0 2.176 1.096 2.157 2.42 0 1.334-.947 2.42-2.157 2.42Z" />
    </svg>
  );
}
