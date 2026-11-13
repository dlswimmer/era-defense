// Eras: each one changes the look of the map, the base, and which towers can be built.
// Eras are unlocked between runs with Relics (the Evolve upgrade). Each run starts in the
// highest era you have unlocked.
//   relicCost: Relics needed to evolve INTO this era
//   startGold: gold at the start of a run in this era (later towers cost more)
//   wallHp:    the outer wall's HP in this era
export interface Era {
  id: string;
  name: string;
  base: string;
  relicCost: number;
  startGold: number;
  wallHp: number;
  ground: string;
  ground2: string;
  path: string;
  decor: string[];
}

export const ERAS: Era[] = [
  {
    id: 'stone',
    name: 'Stone Age',
    base: '🛖',
    relicCost: 0,
    startGold: 80,
    wallHp: 10,
    ground: '#7fb653',
    ground2: '#76ad4b',
    path: '#d8b97c',
    decor: ['🌿', '🪨', '🌳'],
  },
  {
    id: 'ancient',
    name: 'Ancient',
    base: '🏛️',
    relicCost: 6,
    startGold: 180,
    wallHp: 13,
    ground: '#a6b85a',
    ground2: '#9daf52',
    path: '#e3cf98',
    decor: ['🌾', '🏺', '🌳'],
  },
  {
    id: 'medieval',
    name: 'Medieval',
    base: '🏰',
    relicCost: 14,
    startGold: 400,
    wallHp: 16,
    ground: '#5f9c4f',
    ground2: '#589448',
    path: '#b7a07a',
    decor: ['🌲', '🍄', '🌲'],
  },
  {
    id: 'gunpowder',
    name: 'Gunpowder',
    base: '🏯',
    relicCost: 26,
    startGold: 750,
    wallHp: 19,
    ground: '#6c9a6a',
    ground2: '#659263',
    path: '#c9b18a',
    decor: ['🌴', '🛢️', '⚓'],
  },
  {
    id: 'modern',
    name: 'Modern',
    base: '🏢',
    relicCost: 42,
    startGold: 1200,
    wallHp: 22,
    ground: '#6f8a6f',
    ground2: '#688268',
    path: '#5b5f66',
    decor: ['🌳', '🚧', '🚗'],
  },
  {
    id: 'future',
    name: 'Future',
    base: '🌐',
    relicCost: 64,
    startGold: 1800,
    wallHp: 26,
    ground: '#3a4a7a',
    ground2: '#354471',
    path: '#7dd3fc',
    decor: ['💠', '🔷', '✨'],
  },
];
