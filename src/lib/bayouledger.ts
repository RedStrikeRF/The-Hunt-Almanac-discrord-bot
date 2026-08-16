import * as cheerio from "cheerio";

export class BayouLedgerNotFoundError extends Error {}
export class BayouLedgerUnavailableError extends Error {}

export interface HuntStats {
  steamId64: string;
  name: string;
  avatarUrl: string;
  level: string | null;
  mmr: string | null;
  kd: string | null;
  kda: string | null;
  kills: string | null;
  deaths: string | null;
  assists: string | null;
  bounty: string | null;
  playstyle: string | null;
  profileUrl: string;
}

const USER_AGENT = "Mozilla/5.0 (compatible; HuntShowdownDiscordBot/1.0; +https://github.com/RedStrikeRF/hunt-showdown-bot)";

function tileValue($: cheerio.CheerioAPI, label: string): string | null {
  let value: string | null = null;
  $(".tile-key").each((_, el) => {
    if ($(el).text().trim() === label) {
      value = $(el).next(".tile-val").text().trim() || null;
    }
  });
  return value;
}

function extractPlaystyle($: cheerio.CheerioAPI): string | null {
  const ariaLabel = $("svg.archetype-svg").attr("aria-label");
  if (!ariaLabel) return null;
  const marker = "reads as";
  const idx = ariaLabel.indexOf(marker);
  if (idx === -1) return null;
  return ariaLabel
    .slice(idx + marker.length)
    .replace(/^[^\p{L}]+/u, "")
    .trim();
}

/**
 * Scrapes a player's public https://bayouledger.com/p/<SteamID64> page.
 * Bayou Ledger has no documented public API for third-party bots (only
 * their own Discord bot / Discord Linked Roles integration) — this walks
 * the rendered HTML instead, so it will need updating whenever their
 * markup changes. See README for details.
 */
export async function fetchHuntStats(steamId64: string): Promise<HuntStats> {
  const profileUrl = `https://bayouledger.com/p/${steamId64}`;

  let response: Response;
  try {
    response = await fetch(profileUrl, { headers: { "User-Agent": USER_AGENT } });
  } catch (err) {
    throw new BayouLedgerUnavailableError("Bayou Ledger недоступен (сетевая ошибка).");
  }

  if (!response.ok) {
    throw new BayouLedgerUnavailableError(`Bayou Ledger вернул статус ${response.status}.`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Bayou Ledger returns HTTP 200 with an empty stats section for players
  // it has never tracked, instead of a 404 — detect that case explicitly.
  if ($(".tile-key").length === 0) {
    throw new BayouLedgerNotFoundError("Игрок не найден на Bayou Ledger.");
  }

  const name = $(".dossier-name-text").first().text().trim() || steamId64;

  let level: string | null = null;
  $(".sub-item").each((_, el) => {
    const key = $(el).find(".sub-key").first().text().trim();
    if (key === "Level") {
      level = $(el).find(".sub-val").first().text().trim() || null;
    }
  });

  let mmr: string | null = null;
  $("dt.stat-label").each((_, el) => {
    if ($(el).text().trim() === "MMR") {
      mmr = $(el).next("dd.stat-row").find(".stat-val").first().text().trim() || null;
    }
  });

  return {
    steamId64,
    name,
    avatarUrl: `https://cdn.bayouledger.com/api/players/${steamId64}/avatar.webp`,
    level,
    mmr,
    kd: tileValue($, "KD"),
    kda: tileValue($, "KDA"),
    kills: tileValue($, "Kills"),
    deaths: tileValue($, "Deaths"),
    assists: tileValue($, "Assists"),
    bounty: tileValue($, "Bounty"),
    playstyle: extractPlaystyle($),
    profileUrl,
  };
}
