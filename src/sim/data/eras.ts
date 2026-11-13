// Eras: each one changes the look of the map, the base, and which towers can be built.
// `evolveCost` is the gold needed to evolve INTO this era.
// `wallHp` is the outer wall's max HP while in this era (Evolve fully repairs it).
export interface Era {
  id: string;
  name: string;
  base: string;
  evolveCost: number;
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
    evolveCost: 0,
    wallHp: 20,
    ground: '#7fb653',
    ground2: '#76ad4b',
    path: '#d8b97c',
    decor: ['🌿', '🪨', '🌳'],
  },
  {
    id: 'ancient',
    name: 'Ancient',
    base: '🏛️',
    evolveCost: 120,
    wallHp: 25,
    ground: '#a6b85a',
    ground2: '#9daf52',
    path: '#e3cf98',
    decor: ['🌾', '🏺', '🌳'],
  },
  {
    id: 'medieval',
    name: 'Medieval',
    base: '🏰',
    evolveCost: 260,
    wallHp: 30,
    ground: '#5f9c4f',
    ground2: '#589448',
    path: '#b7a07a',
    decor: ['🌲', '🍄', '🌲'],
  },
  {
    id: 'gunpowder',
    name: 'Gunpowder',
    base: '🏯',
    evolveCost: 450,
    wallHp: 35,
    ground: '#6c9a6a',
    ground2: '#659263',
    path: '#c9b18a',
    decor: ['🌴', '🛢️', '⚓'],
  },
  {
    id: 'modern',
    name: 'Modern',
    base: '🏢',
    evolveCost: 700,
    wallHp: 40,
    ground: '#6f8a6f',
    ground2: '#688268',
    path: '#5b5f66',
    decor: ['🌳', '🚧', '🚗'],
  },
  {
    id: 'future',
    name: 'Future',
    base: '🌐',
    evolveCost: 1000,
    wallHp: 50,
    ground: '#3a4a7a',
    ground2: '#354471',
    path: '#7dd3fc',
    decor: ['💠', '🔷', '✨'],
  },
];
