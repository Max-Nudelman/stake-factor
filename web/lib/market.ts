// The real market layer: every match carrying complete average opening and
// closing 1X2 prices, in date order. Exported from DuckDB by
// bettor-segmentation/src/export_market.py, so the page and the analysis cannot
// drift apart.

import raw from "@/data/market-layer.json";

interface MarketLayerJson {
  matches: number;
  book: string;
  dateRange: [string, string];
  leagues: Record<string, number>;
  openH: number[];
  openD: number[];
  openA: number[];
  closeH: number[];
  closeD: number[];
  closeA: number[];
  result: string;
}

export interface MarketLayer {
  matches: number;
  book: string;
  dateRange: [string, string];
  leagues: Record<string, number>;
  /** Decimal odds, three per match in H, D, A order. */
  openOdds: Float64Array;
  closeOdds: Float64Array;
  /** Proportionally devigged probabilities, three per match. */
  openProb: Float64Array;
  closeProb: Float64Array;
  /** 0 for a home win, 1 for a draw, 2 for an away win. */
  winner: Uint8Array;
}

const source: MarketLayerJson = raw as unknown as MarketLayerJson;

function buildOdds(h: number[], d: number[], a: number[]): Float64Array {
  const out: Float64Array = new Float64Array(h.length * 3);
  for (let i = 0; i < h.length; i += 1) {
    out[i * 3] = h[i] / 100;
    out[i * 3 + 1] = d[i] / 100;
    out[i * 3 + 2] = a[i] / 100;
  }
  return out;
}

/** Proportional devig: rescale raw implied probabilities so they sum to one. */
function devig(odds: Float64Array): Float64Array {
  const out: Float64Array = new Float64Array(odds.length);
  for (let i = 0; i < odds.length; i += 3) {
    const h: number = 1 / odds[i];
    const d: number = 1 / odds[i + 1];
    const a: number = 1 / odds[i + 2];
    const total: number = h + d + a;
    out[i] = h / total;
    out[i + 1] = d / total;
    out[i + 2] = a / total;
  }
  return out;
}

function buildWinner(result: string): Uint8Array {
  const out: Uint8Array = new Uint8Array(result.length);
  for (let i = 0; i < result.length; i += 1) {
    out[i] = result[i] === "H" ? 0 : result[i] === "D" ? 1 : 2;
  }
  return out;
}

const openOdds: Float64Array = buildOdds(source.openH, source.openD, source.openA);
const closeOdds: Float64Array = buildOdds(source.closeH, source.closeD, source.closeA);

export const market: MarketLayer = {
  matches: source.matches,
  book: source.book,
  dateRange: source.dateRange,
  leagues: source.leagues,
  openOdds,
  closeOdds,
  openProb: devig(openOdds),
  closeProb: devig(closeOdds),
  winner: buildWinner(source.result),
};

export const LEAGUE_NAMES: Record<string, string> = {
  E0: "Premier League",
  SP1: "La Liga",
  E1: "Championship",
  N1: "Eredivisie",
  E3: "League Two",
  SC2: "Scottish League One",
  USA: "MLS",
};
