"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PercentileChart } from "@/components/percentile-chart";
import { ChoiceGroup, type Choice } from "@/components/ui/choice-group";
import { Figure } from "@/components/ui/figure";
import { Metric } from "@/components/ui/metric";
import { Prose } from "@/components/ui/prose";
import {
  percentileByArchetype,
  policyOutcome,
  scoreAccounts,
  STAKE_FACTOR,
  type PercentileRow,
  type PolicyResult,
} from "@/lib/detect";
import { count, money, percent, signedMoney } from "@/lib/format";
import type { Simulation } from "@/lib/simulate";

const WINDOWS: Choice<string>[] = [
  { value: "10", label: "10 bets" },
  { value: "20", label: "20 bets" },
  { value: "30", label: "30 bets" },
  { value: "50", label: "50 bets" },
  { value: "75", label: "75 bets" },
];

const THRESHOLDS: number[] = [0.8, 0.9, 0.95, 0.97, 0.98, 0.99];

const CHART_WIDTH: number = 960;
const CHART_HEIGHT: number = 280;
const CHART_PAD_LEFT: number = 88;
const CHART_PAD_BOTTOM: number = 76;
const CHART_PAD_TOP: number = 16;

export interface PolicyPanelProps {
  sim: Simulation;
  seed: number;
}

