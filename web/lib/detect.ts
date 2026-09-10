// A port of bettor-segmentation/src/detect.py.
//
// The headline question: how many settled bets does it take to tell a sharp
// bettor from a lucky recreational one, and what does acting too early or too
// late cost?
//
// Two candidate signals. Realized profit and loss is what most people reach for
// first, and a bet either wins or loses, so it is a very noisy read on a
// probability. Closing line value scores the decision rather than the outcome,
// so it carries information from the moment the bet is placed.

import { ADVERSE, type Archetype } from "@/lib/archetypes";
import type { Simulation } from "@/lib/simulate";

export const EVIDENCE_WINDOWS: number[] = [5, 10, 15, 20, 30, 40, 50, 75, 100];

/** Below this many scored accounts a point on the curve is not reported. */
const MIN_SCORED_ACCOUNTS: number = 200;

/** A restricted account keeps betting at a tenth of its previous size. */
export const STAKE_FACTOR: number = 0.1;

export interface ScoredAccount {
  index: number;
  kind: Archetype;
  adverse: boolean;
  meanClv: number;
  roi: number;
}

export interface CurvePoint {
  k: number;
  accounts: number;
  adverse: number;
  aucClv: number;
  aucRoi: number;
}

export interface PolicyResult {
  k: number;
  threshold: number;
  /** Accounts that reached k bets and were therefore eligible to be judged. */
  scored: number;
  restricted: number;
  caught: number;
  wronglyCut: number;
  missed: number;
  doNothing: number;
  withPolicy: number;
  oracle: number;
  gain: number;
  shareOfOracle: number;
}

export interface SegmentSummary {
  kind: Archetype;
  accounts: number;
  bets: number;
  handle: number;
  bookPnl: number;
  bookHold: number;
  meanClv: number;
  avgStake: number;
}

/** Area under the ROC curve, from ranks. No library, same as the Python. */
export function auc(scores: number[], labels: boolean[]): number {
  const n: number = scores.length;
  const positives: number = labels.filter(Boolean).length;
  const negatives: number = n - positives;
  if (positives === 0 || negatives === 0) {
    return Number.NaN;
  }
  const order: number[] = Array.from({ length: n }, (_, i: number): number => i).sort(
    (a: number, b: number): number => scores[a] - scores[b],
  );
  const ranks: number[] = new Array<number>(n);
  order.forEach((idx: number, position: number): void => {
    ranks[idx] = position + 1;
  });
  let rankSum: number = 0;
  labels.forEach((isPositive: boolean, i: number): void => {
    if (isPositive) {
      rankSum += ranks[i];
    }
  });
  return (rankSum - (positives * (positives + 1)) / 2) / (positives * negatives);
}

/** Score every account that has at least k settled bets, on its first k. */
export function scoreAccounts(sim: Simulation, k: number): ScoredAccount[] {
  const out: ScoredAccount[] = [];
  for (let i = 0; i < sim.accounts; i += 1) {
    if (sim.count[i] < k) {
      continue;
    }
    const from: number = sim.start[i];
    let clvSum: number = 0;
    let pnlSum: number = 0;
    let handle: number = 0;
    for (let j = from; j < from + k; j += 1) {
      clvSum += sim.clv[j];
      pnlSum += sim.pnl[j];
      handle += sim.stake[j];
    }
    out.push({
      index: i,
      kind: sim.kind[i],
      adverse: ADVERSE.has(sim.kind[i]),
      meanClv: clvSum / k,
      roi: handle > 0 ? pnlSum / handle : 0,
    });
  }
  return out;
}

export function detectionCurve(sim: Simulation, windows: number[] = EVIDENCE_WINDOWS): CurvePoint[] {
  const points: CurvePoint[] = [];
  windows.forEach((k: number): void => {
    const scored: ScoredAccount[] = scoreAccounts(sim, k);
    if (scored.length < MIN_SCORED_ACCOUNTS) {
      return;
    }
    const labels: boolean[] = scored.map((a: ScoredAccount): boolean => a.adverse);
    const adverse: number = labels.filter(Boolean).length;
    if (adverse === 0) {
      return;
    }
    points.push({
      k,
      accounts: scored.length,
      adverse,
      aucClv: auc(
        scored.map((a: ScoredAccount): number => a.meanClv),
        labels,
      ),
      aucRoi: auc(
        scored.map((a: ScoredAccount): number => a.roi),
        labels,
      ),
    });
  });
  return points;
}

