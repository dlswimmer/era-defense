// A simple bot that plays Phase 1, used by tests and `npm run balance` to check pacing.
import { towerDef, TOWER_IDS, type TowerId } from '../data/towers';
import { posAt, type Point } from '../path';
import * as sim from '../run';
import { ERAS } from '../data/eras';
import {
  WEB_NODES,
  buyNode,
  currentEra,
  eraNodeId,
  gateNodes,
  nodeState,
  ownedSet,
  runOptions,
  webNode,
  type RunOptions,
} from '../web';
import { UNIT_IDS, unitDef } from '../data/units';
import { BOOSTS, type Boost } from '../data/stand';
import {
  boostCost,
  buyBoost,
  canHire,
  createStand,
  hire,
  hireMasteryBuddies,
  standCoins,
  standWavesHeld,
  stepStand,
  type Stand,
  type StandOptions,
} from '../stand';

export interface BotResult {
  wave: number;
  held: number;
  time: number;
  coins: number;
  era: number;
  chest: number;
  kills: number;
  towers: number;
}

/** Points every quarter tile along the trail, for scoring spots. */
const trailSamples = new WeakMap<sim.Run['map'], Point[]>();
function samples(run: sim.Run): Point[] {
  let pts = trailSamples.get(run.map);
  if (!pts) {
    pts = [];
    for (let d = 0; d <= run.map.length; d += 0.25) pts.push(posAt(run.map, d));
    trailSamples.set(run.map, pts);
  }
  return pts;
}

/** How much trail is within `range` of a spot: a rough "how good is this spot". */
function coverage(run: sim.Run, x: number, y: number, range: number): number {
  let n = 0;
  for (const p of samples(run)) if (Math.hypot(p.x - x, p.y - y) <= range) n++;
  return n;
}

