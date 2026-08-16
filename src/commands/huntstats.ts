import { InteractionResponseType } from "discord-interactions";
import type { Env } from "../env";

interface CommandOption {
  name: string;
  value: string | boolean;
}

// TODO(stage 6/7): резолв SteamID, скрапинг Bayou Ledger, embed.
export async function handleHuntstats(_options: CommandOption[], _env: Env) {
  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: "Статистика Bayou Ledger в разработке." },
  });
}
