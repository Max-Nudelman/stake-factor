// The published run: 4,000 accounts, numpy, seed 20260908. Exported by
// bettor-segmentation/src/export_web.py. The browser cannot reproduce numpy's
// random stream, so this is shown beside a live run rather than replaced by it.

import raw from "@/data/published-run.json";
import type { Archetype } from "@/lib/archetypes";

export interface PublishedCurvePoint {
  k: number;
  accounts: number;
  adverse: number;
  auc_clv: number;
  auc_roi: number;
}

export interface PublishedPolicy {
  k: number;
  threshold: number;
  restricted: number;
  caught: number;
  wrongly_cut: number;
  missed: number;
  do_nothing: number;
  with_policy: number;
  oracle: number;
  gain: number;
  share_of_oracle: number;
}

export interface PublishedSegment {
  kind: Archetype;
  accounts: number;
  bets: number;
  handle: number;
  book_pnl: number;
  book_hold: number;
  mean_clv: number;
  avg_stake: number;
}

export interface PublishedRun {
  curve: PublishedCurvePoint[];
  policy: PublishedPolicy[];
  by_k: PublishedPolicy[];
  segments: PublishedSegment[];
  clv_hist: { edges: number[]; counts: Record<string, number[]> };
  stats: { accounts: number; bets: number; matches: number };
}

export const published: PublishedRun = raw as unknown as PublishedRun;

export const PUBLISHED_SEED: number = 20260908;
export const PUBLISHED_ACCOUNTS: number = 4000;