/** The free spot (on a half-tile grid) that covers the most trail. */
export function bestSpot(run: sim.Run, range: number): Point | null {
  let best: Point | null = null;
  let bestScore = 0;
  for (let y = 0.5; y < run.map.height; y += 0.5) {
    for (let x = 0.5; x < run.map.width; x += 0.5) {
      if (!sim.isBuildable(run, x, y)) continue;
      const score = coverage(run, x, y, range);
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  return best;
}

/** Spend gold the way a decent player might: build the best tower it can, then upgrade. */
export function spend(run: sim.Run) {
  for (let guard = 0; guard < 100; guard++) {
    const options = TOWER_IDS.filter(
      (id) => sim.isUnlocked(run, id) && run.gold >= towerDef(id).cost,
    );
    const pick: TowerId | undefined = options.sort(
      (a, b) => towerDef(b).cost - towerDef(a).cost,
    )[0];
    if (pick && run.towers.length < 24) {
      const spot = bestSpot(run, towerDef(pick).levels[0].range);
      if (spot && sim.build(run, pick, spot.x, spot.y)) continue;
    }

    const upgradable = run.towers
      .map((t) => ({ t, cost: sim.nextUpgradeCost(t) }))
      .filter((u): u is { t: sim.Tower; cost: number } => u.cost !== null && u.cost <= run.gold)
      .sort((a, b) => a.cost - b.cost)[0];
    if (upgradable) {
      sim.upgrade(run, upgradable.t);
      continue;
    }
    return;
  }
}

/** Plays one run until an enemy gets through (or a time limit, in seconds of game time). */
export function playRun(
  seed: number,
  options: Partial<RunOptions> = {},
  maxTime = 3600,
): BotResult {
  const run = sim.createRun(seed, options);
  spend(run);
  sim.startWave(run);
  let sinceSpend = 0;
  while (!run.breached && run.time < maxTime) {
    sim.step(run, 0.05);
    run.events.length = 0;
    sinceSpend += 0.05;
    if (sinceSpend >= 1) {
      sinceSpend = 0;
      spend(run);
    }
  }
  return {
    wave: run.wave,
    held: sim.wavesHeld(run),
    era: run.era,
    chest: run.chest,
    kills: run.kills,
    towers: run.towers.length,
    time: run.time,
    coins: sim.runCoins(run),
  };
}

/** Spend the War Chest in the Last Stand: fill the wall with the best defender, then boosts. */
export function spendStand(stand: Stand) {
  for (let guard = 0; guard < 50; guard++) {
    const pick = UNIT_IDS.filter((id) => canHire(stand, id)).sort(
      (a, b) => unitDef(b).cost - unitDef(a).cost,
    )[0];
    if (pick && hire(stand, pick)) continue;
    const hurt = stand.wallHp < stand.wallMax * 0.6;
    const boost = BOOSTS.filter((b) => b.id !== 'repair' || hurt)
      .map((b) => ({ b, cost: boostCost(stand, b) }))
      .filter((x): x is { b: Boost; cost: number } => x.cost !== null && x.cost <= stand.chest)
      .sort((a, b) => a.cost - b.cost)[0];
    if (boost && buyBoost(stand, boost.b.id)) continue;
    return;
  }
}

export interface StandResult {
  time: number;
  held: number;
  wave: number;
  coins: number;
}

/** Plays a Last Stand until the wall falls (or a time limit, in seconds of game time). */
export function playStand(seed: number, opts: StandOptions, maxTime = 1800): StandResult {
  const stand = createStand(seed, opts);
  hireMasteryBuddies(stand);
  spendStand(stand);
  let since = 0;
  while (!stand.over && stand.time < maxTime) {
    stepStand(stand, 0.05);
    stand.events.length = 0;
    since += 0.05;
    if (since >= 1) {
      since = 0;
      spendStand(stand);
    }
  }
  return {
    time: stand.time,
    held: standWavesHeld(stand),
    wave: stand.wave,
    coins: standCoins(stand),
  };
}

// ---------- Whole campaigns (the upgrade web) ----------

export interface EraPace {
  era: number;
  runs: number;
  /** Minutes of play (both phases), not counting menus. */
  minutes: number;
}

/**
 * Plays run after run, spending coins in the upgrade web between runs the way a focused player
 * would: the cheapest node that counts toward the Evolve gate first, then save up for Evolve.
 * Returns how many runs (and minutes) each era took. Real kids buy fun stuff on the way, so
 * they will be a bit slower than this. Stops once it has Evolved past `lastEra`, or (in the last
 * era) once every node is bought.
 */
export function playCampaign(seed: number, lastEra = ERAS.length - 1, maxRuns = 3000): EraPace[] {
  const buyable = WEB_NODES.filter((n) => !n.empty).length;
  const bought: string[] = [];
  let coins = 0;
  const pace: EraPace[] = [{ era: 0, runs: 0, minutes: 0 }];
  for (let i = 0; i < maxRuns; i++) {
    const opts = runOptions(bought);
    if (opts.era > lastEra || ownedSet(bought).size >= buyable) break;
    const r = playRun(seed + i, opts);
    const s = playStand(seed + i, {
      era: opts.era,
      wave: r.wave,
      chest: r.chest,
      damageBonus: 1 + opts.bonusDamage,
      units: opts.units,
      unitMods: opts.unitMods,
      wallBonus: opts.wallBonus,
      coinBonus: opts.coinBonus,
    });
    coins += r.coins + s.coins;
    const now = pace[pace.length - 1]!;
    now.runs++;
    now.minutes += (r.time + s.time) / 60;
    coins = shopWeb(bought, coins);
    const era = currentEra(ownedSet(bought));
    if (era > now.era) pace.push({ era, runs: 0, minutes: 0 });
  }
  return pace.filter((p) => p.runs > 0 && p.era <= lastEra);
}

/** Spends coins in the web: gate nodes first (cheapest first), then saves for Evolve. */
export function shopWeb(bought: string[], coins: number): number {
  for (let guard = 0; guard < 200; guard++) {
    const owned = ownedSet(bought);
    const era = currentEra(owned);
    const next = era + 1 < ERAS.length ? webNode(eraNodeId(era + 1)) : undefined;
    if (next && nodeState(next, owned, coins) === 'open') {
      coins = buyNode(bought, coins, next.id)!;
      continue;
    }
    const pool = gateNodes(era).filter((n) => !owned.has(n.id));
    const choices = (pool.length || !next ? (pool.length ? pool : WEB_NODES) : [])
      .filter((n) => nodeState(n, owned, coins) === 'open')
      .sort((a, b) => a.cost - b.cost);
    if (!choices.length) return coins;
    coins = buyNode(bought, coins, choices[0]!.id)!;
  }
  return coins;
}
