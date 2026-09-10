import type { ReactNode } from "react";
import { marketFigures, type MovementBand } from "@/lib/market-figures";
import { count } from "@/lib/format";

const WIDTH: number = 960;
const HEIGHT: number = 340;
const PAD_LEFT: number = 96;
const PAD_RIGHT: number = 32;
const PAD_TOP: number = 24;
const PAD_BOTTOM: number = 88;
const PLOT: number = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H: number = HEIGHT - PAD_TOP - PAD_BOTTOM;

function label(band: MovementBand): string {
  return `${band.lo_pp.toFixed(1)} to ${band.hi_pp.toFixed(1)}`;
}

/**
 * The load-bearing figure. If the closing price is better than the opening price
 * only where the price moved, then the information a sharp captures is the
 * movement itself, which is exactly what closing line value measures.
 */
export function MovementChart(): ReactNode {
  const bands: MovementBand[] = marketFigures.movement_bands;
  const span: number = Math.max(
    ...bands.map((b: MovementBand): number => Math.abs(b.gain) + b.ci95),
  );
  const zeroY: number = PAD_TOP + PLOT_H / 2;
  const scale: number = (PLOT_H / 2 - 24) / span;
  const slot: number = PLOT / bands.length;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full min-w-[640px]"
        role="img"
        aria-label="Accuracy gained by the closing price, split by how far the price moved"
      >
        <text x={0} y={PAD_TOP + 12} className="fill-muted-foreground font-sans text-[13px]">
          Close better
        </text>
        <text x={0} y={PAD_TOP + PLOT_H} className="fill-muted-foreground font-sans text-[13px]">
          Open better
        </text>

        {bands.map((band: MovementBand, i: number): ReactNode => {
          const height: number = Math.abs(band.gain) * scale;
          const left: number = PAD_LEFT + i * slot + 24;
          const width: number = slot - 48;
          const centre: number = left + width / 2;
          const top: number = band.gain >= 0 ? zeroY - height : zeroY;
          const errTop: number = zeroY - (band.gain + band.ci95) * scale;
          const errBottom: number = zeroY - (band.gain - band.ci95) * scale;
          return (
            <g key={band.lo_pp}>
              <rect x={left} y={top} width={width} height={Math.max(height, 1)} rx={4} className="fill-series-1" />
              {/* 95% interval. Where it crosses zero the band proves nothing. */}
              <line x1={centre} x2={centre} y1={errTop} y2={errBottom} className="stroke-foreground" strokeWidth={2} />
              <line x1={centre - 8} x2={centre + 8} y1={errTop} y2={errTop} className="stroke-foreground" strokeWidth={2} />
              <line x1={centre - 8} x2={centre + 8} y1={errBottom} y2={errBottom} className="stroke-foreground" strokeWidth={2} />
              <text x={centre} y={HEIGHT - PAD_BOTTOM + 30} textAnchor="middle" className="fill-foreground font-mono text-[13px] tabular-nums">
                {label(band)}
              </text>
              <text x={centre} y={HEIGHT - PAD_BOTTOM + 52} textAnchor="middle" className="fill-subtle-foreground font-mono text-[13px] tabular-nums">
                {count(band.matches)} matches
              </text>
            </g>
          );
        })}

        <line x1={PAD_LEFT} x2={PAD_LEFT + PLOT} y1={zeroY} y2={zeroY} className="stroke-foreground" strokeWidth={2} />
        <text x={PAD_LEFT + PLOT} y={zeroY - 10} textAnchor="end" className="fill-muted-foreground font-sans text-[13px]">
          No difference
        </text>
        <text x={PAD_LEFT + PLOT / 2} y={HEIGHT - 8} textAnchor="middle" className="fill-muted-foreground font-sans text-[13px]">
          How far the price moved between open and close, percentage points
        </text>
      </svg>
    </div>
  );
}
