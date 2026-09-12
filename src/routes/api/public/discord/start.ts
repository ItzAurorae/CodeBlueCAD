import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/discord/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env["DISCORD_CLIENT_ID"];
        if (!clientId) {
          const url = new URL(request.url);
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${url.origin}/auth?discord_error=${encodeURIComponent("Discord sign-in is not configured yet.")}`,
              "Cache-Control": "no-store",
            },
          });
        }

        const url = new URL(request.url);
        const redirectUri = `${url.origin}/api/public/discord/callback`;
        const authorize = new URL("https://discord.com/oauth2/authorize");
        authorize.searchParams.set("client_id", clientId);
        authorize.searchParams.set("response_type", "code");
        authorize.searchParams.set("redirect_uri", redirectUri);
        authorize.searchParams.set("scope", "identify email");
        authorize.searchParams.set("prompt", "consent");
        return new Response(null, {
          status: 302,
          headers: { Location: authorize.toString(), "Cache-Control": "no-store" },
        });
      },
    },
  },
});
