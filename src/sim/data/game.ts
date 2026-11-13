// General run settings. Good knobs for a balance pass with the kids.
export const GAME = {
  enemySpeed: 1.6, // multiplies every enemy's speed
  towerRadius: 0.42, // how much room a tower takes up (towers can't overlap each other or the trail)
  boss: { hp: 8, gold: 5, size: 1.6 }, // boss multipliers
  earlyCallGold: 2, // gold per second left on the countdown when you call the next wave early
  warChest: {
    perKill: (tier: number) => 1 + tier, // War Chest per enemy stopped
    perBoss: (tier: number) => 20 * (tier + 1), // extra for a boss
  },
};
