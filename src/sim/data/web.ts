// The upgrade web: what each node costs and does. The nodes themselves are built from the
// eras, towers and defenders data (src/sim/web.ts), so a new tower or defender shows up in the
// web by itself. Prices are in copper (see src/sim/coins.ts) for the Stone Age, and each era
// multiplies them by its `price` scale, so later eras cost (and pay) silver, gold and platinum.
//
// Pacing goal (David): about a dozen runs per era before you can Evolve. Check it with
// `npm run balance`, which plays whole campaigns with a bot.

export const WEB = {
  /** Run rewards in each era are multiplied by this (a new coin every two eras). */
  reward: [1, 10, 100, 1_000, 10_000, 100_000],
  /**
   * Prices in each era are multiplied by this. It grows faster than `reward`, so each era takes
   * more runs than the one before (David: early eras quick, later ones slower).
   */
  price: [2, 40, 600, 12_000, 120_000, 900_000],
  /** Evolving into the next era costs this × your current era's price scale. */
  evolve: 70,
  /** Unlocking the 2nd, 3rd and 4th tower (or defender) of an era. The 1st comes free. */
  unlock: [0, 6, 10, 15],
  /** How many upgrades every tower and defender needs before you can Evolve out of each era. */
  gateUpgrades: [2, 2, 3, 3, 4, 4],
  /** Towers and defenders shown per era. Empty slots are "?" until the kids pick one. */
  slots: 4,
};

/** What an upgrade does to one tower or defender type. Bonuses add up. */
export interface StepEffect {
  dmg?: number; // +share of damage (0.15 = +15%)
  rate?: number; // +share of attack speed
  range?: number; // +share of range
  mastery?: true; // towers start at level 2; defenders bring a free one to the Last Stand
}

export interface Step {
  id: string;
  name: string;
  emoji: string;
  cost: number; // copper, × the era's scale
  effect: StepEffect;
  by?: string;
}

/** Every tower and every defender gets this line of upgrades, in this order. */
export const STEPS: Step[] = [
  { id: 'power', name: 'Power', emoji: '💥', cost: 3, effect: { dmg: 0.15 } },
  { id: 'speed', name: 'Speed', emoji: '⚡', cost: 6, effect: { rate: 0.1 } },
  { id: 'reach', name: 'Reach', emoji: '🎯', cost: 12, effect: { range: 0.08 } },
  { id: 'power2', name: 'Power II', emoji: '💥', cost: 22, effect: { dmg: 0.2 } },
  { id: 'speed2', name: 'Speed II', emoji: '⚡', cost: 38, effect: { rate: 0.15 } },
  { id: 'reach2', name: 'Reach II', emoji: '🎯', cost: 60, effect: { range: 0.1 } },
  { id: 'power3', name: 'Power III', emoji: '💥', cost: 95, effect: { dmg: 0.3 } },
  { id: 'mastery', name: 'Mastery', emoji: '⭐', cost: 150, effect: { mastery: true } },
];

/** Camp upgrades: one line per era, straight out from the era. */
export type CampId = 'treasure' | 'arms' | 'lucky' | 'wall';

export interface CampStep {
  id: CampId;
  name: string;
  emoji: string;
  cost: number; // copper, × the era's scale
  by?: string;
}

export const CAMP: CampStep[] = [
  { id: 'treasure', name: 'Treasure', emoji: '💰', cost: 3 },
  { id: 'arms', name: 'Strong Arms', emoji: '💪', cost: 6 },
  { id: 'lucky', name: 'Lucky Find', emoji: '🍀', cost: 10 },
  { id: 'wall', name: 'Thick Wall', emoji: '🧱', cost: 15 },
];

export const campEffect = {
  treasure: 0.3, // + this share of the era's starting gold, every run
  arms: 0.1, // + damage for every tower and defender
  lucky: 0.1, // + coins from every run
  wall: 0.2, // + Last Stand wall HP
};
