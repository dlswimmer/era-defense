import { describe, expect, it } from 'vitest';
import { coinParts, coinText } from './coins';

describe('coins', () => {
  it('shows the two biggest tiers', () => {
    expect(coinText(0)).toBe('0 copper');
    expect(coinText(42)).toBe('42 copper');
    expect(coinText(150)).toBe('1 silver 50 copper');
    expect(coinText(12_345)).toBe('1 gold 23 silver');
    expect(coinText(3_000_000)).toBe('3 platinum');
    expect(coinText(1_050_000)).toBe('1 platinum 5 gold');
  });

  it('drops an empty second tier', () => {
    expect(coinText(500)).toBe('5 silver');
    expect(coinParts(10_000)).toHaveLength(1);
  });

  it('never shows fractions or negatives', () => {
    expect(coinText(-5)).toBe('0 copper');
    expect(coinText(9.9)).toBe('9 copper');
  });
});
