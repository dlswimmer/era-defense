// The Ancient and Medieval monsters that play differently: packs, shells, splitting, flying.
import { describe, expect, it } from 'vitest';
import { ENEMY_IDS, enemyDef } from './data/enemies';
import { buildWave } from './data/waves';
import { createRng } from './rng';
import * as sim from './run';
import * as st from './stand';

describe('new monsters', () => {
  it('Scarab Scuttlers come in pairs, and Goo Bits never come in a wave', () => {
    const rng = createRng(4);
    let pairs = 0;
    for (let n = 1; n <= 30; n++) {
      const spawns = buildWave(n, rng, 1).spawns;
      spawns.forEach((s, i) => {
        if (s.quick) {
          expect(spawns[i - 1]!.id).toBe(s.id);
          pairs++;
        }
      });
      for (let era = 0; era < 6; era++)
        expect(buildWave(n, rng, era).spawns.some((s) => s.id === 'gooBit')).toBe(false);
    }
    expect(pairs).toBeGreaterThan(5);
  });

  it("a Shellback's shell soaks up hits first, then it hurries on without it", () => {
    const run = sim.createRun(1, { era: 1 });
    const e = sim.makeEnemy(run, 'shellback', false, 1);
    run.enemies.push(e);
    expect(e.shell).toBe(e.maxHp);
    const speed = e.speed;
    sim.damage(run, e, e.maxShell / 2);
    expect(e.hp).toBe(e.maxHp);
    sim.damage(run, e, e.maxShell / 2 + 5);
    expect(e.shell).toBe(0);
    expect(e.hp).toBe(e.maxHp - 5);
    expect(e.speed).toBeCloseTo(speed * enemyDef('shellback').shellSpeed!);
    expect(run.events.some((ev) => ev.type === 'shell')).toBe(true);
  });

  it('a Goo Knight splits into two Goo Bits when stopped, on the trail and at the wall', () => {
    const run = sim.createRun(1, { era: 2 });
    const e = sim.makeEnemy(run, 'goo', false, 4);
    run.enemies.push(e);
    sim.damage(run, e, e.hp);
    const bits = run.enemies.filter((x) => x.type === 'gooBit');
    expect(bits).toHaveLength(2);
    for (const b of bits) expect(b.d).toBeLessThanOrEqual(4);

    const stand = st.createStand(1, { era: 2, wave: 12, chest: 100 });
    const a = st.makeAttacker(stand, 'goo', false, 6, 1);
    stand.enemies.push(a);
    st.hurt(stand, a, a.hp);
    expect(stand.enemies.filter((x) => x.type === 'gooBit')).toHaveLength(2);
  });

  it("nets can't catch a Flapper", () => {
    expect(ENEMY_IDS.filter((id) => enemyDef(id).flying)).toContain('flapper');
    const run = sim.createRun(1, { era: 2 });
    const tower = sim.build(run, 'net', 5, 3.8)!;
    const flapper = sim.makeEnemy(run, 'flapper', false, 0);
    // put it right next to the Net Thrower
    let best = Infinity;
    for (let d = 0; d < run.map.length; d += 0.1) {
      const p = sim.makeEnemy(run, 'flapper', false, d);
      const dist = Math.hypot(p.x - tower.x, p.y - tower.y);
      if (dist < best) [best, flapper.d, flapper.x, flapper.y] = [dist, d, p.x, p.y];
    }
    flapper.speed = 0;
    run.enemies.push(flapper);
    for (let i = 0; i < 300; i++) sim.step(run, 0.02);
    expect(flapper.netUntil).toBe(0);
  });
});
