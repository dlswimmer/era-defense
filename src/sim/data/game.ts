// General run settings. Good knobs for a balance pass with the kids.
export const GAME = {
  enemySpeed: 1.6, // multiplies every enemy's speed
  towerRadius: 0.42, // how much room a tower takes up (towers can't overlap each other or the trail)
  boss: { hp: 8, gold: 5, size: 1.6 }, // boss multipliers
  earlyCallGold: 2, // gold per second left on the countdown when you call the next wave early
  // Older-era towers and defenders stay usable, but prices go up in a newer era: their cost
  // (and a tower's upgrade costs) × this for every era they are behind. Without it a fully
  // upgraded old one, still at its cheap old price, beat the new era's starter by far. With it,
  // it is only a bit better (David, Nov 14). `npm run balance -- units` measures it.
  oldGearPrice: { trail: 2.8, wall: 2.2 },
  warChest: {
    perKill: (tier: number) => 1 + tier, // War Chest per enemy stopped
    perBoss: (tier: number) => 20 * (tier + 1), // extra for a boss
  },
};
