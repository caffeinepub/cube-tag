/**
 * Mulberry32 seeded pseudo-random number generator.
 * Returns a function that generates numbers in [0, 1).
 */
export function createSeededRandom(seed: number) {
  let s = seed >>> 0;
  return (): number => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInRange(
  rng: () => number,
  min: number,
  max: number,
): number {
  return min + rng() * (max - min);
}

export function randomIntInRange(
  rng: () => number,
  min: number,
  max: number,
): number {
  return Math.floor(randomInRange(rng, min, max + 1));
}
