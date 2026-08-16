import { InteractionResponseType } from "discord-interactions";
import { pickWeapons, weaponCapacity } from "../lib/weapons";

interface CommandOption {
  name: string;
  value: string | boolean;
}

function getOption<T extends string | boolean>(options: CommandOption[], name: string): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

function parseExcluded(options: CommandOption[]): Set<string> {
  const raw = getOption<string>(options, "exclude");
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

// TODO(stage 5): подбор снаряжения (8 слотов, лимиты по категориям расходников).
export function handleLoadout(options: CommandOption[]) {
  const quartermaster = getOption<boolean>(options, "quartermaster") ?? false;
  const meleeOnly = getOption<boolean>(options, "melee_only") ?? false;
  const excluded = parseExcluded(options);

  const weapons = pickWeapons({ quartermaster, meleeOnly, excluded });

  if (weapons.length === 0) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content:
          "Не удалось подобрать оружие с текущими ограничениями (Weapon Capacity / exclude). Попробуйте ослабить фильтры.",
      },
    };
  }

  const capacity = weaponCapacity(quartermaster);
  const used = weapons.reduce((sum, w) => sum + w.capacityCost, 0);
  const weaponLines = weapons.map((w) => `• **${w.name}** (${w.capacityCost})`).join("\n");

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `**Оружие** (Weapon Capacity ${used}/${capacity}):\n${weaponLines}\n\n_Снаряжение будет добавлено на следующем этапе разработки._`,
    },
  };
}
