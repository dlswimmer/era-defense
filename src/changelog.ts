// Patch notes for the Options screen, newest first. Every PR that changes the game adds one
// entry at the TOP with the next id (usually its PR number). Write for kids: short, fun,
// what they will notice. No code words.

export interface Update {
  id: number;
  date: string; // YYYY-MM-DD
  title: string;
  notes: string[];
}

export const CHANGELOG: Update[] = [
  {
    id: 16,
    date: '2026-11-14',
    title: 'Dev mode for testing',
    notes: ['🛠️ Tester tools for grown-ups, to try new stuff fast.'],
  },
  {
    id: 15,
    date: '2026-11-14',
    title: 'Check for updates',
    notes: [
      '🔄 New “Check for updates” button in Options.',
      '✨ The menu tells you when a new update is ready, so you never miss one.',
    ],
  },
  {
    id: 14,
    date: '2026-11-14',
    title: 'Options and patch notes',
    notes: [
      '⚙️ New Options button on the main menu.',
      '📜 See what changed in each update right here!',
      '🔴 A red dot on Options means there is something new to read.',
    ],
  },
  {
    id: 13,
    date: '2026-11-14',
    title: 'Fair fights across the ages',
    notes: [
      '⚖️ Every tower and defender got tested by robot players and tuned to be fair.',
      '🧓 Gear from older ages still works, but costs a bit more in newer ages.',
      '🎯 Wall defenders stop wasting throws on monsters that are already beaten.',
    ],
  },
  {
    id: 12,
    date: '2026-11-14',
    title: 'Four new monsters!',
    notes: [
      '🪲 Scarab Scuttlers zoom in pairs in the Ancient age.',
      '🐢 Shellbacks hide in their shell, then hurry when it cracks.',
      '🟢 Goo Knights split into two Goo Bits in the Medieval age.',
      '🦇 Flappers fly, so nets can’t catch them!',
    ],
  },
  {
    id: 11,
    date: '2026-11-14',
    title: 'Ancient and Medieval ages',
    notes: [
      '🏹 Archers and the Boomerang Crew in the Ancient age.',
      '🏰 Catapults and the Boiling Oil crew in the Medieval age.',
      '🛡️ Monsters wear bronze and iron armor in later ages.',
      '🏛️ New temples, castles, trees and mushrooms to look at.',
    ],
  },
  {
    id: 10,
    date: '2026-11-13',
    title: 'A longer fight at the wall',
    notes: [
      '🧱 The Last Stand lasts longer, and monsters come in one wave at a time.',
      '💪 Defenders hit harder.',
      '🔧 Repair only shows up when your wall is hurt.',
    ],
  },
  {
    id: 9,
    date: '2026-11-13',
    title: 'Net Thrower and Boulder Dropper',
    notes: [
      '🕸️ Net Thrower (David’s idea!) catches monsters in nets.',
      '🪨 Boulder Dropper heaves giant boulders that hit lots of monsters at once.',
      '⏩ Evolving out of the Stone Age is a little quicker.',
    ],
  },
  {
    id: 8,
    date: '2026-11-13',
    title: 'The upgrade web',
    notes: [
      '🕸️ Upgrades are now a giant spiderweb with every age around the middle.',
      '🪙 Coins come in copper, silver, gold and platinum.',
      '⭐ Every tower and defender has 8 upgrades to buy.',
    ],
  },
  {
    id: 7,
    date: '2026-11-13',
    title: 'Monsters level up',
    notes: [
      '👹 Every 5 waves the monsters level up and look tougher: helmets, armor, spikes!',
      '🦴 Only monsters from your own age show up now.',
    ],
  },
  {
    id: 6,
    date: '2026-11-13',
    title: 'Cartoon Stone Age',
    notes: [
      '🎨 Real cartoon people and monsters instead of emoji.',
      '🪨 Watch the Rock Thrower wind up and throw!',
      '💨 Monsters go poof in a cloud of dust and stars.',
    ],
  },
];
