// How much a tower or defender is really worth, measured by playing, not by a formula.
// `npm run balance -- units` prints it. Each one is played on its own and scored by how much
// monster HP it stops before the wall falls (or the first monster gets through on the trail).
// That score is turned into "worth": the damage multiplier the era's fresh starter would need to
// score the same. So 1.10 means "as good as the starter with +10% damage".
import { TOWER_IDS, towerDef, type TowerId } from '../data/towers';
import { UNIT_IDS, unitDef, type UnitId } from '../data/units';
import { stepsFor } from '../data/web';
import * as sim from '../run';
import { ERAS } from '../data/eras';
import { STAND } from '../data/stand';
import { createStand, hire, hireMasteryBuddies, stepStand } from '../stand';
import { NO_MODS, type Mods } from '../web';
import { OPTIMAL, playRun, spend, spendStand, type Tester } from './bot';

/** The mods a tower or defender has once every upgrade in its line is bought. */
export function maxedMods(owner: TowerId | UnitId): Mods {
  const m = { ...NO_MODS };
  for (const { effect: fx } of stepsFor(owner)) {
    m.dmg += fx.dmg ?? 0;
    m.rate += fx.rate ?? 0;
    m.range += fx.range ?? 0;
    m.splash += fx.splash ?? 0;
    m.hold += fx.hold ?? 0;
    m.net += fx.net ?? 0;
    if (fx.mastery) m.mastery = true;
    if (fx.grip) m.grip = true;
  }
  return m;
}

export const starterTower = (era: number) => TOWER_IDS.find((id) => towerDef(id).era === era)!;
export const starterUnit = (era: number) => UNIT_IDS.find((id) => unitDef(id).era === era)!;

interface Hp {
  id: number;
  hp: number;
  maxHp: number;
}

