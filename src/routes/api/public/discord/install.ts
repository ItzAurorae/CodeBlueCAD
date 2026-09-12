import { createFileRoute } from "@tanstack/react-router";

const DISCORD_CLIENT_ID = "1543146607686459547";
// CREATE_INSTANT_INVITE (1) is required for the bot to add members via guilds.join
const BOT_PERMISSIONS = "1";

export const Route = createFileRoute("/api/public/discord/install")({
  server: {
    handlers: {
      GET: async () => {
        const authorize = new URL("https://discord.com/oauth2/authorize");
        authorize.searchParams.set("client_id", DISCORD_CLIENT_ID);
        authorize.searchParams.set("scope", "bot applications.commands");
        authorize.searchParams.set("permissions", BOT_PERMISSIONS);
        return new Response(null, {
          status: 302,
          headers: { Location: authorize.toString(), "Cache-Control": "no-store" },
        });
      },
    },
  },
});
