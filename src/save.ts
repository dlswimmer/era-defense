import type { UpgradeLevels } from './sim/data/metaUpgrades';

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
  relics: number; // Relics 🦴 waiting to be spent
  upgrades: UpgradeLevels; // level of each Relic upgrade
  ideas: Idea[];
  lastName: string;
}

const KEY = 'eraDefense.save';
export const SAVE_VERSION = 3;

export function defaultMeta(): Meta {
  return {
    version: SAVE_VERSION,
    best: { wave: 0, era: 0, chest: 0 },
    runs: 0,
    relics: 0,
    upgrades: {},
    ideas: [],
    lastName: '',
  };
}

export function migrate(raw: unknown): Meta {
  const base = defaultMeta();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Meta> & { votes?: unknown };
  // v1 had a Phase 2 style vote; it was decided (side view), so drop it.
  delete r.votes;
  // v2 had Thick Walls (wall HP). Phase 1 has no wall now, so those levels become Strong Arms.
  const upgrades: Record<string, number> = { ...(r.upgrades ?? {}) };
  if (upgrades.wall) upgrades.power = (upgrades.power ?? 0) + upgrades.wall;
  delete upgrades.wall;
  return {
    ...base,
    ...r,
    best: { ...base.best, ...(r.best ?? {}) },
    upgrades,
    relics: typeof r.relics === 'number' ? r.relics : 0,
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
