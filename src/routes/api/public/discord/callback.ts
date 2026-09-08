import { createFileRoute } from "@tanstack/react-router";

const DISCORD_CLIENT_ID = "1543146607686459547";

function fail(origin: string, message: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${origin}/auth?discord_error=${encodeURIComponent(message)}`,
      "Cache-Control": "no-store",
    },
  });
}

export const Route = createFileRoute("/api/public/discord/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const code = url.searchParams.get("code");
        if (!code) return fail(origin, "Discord sign-in was cancelled.");

        const clientSecret = process.env["DISCORD_CLIENT_SECRET"];
        if (!clientSecret) return fail(origin, "Discord sign-in is not configured yet.");

        try {
          const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: DISCORD_CLIENT_ID,
              client_secret: clientSecret,
              grant_type: "authorization_code",
              code,
              redirect_uri: `${origin}/api/public/discord/callback`,
            }),
          });
          if (!tokenRes.ok) return fail(origin, "Discord rejected the sign-in request.");
          const token = (await tokenRes.json()) as { access_token?: string };
          if (!token.access_token) return fail(origin, "Discord did not return a valid session.");

          const meRes = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${token.access_token}` },
          });
          if (!meRes.ok) return fail(origin, "Could not read your Discord profile.");
          const me = (await meRes.json()) as {
            id: string;
            username: string;
            global_name?: string | null;
            email?: string | null;
            verified?: boolean;
            avatar?: string | null;
          };

          if (!me.email || !me.verified) {
            return fail(origin, "Your Discord account needs a verified email address.");
          }

          const displayName = me.global_name || me.username;
          const avatarUrl = me.avatar
            ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=128`
            : null;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const metadata = {
            display_name: displayName,
            avatar_url: avatarUrl,
            discord_id: me.id,
            discord_username: me.username,
          };

          let link = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email: me.email,
          });

          if (link.error) {
            const created = await supabaseAdmin.auth.admin.createUser({
              email: me.email,
              email_confirm: true,
              user_metadata: metadata,
            });
            if (created.error) return fail(origin, "Could not create your account.");
            link = await supabaseAdmin.auth.admin.generateLink({
              type: "magiclink",
              email: me.email,
            });
          } else if (link.data.user) {
            await supabaseAdmin.auth.admin.updateUserById(link.data.user.id, {
              user_metadata: { ...link.data.user.user_metadata, ...metadata },
            });
          }

          if (link.error || !link.data.properties?.hashed_token) {
            return fail(origin, "Could not start your session.");
          }

          const userId = link.data.user?.id;
          if (userId) {
            await supabaseAdmin
              .from("profiles")
              .upsert(
                { id: userId, display_name: displayName, avatar_url: avatarUrl },
                { onConflict: "id" },
              );
          }

          const finish = new URL(`${origin}/auth/discord`);
          finish.searchParams.set("token_hash", link.data.properties.hashed_token);
          return new Response(null, {
            status: 302,
            headers: { Location: finish.toString(), "Cache-Control": "no-store" },
          });
        } catch {
          return fail(origin, "Discord sign-in failed. Please try again.");
        }
      },
    },
  },
});
