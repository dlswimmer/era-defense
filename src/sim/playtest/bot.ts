// A simple bot that plays Phase 1, used by tests and `npm run balance` to check pacing.
import { towerDef, TOWER_IDS, type TowerId } from '../data/towers';
import * as sim from '../run';

export interface BotResult {
  wave: number;
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

/** Spend gold the way a decent player might: keep up with the eras, then build, then upgrade. */
export function spend(run: sim.Run) {
  for (let guard = 0; guard < 100; guard++) {
    const evolveCost = sim.evolveCost(run);
    const behind = sim.nextWaveTier(run) > run.era;
    if (evolveCost !== null && run.gold >= evolveCost && (behind || run.gold > evolveCost + 150)) {
      sim.evolve(run);
      continue;
    }
    if (behind && evolveCost !== null && run.towers.length >= 3) return; // save up to evolve

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

export function playRun(seed: number, maxWaves = 200): BotResult {
  const run = sim.createRun(seed);
  while (!run.breached && run.wave < maxWaves) {
    spend(run);
    sim.startWave(run);
    while (run.waveActive && !run.breached) {
      sim.step(run, 0.05);
      run.events.length = 0;
    }
  }
  return {
    wave: run.wave,
    era: run.era,
    chest: run.chest,
    kills: run.kills,
    towers: run.towers.length,
  };
}
