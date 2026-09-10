// A port of bettor-segmentation/src/simulate.py.
//
// The design constraint that matters: a bettor decides using the OPENING price
// and their own private estimate, and never observes the close. Closing prices
// do two things, both after the fact. They stand in for the true probability
// when a private estimate is generated, and they score closing line value once
// the bet is already placed.
//
// The closing price is an acceptable proxy for truth because the market layer
// work tested all seven leagues for mispricing against a sampling noise baseline
// and found every ratio between 0.68 and 1.26. No league was distinguishable
// from perfectly calibrated.

import { ARCHETYPES, type Archetype, type ArchetypeSpec } from "@/lib/archetypes";
import { market } from "@/lib/market";
import { Rng } from "@/lib/rng";

export interface SimulationOptions {
  accounts: number;
  seed: number;
}

export interface Simulation {
  seed: number;
  requestedAccounts: number;
  /** Archetype of each account that placed at least one bet. */
  kind: Archetype[];
  /** Index into the bet arrays where each account's bets begin. */
  start: Int32Array;
  /** How many bets each account placed, in date order. */
  count: Int32Array;
  stake: Float64Array;
  pnl: Float64Array;
  clv: Float64Array;
  accounts: number;
  bets: number;
  /** Milliseconds spent inside the simulation, reported rather than hidden. */
  elapsedMs: number;
}

function pickArchetype(rng: Rng, cumulative: number[]): number {
  const u: number = rng.next();
  for (let i = 0; i < cumulative.length; i += 1) {
    if (u < cumulative[i]) {
      return i;
    }
  }
  return cumulative.length - 1;
}

export function simulate({ accounts, seed }: SimulationOptions): Simulation {
  const startedAt: number = Date.now();
  const rng: Rng = new Rng(seed);
  const nMatches: number = market.matches;

  const shareTotal: number = ARCHETYPES.reduce(
    (sum: number, a: ArchetypeSpec): number => sum + a.share,
    0,
  );
  const cumulative: number[] = [];
  let running: number = 0;
  ARCHETYPES.forEach((a: ArchetypeSpec): void => {
    running += a.share / shareTotal;
    cumulative.push(running);
  });

  const kind: Archetype[] = [];
  const start: number[] = [];
  const count: number[] = [];
  const stake: number[] = [];
  const pnl: number[] = [];
  const clv: number[] = [];

  const est: number[] = [0, 0, 0];

  for (let account = 0; account < accounts; account += 1) {
    const spec: ArchetypeSpec = ARCHETYPES[pickArchetype(rng, cumulative)];
    const nBets: number = rng.integer(spec.betsLow, spec.betsHigh);
    // Date order, because detection scores an account's first k bets and the
    // market layer is already sorted by match date.
    const chosen: number[] = rng
      .sampleWithoutReplacement(nMatches, Math.min(nBets, nMatches))
      .sort((a: number, b: number): number => a - b);

    const accountStart: number = stake.length;

    for (let j = 0; j < chosen.length; j += 1) {
      const base: number = chosen[j] * 3;
      const late: boolean = rng.next() < spec.lateShare;

      // Private estimate: the truth, blurred by however well this bettor reads a game.
      let total: number = 0;
      for (let s = 0; s < 3; s += 1) {
        est[s] = market.closeProb[base + s] + rng.normal(0, spec.estSd);
      }
      if (spec.favBias !== 0) {
        let favourite: number = 0;
        for (let s = 1; s < 3; s += 1) {
          if (market.openProb[base + s] > market.openProb[base + favourite]) {
            favourite = s;
          }
        }
        est[favourite] += spec.favBias;
      }
      for (let s = 0; s < 3; s += 1) {
        est[s] = Math.min(0.99, Math.max(0.01, est[s]));
        total += est[s];
      }

      // What this bettor can actually see when they decide.
      const refProb: Float64Array = late ? market.closeProb : market.openProb;
      const refOdds: Float64Array = late ? market.closeOdds : market.openOdds;

      let pick: number = 0;
      let bestEdge: number = -Infinity;
      for (let s = 0; s < 3; s += 1) {
        const edge: number = est[s] / total - refProb[base + s];
        if (edge > bestEdge) {
          bestEdge = edge;
          pick = s;
        }
      }
      if (bestEdge < spec.edgeReq) {
        continue;
      }

      const size: number =
        Math.round(Math.max(1, rng.lognormal(Math.log(spec.stakeMu), spec.stakeCv)) * 100) / 100;
      const priceTaken: number = refOdds[base + pick];
      const closingPrice: number = market.closeOdds[base + pick];
      const won: boolean = market.winner[chosen[j]] === pick;

      stake.push(size);
      pnl.push(won ? size * (priceTaken - 1) : -size);
      // Closing line value: the only honest per-bet measure of skill available
      // before results accumulate. Positive means the price beat the market's
      // final word, whether or not the bet came in.
      clv.push(priceTaken / closingPrice - 1);
    }

    const placed: number = stake.length - accountStart;
    if (placed === 0) {
      continue;
    }
    kind.push(spec.kind);
    start.push(accountStart);
    count.push(placed);
  }

  return {
    seed,
    requestedAccounts: accounts,
    kind,
    start: Int32Array.from(start),
    count: Int32Array.from(count),
    stake: Float64Array.from(stake),
    pnl: Float64Array.from(pnl),
    clv: Float64Array.from(clv),
    accounts: kind.length,
    bets: stake.length,
    elapsedMs: Date.now() - startedAt,
  };
}
