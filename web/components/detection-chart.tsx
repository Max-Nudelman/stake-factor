"use client";

import { useState, type ReactNode } from "react";
import type { CurvePoint } from "@/lib/detect";
import { auc as formatAuc, count } from "@/lib/format";

const WIDTH: number = 960;
const HEIGHT: number = 400;
const PAD_LEFT: number = 64;
const PAD_RIGHT: number = 160;
const PAD_TOP: number = 24;
const PAD_BOTTOM: number = 56;
const PLOT_WIDTH: number = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT: number = HEIGHT - PAD_TOP - PAD_BOTTOM;

const K_MAX: number = 105;
const Y_TICKS: number[] = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

function x(k: number): number {
  return PAD_LEFT + (k / K_MAX) * PLOT_WIDTH;
}

function y(value: number): number {
  return PAD_TOP + (1 - (value - 0.5) / 0.5) * PLOT_HEIGHT;
}

function path(points: CurvePoint[], pick: (p: CurvePoint) => number): string {
  return points
    .map((p: CurvePoint, i: number): string => `${i === 0 ? "M" : "L"}${x(p.k)} ${y(pick(p))}`)
    .join(" ");
}

export interface DetectionChartProps {
  points: CurvePoint[];
  caption: string;
}

export function DetectionChart({ points, caption }: DetectionChartProps): ReactNode {
  const [activeK, setActiveK] = useState<number | null>(null);
  if (points.length === 0) {
    return null;
  }
  const active: CurvePoint = points.find((p: CurvePoint): boolean => p.k === activeK) ?? points[0];
  const last: CurvePoint = points[points.length - 1];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-6 border-b border-border pb-4">
        <span className="text-base leading-6 text-muted-foreground">
          After <span className="font-mono tabular-nums text-foreground">{active.k}</span> settled
          bets
        </span>
        <span className="flex items-center gap-2 text-base leading-6">
          <span aria-hidden="true" className="h-2 w-8 rounded-[6px] bg-series-1" />
          Closing line value
          <span className="font-mono tabular-nums">{formatAuc(active.aucClv)}</span>
        </span>
        <span className="flex items-center gap-2 text-base leading-6">
          <span aria-hidden="true" className="h-2 w-8 rounded-[6px] bg-series-2" />
          Realized profit and loss
          <span className="font-mono tabular-nums">{formatAuc(active.aucRoi)}</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full min-w-[640px]"
          role="img"
          aria-label={caption}
        >
          {Y_TICKS.map(
            (t: number): ReactNode => (
              <g key={t}>
                <line
                  x1={PAD_LEFT}
                  x2={PAD_LEFT + PLOT_WIDTH}
                  y1={y(t)}
                  y2={y(t)}
                  className="stroke-grid-line"
                  strokeWidth={1}
                />
                <text
                  x={PAD_LEFT - 16}
                  y={y(t) + 5}
                  textAnchor="end"
                  className="fill-muted-foreground font-mono text-[13px] tabular-nums"
                >
                  {t.toFixed(1)}
                </text>
              </g>
            ),
          )}

          {/* A coin flip. Anything at this line carries no information. */}
          <text
            x={PAD_LEFT + 8}
            y={y(0.5) - 12}
            className="fill-muted-foreground font-sans text-[13px]"
          >
            0.5 is a coin flip
          </text>

          {points.map(
            (p: CurvePoint): ReactNode => (
              <g key={p.k}>
                <text
                  x={x(p.k)}
                  y={HEIGHT - PAD_BOTTOM + 28}
                  textAnchor="middle"
                  className="fill-muted-foreground font-mono text-[13px] tabular-nums"
                >
                  {p.k}
                </text>
              </g>
            ),
          )}
          <text
            x={PAD_LEFT + PLOT_WIDTH / 2}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="fill-muted-foreground font-sans text-[13px]"
          >
            Settled bets used as evidence
          </text>

          <path d={path(points, (p: CurvePoint): number => p.aucRoi)} fill="none" strokeWidth={2} className="stroke-series-2" />
          <path d={path(points, (p: CurvePoint): number => p.aucClv)} fill="none" strokeWidth={2} className="stroke-series-1" />

          {points.map(
            (p: CurvePoint): ReactNode => (
              <g key={`m-${p.k}`}>
                <circle cx={x(p.k)} cy={y(p.aucRoi)} r={4} className="fill-series-2 stroke-background" strokeWidth={2} />
                <circle cx={x(p.k)} cy={y(p.aucClv)} r={4} className="fill-series-1 stroke-background" strokeWidth={2} />
              </g>
            ),
          )}

          {/* Direct labels, so identity never depends on colour alone. */}
          <text x={x(last.k) + 16} y={y(last.aucClv) + 5} className="fill-foreground font-sans text-[13px]">
            Closing line value
          </text>
          <text x={x(last.k) + 16} y={y(last.aucRoi) + 5} className="fill-foreground font-sans text-[13px]">
            Profit and loss
          </text>

          {points.map(
            (p: CurvePoint): ReactNode => (
              <rect
                key={`hit-${p.k}`}
                x={x(p.k) - PLOT_WIDTH / (points.length * 2)}
                y={PAD_TOP}
                width={PLOT_WIDTH / points.length}
                height={PLOT_HEIGHT}
                fill="transparent"
                onMouseEnter={(): void => setActiveK(p.k)}
                onMouseLeave={(): void => setActiveK(null)}
              />
            ),
          )}
        </svg>
      </div>

      <details>
        <summary className="cursor-pointer text-base leading-6 text-brand-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
          Show these numbers as a table
        </summary>
        <table className="mt-4 w-full font-mono text-base leading-6 tabular-nums">
          <thead>
            <tr className="border-b border-border text-left font-sans text-muted-foreground">
              <th scope="col" className="py-2 pr-6 font-normal">Bets</th>
              <th scope="col" className="py-2 pr-6 font-normal">Accounts scored</th>
              <th scope="col" className="py-2 pr-6 font-normal">Sharps present</th>
              <th scope="col" className="py-2 pr-6 font-normal">AUC, closing line value</th>
              <th scope="col" className="py-2 font-normal">AUC, profit and loss</th>
            </tr>
          </thead>
          <tbody>
            {points.map(
              (p: CurvePoint): ReactNode => (
                <tr key={`row-${p.k}`} className="border-b border-border">
                  <td className="py-2 pr-6">{p.k}</td>
                  <td className="py-2 pr-6">{count(p.accounts)}</td>
                  <td className="py-2 pr-6">{p.adverse}</td>
                  <td className="py-2 pr-6">{formatAuc(p.aucClv)}</td>
                  <td className="py-2">{formatAuc(p.aucRoi)}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </details>
    </div>
  );
}
