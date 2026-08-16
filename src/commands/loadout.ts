import { InteractionResponseType } from "discord-interactions";
import { pickWeapons, weaponCapacity } from "../lib/weapons";
import { CATEGORY_LABELS, pickGear } from "../lib/gear";

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

  const gear = pickGear({ excluded });
  if (gear.length === 0) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Не удалось подобрать снаряжение — все предметы исключены фильтром exclude.",
      },
    };
  }

  const capacity = weaponCapacity(quartermaster);
  const used = weapons.reduce((sum, w) => sum + w.capacityCost, 0);
  const weaponLines = weapons.map((w) => `• **${w.name}** (${w.capacityCost})`).join("\n");
  const gearLines = gear.map((slot) => `• **${slot.item.name}** _(${CATEGORY_LABELS[slot.kind]})_`).join("\n");

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: [
        `**Оружие** (Weapon Capacity ${used}/${capacity}${quartermaster ? ", Quartermaster" : ""}):`,
        weaponLines,
        "",
        `**Снаряжение** (${gear.length}/8):`,
        gearLines,
      ].join("\n"),
    },
  };
}