/** Linear interpolated quantile, matching the pandas default. */
export function quantile(values: number[], q: number): number {
  if (values.length === 0) {
    return Number.NaN;
  }
  const sorted: number[] = [...values].sort((a: number, b: number): number => a - b);
  const position: number = q * (sorted.length - 1);
  const lower: number = Math.floor(position);
  const upper: number = Math.ceil(position);
  if (lower === upper) {
    return sorted[lower];
  }
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

/**
 * Price a stake factor policy in the only currency that matters: what the book
 * ends up with.
 *
 * The decision is not restrict or not, it is a dial. An account judged adverse
 * after k bets keeps betting at a tenth of its previous size. Everyone else is
 * untouched, and accounts with fewer than k bets are never scored, which is what
 * actually happens on a desk.
 *
 * Every policy is measured against two reference points. Do nothing leaves every
 * account alone. Perfect foresight cuts only the accounts that truly are adverse,
 * which is not achievable and is there as a ceiling. The interesting number is
 * how much of that ceiling a policy built on k bets of evidence captures.
 */
export function policyOutcome(sim: Simulation, k: number, threshold: number): PolicyResult | null {
  const scored: ScoredAccount[] = scoreAccounts(sim, k);
  if (scored.length === 0) {
    return null;
  }
  const cutoff: number = quantile(
    scored.map((a: ScoredAccount): number => a.meanClv),
    threshold,
  );
  const cut: Set<number> = new Set<number>(
    scored
      .filter((a: ScoredAccount): boolean => a.meanClv >= cutoff)
      .map((a: ScoredAccount): number => a.index),
  );

  let caught: number = 0;
  let wronglyCut: number = 0;
  let missed: number = 0;
  scored.forEach((a: ScoredAccount): void => {
    const isCut: boolean = cut.has(a.index);
    if (isCut && a.adverse) {
      caught += 1;
    } else if (isCut) {
      wronglyCut += 1;
    } else if (a.adverse) {
      missed += 1;
    }
  });

  let doNothing: number = 0;
  let withPolicy: number = 0;
  let oracle: number = 0;
  let hasFuture: boolean = false;
  for (let i = 0; i < sim.accounts; i += 1) {
    if (sim.count[i] <= k) {
      continue;
    }
    hasFuture = true;
    const from: number = sim.start[i] + k;
    const to: number = sim.start[i] + sim.count[i];
    let bookPnl: number = 0;
    for (let j = from; j < to; j += 1) {
      bookPnl -= sim.pnl[j];
    }
    doNothing += bookPnl;
    withPolicy += bookPnl * (cut.has(i) ? STAKE_FACTOR : 1);
    oracle += bookPnl * (ADVERSE.has(sim.kind[i]) ? STAKE_FACTOR : 1);
  }
  if (!hasFuture) {
    return null;
  }

  const gain: number = withPolicy - doNothing;
  return {
    k,
    threshold,
    scored: scored.length,
    restricted: cut.size,
    caught,
    wronglyCut,
    missed,
    doNothing,
    withPolicy,
    oracle,
    gain,
    shareOfOracle: oracle !== doNothing ? gain / (oracle - doNothing) : Number.NaN,
  };
}

export function segmentSummary(sim: Simulation): SegmentSummary[] {
  const byKind: Map<Archetype, SegmentSummary> = new Map<Archetype, SegmentSummary>();
  for (let i = 0; i < sim.accounts; i += 1) {
    const kind: Archetype = sim.kind[i];
    const row: SegmentSummary = byKind.get(kind) ?? {
      kind,
      accounts: 0,
      bets: 0,
      handle: 0,
      bookPnl: 0,
      bookHold: 0,
      meanClv: 0,
      avgStake: 0,
    };
    row.accounts += 1;
    const from: number = sim.start[i];
    const to: number = from + sim.count[i];
    for (let j = from; j < to; j += 1) {
      row.bets += 1;
      row.handle += sim.stake[j];
      row.bookPnl -= sim.pnl[j];
      row.meanClv += sim.clv[j];
    }
    byKind.set(kind, row);
  }
  return Array.from(byKind.values()).map((row: SegmentSummary): SegmentSummary => ({
    ...row,
    bookHold: row.handle > 0 ? row.bookPnl / row.handle : 0,
    meanClv: row.bets > 0 ? row.meanClv / row.bets : 0,
    avgStake: row.bets > 0 ? row.handle / row.bets : 0,
  }));
}

/** Per archetype histogram of mean CLV, on the same edges the published run uses. */
export function clvHistogram(
  sim: Simulation,
  edges: number[],
  minBets: number = 30,
): Record<string, number[]> {
  const counts: Record<string, number[]> = {};
  for (let i = 0; i < sim.accounts; i += 1) {
    if (sim.count[i] < minBets) {
      continue;
    }
    const from: number = sim.start[i];
    const to: number = from + sim.count[i];
    let sum: number = 0;
    for (let j = from; j < to; j += 1) {
      sum += sim.clv[j];
    }
    const mean: number = sum / sim.count[i];
    const kind: string = sim.kind[i];
    if (!counts[kind]) {
      counts[kind] = new Array<number>(edges.length - 1).fill(0);
    }
    let bin: number = -1;
    for (let e = 0; e < edges.length - 1; e += 1) {
      if (mean >= edges[e] && mean < edges[e + 1]) {
        bin = e;
        break;
      }
    }
    if (mean === edges[edges.length - 1]) {
      bin = edges.length - 2;
    }
    if (bin >= 0) {
      counts[kind][bin] += 1;
    }
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Evidence that one run is not a fluke, and that the separation is real rather
// than a summary statistic hiding a messy picture.
// ---------------------------------------------------------------------------

export interface RocPoint {
  falsePositive: number;
  truePositive: number;
}

/** ROC for one signal, so the separation can be seen rather than summarised. */
export function rocCurve(scored: ScoredAccount[], signal: (a: ScoredAccount) => number): RocPoint[] {
  const ordered: ScoredAccount[] = [...scored].sort(
    (a: ScoredAccount, b: ScoredAccount): number => signal(b) - signal(a),
  );
  const positives: number = ordered.filter((a: ScoredAccount): boolean => a.adverse).length;
  const negatives: number = ordered.length - positives;
  if (positives === 0 || negatives === 0) {
    return [];
  }
  const points: RocPoint[] = [{ falsePositive: 0, truePositive: 0 }];
  let tp: number = 0;
  let fp: number = 0;
  ordered.forEach((a: ScoredAccount): void => {
    if (a.adverse) {
      tp += 1;
    } else {
      fp += 1;
    }
    points.push({ falsePositive: fp / negatives, truePositive: tp / positives });
  });
  return points;
}

export interface StabilityPoint {
  k: number;
  clv: number[];
  roi: number[];
  clvMin: number;
  clvMax: number;
  clvMedian: number;
  roiMin: number;
  roiMax: number;
  roiMedian: number;
}

function median(values: number[]): number {
  const sorted: number[] = [...values].sort((a: number, b: number): number => a - b);
  const mid: number = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Collapse many runs' curves into a range per evidence window. */
export function summariseStability(runs: CurvePoint[][]): StabilityPoint[] {
  const byK: Map<number, { clv: number[]; roi: number[] }> = new Map();
  runs.forEach((curve: CurvePoint[]): void => {
    curve.forEach((p: CurvePoint): void => {
      const entry = byK.get(p.k) ?? { clv: [], roi: [] };
      entry.clv.push(p.aucClv);
      entry.roi.push(p.aucRoi);
      byK.set(p.k, entry);
    });
  });
  return Array.from(byK.entries())
    .sort((a, b): number => a[0] - b[0])
    .map(([k, v]): StabilityPoint => ({
      k,
      clv: v.clv,
      roi: v.roi,
      clvMin: Math.min(...v.clv),
      clvMax: Math.max(...v.clv),
      clvMedian: median(v.clv),
      roiMin: Math.min(...v.roi),
      roiMax: Math.max(...v.roi),
      roiMedian: median(v.roi),
    }));
}

export interface PercentileRow {
  kind: Archetype;
  accounts: number;
  medianClv: number;
  medianPercentile: number;
}

/**
 * Where each archetype sits in the CLV ranking. This is the figure that shows
 * why a CLV cut-off alone is the wrong policy: semi sharps rank high and the
 * book makes money on them.
 */
export function percentileByArchetype(scored: ScoredAccount[]): PercentileRow[] {
  const ordered: ScoredAccount[] = [...scored].sort(
    (a: ScoredAccount, b: ScoredAccount): number => a.meanClv - b.meanClv,
  );
  const rank: Map<number, number> = new Map();
  ordered.forEach((a: ScoredAccount, i: number): void => {
    rank.set(a.index, (i + 1) / ordered.length);
  });
  const groups: Map<Archetype, ScoredAccount[]> = new Map();
  scored.forEach((a: ScoredAccount): void => {
    const list: ScoredAccount[] = groups.get(a.kind) ?? [];
    list.push(a);
    groups.set(a.kind, list);
  });
  return Array.from(groups.entries()).map(([kind, list]): PercentileRow => ({
    kind,
    accounts: list.length,
    medianClv: median(list.map((a: ScoredAccount): number => a.meanClv)),
    medianPercentile: median(list.map((a: ScoredAccount): number => rank.get(a.index) ?? 0)),
  }));
}

/** Per archetype histogram of realized return on the first k bets. */
export function roiHistogram(
  scored: ScoredAccount[],
  edges: number[],
): Record<string, number[]> {
  const counts: Record<string, number[]> = {};
  scored.forEach((a: ScoredAccount): void => {
    if (!counts[a.kind]) {
      counts[a.kind] = new Array<number>(edges.length - 1).fill(0);
    }
    const clamped: number = Math.min(
      Math.max(a.roi, edges[0]),
      edges[edges.length - 1] - 1e-9,
    );
    for (let e = 0; e < edges.length - 1; e += 1) {
      if (clamped >= edges[e] && clamped < edges[e + 1]) {
        counts[a.kind][e] += 1;
        break;
      }
    }
  });
  return counts;
}

/** Symmetric bin edges for the return histogram. */
export function roiEdges(span: number = 1.0, bins: number = 39): number[] {
  const step: number = (span * 2) / bins;
  return Array.from({ length: bins + 1 }, (_, i: number): number =>
    Number((-span + i * step).toFixed(4)),
  );
}
