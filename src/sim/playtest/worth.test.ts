// David (Nov 14): a fully upgraded tower or defender from the era before should be slightly
// better (about 10%) than the next era's fresh starter, and the ones within an era about even.
// Worth is measured by playing (worth.ts); `npm run balance -- units` prints the whole table.
import { describe, expect, it } from 'vitest';
import { TOWER_IDS, towerDef } from '../data/towers';
import { UNIT_IDS, unitDef } from '../data/units';
import { maxedMods, towerWorth, unitPlayWorth, unitWorth } from './worth';

// Eras tuned to the rule so far. Add the next one when its units are picked.
const TUNED_UP_TO = 2; // Medieval

/** A defender's worth: the real Last Stand and a full wall without boosts, averaged. */
const defender = (era: number, id: (typeof UNIT_IDS)[number], maxed: boolean) => {
  const m = maxed ? maxedMods(id) : undefined;
  return (unitPlayWorth(era, id, m) + unitWorth(era, id, m)) / 2;
};

describe("a maxed one from the era before is a bit better than the new era's starter", () => {
  for (let era = 1; era <= TUNED_UP_TO; era++) {
    for (const id of UNIT_IDS.filter((u) => unitDef(u).era === era - 1)) {
      it(`${unitDef(id).name} in era ${era}`, { timeout: 60_000 }, () => {
        const w = defender(era, id, true);
        expect(w).toBeGreaterThan(1.0);
        expect(w).toBeLessThan(1.3);
      });
    }
    for (const id of TOWER_IDS.filter((t) => towerDef(t).era === era - 1 && !towerDef(t).net)) {
      it(`${towerDef(id).name} in era ${era}`, { timeout: 60_000 }, () => {
        const w = towerWorth(era, id, maxedMods(id));
        expect(w).toBeGreaterThan(0.95);
        expect(w).toBeLessThan(1.3);
      });
    }
  }
});

describe('defenders in the same era are about even', () => {
  it('Spear Thrower and Boulder Dropper', { timeout: 60_000 }, () => {
    const fresh = defender(0, 'boulder', false);
    expect(fresh).toBeGreaterThan(0.8);
    expect(fresh).toBeLessThan(1.2);
    const ratio = defender(0, 'boulder', true) / defender(0, 'spear', true);
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(1.25);
  });
});
