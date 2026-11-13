// Enemies. To add a new enemy, add one entry here.
//   tier:   which group of waves it shows up in (tier goes up every 5 waves)
//   hp:     health at wave 1 (it grows each wave)
//   speed:  tiles per second
//   gold:   gold for stopping it
//   heavy:  the tough one of each tier. Bosses are a big version of the heavy enemy.
//   by:     who designed it (shown in the game)
export interface EnemyDef {
  name: string;
  emoji: string;
  tier: number;
  hp: number;
  speed: number;
  gold: number;
  heavy?: boolean;
  by?: string;
}

export const ENEMIES = {
  caveman: { name: 'Grumbler', emoji: '👾', tier: 0, hp: 20, speed: 1.0, gold: 3 },
  mammoth: { name: 'Woolly Brute', emoji: '🦣', tier: 0, hp: 60, speed: 0.6, gold: 6, heavy: true },
  warrior: { name: 'Warrior', emoji: '🛡️', tier: 1, hp: 50, speed: 1.0, gold: 5 },
  chariot: { name: 'Chariot', emoji: '🐎', tier: 1, hp: 80, speed: 1.5, gold: 7, heavy: true },
  knight: { name: 'Knight', emoji: '🏇', tier: 2, hp: 120, speed: 1.1, gold: 8 },
  ram: { name: 'Battering Ram', emoji: '🪵', tier: 2, hp: 260, speed: 0.55, gold: 12, heavy: true },
  musketeer: { name: 'Musketeer', emoji: '💂', tier: 3, hp: 170, speed: 1.1, gold: 10 },
  ship: { name: 'Pirate Ship', emoji: '⛵', tier: 3, hp: 380, speed: 0.6, gold: 18, heavy: true },
  soldier: { name: 'Soldier', emoji: '🪖', tier: 4, hp: 260, speed: 1.2, gold: 14 },
  helicopter: {
    name: 'Helicopter',
    emoji: '🚁',
    tier: 4,
    hp: 420,
    speed: 1.5,
    gold: 18,
    heavy: true,
  },
  robot: { name: 'Robot', emoji: '🤖', tier: 5, hp: 520, speed: 1.0, gold: 22 },
  ufo: { name: 'UFO', emoji: '🛸', tier: 5, hp: 800, speed: 1.4, gold: 30, heavy: true },
} satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof ENEMIES;
export const ENEMY_IDS = Object.keys(ENEMIES) as EnemyId[];
export const enemyDef = (id: EnemyId): EnemyDef => ENEMIES[id];
