// Enemies. To add a new enemy, add one entry here.
//   tier:   which group of waves it shows up in (tier goes up every 5 waves)
//   hp:     health at wave 1 (it grows each wave)
//   speed:  tiles per second
//   gold:   gold for stopping it
//   heavy:  the tough one of each tier. Bosses are a big version of the heavy enemy.
//   pack:   comes in a little group of this many
//   shell:  a shell soaks up this share of its HP in damage first; then it walks shellSpeed × faster
//   split:  when stopped, splits into `count` of `into` (an enemy with noWave: never in a wave)
//   flying: nets can't catch it
//   by:     who designed it (shown in the game)
export interface EnemyDef {
  name: string;
  emoji: string;
  tier: number;
  hp: number;
  speed: number;
  gold: number;
  heavy?: boolean;
  pack?: number;
  shell?: number;
  shellSpeed?: number;
  split?: { into: string; count: number };
  flying?: boolean;
  noWave?: boolean;
  by?: string;
}

export const ENEMIES = {
  caveman: { name: 'Grumbler', emoji: '👾', tier: 0, hp: 20, speed: 1.0, gold: 3 },
  mammoth: { name: 'Woolly Brute', emoji: '🦣', tier: 0, hp: 60, speed: 0.6, gold: 6, heavy: true },
  // Ancient: the same monsters in bronze helmets and chest plates.
  bronzeGrumbler: { name: 'Bronze Grumbler', emoji: '👾', tier: 1, hp: 65, speed: 1.0, gold: 5 },
  bronzeBrute: {
    name: 'Bronze Brute',
    emoji: '🦣',
    tier: 1,
    hp: 170,
    speed: 0.65,
    gold: 8,
    heavy: true,
  },
  scuttler: {
    name: 'Scarab Scuttler',
    emoji: '🪲',
    tier: 1,
    hp: 22,
    speed: 1.7,
    gold: 3,
    pack: 2,
  },
  shellback: {
    name: 'Shellback',
    emoji: '🐢',
    tier: 1,
    hp: 110,
    speed: 0.45,
    gold: 10,
    heavy: true,
    shell: 1,
    shellSpeed: 2,
  },
  // Medieval: iron helmets, chain mail and maces.
  ironGrumbler: { name: 'Iron Grumbler', emoji: '👾', tier: 2, hp: 150, speed: 1.05, gold: 8 },
  ironBrute: {
    name: 'Iron Brute',
    emoji: '🦣',
    tier: 2,
    hp: 380,
    speed: 0.6,
    gold: 12,
    heavy: true,
  },
  goo: {
    name: 'Goo Knight',
    emoji: '🟢',
    tier: 2,
    hp: 90,
    speed: 0.9,
    gold: 6,
    split: { into: 'gooBit', count: 2 },
  },
  gooBit: { name: 'Goo Bit', emoji: '🟢', tier: 2, hp: 40, speed: 1.2, gold: 2, noWave: true },
  flapper: {
    name: 'Flapper',
    emoji: '🦇',
    tier: 2,
    hp: 80,
    speed: 1.3,
    gold: 7,
    flying: true,
  },
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
