import type { ReactNode } from "react";
import { specOf } from "@/lib/archetypes";
import type { PercentileRow } from "@/lib/detect";
import { count, percent, signedPercent } from "@/lib/format";

const WIDTH: number = 960;
const PAD_LEFT: number = 184;
const PAD_RIGHT: number = 88;
const ROW: number = 56;
const AXIS: number = 52;
/** Room above the rows for the threshold marker label. */
const TOP: number = 32;
const PLOT: number = WIDTH - PAD_LEFT - PAD_RIGHT;

export interface PercentileChartProps {
  rows: PercentileRow[];
  /** The cut-off currently selected in the policy section. */
  threshold: number;
}

/**
 * The figure behind the correction. Semi sharps rank near the top on closing
 * line value, so any cut-off high enough to catch sharps catches them too, and
 * the book holds about 4.7% on them. Skill and economic harm are different axes.
 */
export function PercentileChart({ rows, threshold }: PercentileChartProps): ReactNode {
  const ordered: PercentileRow[] = [...rows].sort(
    (a: PercentileRow, b: PercentileRow): number => b.medianPercentile - a.medianPercentile,
  );
  const height: number = TOP + ordered.length * ROW + AXIS;
  const x = (p: number): number => PAD_LEFT + p * PLOT;
  const ticks: number[] = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-auto w-full min-w-[640px]" role="img" aria-label="Median closing line value rank by archetype">
        {ordered.map((row: PercentileRow, i: number): ReactNode => {
          const cy: number = TOP + i * ROW + ROW / 2;
          const isAdverse: boolean = row.kind === "sharp";
          const caught: boolean = row.medianPercentile >= threshold;
          return (
            <g key={row.kind}>
              <text x={0} y={cy - 2} className="fill-foreground font-sans text-[14px]">{specOf(row.kind).label}</text>
              <text x={0} y={cy + 18} className="fill-subtle-foreground font-mono text-[13px] tabular-nums">
                {count(row.accounts)} accounts, median {signedPercent(row.medianClv, 2)}
              </text>
              <line x1={PAD_LEFT} x2={PAD_LEFT + PLOT} y1={cy} y2={cy} className="stroke-grid-line" strokeWidth={1} />
              <rect
                x={PAD_LEFT}
                y={cy - 8}
                width={Math.max(x(row.medianPercentile) - PAD_LEFT, 2)}
                height={16}
                rx={4}
                className={isAdverse ? "fill-series-1" : "fill-series-2"}
              />
              <text
                x={x(row.medianPercentile) + 12}
                y={cy + 5}
                className={caught ? "fill-foreground font-mono text-[13px] tabular-nums" : "fill-subtle-foreground font-mono text-[13px] tabular-nums"}
              >
                {percent(row.medianPercentile, 0)}
              </text>
            </g>
          );
        })}

        {/* Everything to the right of this line gets restricted. */}
        <line x1={x(threshold)} x2={x(threshold)} y1={TOP - 4} y2={TOP + ordered.length * ROW} className="stroke-brand-accent" strokeWidth={2} strokeDasharray="6 4" />
        <text x={x(threshold)} y={TOP - 12} textAnchor="end" className="fill-brand-accent font-mono text-[13px] tabular-nums">
          cut at {percent(threshold, 0)}
        </text>

        {ticks.map(
          (t: number): ReactNode => (
            <text key={t} x={x(t)} y={height - 28} textAnchor="middle" className="fill-muted-foreground font-mono text-[13px] tabular-nums">
              {percent(t, 0)}
            </text>
          ),
        )}
        <text x={PAD_LEFT + PLOT / 2} y={height - 8} textAnchor="middle" className="fill-muted-foreground font-sans text-[13px]">
          Median rank on closing line value
        </text>
      </svg>
    </div>
  );
}
