// Permanent upgrades bought with Relics 🦴 between runs. To add one, add an entry here and
// read its level in `runOptions` below.
import { ERAS } from './eras';

export type MetaUpgradeId = 'era' | 'gold' | 'power';

export interface MetaUpgrade {
  id: MetaUpgradeId;
  name: string;
  emoji: string;
  /** What the next level does (or what you have, when maxed). */
  describe: (level: number) => string;
  costs: number[]; // Relic cost of each level, in order
  by?: string;
}

export const META_UPGRADES: MetaUpgrade[] = [
  {
    id: 'era',
    name: 'Evolve',
    emoji: '🧬',
    describe: (level) => {
      const next = ERAS[level + 1];
      return next ? `Start in the ${next.name} era ${next.base}` : 'You reached the Future! 🌐';
    },
    costs: ERAS.slice(1).map((e) => e.relicCost),
  },
  {
    id: 'gold',
    name: 'Treasure',
    emoji: '💰',
    describe: () => '+25 gold at the start of each run',
    costs: [3, 6, 10, 16, 24],
  },
  {
    id: 'power',
    name: 'Strong Arms',
    emoji: '💪',
    describe: () => '+10% damage for every tower',
    costs: [3, 6, 10, 16, 24],
  },
];

export type UpgradeLevels = Partial<Record<MetaUpgradeId, number>>;

export interface RunOptions {
  era: number;
  bonusGold: number;
  bonusDamage: number; // 0.1 = +10% tower damage
}

export function runOptions(levels: UpgradeLevels): RunOptions {
  return {
    era: Math.min(ERAS.length - 1, levels.era ?? 0),
    bonusGold: 25 * (levels.gold ?? 0),
    bonusDamage: 0.1 * (levels.power ?? 0),
  };
}

/** Relic cost of the next level, or null when maxed. */
export function nextCost(up: MetaUpgrade, level: number): number | null {
  return up.costs[level] ?? null;
}

/** Relics for a finished run: 1 per wave reached, plus 2 per boss stopped. */
export function relicsEarned(run: { wave: number; bosses: number }): number {
  return run.wave + 2 * run.bosses;
}
