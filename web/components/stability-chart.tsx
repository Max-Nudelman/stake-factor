import type { ReactNode } from "react";
import type { StabilityPoint } from "@/lib/detect";
import { auc as formatAuc } from "@/lib/format";

const WIDTH: number = 960;
const HEIGHT: number = 400;
const PAD_LEFT: number = 72;
const PAD_RIGHT: number = 152;
const PAD_TOP: number = 24;
const PAD_BOTTOM: number = 64;
const PLOT: number = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H: number = HEIGHT - PAD_TOP - PAD_BOTTOM;
const Y_TICKS: number[] = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

export interface StabilityChartProps {
  points: StabilityPoint[];
  runs: number;
}

/**
 * One run proves nothing. This repeats the whole simulation on independent
 * seeds and draws the full range each signal covers, so the gap between them
 * can be judged against how much either one wanders.
 */
export function StabilityChart({ points, runs }: StabilityChartProps): ReactNode {
  if (points.length === 0) {
    return null;
  }
  const x = (i: number): number => PAD_LEFT + (i / Math.max(points.length - 1, 1)) * PLOT;
  const y = (v: number): number => PAD_TOP + (1 - (v - 0.5) / 0.5) * PLOT_H;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full min-w-[640px]" role="img" aria-label={`Range of separation across ${runs} independent runs`}>
        {Y_TICKS.map(
          (t: number): ReactNode => (
            <g key={t}>
              <line x1={PAD_LEFT} x2={PAD_LEFT + PLOT} y1={y(t)} y2={y(t)} className="stroke-grid-line" strokeWidth={1} />
              <text x={PAD_LEFT - 16} y={y(t) + 5} textAnchor="end" className="fill-muted-foreground font-mono text-[13px] tabular-nums">
                {t.toFixed(1)}
              </text>
            </g>
          ),
        )}

        {points.map((p: StabilityPoint, i: number): ReactNode => (
          <g key={p.k}>
            {/* Full range across seeds, then the median on top of it. */}
            <line x1={x(i)} x2={x(i)} y1={y(p.roiMax)} y2={y(p.roiMin)} className="stroke-series-2" strokeWidth={8} strokeLinecap="round" opacity={0.45} />
            <line x1={x(i)} x2={x(i)} y1={y(p.clvMax)} y2={y(p.clvMin)} className="stroke-series-1" strokeWidth={8} strokeLinecap="round" opacity={0.45} />
            <circle cx={x(i)} cy={y(p.roiMedian)} r={4} className="fill-series-2 stroke-card" strokeWidth={2} />
            <circle cx={x(i)} cy={y(p.clvMedian)} r={4} className="fill-series-1 stroke-card" strokeWidth={2} />
            <text x={x(i)} y={HEIGHT - PAD_BOTTOM + 28} textAnchor="middle" className="fill-muted-foreground font-mono text-[13px] tabular-nums">
              {p.k}
            </text>
          </g>
        ))}

        <text x={x(points.length - 1) + 16} y={y(points[points.length - 1].clvMedian) + 5} className="fill-foreground font-sans text-[13px]">
          Closing line value
        </text>
        <text x={x(points.length - 1) + 16} y={y(points[points.length - 1].roiMedian) + 5} className="fill-foreground font-sans text-[13px]">
          Profit and loss
        </text>
        <text x={PAD_LEFT + PLOT / 2} y={HEIGHT - 12} textAnchor="middle" className="fill-muted-foreground font-sans text-[13px]">
          Settled bets used as evidence, {runs} independent runs
        </text>
      </svg>
    </div>
  );
}

export function stabilitySummary(points: StabilityPoint[]): string {
  const first: StabilityPoint | undefined = points[0];
  if (!first) {
    return "";
  }
  const overlap: boolean = points.some((p: StabilityPoint): boolean => p.clvMin <= p.roiMax);
  return overlap
    ? "At least one evidence window shows the two ranges touching."
    : `The ranges never touch. At five bets closing line value covers ${formatAuc(first.clvMin)} to ${formatAuc(first.clvMax)} while profit and loss covers ${formatAuc(first.roiMin)} to ${formatAuc(first.roiMax)}.`;
}
