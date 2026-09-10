"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DetectionChart } from "@/components/detection-chart";
import { DistributionChart } from "@/components/distribution-chart";
import { PolicyPanel } from "@/components/policy-panel";
import { RocChart } from "@/components/roc-chart";
import { RestrictionRisk } from "@/components/restriction-risk";
import { SegmentTable } from "@/components/segment-table";
import { StabilityChart, stabilitySummary } from "@/components/stability-chart";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ChoiceGroup, type Choice } from "@/components/ui/choice-group";
import { Figure } from "@/components/ui/figure";
import { NumberField } from "@/components/ui/number-field";
import { Section } from "@/components/ui/section";
import { SelectField } from "@/components/ui/select-field";
import {
  clvHistogram,
  detectionCurve,
  rocCurve,
  roiEdges,
  roiHistogram,
  scoreAccounts,
  segmentSummary,
  summariseStability,
  type CurvePoint,
  type RocPoint,
  type ScoredAccount,
  type SegmentSummary,
  type StabilityPoint,
} from "@/lib/detect";
import { count, percent, signedPercent } from "@/lib/format";
import { published, PUBLISHED_ACCOUNTS, PUBLISHED_SEED, type PublishedCurvePoint } from "@/lib/published";
import { simulate, type Simulation } from "@/lib/simulate";

const ACCOUNT_SIZES: string[] = ["500", "1000", "2000", "4000"];
/** Matches the published run, which histograms accounts with at least 30 bets. */
const HISTOGRAM_MIN_BETS: number = 30;
/** The headline evidence window. Five bets is the claim the page is built on. */
const ROC_WINDOW: number = 5;
const STABILITY_RUNS: number = 12;
const STABILITY_WINDOWS: number[] = [5, 10, 20, 30, 50];

const SOURCES: Choice<string>[] = [
  { value: "live", label: "This run" },
  { value: "published", label: "Published run" },
];

const publishedCurve: CurvePoint[] = published.curve.map(
  (p: PublishedCurvePoint): CurvePoint => ({
    k: p.k, accounts: p.accounts, adverse: p.adverse, aucClv: p.auc_clv, aucRoi: p.auc_roi,
  }),
);

const RETURN_EDGES: number[] = roiEdges(1, 39);
const RETURN_TICKS: number[] = [-1, -0.5, 0, 0.5, 1];
const CLV_TICKS: number[] = [-0.05, 0, 0.05, 0.1, 0.15, 0.2];

