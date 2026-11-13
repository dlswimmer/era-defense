// A simple bot that plays Phase 1, used by tests and `npm run balance` to check pacing.
import { towerDef, TOWER_IDS, type TowerId } from '../data/towers';
import { relicsEarned, type RunOptions } from '../data/metaUpgrades';
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

/** How many path tiles are within `range` of a cell: a rough "how good is this spot". */
function coverage(run: sim.Run, col: number, row: number, range: number): number {
  let n = 0;
  for (const key of run.map.pathCells) {
    const [c, r] = key.split(',').map(Number) as [number, number];
    if (Math.hypot(c - col, r - row) <= range) n++;
  }
  return n;
}

function bestSpot(run: sim.Run, range: number): { col: number; row: number } | null {
  let best: { col: number; row: number } | null = null;
  let bestScore = 0;
  for (let row = 0; row < run.map.rows; row++) {
    for (let col = 0; col < run.map.cols; col++) {
      if (!sim.isBuildable(run, col, row)) continue;
      const score = coverage(run, col, row, range);
      if (score > bestScore) {
        bestScore = score;
        best = { col, row };
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
      if (spot && sim.build(run, pick, spot.col, spot.row)) continue;
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

/** Plays one run until the wall falls (or a time limit, in seconds of game time). */
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
