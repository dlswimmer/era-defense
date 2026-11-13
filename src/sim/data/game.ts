// General run settings. Good knobs for a balance pass with the kids.
export const GAME = {
  startGold: 100,
  wallDamage: { normal: 1, heavy: 2, boss: 5 }, // how much an enemy hurts the wall when it gets through
  boss: { hp: 8, gold: 5, size: 1.6 }, // boss multipliers
  warChest: {
    perKill: (tier: number) => 1 + tier, // War Chest per enemy stopped
    perBoss: (tier: number) => 20 * (tier + 1), // extra for a boss
  },
};
