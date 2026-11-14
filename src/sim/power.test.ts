import { describe, expect, it } from 'vitest';
import { maxedMods, starterTower, starterUnit, towerPower, unitPower } from './power';

// Eras whose starters have been tuned to the rule so far. Add the next one when it's built.
const TUNED_UP_TO = 2; // Medieval

describe("an old era's maxed starter is slightly better than the next era's starter", () => {
  for (let era = 1; era <= TUNED_UP_TO; era++) {
    it(`era ${era}`, () => {
      const oldTower = starterTower(era - 1)!;
      const newTower = starterTower(era)!;
      const t = towerPower(oldTower, maxedMods(oldTower)) / towerPower(newTower);
      expect(t, `${oldTower} maxed vs ${newTower}`).toBeGreaterThan(1.03);
      expect(t, `${oldTower} maxed vs ${newTower}`).toBeLessThan(1.25);
      const oldUnit = starterUnit(era - 1)!;
      const newUnit = starterUnit(era)!;
      const u = unitPower(oldUnit, maxedMods(oldUnit)) / unitPower(newUnit);
      expect(u, `${oldUnit} maxed vs ${newUnit}`).toBeGreaterThan(1.03);
      expect(u, `${oldUnit} maxed vs ${newUnit}`).toBeLessThan(1.25);
    });
  }

  it('upgrading still makes the new starter better than the old one', () => {
    for (let era = 1; era <= TUNED_UP_TO; era++) {
      const t = starterTower(era)!;
      expect(towerPower(t, maxedMods(t))).toBeGreaterThan(
        towerPower(starterTower(era - 1)!, maxedMods(starterTower(era - 1)!)),
      );
    }
  });
});
