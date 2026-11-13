/** Small seeded RNG (mulberry32). Use this in the sim instead of Math.random so tests are repeatable. */
export interface Rng {
  next(): number;
  pick<T>(arr: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    pick: <T>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)] as T,
  };
}
