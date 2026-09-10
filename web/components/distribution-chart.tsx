"use client";

import type { ReactNode } from "react";
import { ARCHETYPES, type ArchetypeSpec } from "@/lib/archetypes";
import { count } from "@/lib/format";

const WIDTH: number = 960;
const PAD_LEFT: number = 184;
const PAD_RIGHT: number = 32;
const ROW_HEIGHT: number = 56;
const ROW_GAP: number = 8;
const AXIS_HEIGHT: number = 56;
const PLOT_WIDTH: number = WIDTH - PAD_LEFT - PAD_RIGHT;

export interface DistributionChartProps {
  edges: number[];
  counts: Record<string, number[]>;
  /** Axis tick positions in data units. */
  ticks: number[];
  formatTick: (value: number) => string;
  axisLabel: string;
  ariaLabel: string;
  /** Where the reference line goes. Zero, in both charts that use this. */
  reference?: number;
  note: string;
}

export function DistributionChart({
  edges,
  counts,
  ticks,
  formatTick,
  axisLabel,
  ariaLabel,
  reference = 0,
  note,
}: DistributionChartProps): ReactNode {
  const lo: number = edges[0];
  const hi: number = edges[edges.length - 1];
  const rows: ArchetypeSpec[] = ARCHETYPES.filter(
    (a: ArchetypeSpec): boolean => (counts[a.kind]?.length ?? 0) > 0,
  );
  const height: number = rows.length * (ROW_HEIGHT + ROW_GAP) + AXIS_HEIGHT;
  const x = (value: number): number => PAD_LEFT + ((value - lo) / (hi - lo)) * PLOT_WIDTH;
  const binWidth: number = PLOT_WIDTH / (edges.length - 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-auto w-full min-w-[640px]" role="img" aria-label={ariaLabel}>
          {rows.map((spec: ArchetypeSpec, rowIndex: number): ReactNode => {
            const series: number[] = counts[spec.kind];
            const peak: number = Math.max(...series, 1);
            const accounts: number = series.reduce((a: number, b: number): number => a + b, 0);
            const top: number = rowIndex * (ROW_HEIGHT + ROW_GAP);
            const baseline: number = top + ROW_HEIGHT;
            const isAdverse: boolean = spec.kind === "sharp";
            return (
              <g key={spec.kind}>
                <text x={0} y={top + 22} className="fill-foreground font-sans text-[14px]">{spec.label}</text>
                <text x={0} y={top + 42} className="fill-subtle-foreground font-mono text-[13px] tabular-nums">
                  {count(accounts)} accounts
                </text>
                <line x1={PAD_LEFT} x2={PAD_LEFT + PLOT_WIDTH} y1={baseline} y2={baseline} className="stroke-grid-line" strokeWidth={1} />
                <line x1={x(reference)} x2={x(reference)} y1={top} y2={baseline} className="stroke-grid-line" strokeWidth={1} />
                {series.map((value: number, bin: number): ReactNode => {
                  if (value === 0) {
                    return null;
                  }
                  const barHeight: number = (value / peak) * (ROW_HEIGHT - 8);
                  return (
                    <rect
                      key={bin}
                      x={x(edges[bin]) + 1}
                      y={baseline - barHeight}
                      width={Math.max(binWidth - 2, 1)}
                      height={barHeight}
                      rx={2}
                      className={isAdverse ? "fill-series-1" : "fill-series-2"}
                    />
                  );
                })}
              </g>
            );
          })}
          {ticks.map(
            (t: number): ReactNode => (
              <text key={t} x={x(t)} y={height - AXIS_HEIGHT + 22} textAnchor="middle" className="fill-muted-foreground font-mono text-[13px] tabular-nums">
                {formatTick(t)}
              </text>
            ),
          )}
          <text x={PAD_LEFT + PLOT_WIDTH / 2} y={height - 6} textAnchor="middle" className="fill-muted-foreground font-sans text-[13px]">
            {axisLabel}
          </text>
        </svg>
      </div>
      <p className="max-w-[80ch] text-base leading-6 text-muted-foreground">{note}</p>
    </div>
  );
}
