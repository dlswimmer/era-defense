import { describe, expect, it } from 'vitest';
import { ERAS } from './data/eras';
import { GAME } from './data/game';
import { towerDef, upgradeCost } from './data/towers';
import * as sim from './run';

const playWave = (run: sim.Run) => {
  sim.startWave(run);
  while (run.waveActive && !run.breached) sim.step(run, 0.05);
};

describe('building', () => {
  it('costs gold and blocks the cell', () => {
    const run = sim.createRun(1);
    const tower = sim.build(run, 'rock', 0, 1);
    expect(tower).not.toBeNull();
    expect(run.gold).toBe(GAME.startGold - towerDef('rock').cost);
    expect(sim.build(run, 'rock', 0, 1)).toBeNull();
  });

  it('cannot build on the path or decorations', () => {
    const run = sim.createRun(1);
    expect(sim.build(run, 'rock', 1, 0)).toBeNull(); // path
    expect(sim.build(run, 'rock', 0, 0)).toBeNull(); // decoration
  });

  it('cannot build towers from a later era', () => {
    const run = sim.createRun(1);
    run.gold = 10_000;
    expect(sim.build(run, 'archer', 0, 1)).toBeNull();
    sim.evolve(run);
    expect(sim.build(run, 'archer', 0, 1)).not.toBeNull();
  });

  it('upgrades twice, then sells for 70% of everything spent', () => {
    const run = sim.createRun(1);
    run.gold = 1000;
    const tower = sim.build(run, 'rock', 0, 1)!;
    expect(sim.upgrade(run, tower)).toBe(true);
    expect(sim.upgrade(run, tower)).toBe(true);
    expect(sim.upgrade(run, tower)).toBe(false);
    const def = towerDef('rock');
    const spent = def.cost + upgradeCost(def, 0) + upgradeCost(def, 1);
    const before = run.gold;
    expect(sim.sell(run, tower)).toBe(Math.floor(spent * 0.7));
    expect(run.gold).toBe(before + Math.floor(spent * 0.7));
    expect(run.towers).toHaveLength(0);
  });
});

describe('evolve', () => {
  it('fully repairs the wall and raises its max HP', () => {
    const run = sim.createRun(1);
    run.gold = ERAS[1]!.evolveCost;
    run.wallHp = 3;
    expect(sim.evolve(run)).toBe(true);
    expect(run.era).toBe(1);
    expect(run.gold).toBe(0);
    expect(run.wallMax).toBe(ERAS[1]!.wallHp);
    expect(run.wallHp).toBe(run.wallMax);
  });

  it('needs enough gold', () => {
    const run = sim.createRun(1);
    run.gold = ERAS[1]!.evolveCost - 1;
    expect(sim.evolve(run)).toBe(false);
  });
});

describe('waves and the wall', () => {
  it('enemies that get through damage the wall until it breaches', () => {
    const run = sim.createRun(1);
    playWave(run);
    expect(run.wallHp).toBeLessThan(run.wallMax);
    while (!run.breached) playWave(run);
    expect(run.wallHp).toBe(0);
    expect(run.events.some((e) => e.type === 'breach')).toBe(true);
    // Nothing can be bought after the breach.
    expect(sim.startWave(run)).toBe(false);
    expect(sim.build(run, 'rock', 0, 1)).toBeNull();
  });

  it('stopping enemies earns gold and fills the War Chest', () => {
    const run = sim.createRun(1);
    run.gold = 1000;
    for (const [c, r] of [
      [0, 1],
      [2, 1],
      [3, 3],
      [5, 3],
      [2, 4],
    ] as const)
      sim.build(run, 'rock', c, r);
    const goldBefore = run.gold;
    playWave(run);
    expect(run.kills).toBeGreaterThan(0);
    expect(run.chest).toBe(run.kills * GAME.warChest.perKill(0));
    expect(run.gold).toBeGreaterThan(goldBefore);
    expect(run.events.some((e) => e.type === 'waveCleared')).toBe(true);
  });

  it('gives a bonus to the War Chest for bosses', () => {
    const run = sim.createRun(1);
    run.gold = 100_000;
    sim.evolve(run);
    sim.evolve(run);
    for (let c = 2; c < 8; c++) {
      sim.build(run, 'catapult', c, 1);
      sim.build(run, 'catapult', c, 3);
    }
    for (let w = 0; w < 5; w++) playWave(run);
    expect(run.bosses).toBe(1);
  });

  it('is repeatable with the same seed', () => {
    const a = sim.createRun(42);
    const b = sim.createRun(42);
    for (let i = 0; i < 3; i++) {
      playWave(a);
      playWave(b);
    }
    expect(a.wallHp).toBe(b.wallHp);
    expect(a.gold).toBe(b.gold);
  });
});
