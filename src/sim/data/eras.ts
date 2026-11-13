// Eras: each one changes the look of the map, the base, and which towers can be built.
// Eras are unlocked between runs in the upgrade web (src/sim/web.ts). Each run starts in the
// highest era you have unlocked.
//   startGold: gold at the start of a run in this era (later towers cost more)
//   wall:      how the Last Stand wall looks
//   wallHp:    the wall's HP in this era (for the Last Stand; Phase 1 ends on the first leak)
export interface Era {
  id: string;
  name: string;
  base: string;
  startGold: number;
  wallHp: number;
  ground: string;
  ground2: string;
  path: string;
  decor: string[];
  /** How the Last Stand wall looks in this era. */
  wall: WallStyle;
}

export interface WallStyle {
  kind: 'logs' | 'blocks' | 'bricks' | 'concrete' | 'energy';
  color: string;
}

export const ERAS: Era[] = [
  {
    id: 'stone',
    name: 'Stone Age',
    base: '🛖',
    startGold: 80,
    wallHp: 10,
    ground: '#7fb653',
    ground2: '#76ad4b',
    path: '#d8b97c',
    decor: ['🌿', '🪵', '🌳'],
    wall: { kind: 'logs', color: '#8b5a2b' },
  },
  {
    id: 'ancient',
    name: 'Ancient',
    base: '🏛️',
    startGold: 180,
    wallHp: 13,
    ground: '#a6b85a',
    ground2: '#9daf52',
    path: '#e3cf98',
    decor: ['🌾', '🏺', '🌳'],
    wall: { kind: 'blocks', color: '#d9c08a' },
  },
  {
    id: 'medieval',
    name: 'Medieval',
    base: '🏰',
    startGold: 400,
    wallHp: 16,
    ground: '#5f9c4f',
    ground2: '#589448',
    path: '#b7a07a',
    decor: ['🌲', '🍄', '🌲'],
    wall: { kind: 'blocks', color: '#9a958c' },
  },
  {
    id: 'gunpowder',
    name: 'Gunpowder',
    base: '🏯',
    startGold: 750,
    wallHp: 19,
    ground: '#6c9a6a',
    ground2: '#659263',
    path: '#c9b18a',
    decor: ['🌴', '🛢️', '⚓'],
    wall: { kind: 'bricks', color: '#a8553a' },
  },
  {
    id: 'modern',
    name: 'Modern',
    base: '🏢',
    startGold: 1200,
    wallHp: 22,
    ground: '#6f8a6f',
    ground2: '#688268',
    path: '#5b5f66',
    decor: ['🌳', '🚧', '🚗'],
    wall: { kind: 'concrete', color: '#a7adb5' },
  },
  {
    id: 'future',
    name: 'Future',
    base: '🌐',
    startGold: 1800,
    wallHp: 26,
    ground: '#3a4a7a',
    ground2: '#354471',
    path: '#7dd3fc',
    decor: ['💠', '🔷', '✨'],
    wall: { kind: 'energy', color: '#5fd4ff' },
  },
];
