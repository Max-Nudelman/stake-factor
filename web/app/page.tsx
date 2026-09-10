import type { ReactNode } from "react";
import { CalibrationChart } from "@/components/calibration-chart";
import { HeroFinding } from "@/components/hero-finding";
import { CalibrationNoiseTable, LeagueEfficiencyTable } from "@/components/league-tables";
import { MovementChart } from "@/components/movement-chart";
import { Simulator } from "@/components/simulator";
import { SiteNav } from "@/components/site-nav";
import { Figure } from "@/components/ui/figure";
import { Prose, Subhead } from "@/components/ui/prose";
import { Section } from "@/components/ui/section";
import { count } from "@/lib/format";
import { LEAGUE_NAMES, market } from "@/lib/market";
import { marketFigures } from "@/lib/market-figures";

export default function Page(): ReactNode {
  const leagues: [string, number][] = Object.entries(market.leagues).sort(
    (a: [string, number], b: [string, number]): number => b[1] - a[1],
  );
  const h = marketFigures.headline;
  const topBand = marketFigures.movement_bands[marketFigures.movement_bands.length - 1];

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-[1120px] px-6 pb-24 pt-24">
        <header className="flex flex-col items-center gap-10 pb-16 text-center">
          <h1 className="display mx-auto max-w-[22ch] text-balance text-[clamp(2.6rem,6vw,4rem)]">
            Five settled bets is enough to spot a sharp
          </h1>
          <p className="mx-auto max-w-[56ch] text-lg leading-8">
            Closing line value separates adverse accounts almost perfectly after five bets.
            Realized profit and loss never gets close, even after a hundred. Detection is not
            the hard problem. Choosing where to draw the line is.
          </p>
        </header>

        <HeroFinding />

        <div className="py-16">
          <Prose>
            <p className="text-lg leading-8">
              Draw that line in the wrong place and it costs more than the problem. Restricting
              the top fifth of accounts loses the book £202k. Every sharp in the building, all
              86 of them, takes £51k between them.
            </p>
            <p className="text-base leading-8 text-muted-foreground">
              Simulated bettors, real prices. Twelve figures follow. The first four are real
              market data and establish that the mechanism exists at all. The rest simulate
              accounts on top of it, because no public bettor level data exists.
            </p>
          </Prose>
        </div>

        <Section
          id="market"
          index={1}
          title="The market that makes this possible"
          note="Before simulating a single bettor, the prices have to admit there is an edge to find."
        >
          <div className="flex flex-col gap-24">
            <Prose>
              <p className="text-base leading-8">
                Closing line value only means something if the closing price is worth beating.
                So the first question is not about bettors at all. It is whether the close is a
                better forecast than the open, and if so, where that extra accuracy comes from.
              </p>
            </Prose>

            <Figure
              index={1}
              title="Both prices are well calibrated. The close is slightly better."
              caption={`Across ${count(h.matches)} matches the closing price scores ${h.brier_close.toFixed(5)} on Brier against the opening price's ${h.brier_open.toFixed(5)}. That gap is small but it is not noise: a paired test gives t = ${h.t_stat}, and a bootstrap puts the 95% interval at ${h.gain_ci95[0].toFixed(4)} to ${h.gain_ci95[1].toFixed(4)}, which does not contain zero.`}
              source={`Average 1X2 prices, ${count(h.matches)} matches with complete opening and closing quotes, ${market.dateRange[0]} to ${market.dateRange[1]}.`}
            >
              <CalibrationChart />
            </Figure>

            <Figure
              index={2}
              title="The close is only better where the price moved."
              caption={`Split the same matches by how far the price travelled between open and close and the advantage is not spread evenly. In the two quietest quartiles the close is no better than the open, and the interval crosses zero. In the noisiest quartile it gains ${topBand.gain.toFixed(4)}, which is ${(topBand.gain / h.gain).toFixed(1)} times the overall average. The information a sharp captures is the movement itself, and closing line value is the measure of how much of it they caught.`}
              source={`Same ${count(h.matches)} matches, split into quartiles by the largest single leg move. Bars show the mean gain, whiskers the 95% interval.`}
            >
              <MovementChart />
            </Figure>

            <Prose>
              <p className="text-base leading-8">
                The median match moves {h.move_median_pp}pp between open and close, the top
                tenth moves more than {h.move_p90_pp}pp, and in{" "}
                {(h.favourite_flipped * 100).toFixed(1)}% of matches the favourite changes
                outright. That is the room. The next two figures ask whether any of it survives
                as mispricing at the close, and the answer is no.
              </p>
              <Subhead>Margin is not the same thing as mispricing</Subhead>
              <p className="text-base leading-8">
                The obvious story about sharps is that they hunt badly priced leagues. The data
                supports a different one. What varies across divisions is what the book charges,
                not how well it forecasts.
              </p>
            </Prose>

            <Figure
              index={3}
              title="Margin varies far more across leagues than accuracy does."
              caption="Scottish League One charges 5.71% overround against the Premier League's 2.68%, more than double, while the Brier scores sit inside overlapping intervals. Thin leagues are not more mispriced. They are more expensive, so a sharp needs a bigger edge there simply to break even."
              source="Pinnacle closing prices. Query: sql/01_league_efficiency.sql, run unchanged."
            >
              <LeagueEfficiencyTable />
            </Figure>

            <Figure
              index={4}
              title="No league is distinguishable from perfectly calibrated."
              caption="Raw calibration error is confounded by sample size, because the error expected under perfect calibration shrinks with the square root of n. Dividing observed error by that expected error removes the confound. Every ratio lands between 0.68 and 1.26, so nothing here is mispriced beyond what sampling alone would produce."
              source="Pinnacle closing prices, decile buckets per league. Query: sql/03_calibration_vs_noise.sql, run unchanged."
            >
              <CalibrationNoiseTable />
            </Figure>

            <Prose>
              <p className="text-base leading-8">
                Taken together those four figures set the rules. Nobody beats the close, so a
                sharp&apos;s edge has to come from beating the price before it converges. That is
                the only mechanism available, it is measurable the moment a bet is placed, and it
                is what the rest of this page simulates.
              </p>
            </Prose>
          </div>
        </Section>

        <Simulator />

        <Section id="method" index={6} title="Method and limits">
          <div className="flex flex-col gap-16">
            <Prose>
              <Subhead>How the simulation works</Subhead>
              <p className="text-base leading-8">
                A bettor decides using the opening price and a private estimate of the true
                probability. They never see the close. How good a bettor is comes down to one
                number: how far that private estimate sits from the truth.
              </p>
              <p className="text-base leading-8">
                A sharp reads a game about as well as the closing price does, and bets early,
                into prices that have not absorbed everyone else&apos;s information yet. There is
                no secret edge in this model, because Figure 04 says there is nowhere to hide one.
              </p>
              <p className="text-base leading-8">
                Closing prices do two things, both after the fact. They stand in for truth when a
                private estimate is generated, and they score the bet once it is already placed.
              </p>
              <table className="w-full text-base leading-7">
                <caption className="mb-4 text-left text-base leading-7 text-muted-foreground">
                  {count(market.matches)} matches carry complete average opening and closing
                  prices, {market.dateRange[0]} to {market.dateRange[1]}.
                </caption>
                <tbody>
                  {leagues.map(([code, matches]: [string, number]): ReactNode => (
                    <tr key={code} className="border-b border-border">
                      <th scope="row" className="py-2 text-left font-normal">
                        {LEAGUE_NAMES[code] ?? code}
                      </th>
                      <td className="py-2 text-right font-mono tabular-nums">{count(matches)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Subhead>What it gets wrong</Subhead>
              <p className="text-base leading-8">
                <strong className="font-semibold">I labelled the wrong people adverse.</strong>{" "}
                The first version of the detection code counted semi sharps as adverse, because
                they are skilled. The cost model then returned a negative cost for failing to
                restrict them, which was the model saying the label was wrong. The book holds
                4.7% on semi sharps. Adverse is an economic label, not a skill label, and Figure
                12 is what that distinction looks like.
              </p>
              <p className="text-base leading-8">
                <strong className="font-semibold">The bettors are invented.</strong> No public
                bettor level data exists, so the accounts are simulated. This does not discover
                that sharps exist. It measures how fast an estimator converges on a truth already
                known by construction, which is the one question simulation is genuinely the right
                tool for. Figures 01 to 04 are real data and carry the part of the argument that
                simulation cannot.
              </p>
              <p className="text-base leading-8">
                <strong className="font-semibold">Truth is a proxy, and proxies drift.</strong>{" "}
                Private estimates are generated around the devigged closing price. Figures 01 and
                04 justify that, but it still means the simulation inherits whatever the closing
                price gets wrong. A real desk would find that out slowly and expensively.
              </p>
              <p className="text-base leading-8">
                <strong className="font-semibold">
                  Your run will not match the published one.
                </strong>{" "}
                The published figures come from numpy. A browser cannot reproduce that random
                stream, so a live run lands near those numbers rather than on them. Figure 10
                exists so that claim can be checked rather than taken on trust.
              </p>
            </Prose>
          </div>
        </Section>

        <footer className="border-t border-border pt-12">
          <Prose>
            <p className="text-base leading-8 text-muted-foreground">
              Market data from football-data.co.uk, six European divisions,{" "}
              {market.dateRange[0]} to {market.dateRange[1]}. Staging, the dimensional model and
              the market layer queries are SQL over DuckDB. The simulation and the detection work
              are Python, ported to TypeScript so this page can run them rather than replay them.
            </p>
            <p className="text-base leading-7 text-subtle-foreground">Built by Max Nudelman.</p>
          </Prose>
        </footer>
      </main>
    </>
  );
}
