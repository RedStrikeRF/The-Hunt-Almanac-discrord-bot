import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import type { Env } from "./env";
import { handleLoadout } from "./commands/loadout";
import { handleHuntstats } from "./commands/huntstats";

interface DiscordInteraction {
  type: number;
  data?: {
    name: string;
    options?: Array<{ name: string; value: string | boolean }>;
  };
}

async function verifyDiscordRequest(request: Request, env: Env): Promise<{ isValid: boolean; body: string }> {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const body = await request.text();

  if (!signature || !timestamp) {
    return { isValid: false, body };
  }

  const isValid = await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
  return { isValid, body };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Hunt: Showdown bot is running.", { status: 200 });
    }

    const { isValid, body } = await verifyDiscordRequest(request, env);
    if (!isValid) {
      return new Response("Invalid request signature", { status: 401 });
    }

    const interaction = JSON.parse(body) as DiscordInteraction;

    if (interaction.type === InteractionType.PING) {
      return Response.json({ type: InteractionResponseType.PONG });
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = interaction.data?.name;
      const options = interaction.data?.options ?? [];

      switch (commandName) {
        case "loadout":
          return Response.json(handleLoadout(options));
        case "huntstats":
          return await handleHuntstats(options, env);
        default:
          return Response.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `Неизвестная команда: ${commandName}` },
          });
      }
    }

    return new Response("Unhandled interaction type", { status: 400 });
  },
};
