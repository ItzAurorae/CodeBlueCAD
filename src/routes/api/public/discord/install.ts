import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/discord/install")({
  server: {
    handlers: {
      GET: async () => {
        const clientId = process.env["DISCORD_CLIENT_ID"];
        if (!clientId) {
          return new Response("Discord bot is not configured.", { status: 503 });
        }
        const authorize = new URL("https://discord.com/oauth2/authorize");
        authorize.searchParams.set("client_id", clientId);
        authorize.searchParams.set("scope", "bot applications.commands");
        authorize.searchParams.set("permissions", "1");
        return new Response(null, {
          status: 302,
          headers: { Location: authorize.toString(), "Cache-Control": "no-store" },
        });
      },
    },
  },
});
