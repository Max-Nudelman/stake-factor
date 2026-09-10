import type { ReactNode } from "react";
import type { RocPoint } from "@/lib/detect";
import { percent } from "@/lib/format";

const SIZE: number = 520;
const PAD: number = 64;
const PLOT: number = SIZE - PAD * 2;

function path(points: RocPoint[]): string {
  return points
    .map((p: RocPoint, i: number): string =>
      `${i === 0 ? "M" : "L"}${PAD + p.falsePositive * PLOT} ${SIZE - PAD - p.truePositive * PLOT}`,
    )
    .join(" ");
}

export interface RocChartProps {
  clv: RocPoint[];
  roi: RocPoint[];
  k: number;
}

/**
 * The AUC numbers are summaries. This is the thing they summarise: how many
 * sharps you catch against how many innocent accounts you cut, at every
 * possible cut-off.
 */
export function RocChart({ clv, roi, k }: RocChartProps): ReactNode {
  const ticks: number[] = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full max-w-[520px] min-w-[380px]"
        role="img"
        aria-label={`Sharps caught against profitable accounts cut, after ${k} bets`}
      >
        {ticks.map(
          (t: number): ReactNode => (
            <g key={t}>
              <line x1={PAD} x2={PAD + PLOT} y1={SIZE - PAD - t * PLOT} y2={SIZE - PAD - t * PLOT} className="stroke-grid-line" strokeWidth={1} />
              <text x={PAD - 12} y={SIZE - PAD - t * PLOT + 5} textAnchor="end" className="fill-muted-foreground font-mono text-[13px] tabular-nums">
                {percent(t, 0)}
              </text>
              <text x={PAD + t * PLOT} y={SIZE - PAD + 24} textAnchor="middle" className="fill-muted-foreground font-mono text-[13px] tabular-nums">
                {percent(t, 0)}
              </text>
            </g>
          ),
        )}

        {/* A signal that lands on this line is telling you nothing. */}
        <line x1={PAD} y1={SIZE - PAD} x2={PAD + PLOT} y2={SIZE - PAD - PLOT} className="stroke-subtle-foreground" strokeWidth={2} strokeDasharray="6 6" />

        <path d={path(roi)} fill="none" strokeWidth={2} className="stroke-series-2" />
        <path d={path(clv)} fill="none" strokeWidth={2} className="stroke-series-1" />

        <text x={PAD + PLOT * 0.34} y={SIZE - PAD - PLOT * 0.96} className="fill-foreground font-sans text-[13px]">
          Closing line value
        </text>
        <text x={PAD + PLOT * 0.52} y={SIZE - PAD - PLOT * 0.42} className="fill-foreground font-sans text-[13px]">
          Profit and loss
        </text>
        <text x={PAD + PLOT * 0.60} y={SIZE - PAD - PLOT * 0.70} className="fill-subtle-foreground font-sans text-[13px]">
          Coin flip
        </text>

        <text x={PAD + PLOT / 2} y={SIZE - 12} textAnchor="middle" className="fill-muted-foreground font-sans text-[13px]">
          Share of profitable accounts wrongly cut
        </text>
        <text x={16} y={SIZE / 2} textAnchor="middle" transform={`rotate(-90 16 ${SIZE / 2})`} className="fill-muted-foreground font-sans text-[13px]">
          Share of sharps caught
        </text>
      </svg>
    </div>
  );
}
