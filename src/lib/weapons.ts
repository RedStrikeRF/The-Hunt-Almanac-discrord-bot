import itemsData from "../data/items.json";
import { pickRandom } from "./random";

export interface Weapon {
  id: string;
  name: string;
  capacityCost: number;
  meleeOnly: boolean;
}

const ALL_WEAPONS = itemsData.weapons as Weapon[];

export interface WeaponPickOptions {
  quartermaster: boolean;
  meleeOnly: boolean;
  excluded: Set<string>;
}

export function weaponCapacity(quartermaster: boolean): number {
  return quartermaster ? 6 : 5;
}

function isExcluded(weapon: Weapon, excluded: Set<string>): boolean {
  return excluded.has(weapon.id.toLowerCase()) || excluded.has(weapon.name.toLowerCase());
}

/**
 * Randomly picks 1-2 weapons whose combined capacityCost fits the Weapon
 * Capacity pool. Falls back to a single weapon if no valid second pick
 * exists for the remaining budget (e.g. a 5-cost weapon leaves no room).
 */
export function pickWeapons(options: WeaponPickOptions): Weapon[] {
  const capacity = weaponCapacity(options.quartermaster);
  const pool = ALL_WEAPONS.filter((w) => !isExcluded(w, options.excluded));

  const firstCandidates = pool.filter((w) => {
    if (w.capacityCost > capacity) return false;
    if (options.meleeOnly && !w.meleeOnly) return false;
    return true;
  });

  const first = pickRandom(firstCandidates);
  if (!first) return [];

  const remaining = capacity - first.capacityCost;
  const secondCandidates = pool.filter((w) => w.id !== first.id && w.capacityCost <= remaining);
  const second = pickRandom(secondCandidates);

  return second ? [first, second] : [first];
}
