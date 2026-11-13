// Towers. To add a new tower, add one entry here.
//   era:    the era index that unlocks it (see eras.js)
//   kind:   'shot' (a projectile flies to the enemy), 'beam' (instant hit), 'chain' (zaps several enemies)
//   splash: area damage radius in tiles (0 = single target)
//   levels: stats for level 1, 2 and 3. range is in tiles, rate is shots per second.
//   by:     who designed it, shown in the game. Put a kid's name here when it's their idea!
export interface TowerLevel {
  dmg: number;
  range: number;
  rate: number;
}

export interface TowerDef {
  name: string;
  emoji: string;
  era: number;
  cost: number;
  kind: 'shot' | 'beam' | 'chain';
  splash?: number;
  chain?: number;
  shot?: { emoji?: string; color?: string; size: number; speed: number };
  beam?: { color: string; width: number };
  levels: [TowerLevel, TowerLevel, TowerLevel];
  by?: string;
}

export const TOWERS = {
  rock: {
    name: 'Rock Thrower',
    emoji: '🪨',
    era: 0,
    cost: 30,
    kind: 'shot',
    shot: { emoji: '🪨', size: 0.28, speed: 7 },
    levels: [
      { dmg: 6, range: 2.2, rate: 1.2 },
      { dmg: 10, range: 2.4, rate: 1.4 },
      { dmg: 16, range: 2.6, rate: 1.6 },
    ],
  },
  archer: {
    name: 'Archer',
    emoji: '🏹',
    era: 1,
    cost: 60,
    kind: 'shot',
    shot: { color: '#6b4423', size: 0.1, speed: 11 },
    levels: [
      { dmg: 12, range: 3.0, rate: 1.6 },
      { dmg: 20, range: 3.2, rate: 1.8 },
      { dmg: 32, range: 3.5, rate: 2.0 },
    ],
  },
  catapult: {
    name: 'Catapult',
    emoji: '🎯',
    era: 2,
    cost: 110,
    kind: 'shot',
    splash: 0.9,
    shot: { emoji: '🪨', size: 0.4, speed: 5 },
    levels: [
      { dmg: 30, range: 3.2, rate: 0.6 },
      { dmg: 50, range: 3.4, rate: 0.7 },
      { dmg: 80, range: 3.6, rate: 0.8 },
    ],
  },
  cannon: {
    name: 'Cannon',
    emoji: '💣',
    era: 3,
    cost: 170,
    kind: 'shot',
    splash: 1.0,
    shot: { color: '#111', size: 0.14, speed: 9 },
    levels: [
      { dmg: 55, range: 3.0, rate: 0.8 },
      { dmg: 90, range: 3.2, rate: 0.9 },
      { dmg: 140, range: 3.4, rate: 1.0 },
    ],
  },
  machinegun: {
    name: 'Machine Gun',
    emoji: '🔫',
    era: 4,
    cost: 240,
    kind: 'shot',
    shot: { color: '#ffd34d', size: 0.06, speed: 16 },
    levels: [
      { dmg: 14, range: 2.8, rate: 8 },
      { dmg: 22, range: 3.0, rate: 9 },
      { dmg: 32, range: 3.2, rate: 10 },
    ],
  },
  rocket: {
    name: 'Rocket',
    emoji: '🚀',
    era: 4,
    cost: 300,
    kind: 'shot',
    splash: 1.2,
    shot: { emoji: '🔥', size: 0.3, speed: 7 },
    levels: [
      { dmg: 120, range: 4.2, rate: 0.7 },
      { dmg: 190, range: 4.4, rate: 0.75 },
      { dmg: 290, range: 4.6, rate: 0.8 },
    ],
  },
  laser: {
    name: 'Laser',
    emoji: '🔆',
    era: 5,
    cost: 420,
    kind: 'beam',
    beam: { color: '#ff4df0', width: 3 },
    levels: [
      { dmg: 40, range: 3.5, rate: 6 },
      { dmg: 65, range: 3.8, rate: 6.5 },
      { dmg: 100, range: 4.1, rate: 7 },
    ],
  },
  tesla: {
    name: 'Tesla Coil',
    emoji: '⚡',
    era: 5,
    cost: 480,
    kind: 'chain',
    chain: 4,
    beam: { color: '#7df9ff', width: 2 },
    levels: [
      { dmg: 90, range: 2.8, rate: 1.2 },
      { dmg: 140, range: 3.0, rate: 1.3 },
      { dmg: 210, range: 3.2, rate: 1.4 },
    ],
  },
} satisfies Record<string, TowerDef>;

export type TowerId = keyof typeof TOWERS;
export const TOWER_IDS = Object.keys(TOWERS) as TowerId[];
export const towerDef = (id: TowerId): TowerDef => TOWERS[id];

// Cost to go from `level` (0-based) to the next level.
export function upgradeCost(def: TowerDef, level: number): number {
  return Math.round(def.cost * (level === 0 ? 0.8 : 1.4));
}

// Selling gives back 70% of everything spent on the tower.
export function sellValue(spent: number): number {
  return Math.floor(spent * 0.7);
}
