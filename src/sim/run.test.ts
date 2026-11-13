import { describe, expect, it } from 'vitest';
import { ERAS } from './data/eras';
import { GAME } from './data/game';
import { towerDef, upgradeCost } from './data/towers';
import { enemyDef } from './data/enemies';
import { WAVES, buildWave, hpScale, rankFor } from './data/waves';
import { createRng } from './rng';
import { posAt } from './path';
import { bestSpot } from './playtest/bot';
import * as sim from './run';
import { runOptions } from './web';

/** Runs the sim until `wave` has finished spawning and the field is clear, or one gets through. */
/** Fills the best spots with maxed-out Rock Throwers. */
const fortify = (run: sim.Run, count = 18) => {
  for (let i = 0; i < count; i++) {
    const spot = bestSpot(run, 2.6);
    const t = spot && sim.build(run, 'rock', spot.x, spot.y);
    if (!t) break;
    sim.upgrade(run, t);
    sim.upgrade(run, t);
  }
};

const playUntil = (run: sim.Run, wave: number) => {
  if (!run.started) sim.startWave(run);
  while (!run.breached && (run.wave < wave || sim.isSpawning(run) || run.enemies.length)) {
    sim.step(run, 0.05);
  }
};

describe('building', () => {
  it('costs gold and blocks the space around it', () => {
    const run = sim.createRun(1);
    const tower = sim.build(run, 'rock', 0.6, 3);
    expect(tower).not.toBeNull();
    expect(run.gold).toBe(ERAS[0]!.startGold - towerDef('rock').cost);
    expect(sim.build(run, 'rock', 0.6, 3)).toBeNull();
    expect(sim.build(run, 'rock', 0.9, 3.3)).toBeNull(); // overlapping
    expect(sim.build(run, 'rock', 0.6, 3.9)).not.toBeNull(); // right next to it is fine
  });

  it('finds towers by where you tap', () => {
    const run = sim.createRun(1);
    const tower = sim.build(run, 'rock', 0.6, 3)!;
    expect(sim.towerAt(run, 0.7, 3.1)).toBe(tower);
    expect(sim.towerAt(run, 1.5, 3)).toBeUndefined();
    expect(sim.towerAt(run, 1.2, 3, 0.3)).toBe(tower);
  });

  it('cannot build on the trail, decorations, the base or off the map', () => {
    const run = sim.createRun(1);
    const { map } = run;
    expect(sim.build(run, 'rock', map.points[60]!.x, map.points[60]!.y)).toBeNull(); // trail
    expect(sim.build(run, 'rock', map.decor[0]!.x, map.decor[0]!.y)).toBeNull(); // decoration
    expect(sim.build(run, 'rock', map.base.x + 1, map.base.y)).toBeNull(); // base
    expect(sim.build(run, 'rock', 0.1, 3)).toBeNull(); // hanging off the edge
  });

  it("cannot build towers from an era you haven't unlocked", () => {
    const stone = sim.createRun(1);
    stone.gold = 10_000;
    expect(sim.build(stone, 'archer', 0.6, 3)).toBeNull();
    const ancient = sim.createRun(1, { era: 1 });
    expect(sim.build(ancient, 'archer', 0.6, 3)).not.toBeNull();
  });

  it('upgrades twice, then sells for 70% of everything spent', () => {
    const run = sim.createRun(1);
    run.gold = 1000;
    const tower = sim.build(run, 'rock', 0.6, 3)!;
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

describe('targeting', () => {
  /** One tower and three enemies in range: near the end, tough, and right next to the tower. */
  const setup = (mode: sim.Targeting) => {
    const run = sim.createRun(1);
    const tower = sim.build(run, 'rock', 5, 3.8)!;
    tower.targeting = mode;
    const at = (d: number, hp: number) => {
      const p = posAt(run.map, d);
      run.enemies.push({
        id: run.nextId++,
        type: 'caveman',
        boss: false,
        tier: 0,
        rank: 0,
        hp,
        maxHp: hp,
        speed: 0,
        d,
        ...p,
      });
    };
    // Pick trail spots in range, at different distances from the tower.
    const inRange = [] as { d: number; dist: number }[];
    for (let d = 0; d < run.map.length; d += 0.1) {
      const p = posAt(run.map, d);
      const dist = Math.hypot(p.x - 5, p.y - 3.8);
      if (dist < 2) inRange.push({ d, dist });
    }
    const nearest = inRange.reduce((a, b) => (b.dist < a.dist ? b : a));
    const last = inRange[inRange.length - 1]!;
    const firstSeen = inRange[0]!;
    at(last.d, 10); // furthest along
    at(firstSeen.d, 999); // toughest
    at(nearest.d, 10); // closest
    sim.step(run, 0.01);
    const shot = run.shots[0]!;
    return run.enemies.findIndex((e) => e.id === shot.targetId);
  };

  it('aims at the first, the strongest or the closest enemy', () => {
    expect(setup('first')).toBe(0);
    expect(setup('strong')).toBe(1);
    expect(setup('close')).toBe(2);
  });
});

describe('run options (upgrade web)', () => {
  it('starts in the newest era with its head start on waves, Treasure and Strong Arms', () => {
    const run = sim.createRun(
      1,
      runOptions(['era:ancient', 'era:medieval', 'camp:stone:treasure', 'camp:stone:arms']),
    );
    expect(run.era).toBe(2);
    expect(run.gold).toBe(ERAS[2]!.startGold + Math.round(ERAS[0]!.startGold * 0.3));
    expect(run.damageBonus).toBeCloseTo(1.1);
    expect(run.wave).toBe(WAVES.tierEvery);
    expect(sim.wavesHeld(run)).toBe(0);
  });

  it('only offers towers unlocked in the web', () => {
    const run = sim.createRun(1, runOptions(['era:ancient', 'era:medieval']));
    expect(sim.isUnlocked(run, 'rock')).toBe(true);
    expect(sim.isUnlocked(run, 'catapult')).toBe(true);
    expect(sim.isUnlocked(run, 'cannon')).toBe(false);
  });

  it('tower upgrades change its stats, and Mastery starts it at level 2', () => {
    const steps = ['power', 'speed', 'reach', 'power2', 'speed2', 'reach2', 'power3', 'mastery'];
    const run = sim.createRun(1, runOptions(steps.map((s) => `tower:rock:${s}`)));
    const base = towerDef('rock').levels[1];
    const stats = sim.towerStats(run, 'rock', 1);
    expect(stats.dmg).toBeCloseTo(base.dmg * 1.65);
    expect(stats.rate).toBeCloseTo(base.rate * 1.25);
    expect(stats.range).toBeCloseTo(base.range * 1.18);
    expect(sim.build(run, 'rock', 0.6, 3)!.level).toBe(1);
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
    run.gold = 100_000;
    fortify(run);
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

describe('getting through', () => {
  it('the first enemy that reaches the base ends Phase 1', () => {
    const run = sim.createRun(1);
    sim.startWave(run);
    while (!run.breached) sim.step(run, 0.05);
    expect(run.events.filter((e) => e.type === 'leak')).toHaveLength(1);
    expect(run.events.some((e) => e.type === 'breach')).toBe(true);
    // Nothing can be bought after the breach.
    expect(sim.startWave(run)).toBe(false);
    expect(sim.build(run, 'rock', 0.6, 3)).toBeNull();
  });

  it('stopping enemies earns gold and fills the War Chest', () => {
    const run = sim.createRun(1);
    run.gold = 1000;
    for (let i = 0; i < 5; i++) {
      const spot = bestSpot(run, 2.2)!;
      sim.build(run, 'rock', spot.x, spot.y);
    }
    const goldBefore = run.gold;
    playUntil(run, 1);
    expect(run.kills).toBeGreaterThan(0);
    expect(run.chest).toBe(run.kills * GAME.warChest.perKill(0));
    expect(run.gold).toBeGreaterThan(goldBefore);
  });

  it('counts bosses', () => {
    const run = sim.createRun(1);
    run.gold = 100_000;
    fortify(run);
    playUntil(run, 5);
    expect(run.breached).toBe(false);
    expect(run.bosses).toBe(1);
  });

  it('is repeatable with the same seed', () => {
    const a = sim.createRun(42);
    const b = sim.createRun(42);
    playUntil(a, 3);
    playUntil(b, 3);
    expect(a.kills).toBe(b.kills);
    expect(a.gold).toBe(b.gold);
  });
});

describe('waves stay in your era', () => {
  it('never sends enemies from a later era, but they level up and keep getting tougher', () => {
    const rng = createRng(3);
    for (let era = 0; era < ERAS.length; era++) {
      for (let n = 1; n <= 40; n++) {
        for (const s of buildWave(n, rng, era).spawns)
          expect(enemyDef(s.id).tier).toBeLessThanOrEqual(era);
      }
    }
    expect(rankFor(5, 0)).toBe(0);
    expect(rankFor(6, 0)).toBe(1);
    expect(rankFor(16, 0)).toBe(3);
    expect(hpScale(20, 0)).toBeGreaterThan(hpScale(10, 0) * 3);
  });
});
