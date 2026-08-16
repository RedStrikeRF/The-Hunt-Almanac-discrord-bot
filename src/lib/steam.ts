const STEAM_ID64_RE = /^7656119\d{10}$/;

export class SteamResolveError extends Error {}

function extractRawId(input: string): string {
  const trimmed = input.trim();

  // https://steamcommunity.com/profiles/<id64>[/...]
  const profileMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d+)/i);
  if (profileMatch) return profileMatch[1];

  // https://steamcommunity.com/id/<vanity>[/...]
  const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  if (vanityMatch) return vanityMatch[1];

  return trimmed;
}

/**
 * Accepts a raw SteamID64, a steamcommunity.com profile/vanity URL, or a
 * bare vanity name, and resolves it to a SteamID64 via the Steam Web API
 * when needed.
 */
export async function resolveSteamId64(input: string, steamApiKey: string): Promise<string> {
  const raw = extractRawId(input);

  if (STEAM_ID64_RE.test(raw)) {
    return raw;
  }

  const url = new URL("https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/");
  url.searchParams.set("key", steamApiKey);
  url.searchParams.set("vanityurl", raw);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new SteamResolveError(`Steam Web API вернул статус ${response.status}`);
  }

  const payload = (await response.json()) as {
    response?: { success?: number; steamid?: string; message?: string };
  };

  if (payload.response?.success !== 1 || !payload.response.steamid) {
    throw new SteamResolveError(payload.response?.message ?? "Не удалось найти игрока по этому имени в Steam.");
  }

  return payload.response.steamid;
}
