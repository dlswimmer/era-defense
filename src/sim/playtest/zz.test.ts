import { it } from 'vitest';
import { playRun, playStand } from './bot';
it('m', () => {
  for (let era = 0; era < 6; era++)
    for (const seed of [1, 2]) {
      const r = playRun(seed, { era });
      const s = playStand(seed, { era, wave: r.wave, chest: r.chest });
      console.log(
        `era${era} p1 held ${r.held} ${Math.round(r.time)}s | wall held ${s.held} ${Math.round(s.time)}s coins p1 ${r.coins} wall ${s.coins}`,
      );
    }
});
