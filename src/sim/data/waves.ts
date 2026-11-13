import { enemyDef, ENEMY_IDS, type EnemyId } from './enemies';
import type { Rng } from '../rng';

// Tunable wave numbers. Waves never stop getting harder, so the wall always falls eventually.
export const WAVES = {
  tierEvery: 5, // enemy tier goes up every N waves
  bossEvery: 5, // boss on every Nth wave
  breather: 5, // seconds between the last spawn of a wave and the next wave
  baseCount: 5, // enemies in wave 1 (roughly)
  countPerWave: 1, // extra enemies per wave
  hpInTier: 0.15, // +15% enemy HP for each wave within a tier (tiers end tough)
  hpPerWave: 0.03, // +3% enemy HP per wave overall
  endlessAfter: 30, // after this wave, HP grows faster...
  endlessGrowth: 1.1, // ...by this much per wave
  pastEraGrowth: 1.2, // once waves pass the era's own enemies, HP grows this much per wave
  firstGap: 0.9, // seconds between spawns in wave 1
  minGap: 0.35,
  waveBonus: (n: number) => 5 + n * 2, // gold paid when wave n starts (after the first)
};

const MAX_TIER = Math.max(...ENEMY_IDS.map((id) => enemyDef(id).tier));

/**
 * Enemy tier for wave n. It never goes past `maxTier` (the run's era), so a run only ever sees
 * enemies from its own era and earlier: next-era enemies stay a surprise for after you evolve.
 */
export function tierFor(wave: number, maxTier = MAX_TIER): number {
  return Math.min(maxTier, MAX_TIER, Math.floor((wave - 1) / WAVES.tierEvery));
}

/**
 * How many times enemies have "leveled up" by wave n: 0 while the era's own enemy tiers are
 * still coming in, then +1 every `tierEvery` waves. Only changes how they look (colors, armor).
 */
export function rankFor(wave: number, maxTier = MAX_TIER): number {
  return Math.max(0, Math.floor((wave - 1) / WAVES.tierEvery) - Math.min(maxTier, MAX_TIER));
}

/** How much tougher enemies are in wave n. Past the era's last tier, they keep getting tougher. */
export function hpScale(wave: number, maxTier = MAX_TIER): number {
  const lastTierEnds = (Math.min(maxTier, MAX_TIER) + 1) * WAVES.tierEvery;
  const past = Math.max(0, wave - lastTierEnds);
  const inTier = past ? WAVES.tierEvery - 1 : (wave - 1) % WAVES.tierEvery;
  let s = (1 + WAVES.hpInTier * inTier) * (1 + WAVES.hpPerWave * (wave - 1));
  s *= Math.pow(WAVES.pastEraGrowth, past);
  if (wave > WAVES.endlessAfter) s *= Math.pow(WAVES.endlessGrowth, wave - WAVES.endlessAfter);
  return s;
}

export interface Spawn {
  id: EnemyId;
  boss: boolean;
}

export interface Wave {
  gap: number;
  spawns: Spawn[];
}

const ofTier = (t: number) => ENEMY_IDS.filter((id) => enemyDef(id).tier === t);

/** Builds wave n (1-based). */
export function buildWave(n: number, rng: Rng, maxTier = MAX_TIER): Wave {
  const tier = tierFor(n, maxTier);
  const pool = ofTier(tier);
  const light = pool.filter((id) => !enemyDef(id).heavy);
  const heavy = pool.filter((id) => enemyDef(id).heavy);
  const prev = ofTier(tier - 1);
  const count = Math.round(WAVES.baseCount + n * WAVES.countPerWave);
  const spawns: Spawn[] = [];
  for (let i = 0; i < count; i++) {
    let id: EnemyId;
    if (prev.length && rng.next() < 0.2) id = rng.pick(prev);
    else if (heavy.length && i % 3 === 2) id = rng.pick(heavy);
    else id = rng.pick(light.length ? light : pool);
    spawns.push({ id, boss: false });
  }
  if (n % WAVES.bossEvery === 0)
    spawns.push({ id: rng.pick(heavy.length ? heavy : pool), boss: true });
  const gap = Math.max(WAVES.minGap, WAVES.firstGap - n * 0.02);
  return { gap, spawns };
}
