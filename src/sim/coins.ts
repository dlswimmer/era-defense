// Coins 🪙: what runs pay out and what the upgrade web costs. Under the hood it is one whole
// number of copper; on screen it shows as copper, silver, gold and platinum (each worth 100 of
// the one before), so later eras get shinier coins instead of ever-longer numbers.

export type CoinTier = 'copper' | 'silver' | 'gold' | 'platinum';

export const COIN_TIERS: { tier: CoinTier; value: number; color: string }[] = [
  { tier: 'platinum', value: 1_000_000, color: '#9ff0ff' },
  { tier: 'gold', value: 10_000, color: '#ffcf3f' },
  { tier: 'silver', value: 100, color: '#c9d1da' },
  { tier: 'copper', value: 1, color: '#d4844a' },
];

/**
 * The coins to show for an amount: at most the two biggest tiers, skipping empty ones.
 * 12_345 → [1 gold, 23 silver]. 0 → [0 copper].
 */
export function coinParts(amount: number): { tier: CoinTier; count: number; color: string }[] {
  let left = Math.max(0, Math.floor(amount));
  const parts: { tier: CoinTier; count: number; color: string }[] = [];
  for (const { tier, value, color } of COIN_TIERS) {
    const count = Math.floor(left / value);
    left -= count * value;
    if (count > 0 || (parts.length > 0 && parts.length < 2)) parts.push({ tier, count, color });
    if (parts.length === 2) break;
  }
  // A second tier of 0 adds nothing ("3 gold 0 silver" is just "3 gold").
  if (parts.length === 2 && parts[1]!.count === 0) parts.pop();
  return parts.length ? parts : [{ tier: 'copper', count: 0, color: COIN_TIERS[3]!.color }];
}

/** Plain text for an amount, like "1 gold 23 silver". */
export function coinText(amount: number): string {
  return coinParts(amount)
    .map((p) => `${p.count} ${p.tier}`)
    .join(' ');
}
