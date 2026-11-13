// General run settings. Good knobs for a balance pass with the kids.
export const GAME = {
  enemySpeed: 1.6, // multiplies every enemy's speed
  wallDamage: { normal: 1, heavy: 2, boss: 4 }, // how much an enemy hurts the wall when it gets through
  boss: { hp: 8, gold: 5, size: 1.6 }, // boss multipliers
  earlyCallGold: 2, // gold per second left on the countdown when you call the next wave early
  warChest: {
    perKill: (tier: number) => 1 + tier, // War Chest per enemy stopped
    perBoss: (tier: number) => 20 * (tier + 1), // extra for a boss
  },
};
