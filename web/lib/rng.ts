// Seeded random numbers, so a run is reproducible from the seed shown on screen.
// numpy's Generator is not reproducible in a browser, so this is a different
// stream from the published run. The distributions are the same; the draws are not.

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** mulberry32. Small, fast, and good enough for Monte Carlo work. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t: number = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform integer in [low, high), matching numpy's integers(). */
  integer(low: number, high: number): number {
    return low + Math.floor(this.next() * (high - low));
  }

  /** Box-Muller. One draw kept, one discarded, which is fine at this cost. */
  normal(mean: number, sd: number): number {
    const u1: number = Math.max(this.next(), Number.EPSILON);
    const u2: number = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  lognormal(logMean: number, sigma: number): number {
    return Math.exp(this.normal(logMean, sigma));
  }

  /** Pick `count` distinct indices from [0, size) by rejection. */
  sampleWithoutReplacement(size: number, count: number): number[] {
    const taken: Set<number> = new Set<number>();
    while (taken.size < count) {
      taken.add(Math.floor(this.next() * size));
    }
    return Array.from(taken);
  }
}