/** Counts monster HP taken away, step by step (a monster that vanishes was stopped). */
function hpTracker() {
  const last = new Map<number, number>();
  let removed = 0;
  return {
    update(enemies: Hp[], countVanished: boolean) {
      const seen = new Set<number>();
      for (const e of enemies) {
        seen.add(e.id);
        const before = last.get(e.id) ?? e.maxHp;
        removed += Math.max(0, before - Math.max(0, e.hp));
        last.set(e.id, Math.max(0, e.hp));
      }
      for (const [id, hp] of last) {
        if (seen.has(id)) continue;
        if (countVanished) removed += hp;
        last.delete(id);
      }
    },
    get removed() {
      return removed;
    },
  };
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Runs `play` with the wall's monsters a bit weaker or tougher than usual, a different amount for
 * each seed. A defense tends to fall at the same tough wave (a boss crowd), so without the spread
 * a small change in strength often changes nothing and the scores jump in steps.
 */
function withSpread<T>(seed: number, play: () => T): T {
  const firstHp = STAND.firstHp;
  STAND.firstHp = firstHp * (0.6 + 0.1 * seed);
  try {
    return play();
  } finally {
    STAND.firstHp = firstHp;
  }
}

/** The wave a decent player reaches the wall at, in each era (from `npm run balance`). */
export const WALL_WAVE = [9, 11, 15, 20, 23, 28];

/**
 * A full wall (10) of one defender, no boosts, starting at the era's usual wall wave. Score:
 * monster HP stopped before the wall falls (summed over a few seeds).
 */
export function standScore(era: number, unit: UnitId, mods: Mods, wave = WALL_WAVE[era]!) {
  let total = 0;
  for (const seed of SEEDS) {
    total += withSpread(seed, () => {
      const stand = createStand(seed, {
        era,
        wave,
        chest: 0,
        units: [unit],
        unitMods: { [unit]: mods },
      });
      for (let i = 0; i < 10; i++) hire(stand, unit, true);
      const hp = hpTracker();
      while (!stand.over && stand.time < 4000) {
        stepStand(stand, 0.05);
        stand.events.length = 0;
        hp.update(stand.enemies, true);
      }
      return hp.removed;
    });
  }
  return total;
}

/** How a fresh trail run in the era ends (the wave and War Chest the Last Stand starts with). */
const trailEnds = new Map<string, { wave: number; chest: number }>();
function trailEnd(era: number, seed: number) {
  const key = `${era}:${seed}`;
  let end = trailEnds.get(key);
  if (!end) {
    const r = playRun(seed, { era });
    end = { wave: r.wave, chest: r.chest };
    trailEnds.set(key, end);
  }
  return end;
}

/**
 * A real Last Stand where the bot may only hire this defender: it starts from a fresh trail run's
 * wave and War Chest, and spends on defenders and boosts like the tester does. So a cheap
 * defender (more War Chest left for boosts) counts for what it is worth. Score: monster HP stopped.
 */
export function standPlayScore(era: number, unit: UnitId, mods: Mods, tester: Tester = OPTIMAL) {
  let total = 0;
  for (const seed of SEEDS) {
    const end = trailEnd(era, seed);
    total += withSpread(seed, () => {
      // Players reach the wall with more or less War Chest.
      const chest = Math.round(end.chest * (0.5 + 0.2 * seed));
      const stand = createStand(seed, {
        era,
        wave: end.wave,
        chest,
        units: [unit],
        unitMods: { [unit]: mods },
      });
      hireMasteryBuddies(stand);
      spendStand(stand, tester);
      const hp = hpTracker();
      let since = 0;
      while (!stand.over && stand.time < 4000) {
        stepStand(stand, 0.05);
        stand.events.length = 0;
        hp.update(stand.enemies, true);
        since += 0.05;
        if (since >= tester.think) {
          since = 0;
          spendStand(stand, tester);
        }
      }
      return hp.removed;
    });
  }
  return total;
}

/**
 * A trail run where the bot may only build these towers (and spends all its gold on them).
 * Score: monster HP stopped before the first one gets through.
 */
export function trailScore(era: number, towers: TowerId[], mods: Partial<Record<TowerId, Mods>>) {
  let total = 0;
  for (const seed of SEEDS.slice(0, 6)) {
    // A bit more or less gold each time, so the score doesn't jump in steps (see withSpread).
    const bonusGold = Math.round(ERAS[era]!.startGold * 0.15 * (seed - 3.5));
    const run = sim.createRun(seed, { era, towers, towerMods: mods, bonusGold });
    spend(run);
    sim.startWave(run);
    const hp = hpTracker();
    let since = 0;
    while (!run.breached && run.time < 1200) {
      sim.step(run, 0.05);
      run.events.length = 0;
      hp.update(run.enemies, !run.breached);
      since += 0.05;
      if (since >= 1) {
        since = 0;
        spend(run);
      }
    }
    total += hp.removed;
  }
  return total;
}

/** Finds k so that score(k) = target, for a score that grows with k. */
function solve(score: (k: number) => number, target: number) {
  let lo = 0.2;
  let hi = 5;
  for (let i = 0; i < 18; i++) {
    const mid = Math.sqrt(lo * hi);
    if (score(mid) < target) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

const withDmg = (k: number): Mods => ({ ...NO_MODS, dmg: k });

/** A defender's worth in an era: 1 = as good as that era's fresh starter, per wall spot. */
export function unitWorth(era: number, unit: UnitId, mods: Mods = NO_MODS) {
  const ref = starterUnit(era);
  const target = standScore(era, unit, mods);
  return solve((k) => standScore(era, ref, withDmg(k)), target);
}

/** Like unitWorth, but in a real Last Stand with War Chest and boosts (see standPlayScore). */
export function unitPlayWorth(era: number, unit: UnitId, mods: Mods = NO_MODS, tester = OPTIMAL) {
  const ref = starterUnit(era);
  const target = standPlayScore(era, unit, mods, tester);
  return solve((k) => standPlayScore(era, ref, withDmg(k), tester), target);
}

/**
 * A tower's worth in an era: 1 = as good as that era's fresh starter, when the bot spends all its
 * gold on it. Nets can't stop anything alone, so a net is played next to the starter, and its
 * worth is how much it adds compared with the same gold spent on more of the starter.
 */
export function towerWorth(era: number, tower: TowerId, mods: Mods = NO_MODS) {
  const ref = starterTower(era);
  const towers = towerDef(tower).net ? [ref, tower] : [tower];
  const target = trailScore(era, towers, { [tower]: mods });
  return solve((k) => trailScore(era, [ref], { [ref]: withDmg(k) }), target);
}
