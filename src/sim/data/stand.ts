// Last Stand (Phase 2) knobs. A side view with a little depth (2.5D): the wall is on the left,
// enemies walk in from far to the right along the ground. x runs along the field, y is height
// (screen down), z is depth into the screen (0 = front). Same tile units as Phase 1.
export const STAND = {
  view: { width: 10, height: 13 }, // one screen
  fieldWidth: 32, // the whole field: about 3 screens, so you can drag to look ahead
  groundY: 10.6, // ground level at the front (z = 0)
  depth: 3, // how deep the field and the wall go
  skew: 0.7, // 2.5D: each unit of depth moves things this far up and to the right on screen
  wall: { back: 0.3, front: 2.5, top: 6.6 }, // wall box: x from back to front, top height
  spawnX: 30, // enemies start about 2 screens away from the wall
  maxDefenders: 10, // how many fit on the wall
  wallHpScale: 15, // wall HP = era.wallHp × this
  enemySpeed: 1.1, // multiplies enemy speed
  attackEvery: 1, // seconds between an enemy's hits on the wall
  wallDamage: { normal: 1, heavy: 3, boss: 10 },
  minChest: 15, // you always get at least one defender, even after a rough Phase 1
  firstWaveIn: 1, // seconds before the first wave starts walking in
  breather: 4, // seconds between waves
  boostCostByEra: [1, 2.5, 4.5, 6.5, 10, 15], // boosts cost more in later eras (more War Chest there)
};

// Team boosts: bought with the War Chest during the Last Stand, they help every defender
// (or the wall). Each level costs more. To add one, add an entry and read it in stand.ts.
export type BoostId = 'power' | 'speed' | 'reach' | 'repair';

export interface Boost {
  id: BoostId;
  name: string;
  emoji: string;
  cost: (level: number) => number; // War Chest for the next level
  max?: number; // most levels you can buy (repair has no limit)
  by?: string;
}

export const BOOSTS: Boost[] = [
  { id: 'power', name: 'Power', emoji: '💥', cost: (l) => 20 + l * 20, max: 8 },
  { id: 'speed', name: 'Speed', emoji: '⚡', cost: (l) => 25 + l * 25, max: 6 },
  { id: 'reach', name: 'Reach', emoji: '🎯', cost: (l) => 15 + l * 20, max: 5 },
  { id: 'repair', name: 'Repair', emoji: '🧱', cost: (l) => 15 + l * 15 },
];

export const boostEffect = {
  power: (l: number) => 1 + 0.25 * l, // damage ×
  speed: (l: number) => 1 + 0.2 * l, // shots per second ×
  reach: (l: number) => 0.8 * l, // + tiles of range
  repair: 0.3, // heals this share of the wall's full HP
};
