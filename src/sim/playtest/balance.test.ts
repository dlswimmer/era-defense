// Locks the overall pacing. If a balance change moves these, run `npm run balance`,
// check it still feels right with the kids, then update the band.
import { describe, expect, it } from 'vitest';
import { playRun } from './bot';

describe('balance', () => {
  const results = [1, 2, 3, 4, 5].map((seed) => playRun(seed));

  it('a decent player gets well into the game', () => {
    for (const r of results) expect(r.wave).toBeGreaterThanOrEqual(12);
  });

  it('the wall always falls eventually (Phase 2 is guaranteed)', () => {
    for (const r of results) expect(r.wave).toBeLessThan(45);
  });

  it('players reach a later era and fill the War Chest', () => {
    for (const r of results) {
      expect(r.era).toBeGreaterThanOrEqual(3);
      expect(r.chest).toBeGreaterThan(200);
    }
  });
});
