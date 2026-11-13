import { describe, expect, it } from 'vitest';
import { ERAS } from './data/eras';
import { GAME } from './data/game';
import { runOptions } from './data/metaUpgrades';
import { towerDef, upgradeCost } from './data/towers';
import { WAVES } from './data/waves';
import * as sim from './run';

/** Runs the sim until `wave` has finished spawning and the field is clear, or the wall falls. */
const playUntil = (run: sim.Run, wave: number) => {
  if (!run.started) sim.startWave(run);
  while (!run.breached && (run.wave < wave || sim.isSpawning(run) || run.enemies.length)) {
    sim.step(run, 0.05);
  }
};

describe('building', () => {
  it('costs gold and blocks the cell', () => {
    const run = sim.createRun(1);
    const tower = sim.build(run, 'rock', 0, 1);
    expect(tower).not.toBeNull();
    expect(run.gold).toBe(ERAS[0]!.startGold - towerDef('rock').cost);
    expect(sim.build(run, 'rock', 0, 1)).toBeNull();
  });

  it('cannot build on the path or decorations', () => {
    const run = sim.createRun(1);
    expect(sim.build(run, 'rock', 1, 0)).toBeNull(); // path
    expect(sim.build(run, 'rock', 0, 0)).toBeNull(); // decoration
  });

  it("cannot build towers from an era you haven't unlocked", () => {
    const stone = sim.createRun(1);
    stone.gold = 10_000;
    expect(sim.build(stone, 'archer', 0, 1)).toBeNull();
    const ancient = sim.createRun(1, { era: 1 });
    expect(sim.build(ancient, 'archer', 0, 1)).not.toBeNull();
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

describe('run options (Relic upgrades)', () => {
  it('starts in the unlocked era with its wall, gold and a head start on waves', () => {
    const run = sim.createRun(1, runOptions({ era: 2, gold: 2, wall: 1 }));
    expect(run.era).toBe(2);
    expect(run.gold).toBe(ERAS[2]!.startGold + 50);
    expect(run.wallMax).toBe(ERAS[2]!.wallHp + 3);
    expect(run.wave).toBe(WAVES.tierEvery);
    expect(sim.wavesHeld(run)).toBe(0);
  });

  it('never goes past the last era', () => {
    expect(runOptions({ era: 99 }).era).toBe(ERAS.length - 1);
  });
});

describe('waves', () => {
  it('waits for the player to call the first wave', () => {
    const run = sim.createRun(1);
    for (let i = 0; i < 200; i++) sim.step(run, 0.05);
    expect(run.wave).toBe(0);
    expect(run.enemies).toHaveLength(0);
  });

  it('then keeps coming on its own', () => {
    const run = sim.createRun(1);
    run.wallHp = run.wallMax = 1000;
    sim.startWave(run);
    for (let i = 0; i < 20 * 60; i++) sim.step(run, 0.05); // one minute
    expect(run.wave).toBeGreaterThanOrEqual(4);
  });

  it('pays a bonus for calling the next wave early', () => {
    const run = sim.createRun(1);
    sim.startWave(run);
    expect(sim.startWave(run)).toBe(false); // still spawning
    while (sim.isSpawning(run)) sim.step(run, 0.05);
    const bonus = sim.earlyCallBonus(run);
    expect(bonus).toBeGreaterThan(0);
    const gold = run.gold;
    expect(sim.startWave(run)).toBe(true);
    expect(run.gold).toBe(gold + bonus + WAVES.waveBonus(1));
  });
});

describe('the wall', () => {
  it('enemies that get through damage the wall until it breaches', () => {
    const run = sim.createRun(1);
    playUntil(run, 1);
    expect(run.wallHp).toBeLessThan(run.wallMax);
    playUntil(run, 999);
    expect(run.breached).toBe(true);
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
    playUntil(run, 1);
    expect(run.kills).toBeGreaterThan(0);
    expect(run.chest).toBe(run.kills * GAME.warChest.perKill(0));
    expect(run.gold).toBeGreaterThan(goldBefore);
  });

  it('counts bosses', () => {
    const run = sim.createRun(1);
    run.gold = 100_000;
    run.wallHp = run.wallMax = 1000;
    for (let c = 2; c < 8; c++) {
      for (const r of [1, 3, 4]) {
        const t = sim.build(run, 'rock', c, r);
        if (t) {
          sim.upgrade(run, t);
          sim.upgrade(run, t);
        }
      }
    }
    playUntil(run, 5);
    expect(run.bosses).toBe(1);
  });

  it('is repeatable with the same seed', () => {
    const a = sim.createRun(42);
    const b = sim.createRun(42);
    playUntil(a, 3);
    playUntil(b, 3);
    expect(a.wallHp).toBe(b.wallHp);
    expect(a.gold).toBe(b.gold);
  });
});
