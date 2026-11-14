// How strong a tower or defender is, as one number, to compare them across eras.
// David (Nov 14): a fully upgraded tower or defender from the previous era should be slightly
// better than the next era's starter. `power.test.ts` checks that for every era's starters.
import { TOWER_IDS, towerDef, type TowerId } from './data/towers';
import { UNIT_IDS, unitDef, type UnitId } from './data/units';
import { stepsFor } from './data/web';
import { NO_MODS, type Mods } from './web';

/** The mods a tower or defender has once every upgrade in its line is bought. */
export function maxedMods(owner: TowerId | UnitId): Mods {
  const m = { ...NO_MODS };
  for (const { effect: fx } of stepsFor(owner)) {
    m.dmg += fx.dmg ?? 0;
    m.rate += fx.rate ?? 0;
    m.range += fx.range ?? 0;
    m.splash += fx.splash ?? 0;
    if (fx.mastery) m.mastery = true;
  }
  return m;
}

/** Damage per second, counting splash as hitting a few more monsters (1 + radius in tiles). */
const power = (dmg: number, rate: number, splash: number) => dmg * rate * (1 + splash);

/** A tower's power at its top level (3), with these upgrades. */
export function towerPower(id: TowerId, m: Mods = NO_MODS): number {
  const def = towerDef(id);
  const top = def.levels[2];
  return power(top.dmg * m.dmg, top.rate * m.rate, (def.splash ?? 0) * m.splash);
}

/** A defender's power with these upgrades (defenders have no levels). */
export function unitPower(id: UnitId, m: Mods = NO_MODS): number {
  const def = unitDef(id);
  return power(def.dmg * m.dmg, def.rate * m.rate, (def.splash ?? 0) * m.splash);
}

/** The tower and defender you get for free when you reach an era (the first one listed). */
export const starterTower = (era: number) => TOWER_IDS.find((id) => towerDef(id).era === era);
export const starterUnit = (era: number) => UNIT_IDS.find((id) => unitDef(id).era === era);
