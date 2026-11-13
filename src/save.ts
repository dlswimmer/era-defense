import { ERAS } from './sim/data/eras';
import { eraNodeId } from './sim/web';

// Saved progress on this device (localStorage). Every read and write is wrapped in try/catch
// because storage can be missing or blocked (private mode, full disk, old browsers).
// Bump SAVE_VERSION and add a migration in `migrate` when the shape changes.

export interface Idea {
  name: string;
  text: string;
  date: string;
}

export interface Meta {
  version: number;
  best: { wave: number; era: number; chest: number };
  runs: number;
  coins: number; // coins waiting to be spent, in copper (see src/sim/coins.ts)
  web: string[]; // upgrade-web nodes bought, in the order they were bought (src/sim/web.ts)
  ideas: Idea[];
  lastName: string;
}

const KEY = 'eraDefense.save';
export const SAVE_VERSION = 4;

export function defaultMeta(): Meta {
  return {
    version: SAVE_VERSION,
    best: { wave: 0, era: 0, chest: 0 },
    runs: 0,
    coins: 0,
    web: [],
    ideas: [],
    lastName: '',
  };
}

/** What the v3 Treasure and Strong Arms levels cost, in Relics. They are refunded as coins. */
const OLD_UPGRADE_COSTS = [3, 6, 10, 16, 24];

export function migrate(raw: unknown): Meta {
  const base = defaultMeta();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Meta> & {
    votes?: unknown;
    relics?: unknown;
    upgrades?: Record<string, number>;
  };
  // v1 had a Phase 2 style vote; it was decided (side view), so drop it.
  delete r.votes;
  let coins = typeof r.coins === 'number' ? r.coins : 0;
  let web = Array.isArray(r.web) ? r.web.filter((id) => typeof id === 'string') : [];
  // v2-v3 had Relics and a list of upgrades. Relics become copper; reached eras stay reached;
  // Treasure and Strong Arms (and v2 Thick Walls) are refunded so they can be spent in the web.
  if (r.upgrades || typeof r.relics === 'number') {
    const up = r.upgrades ?? {};
    coins += typeof r.relics === 'number' ? r.relics : 0;
    for (const key of ['gold', 'power', 'wall']) {
      const level = Math.min(OLD_UPGRADE_COSTS.length, Math.max(0, up[key] ?? 0));
      coins += OLD_UPGRADE_COSTS.slice(0, level).reduce((a, b) => a + b, 0);
    }
    const era = Math.min(ERAS.length - 1, Math.max(0, up.era ?? 0));
    for (let e = 1; e <= era; e++) web.push(eraNodeId(e));
    web = [...new Set(web)];
  }
  delete r.relics;
  delete r.upgrades;
  return {
    ...base,
    ...r,
    best: { ...base.best, ...(r.best ?? {}) },
    coins,
    web,
    ideas: Array.isArray(r.ideas) ? r.ideas : [],
    version: SAVE_VERSION,
  };
}

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : defaultMeta();
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(meta: Meta): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    // Storage blocked or full: the game still works, it just won't remember.
  }
}
