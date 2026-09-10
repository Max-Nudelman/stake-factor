"use client";

import { useState, type ReactNode } from "react";
import { ChoiceGroup, type Choice } from "@/components/ui/choice-group";
import { marketFigures, type CalibrationBin } from "@/lib/market-figures";
import { count, percent } from "@/lib/format";

const WIDTH: number = 720;
const HEIGHT: number = 560;
const PAD_LEFT: number = 72;
const PAD_BOTTOM: number = 72;
const PAD_TOP: number = 16;
const PAD_RIGHT: number = 24;
const PLOT: number = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H: number = HEIGHT - PAD_TOP - PAD_BOTTOM;
const MAX: number = 0.9;

const PHASES: Choice<string>[] = [
  { value: "close", label: "Closing price" },
  { value: "open", label: "Opening price" },
  { value: "both", label: "Both" },
];

function x(p: number): number {
  return PAD_LEFT + (p / MAX) * PLOT;
}

function y(p: number): number {
  return PAD_TOP + (1 - p / MAX) * PLOT_H;
}

function series(bins: CalibrationBin[]): string {
  return bins
    .map((b: CalibrationBin, i: number): string => `${i === 0 ? "M" : "L"}${x(b.predicted)} ${y(b.actual)}`)
    .join(" ");
}

export function CalibrationChart(): ReactNode {
  const [phase, setPhase] = useState<string>("close");
  const close: CalibrationBin[] = marketFigures.calibration.close;
  const open: CalibrationBin[] = marketFigures.calibration.open;
  const showClose: boolean = phase === "close" || phase === "both";
  const showOpen: boolean = phase === "open" || phase === "both";
  const ticks: number[] = [0, 0.2, 0.4, 0.6, 0.8];

  return (
    <div className="flex flex-col gap-6">
      <ChoiceGroup label="Price" value={phase} choices={PHASES} onChange={setPhase} />
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full max-w-[720px] min-w-[480px]"
          role="img"
          aria-label="Predicted probability against observed frequency"
        >
          {ticks.map(
            (t: number): ReactNode => (
              <g key={t}>
                <line x1={PAD_LEFT} x2={PAD_LEFT + PLOT} y1={y(t)} y2={y(t)} className="stroke-grid-line" strokeWidth={1} />
                <text x={PAD_LEFT - 16} y={y(t) + 5} textAnchor="end" className="fill-muted-foreground font-mono text-[13px] tabular-nums">
                  {percent(t, 0)}
                </text>
                <text x={x(t)} y={HEIGHT - PAD_BOTTOM + 28} textAnchor="middle" className="fill-muted-foreground font-mono text-[13px] tabular-nums">
                  {percent(t, 0)}
                </text>
              </g>
            ),
          )}

          {/* Perfect calibration. A market sitting on this line is telling the truth. */}
          <line
            x1={x(0)}
            y1={y(0)}
            x2={x(MAX)}
            y2={y(MAX)}
            className="stroke-subtle-foreground"
            strokeWidth={2}
            strokeDasharray="6 6"
          />
          <text x={x(0.66)} y={y(0.72)} className="fill-subtle-foreground font-sans text-[13px]">
            Perfectly calibrated
          </text>

          {showOpen ? (
            <>
              <path d={series(open)} fill="none" strokeWidth={2} className="stroke-series-2" />
              {open.map((b: CalibrationBin): ReactNode => (
                <circle key={`o-${b.lo}`} cx={x(b.predicted)} cy={y(b.actual)} r={4} className="fill-series-2 stroke-card" strokeWidth={2} />
              ))}
              <text x={x(open[open.length - 1].predicted) - 8} y={y(open[open.length - 1].actual) + 24} textAnchor="end" className="fill-foreground font-sans text-[13px]">
                Opening price
              </text>
            </>
          ) : null}

          {showClose ? (
            <>
              <path d={series(close)} fill="none" strokeWidth={2} className="stroke-series-1" />
              {close.map((b: CalibrationBin): ReactNode => (
                <circle key={`c-${b.lo}`} cx={x(b.predicted)} cy={y(b.actual)} r={4} className="fill-series-1 stroke-card" strokeWidth={2} />
              ))}
              <text x={x(close[close.length - 1].predicted) - 8} y={y(close[close.length - 1].actual) - 16} textAnchor="end" className="fill-foreground font-sans text-[13px]">
                Closing price
              </text>
            </>
          ) : null}

          <text x={PAD_LEFT + PLOT / 2} y={HEIGHT - 24} textAnchor="middle" className="fill-muted-foreground font-sans text-[13px]">
            Probability the price implied
          </text>
          <text x={16} y={PAD_TOP + PLOT_H / 2} textAnchor="middle" transform={`rotate(-90 16 ${PAD_TOP + PLOT_H / 2})`} className="fill-muted-foreground font-sans text-[13px]">
            How often it actually happened
          </text>
        </svg>
      </div>

      <details>
        <summary className="cursor-pointer text-base leading-6 text-brand-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
          Show these numbers as a table
        </summary>
        <table className="mt-4 w-full font-mono text-base leading-6 tabular-nums">
          <thead>
            <tr className="border-b border-border text-left font-sans text-muted-foreground">
              <th scope="col" className="py-2 pr-6 font-normal">Band</th>
              <th scope="col" className="py-2 pr-6 text-right font-normal">Outcomes</th>
              <th scope="col" className="py-2 pr-6 text-right font-normal">Implied</th>
              <th scope="col" className="py-2 text-right font-normal">Observed</th>
            </tr>
          </thead>
          <tbody>
            {(showClose ? close : open).map((b: CalibrationBin): ReactNode => (
              <tr key={b.lo} className="border-b border-border">
                <td className="py-2 pr-6">{percent(b.lo, 0)} to {percent(b.hi, 0)}</td>
                <td className="py-2 pr-6 text-right">{count(b.n)}</td>
                <td className="py-2 pr-6 text-right">{percent(b.predicted, 2)}</td>
                <td className="py-2 text-right">{percent(b.actual, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
