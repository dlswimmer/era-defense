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
  ideas: Idea[];
  votes: { topdown: number; side: number };
  lastName: string;
}

const KEY = 'eraDefense.save';
export const SAVE_VERSION = 1;

export function defaultMeta(): Meta {
  return {
    version: SAVE_VERSION,
    best: { wave: 0, era: 0, chest: 0 },
    runs: 0,
    ideas: [],
    votes: { topdown: 0, side: 0 },
    lastName: '',
  };
}

export function migrate(raw: unknown): Meta {
  const base = defaultMeta();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Meta>;
  return {
    ...base,
    ...r,
    best: { ...base.best, ...(r.best ?? {}) },
    votes: { ...base.votes, ...(r.votes ?? {}) },
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
