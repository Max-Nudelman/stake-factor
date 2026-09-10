import type { ReactNode } from "react";
import { marketFigures, type CalibrationNoiseRow, type LeagueEfficiencyRow } from "@/lib/market-figures";
import { count } from "@/lib/format";

export function LeagueEfficiencyTable(): ReactNode {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-base leading-6">
        <thead>
          <tr className="border-b border-border text-left font-sans text-muted-foreground">
            <th scope="col" className="py-2 pr-6 font-normal">League</th>
            <th scope="col" className="py-2 pr-6 font-normal">Tier</th>
            <th scope="col" className="py-2 pr-6 text-right font-normal">Matches</th>
            <th scope="col" className="py-2 pr-6 text-right font-normal">Overround</th>
            <th scope="col" className="py-2 text-right font-normal">Brier, with 95% interval</th>
          </tr>
        </thead>
        <tbody>
          {marketFigures.league_efficiency.map((row: LeagueEfficiencyRow): ReactNode => (
            <tr key={row.league_name} className="border-b border-border">
              <th scope="row" className="py-2 pr-6 text-left font-normal">{row.league_name}</th>
              <td className="py-2 pr-6 text-muted-foreground">{row.tier}</td>
              <td className="py-2 pr-6 text-right font-mono tabular-nums">{count(row.matches)}</td>
              <td className="py-2 pr-6 text-right font-mono tabular-nums">{row.overround_pct.toFixed(2)}%</td>
              <td className="py-2 text-right font-mono tabular-nums">
                {row.brier.toFixed(4)} ± {row.brier_ci95.toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CalibrationNoiseTable(): ReactNode {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-base leading-6">
        <thead>
          <tr className="border-b border-border text-left font-sans text-muted-foreground">
            <th scope="col" className="py-2 pr-6 font-normal">League</th>
            <th scope="col" className="py-2 pr-6 text-right font-normal">Outcomes</th>
            <th scope="col" className="py-2 pr-6 text-right font-normal">Observed error</th>
            <th scope="col" className="py-2 pr-6 text-right font-normal">Error from noise alone</th>
            <th scope="col" className="py-2 text-right font-normal">Ratio</th>
          </tr>
        </thead>
        <tbody>
          {marketFigures.calibration_vs_noise.map((row: CalibrationNoiseRow): ReactNode => (
            <tr key={row.league_name} className="border-b border-border">
              <th scope="row" className="py-2 pr-6 text-left font-normal">{row.league_name}</th>
              <td className="py-2 pr-6 text-right font-mono tabular-nums">{count(row.outcomes)}</td>
              <td className="py-2 pr-6 text-right font-mono tabular-nums">{row.observed_pp.toFixed(2)}pp</td>
              <td className="py-2 pr-6 text-right font-mono tabular-nums">{row.noise_pp.toFixed(2)}pp</td>
              <td className="py-2 text-right font-mono tabular-nums">{row.ratio.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
