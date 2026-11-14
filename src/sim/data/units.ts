// Wall defenders for the Last Stand (Phase 2). To add one, add one entry here.
//   era:    the era index that unlocks it. Plan: 4 per era, picked with the kids.
//   cost:   War Chest ⚔️ for one. Bought defenders show up on the wall by themselves.
//   splash: area damage radius (0 = single target)
//   dmg, range (how far out from the wall it reaches), rate (shots per second). Defenders don't
//   level up one by one; team boosts (src/sim/data/stand.ts) make them all stronger.
//   by:     who designed it, shown in the game. Put a kid's name here when it's their idea!
export interface UnitDef {
  name: string;
  emoji: string;
  era: number;
  cost: number;
  splash?: number;
  shot: { emoji?: string; color?: string; size: number; speed: number };
  dmg: number;
  range: number;
  rate: number;
  by?: string;
}

export const UNITS = {
  spear: {
    name: 'Spear Thrower',
    emoji: '🔱',
    era: 0,
    cost: 12,
    shot: { color: '#7a5230', size: 0.1, speed: 10 },
    dmg: 18,
    range: 5,
    rate: 1.2,
  },
  boulder: {
    name: 'Boulder Dropper',
    emoji: '🪨',
    era: 0,
    cost: 25,
    splash: 1.1,
    shot: { emoji: '🪨', size: 0.5, speed: 6 },
    dmg: 70,
    range: 3,
    rate: 0.35,
  },
  boomerang: {
    name: 'Boomerang Crew',
    emoji: '🪃',
    era: 1,
    cost: 30,
    shot: { emoji: '🪃', size: 0.3, speed: 8 },
    dmg: 33,
    range: 6,
    rate: 1.3,
  },
  oil: {
    name: 'Boiling Oil',
    emoji: '🫕',
    era: 2,
    cost: 55,
    splash: 1.2,
    shot: { color: '#ffb547', size: 0.2, speed: 6 },
    dmg: 60,
    range: 3,
    rate: 0.7,
  },
  musket: {
    name: 'Musket Line',
    emoji: '💂',
    era: 3,
    cost: 80,
    shot: { color: '#333', size: 0.08, speed: 16 },
    dmg: 135,
    range: 7,
    rate: 1.2,
  },
  dynamite: {
    name: 'Dynamite',
    emoji: '🧨',
    era: 4,
    cost: 120,
    splash: 1.4,
    shot: { emoji: '🧨', size: 0.3, speed: 7 },
    dmg: 165,
    range: 6,
    rate: 0.8,
  },
  drone: {
    name: 'Drone',
    emoji: '🛸',
    era: 5,
    cost: 180,
    shot: { color: '#7dd3fc', size: 0.1, speed: 18 },
    dmg: 300,
    range: 8,
    rate: 3,
  },
} satisfies Record<string, UnitDef>;

export type UnitId = keyof typeof UNITS;
export const UNIT_IDS = Object.keys(UNITS) as UnitId[];
export const unitDef = (id: UnitId): UnitDef => UNITS[id];
