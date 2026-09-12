import { createFileRoute } from "@tanstack/react-router";
import { logServerAudit } from "@/lib/audit.server";

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

        const clientId = process.env["DISCORD_CLIENT_ID"];
        const clientSecret = process.env["DISCORD_CLIENT_SECRET"];

        if (!clientId || !clientSecret) {
          console.error("[discord/callback] Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET");
          return fail(origin, "Discord sign-in is not configured yet.");
        }

        const redirectUri = `${origin}/api/public/discord/callback`;

        try {
          // 1. Exchange the authorization code for a Discord access token
          const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: "authorization_code",
              code,
              redirect_uri: redirectUri,
            }),
          });

          if (!tokenRes.ok) {
            const errBody = await tokenRes.text();
            console.error("[discord/callback] Token exchange failed:", tokenRes.status, errBody);
            return fail(origin, "Discord rejected the sign-in request.");
          }

          const token = (await tokenRes.json()) as { access_token?: string };
          if (!token.access_token) {
            return fail(origin, "Discord did not return a valid session.");
          }

          // 2. Fetch the Discord user's profile
          const meRes = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${token.access_token}` },
          });
          if (!meRes.ok) {
            console.error("[discord/callback] /users/@me failed:", meRes.status);
            return fail(origin, "Could not read your Discord profile.");
          }

          const me = (await meRes.json()) as {
            id: string;
            username: string;
            global_name?: string | null;
            email?: string | null;
            verified?: boolean;
            avatar?: string | null;
          };

          if (!me.email || !me.verified) {
            void logServerAudit({
              action: "auth.discord.fail",
              actor_email: me.email ?? undefined,
              details: { reason: "unverified email" },
            });
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

          // 3. Try to generate a magic link for the user's Discord email.
          // If the user doesn't exist yet, create them first, then generate the link.
          let link = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email: me.email,
          });

          if (link.error) {
            // User doesn't exist — create them with Discord metadata
            const created = await supabaseAdmin.auth.admin.createUser({
              email: me.email,
              email_confirm: true,
              user_metadata: metadata,
            });
            if (created.error) {
              console.error("[discord/callback] createUser failed:", created.error.message);
              return fail(origin, "Could not create your account.");
            }

            // Now generate the magic link for the newly created user
            link = await supabaseAdmin.auth.admin.generateLink({
              type: "magiclink",
              email: me.email,
            });
          } else if (link.data.user) {
            // User already exists — merge Discord metadata into their existing metadata
            await supabaseAdmin.auth.admin.updateUserById(link.data.user.id, {
              user_metadata: { ...link.data.user.user_metadata, ...metadata },
            });
          }

          if (link.error || !link.data.properties?.hashed_token) {
            console.error("[discord/callback] generateLink failed:", link.error?.message);
            return fail(origin, "Could not start your session.");
          }

          // 4. Upsert the profile with Discord info
          const userId = link.data.user?.id;
          if (userId) {
            await supabaseAdmin
              .from("profiles")
              .upsert(
                {
                  id: userId,
                  display_name: displayName,
                  avatar_url: avatarUrl,
                  discord_id: me.id,
                  discord_username: me.username,
                  discord_avatar_url: avatarUrl,
                  discord_linked_at: new Date().toISOString(),
                },
                { onConflict: "id" },
              );
          }

          // 5. Redirect to the frontend with the hashed token to verify the OTP
          const finish = new URL(`${origin}/auth/discord`);
          finish.searchParams.set("token_hash", link.data.properties.hashed_token);

          void logServerAudit({
            action: "auth.discord.signin",
            user_id: userId ?? null,
            actor_email: me.email,
            details: { discord_username: me.username, display_name: displayName },
          });

          return new Response(null, {
            status: 302,
            headers: { Location: finish.toString(), "Cache-Control": "no-store" },
          });
        } catch (err) {
          console.error("[discord/callback] Unexpected error:", err);
          void logServerAudit({
            action: "auth.discord.fail",
            details: {
              reason: "exception",
              message: err instanceof Error ? err.message : "unknown",
            },
          });
          return fail(origin, "Discord sign-in failed. Please try again.");
        }
      },
    },
  },
});
