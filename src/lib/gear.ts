import itemsData from "../data/items.json";
import { shuffle } from "./random";

interface Item {
  id: string;
  name: string;
}

export type ConsumableCategory = "throwables" | "placeables" | "shots" | "tarotCards";
export type GearKind = "tool" | ConsumableCategory;

export interface GearSlot {
  item: Item;
  kind: GearKind;
}

const TOOLS = itemsData.tools as Item[];
const CONSUMABLE_CATEGORIES: Record<ConsumableCategory, Item[]> = {
  throwables: itemsData.consumables.throwables as Item[],
  placeables: itemsData.consumables.placeables as Item[],
  shots: itemsData.consumables.shots as Item[],
  tarotCards: itemsData.consumables.tarotCards as Item[],
};

export const GEAR_SLOTS = 8;
export const MAX_PER_CONSUMABLE_CATEGORY = 4;

export const CATEGORY_LABELS: Record<GearKind, string> = {
  tool: "Инструмент",
  throwables: "Throwables",
  placeables: "Placeables",
  shots: "Shots",
  tarotCards: "Tarot Cards",
};

export interface GearPickOptions {
  excluded: Set<string>;
}

function isExcluded(item: Item, excluded: Set<string>): boolean {
  return excluded.has(item.id.toLowerCase()) || excluded.has(item.name.toLowerCase());
}

/**
 * Fills up to 8 gear slots from a mix of tools (unlimited, capped only by
 * total slots) and consumables (max 4 per one of the 4 categories).
 */
export function pickGear(options: GearPickOptions): GearSlot[] {
  const pool: GearSlot[] = [];

  for (const tool of TOOLS) {
    if (!isExcluded(tool, options.excluded)) pool.push({ item: tool, kind: "tool" });
  }
  for (const category of Object.keys(CONSUMABLE_CATEGORIES) as ConsumableCategory[]) {
    for (const item of CONSUMABLE_CATEGORIES[category]) {
      if (!isExcluded(item, options.excluded)) pool.push({ item, kind: category });
    }
  }

  const shuffled = shuffle(pool);
  const picked: GearSlot[] = [];
  const categoryCounts: Partial<Record<ConsumableCategory, number>> = {};

  for (const candidate of shuffled) {
    if (picked.length >= GEAR_SLOTS) break;

    if (candidate.kind !== "tool") {
      const count = categoryCounts[candidate.kind] ?? 0;
      if (count >= MAX_PER_CONSUMABLE_CATEGORY) continue;
    }

    picked.push(candidate);
    if (candidate.kind !== "tool") {
      categoryCounts[candidate.kind] = (categoryCounts[candidate.kind] ?? 0) + 1;
    }
  }

  return picked;
}