export function PolicyPanel({ sim, seed }: PolicyPanelProps): ReactNode {
  const [evidence, setEvidence] = useState<string>("30");
  const [threshold, setThreshold] = useState<number>(0.98);
  const k: number = Number(evidence);

  const results: PolicyResult[] = useMemo(
    (): PolicyResult[] =>
      THRESHOLDS.map((q: number): PolicyResult | null => policyOutcome(sim, k, q)).filter(
        (r: PolicyResult | null): r is PolicyResult => r !== null,
      ),
    [sim, k],
  );
  const current: PolicyResult | undefined = results.find(
    (r: PolicyResult): boolean => r.threshold === threshold,
  );
  const ranks: PercentileRow[] = useMemo(
    (): PercentileRow[] => percentileByArchetype(scoreAccounts(sim, k)),
    [sim, k],
  );

  const span: number = Math.max(...results.map((r: PolicyResult): number => Math.abs(r.gain)), 1);
  const plotWidth: number = CHART_WIDTH - CHART_PAD_LEFT - 32;
  const plotHeight: number = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const zeroY: number = CHART_PAD_TOP + plotHeight / 2;
  const barSlot: number = plotWidth / Math.max(results.length, 1);

  return (
    <div className="flex flex-col gap-24">
      <div className="mx-auto flex max-w-[860px] flex-wrap justify-center gap-8">
        <ChoiceGroup label="Evidence before acting" value={evidence} choices={WINDOWS} onChange={setEvidence} />
        <ChoiceGroup
          label="Restrict accounts above this CLV percentile"
          value={String(threshold)}
          choices={THRESHOLDS.map((q: number): Choice<string> => ({ value: String(q), label: `${(q * 100).toFixed(0)}th` }))}
          onChange={(value: string): void => setThreshold(Number(value))}
        />
      </div>

      {current ? (
        <>
          <div className="mx-auto grid w-full max-w-[1000px] gap-8 border-y border-border py-10 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Accounts restricted"
              value={count(current.restricted)}
              note={`${percent(current.restricted / Math.max(current.scored, 1), 1)} of the ${count(current.scored)} accounts old enough to judge`}
            />
            <Metric
              label="Sharps caught"
              value={`${current.caught} of ${current.caught + current.missed}`}
              note={`${current.missed} left betting at full size`}
            />
            <Metric
              label="Profitable accounts cut"
              value={count(current.wronglyCut)}
              note="Restricted although the book makes money on them"
            />
            <Metric
              label="Change in book profit"
              value={signedMoney(current.gain)}
              note={`Against ${money(current.doNothing)} from doing nothing`}
            />
          </div>

          <Figure
            index={11}
            title="Cutting too widely costs more than the sharps ever take."
            caption={`Every bar is the same policy at a different cut-off, priced in what the book ends up with from bet ${k + 1} onward. The loose thresholds on the left catch every sharp and still destroy value, because they take profitable accounts down with them. Sign is read from which side of the line a bar falls on.`}
            source={`This run: ${count(sim.accounts)} accounts, seed ${seed}, restricted accounts betting at ${percent(STAKE_FACTOR, 0)} of previous stake.`}
          >
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-auto w-full min-w-[640px]" role="img" aria-label="Change in book profit at each restriction threshold">
                <text x={0} y={CHART_PAD_TOP + 14} className="fill-muted-foreground font-sans text-[13px]">Book gains</text>
                <text x={0} y={CHART_PAD_TOP + plotHeight} className="fill-muted-foreground font-sans text-[13px]">Book loses</text>

                {results.map((r: PolicyResult, i: number): ReactNode => {
                  const height: number = (Math.abs(r.gain) / span) * (plotHeight / 2 - 16);
                  const left: number = CHART_PAD_LEFT + i * barSlot + 8;
                  const width: number = barSlot - 16;
                  const isSelected: boolean = r.threshold === threshold;
                  return (
                    <g key={r.threshold}>
                      <rect
                        x={left}
                        y={r.gain >= 0 ? zeroY - height : zeroY}
                        width={width}
                        height={Math.max(height, 1)}
                        rx={4}
                        className="fill-series-1"
                        opacity={isSelected ? 1 : 0.45}
                      />
                      <text x={left + width / 2} y={r.gain >= 0 ? zeroY - height - 8 : zeroY + height + 20} textAnchor="middle" className="fill-foreground font-mono text-[13px] tabular-nums">
                        {signedMoney(r.gain)}
                      </text>
                      <text x={left + width / 2} y={CHART_HEIGHT - 28} textAnchor="middle" className="fill-muted-foreground font-mono text-[13px] tabular-nums">
                        {(r.threshold * 100).toFixed(0)}th
                      </text>
                    </g>
                  );
                })}

                <line x1={CHART_PAD_LEFT} x2={CHART_PAD_LEFT + plotWidth} y1={zeroY} y2={zeroY} className="stroke-foreground" strokeWidth={2} />
                <text x={CHART_PAD_LEFT + plotWidth} y={zeroY - 8} textAnchor="end" className="fill-muted-foreground font-sans text-[13px]">Doing nothing</text>
                <text x={CHART_PAD_LEFT + plotWidth / 2} y={CHART_HEIGHT - 4} textAnchor="middle" className="fill-muted-foreground font-sans text-[13px]">
                  Restriction threshold, as a percentile of mean closing line value
                </text>
              </svg>
            </div>
          </Figure>

          <Prose>
            <p className="text-base leading-8">
              A restricted account is not closed. It keeps betting at{" "}
              {percent(STAKE_FACTOR, 0)} of its previous stake, which is what a desk actually
              does. Perfect foresight, restricting only the truly adverse accounts, would be
              worth {signedMoney(current.oracle - current.doNothing)}.{" "}
              {current.shareOfOracle >= 0
                ? `This policy captures ${percent(current.shareOfOracle, 0)} of that.`
                : `This policy captures none of it. Cutting ${count(current.wronglyCut)} profitable accounts costs more than every sharp in the book takes.`}
            </p>
          </Prose>

          <Figure
            index={12}
            title="Skill and economic harm are different axes, and the cut-off cannot tell them apart."
            caption="Semi sharps rank near the top on closing line value because they are genuinely good. The book still holds about 4.7% on them. Any cut-off loose enough to be safe catches them, which is why the loose thresholds in the previous figure lose money. This is the mistake I made first: I labelled semi sharps adverse, and the cost model returned a negative cost, which was the model telling me the label was wrong."
            source={`This run, accounts with at least ${k} settled bets, seed ${seed}.`}
          >
            <PercentileChart rows={ranks} threshold={threshold} />
          </Figure>
        </>
      ) : (
        <p className="text-base leading-6 text-muted-foreground">
          Not enough accounts reach {k} settled bets in this run to price a policy.
        </p>
      )}
    </div>
  );
}
