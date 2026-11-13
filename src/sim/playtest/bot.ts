// A simple bot that plays Phase 1, used by tests and `npm run balance` to check pacing.
import { towerDef, TOWER_IDS, type TowerId } from '../data/towers';
import { relicsEarned, type RunOptions } from '../data/metaUpgrades';
import { posAt, type Point } from '../path';
import * as sim from '../run';

export interface BotResult {
  wave: number;
  held: number;
  time: number;
  relics: number;
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
    relics: relicsEarned(run),
  };
}
