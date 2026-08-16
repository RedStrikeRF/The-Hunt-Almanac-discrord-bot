import { InteractionResponseType } from "discord-interactions";
import type { Env } from "../env";
import { resolveSteamId64, SteamResolveError } from "../lib/steam";
import { fetchHuntStats, BayouLedgerNotFoundError, BayouLedgerUnavailableError, type HuntStats } from "../lib/bayouledger";
import { getCached, setCached } from "../lib/cache";

interface CommandOption {
  name: string;
  value: string | boolean;
}

const CACHE_TTL_SECONDS = 12 * 60; // 12 minutes, within the requested 10-15 min window
const EMBED_COLOR = 0x6a4423;

function messageResponse(content: string) {
  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content },
  });
}

function statsEmbed(stats: HuntStats, fromCache: boolean) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          title: stats.name,
          url: stats.profileUrl,
          color: EMBED_COLOR,
          thumbnail: { url: stats.avatarUrl },
          fields: [
            { name: "MMR", value: stats.mmr ?? "—", inline: true },
            { name: "Level", value: stats.level ?? "—", inline: true },
            { name: "Playstyle", value: stats.playstyle ?? "—", inline: true },
            { name: "KD", value: stats.kd ?? "—", inline: true },
            { name: "KDA", value: stats.kda ?? "—", inline: true },
            { name: "Bounty", value: stats.bounty ?? "—", inline: true },
            { name: "Kills", value: stats.kills ?? "—", inline: true },
            { name: "Deaths", value: stats.deaths ?? "—", inline: true },
            { name: "Assists", value: stats.assists ?? "—", inline: true },
          ],
          footer: {
            text: fromCache
              ? "Данные из кэша (обновляются раз в ~12 минут) · bayouledger.com, неофициальный парсинг"
              : "bayouledger.com · неофициальный парсинг публичной страницы",
          },
        },
      ],
    },
  };
}

export async function handleHuntstats(options: CommandOption[], env: Env): Promise<Response> {
  const steamInput = options.find((o) => o.name === "steam")?.value;
  if (typeof steamInput !== "string" || !steamInput.trim()) {
    return messageResponse("Укажите SteamID64, ссылку на профиль Steam или vanity-имя в параметре `steam`.");
  }

  let steamId64: string;
  try {
    steamId64 = await resolveSteamId64(steamInput, env.STEAM_API_KEY);
  } catch (err) {
    if (err instanceof SteamResolveError) {
      return messageResponse(`Не удалось определить SteamID: ${err.message}`);
    }
    return messageResponse("Steam Web API временно недоступен. Попробуйте позже.");
  }

  const cacheKey = `huntstats:${steamId64}`;
  const cached = await getCached<HuntStats>(env, cacheKey);
  if (cached) {
    return Response.json(statsEmbed(cached, true));
  }

  try {
    const stats = await fetchHuntStats(steamId64);
    await setCached(env, cacheKey, stats, CACHE_TTL_SECONDS);
    return Response.json(statsEmbed(stats, false));
  } catch (err) {
    if (err instanceof BayouLedgerNotFoundError) {
      return messageResponse(
        "Этот игрок не найден на Bayou Ledger. Убедитесь, что профиль Steam публичный и статистика Hunt: Showdown видна на bayouledger.com."
      );
    }
    if (err instanceof BayouLedgerUnavailableError) {
      return messageResponse("Bayou Ledger сейчас недоступен или не отвечает. Попробуйте позже.");
    }
    return messageResponse("Не удалось получить статистику из-за неожиданной ошибки. Попробуйте позже.");
  }
}
