// Wall defenders for the Last Stand (Phase 2). To add one, add one entry here.
//   era:    the era index that unlocks it. Plan: 4 per era, picked with the kids.
//   cost:   War Chest ⚔️ to put one on the wall
//   splash: area damage radius (0 = single target)
//   levels: stats for level 1, 2 and 3. range is how far out from the wall it reaches.
//   by:     who designed it, shown in the game. Put a kid's name here when it's their idea!
export interface UnitLevel {
  dmg: number;
  range: number;
  rate: number;
}

export interface UnitDef {
  name: string;
  emoji: string;
  era: number;
  cost: number;
  splash?: number;
  shot: { emoji?: string; color?: string; size: number; speed: number };
  levels: [UnitLevel, UnitLevel, UnitLevel];
  by?: string;
}

export const UNITS = {
  spear: {
    name: 'Spear Thrower',
    emoji: '🔱',
    era: 0,
    cost: 12,
    shot: { color: '#7a5230', size: 0.1, speed: 10 },
    levels: [
      { dmg: 12, range: 5, rate: 1.2 },
      { dmg: 20, range: 5.5, rate: 1.4 },
      { dmg: 30, range: 6, rate: 1.6 },
    ],
  },
  boomerang: {
    name: 'Boomerang Crew',
    emoji: '🪃',
    era: 1,
    cost: 30,
    shot: { emoji: '🪃', size: 0.3, speed: 8 },
    levels: [
      { dmg: 22, range: 6, rate: 1.3 },
      { dmg: 36, range: 6.5, rate: 1.5 },
      { dmg: 55, range: 7, rate: 1.7 },
    ],
  },
  oil: {
    name: 'Boiling Oil',
    emoji: '🫕',
    era: 2,
    cost: 55,
    splash: 1.2,
    shot: { color: '#ffb547', size: 0.2, speed: 6 },
    levels: [
      { dmg: 40, range: 3, rate: 0.7 },
      { dmg: 65, range: 3.3, rate: 0.8 },
      { dmg: 100, range: 3.6, rate: 0.9 },
    ],
  },
  musket: {
    name: 'Musket Line',
    emoji: '💂',
    era: 3,
    cost: 80,
    shot: { color: '#333', size: 0.08, speed: 16 },
    levels: [
      { dmg: 90, range: 7, rate: 1.2 },
      { dmg: 140, range: 7.5, rate: 1.3 },
      { dmg: 210, range: 8, rate: 1.4 },
    ],
  },
  dynamite: {
    name: 'Dynamite',
    emoji: '🧨',
    era: 4,
    cost: 120,
    splash: 1.4,
    shot: { emoji: '🧨', size: 0.3, speed: 7 },
    levels: [
      { dmg: 110, range: 6, rate: 0.8 },
      { dmg: 170, range: 6.5, rate: 0.85 },
      { dmg: 260, range: 7, rate: 0.9 },
    ],
  },
  drone: {
    name: 'Drone',
    emoji: '🛸',
    era: 5,
    cost: 180,
    shot: { color: '#7dd3fc', size: 0.1, speed: 18 },
    levels: [
      { dmg: 200, range: 8, rate: 3 },
      { dmg: 300, range: 8.5, rate: 3.3 },
      { dmg: 450, range: 9, rate: 3.6 },
    ],
  },
} satisfies Record<string, UnitDef>;

export type UnitId = keyof typeof UNITS;
export const UNIT_IDS = Object.keys(UNITS) as UnitId[];
export const unitDef = (id: UnitId): UnitDef => UNITS[id];

/** War Chest cost to go from `level` to `level + 1`. */
export const unitUpgradeCost = (def: UnitDef, level: number) =>
  Math.round(def.cost * (level === 0 ? 0.8 : 1.4));
