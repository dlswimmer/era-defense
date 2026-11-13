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

  it('every era lasts longer than the Stone Age, and the wall always falls', () => {
    const stoneTime = Math.max(...stone.map((r) => r.time));
    for (let era = 1; era < ERAS.length; era++) {
      const r = playRun(seeds[0]!, { era });
      expect(r.time).toBeGreaterThan(stoneTime);
      expect(r.time).toBeLessThan(10 * 60);
    }
  });
});
