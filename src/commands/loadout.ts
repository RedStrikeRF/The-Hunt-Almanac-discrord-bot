import { InteractionResponseType } from "discord-interactions";

interface CommandOption {
  name: string;
  value: string | boolean;
}

// TODO(stage 4/5): реальная логика подбора оружия и снаряжения.
export function handleLoadout(_options: CommandOption[]) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: "Генератор лоадаутов в разработке." },
  };
}
