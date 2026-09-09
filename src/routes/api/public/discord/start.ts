import { createFileRoute } from "@tanstack/react-router";

export const DISCORD_CLIENT_ID = "1543146607686459547";

export const Route = createFileRoute("/api/public/discord/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const redirectUri = `${url.origin}/api/public/discord/callback`;
        const authorize = new URL("https://discord.com/oauth2/authorize");
        authorize.searchParams.set("client_id", DISCORD_CLIENT_ID);
        authorize.searchParams.set("response_type", "code");
        authorize.searchParams.set("redirect_uri", redirectUri);
        authorize.searchParams.set("scope", "identify email guilds.join");
        authorize.searchParams.set("prompt", "consent");
        return new Response(null, {
          status: 302,
          headers: { Location: authorize.toString(), "Cache-Control": "no-store" },
        });
      },
    },
  },
});
