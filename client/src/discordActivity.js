import { DiscordSDK } from "@discord/embedded-app-sdk";

let discordSdk = null;

export function isDiscordEmbed() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.has("frame_id") ||
    params.has("instance_id") ||
    params.has("platform") ||
    window.location.hostname.endsWith("discordsays.com")
  );
}

export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;

  // In production/Railway/Discord, use the same origin that served the app.
  // This keeps Socket.IO and API calls on the Railway domain instead of localhost.
  if (import.meta.env.PROD) return "";

  // Discord iframe also proxies to the same origin.
  if (isDiscordEmbed()) return "";

  // Local development fallback.
  return "http://localhost:3001";
}

export async function initDiscordActivity() {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

  if (!isDiscordEmbed()) {
    return { inDiscord: false, user: null, channelId: null, guildId: null, sdk: null };
  }

  if (!clientId) {
    throw new Error("Missing VITE_DISCORD_CLIENT_ID in client/.env");
  }

  discordSdk = new DiscordSDK(clientId);
  await discordSdk.ready();

  const { code } = await discordSdk.commands.authorize({
    client_id: clientId,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify"],
  });

  const response = await fetch(`${getApiBaseUrl()}/api/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord auth exchange failed: ${response.status} ${text}`);
  }

  const { access_token } = await response.json();
  const auth = await discordSdk.commands.authenticate({ access_token });

  return {
    inDiscord: true,
    user: auth.user,
    channelId: discordSdk.channelId ?? null,
    guildId: discordSdk.guildId ?? null,
    sdk: discordSdk,
  };
}