export function Simulator(): ReactNode {
  const [accounts, setAccounts] = useState<string>("2000");
  const [seed, setSeed] = useState<number>(7);
  const [sim, setSim] = useState<Simulation | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [source, setSource] = useState<string>("live");
  const [stability, setStability] = useState<StabilityPoint[] | null>(null);
  const [stabilityRunning, setStabilityRunning] = useState<boolean>(false);

  const run = (): void => {
    setRunning(true);
    window.setTimeout((): void => {
      setSim(simulate({ accounts: Number(accounts), seed }));
      setStability(null);
      setRunning(false);
    }, 0);
  };

  const runStability = (): void => {
    setStabilityRunning(true);
    window.setTimeout((): void => {
      const curves: CurvePoint[][] = [];
      for (let i = 0; i < STABILITY_RUNS; i += 1) {
        const run: Simulation = simulate({ accounts: Number(accounts), seed: seed + i * 101 });
        curves.push(detectionCurve(run, STABILITY_WINDOWS));
      }
      setStability(summariseStability(curves));
      setStabilityRunning(false);
    }, 0);
  };

  const segments: SegmentSummary[] = useMemo(
    (): SegmentSummary[] => (sim ? segmentSummary(sim) : []), [sim],
  );
  const curve: CurvePoint[] = useMemo((): CurvePoint[] => (sim ? detectionCurve(sim) : []), [sim]);
  const clvBins: Record<string, number[]> = useMemo(
    (): Record<string, number[]> => (sim ? clvHistogram(sim, published.clv_hist.edges, HISTOGRAM_MIN_BETS) : {}),
    [sim],
  );
  const scoredAtFive: ScoredAccount[] = useMemo(
    (): ScoredAccount[] => (sim ? scoreAccounts(sim, ROC_WINDOW) : []), [sim],
  );
  const returnBins: Record<string, number[]> = useMemo(
    (): Record<string, number[]> => roiHistogram(scoredAtFive, RETURN_EDGES), [scoredAtFive],
  );
  const rocClv: RocPoint[] = useMemo(
    (): RocPoint[] => rocCurve(scoredAtFive, (a: ScoredAccount): number => a.meanClv), [scoredAtFive],
  );
  const rocRoi: RocPoint[] = useMemo(
    (): RocPoint[] => rocCurve(scoredAtFive, (a: ScoredAccount): number => a.roi), [scoredAtFive],
  );

  const showingLive: boolean = source === "live" && curve.length > 0;
  const sharpShare: string = sim
    ? percent(sim.kind.filter((k: string): boolean => k === "sharp").length / sim.accounts, 1)
    : "";

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-[860px] py-16">
      <Card>
        <CardHeader
          title="Run the simulation"
          note="Accounts are drawn from the five archetypes and bet into the real market layer above."
        />
        <CardBody>
          <div className="flex flex-wrap items-end gap-8">
            <SelectField label="Accounts" value={accounts} options={ACCOUNT_SIZES} onChange={setAccounts} />
            <NumberField label="Seed" value={seed} min={1} max={999999} onChange={setSeed} />
            <Button onClick={run} disabled={running}>
              {running ? "Running" : sim ? "Run again" : "Run"}
            </Button>
            {sim ? (
              <p className="text-base leading-6 text-muted-foreground">
                {count(sim.accounts)} accounts placed {count(sim.bets)} bets in{" "}
                {(sim.elapsedMs / 1000).toFixed(1)} seconds. {sharpShare} of them are sharps.
              </p>
            ) : null}
          </div>
        </CardBody>
      </Card>
      </div>

      {sim ? (
        <>
          <Section
            id="segments"
            index={2}
            title="Who the book makes money on"
            note="Whales pay for the building. Sharps are the only segment with a negative hold."
          >
            <Figure
              index={5}
              title="The book holds around 5% on every segment except one."
              caption="Sharps are a rounding error by headcount and the only accounts the book loses to. Semi sharps are skilled, and the book still holds about 4.7% on them, which is the distinction the whole policy rests on."
              source={`This run: ${count(sim.accounts)} accounts, ${count(sim.bets)} bets, seed ${seed}.`}
            >
              <SegmentTable segments={segments} />
            </Figure>
          </Section>

          <Section
            id="signal"
            index={3}
            title="Where the signal lives"
            note="One measure separates sharps completely. The other does not separate them at all."
          >
            <div className="flex flex-col gap-24">
              <Figure
                index={6}
                title="On closing line value, sharps do not overlap anybody."
                caption="Every other segment sits on top of zero, meaning they paid roughly what the market closed at. Sharps sit clear of the pack, and nothing else is out there with them."
                source={`Accounts with at least ${HISTOGRAM_MIN_BETS} settled bets, this run.`}
              >
                <DistributionChart
                  edges={published.clv_hist.edges}
                  counts={clvBins}
                  ticks={CLV_TICKS}
                  formatTick={(v: number): string => signedPercent(v, 0)}
                  axisLabel="Mean closing line value per account"
                  ariaLabel="Mean closing line value per account, one row per archetype"
                  note={`Each row is scaled to its own tallest bar, so a small segment stays readable beside a large one. Only accounts with at least ${HISTOGRAM_MIN_BETS} settled bets are plotted. The vertical line marks zero, where an account paid exactly what the market closed at.`}
                />
              </Figure>

              <Figure
                index={7}
                title="On realized profit, the same accounts are indistinguishable."
                caption="This is the same population, five bets in, measured by what they actually won. Sharps sit inside the recreational spread. Anyone restricting on early profit would be reading variance."
                source={`Accounts with at least ${ROC_WINDOW} settled bets, this run. Returns clipped to plus or minus 100%.`}
              >
                <DistributionChart
                  edges={RETURN_EDGES}
                  counts={returnBins}
                  ticks={RETURN_TICKS}
                  formatTick={(v: number): string => signedPercent(v, 0)}
                  axisLabel={`Return on the first ${ROC_WINDOW} bets`}
                  ariaLabel="Realized return per account, one row per archetype"
                  note="Five bets is not many, so these are wide by construction. That is the point: the spread swamps the difference between a sharp and everyone else, and it stays that way for a hundred bets."
                />
              </Figure>
            </div>
          </Section>
        </>
      ) : null}

      <Section
        id="detection"
        index={4}
        title="How fast a sharp becomes visible"
        action={<ChoiceGroup label="Source" value={source} choices={SOURCES} onChange={setSource} />}
      >
        <div className="flex flex-col gap-24">
          <Figure
            index={8}
            title="Closing line value is near perfect after five bets. Profit never arrives."
            caption="Both lines rank every account by one signal after k settled bets and ask how often a sharp outranks a non sharp. Closing line value scores the decision. Profit and loss scores the outcome, which at this sample size is mostly variance."
            source={
              showingLive
                ? `This run: ${count(sim?.accounts ?? 0)} accounts, seed ${seed}.`
                : `Published run: ${count(PUBLISHED_ACCOUNTS)} accounts, numpy, seed ${PUBLISHED_SEED}. Beyond 100 bets no sharp has enough bets left to score, so the curve stops there.`
            }
          >
            <DetectionChart
              points={showingLive ? curve : publishedCurve}
              caption="Separation of sharp accounts by evidence window"
            />
          </Figure>

          {sim && rocClv.length > 0 ? (
            <Figure
              index={9}
              title="At five bets you can catch every sharp while cutting almost nobody."
              caption="The area under these curves is what the previous figure plots as a single number. Closing line value bends hard into the top left corner, so a cut-off exists that catches nearly all sharps at a small false positive rate. Profit and loss hugs the diagonal, where every sharp caught costs you a profitable account."
              source={`This run, accounts with at least ${ROC_WINDOW} settled bets, seed ${seed}.`}
            >
              <RocChart clv={rocClv} roi={rocRoi} k={ROC_WINDOW} />
            </Figure>
          ) : null}

          <Figure
            index={10}
            title="The gap survives independent runs."
            caption={
              stability
                ? stabilitySummary(stability)
                : "One simulation is an anecdote. This repeats the whole thing on independent seeds and draws the full range each signal covers, so the gap can be judged against how much either measure wanders."
            }
            source={
              stability
                ? `${STABILITY_RUNS} runs of ${count(Number(accounts))} accounts, seeds ${seed} to ${seed + (STABILITY_RUNS - 1) * 101}.`
                : "Not yet run. Each run resimulates every account from scratch."
            }
          >
            {stability ? (
              <StabilityChart points={stability} runs={STABILITY_RUNS} />
            ) : (
              <div className="flex flex-wrap items-center gap-6">
                <Button onClick={runStability} disabled={stabilityRunning}>
                  {stabilityRunning ? "Running" : `Run ${STABILITY_RUNS} more simulations`}
                </Button>
                <p className="max-w-[52ch] text-base leading-6 text-muted-foreground">
                  This resimulates {count(Number(accounts) * STABILITY_RUNS)} accounts, so it
                  takes a few seconds.
                </p>
              </div>
            )}
          </Figure>
        </div>
      </Section>

      {sim ? (
        <Section
          id="policy"
          index={5}
          title="What a restriction policy costs"
          note="Detection is solved by bet five. Choosing the threshold is the hard part."
        >
          <div className="flex flex-col gap-24">
            <PolicyPanel sim={sim} seed={seed} />
            <RestrictionRisk />
          </div>
        </Section>
      ) : null}
    </div>
  );
}
