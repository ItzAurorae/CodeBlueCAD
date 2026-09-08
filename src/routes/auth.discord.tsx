import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/discord")({
  ssr: false,
  validateSearch: z.object({ token_hash: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Finishing Discord sign-in — CodeBlueCAD" },
      {
        name: "description",
        content: "Completing your Discord sign-in and opening your CodeBlueCAD terminal.",
      },
      { property: "og:title", content: "Finishing Discord sign-in — CodeBlueCAD" },
      {
        property: "og:description",
        content: "Completing your Discord sign-in and opening your CodeBlueCAD terminal.",
      },
    ],
  }),
  component: DiscordFinishPage,
});

function DiscordFinishPage() {
  const { token_hash: tokenHash } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!tokenHash) {
        setError("This sign-in link is incomplete. Please try again.");
        return;
      }
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: tokenHash,
      });
      if (cancelled) return;
      if (verifyError) {
        setError("That sign-in link has expired. Please sign in with Discord again.");
        return;
      }
      navigate({ to: "/cad/dispatch", replace: true });
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [tokenHash, navigate]);

  return (
    <div className="grid-backdrop flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center">
        {error ? (
          <>
            <ShieldAlert className="mx-auto size-6 text-destructive" />
            <h1 className="mt-3 font-display text-base font-semibold">Sign-in failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button className="mt-4 w-full" onClick={() => navigate({ to: "/auth" })}>
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto size-6 animate-spin text-primary" />
            <h1 className="mt-3 font-display text-base font-semibold">Signing you in…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Verifying your Discord account and opening your terminal.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
