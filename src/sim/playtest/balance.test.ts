// Locks the overall pacing. If a balance change moves these, run `npm run balance`,
// check it still feels right with the kids, then update the bands.
import { describe, expect, it } from 'vitest';
import { ERAS } from '../data/eras';
import { playRun } from './bot';

const seeds = [1, 2, 3, 4];

describe('balance', () => {
  const stone = seeds.map((seed) => playRun(seed));

  it('the first Stone Age run is short: about 1-2 minutes', () => {
    for (const r of stone) {
      expect(r.time).toBeGreaterThan(50);
      expect(r.time).toBeLessThan(150);
    }
  });

  it('the first run earns enough Relics to evolve', () => {
    for (const r of stone) expect(r.relics).toBeGreaterThanOrEqual(ERAS[1]!.relicCost);
  });

  // Phase 1 ends on the first leak, so every era stays a short run. Harder maps will keep it
  // that way once players have strong upgrades (David doesn't want 20-minute Phase 1s).
  it('every era is a short run that still lets you play a while, and someone always gets through', () => {
    for (let era = 1; era < ERAS.length; era++) {
      const r = playRun(seeds[0]!, { era });
      expect(r.time).toBeGreaterThan(60);
      expect(r.time).toBeLessThan(5 * 60);
      expect(r.held).toBeGreaterThanOrEqual(3);
    }
  });
});
