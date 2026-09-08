# Stake Factor

**Detecting adverse sportsbook accounts before the money is gone.**

> How many settled bets does it take to tell a sharp bettor from a lucky recreational one,
> and what does it cost the book to act too early or too late?

On the risk desk at Fanatics I answered that by feel. I would pull up an account, look at
its history and its metrics, and decide whether it needed restricting or whether its stake
factor should go up. It was usually right, but I could never have told you how right. This
project is the same decision made with evidence behind it, and with an honest accounting of
the errors on both sides.

## Framing

Three commitments, each of which rules something out:

- **The axis is skill against economic value, not profitable against adverse.** A high
  volume recreational parlay bettor is the most valuable account on the book, while a $50
  sharp is adverse but cheap. Collapsing those into one dimension throws away what the
  business actually cares about.
- **The output is a continuous stake factor, not a binary label.** Restrict or don't
  restrict was never really the decision. It was a dial.
- **Segment on process, not outcome.** Features are closing line value, bet timing, market
  selection and stake behavior, never realized profit or win rate. Under a few thousand
  bets, a season of profit and loss is mostly variance.

Note what the headline question is not. It is not whether I can cluster bettors.
Clustering data I generated myself would be circular, since I would be rediscovering my own
assumptions and calling the result a finding. The defensible question is how fast an
estimator converges against a truth you already know, and that is what simulation is
actually the right tool for.

## Data: real market, simulated bettors

There is no public dataset of individual bettor histories and there never will be, since it
is the most commercially sensitive data a sportsbook holds. So the design splits the
difference. **The market is real**, seven years of actual opening and closing odds across
seven European divisions including Pinnacle. **The bettors are simulated** from documented
and parameterized archetypes betting into that real market.

That split is what makes the result mean anything. The bettors are my assumptions and they
are written down in `docs/assumptions.md` so anyone can argue with them. The prices they
face, and whether those prices were beatable at all, are not up to me.

## Findings so far

The market layer is built and queried, all of it in SQL against DuckDB. Two hypotheses went
in. One held and the more interesting one did not.

### Confirmed: books charge far more where nobody is watching

Pinnacle closing overround by division, across 19,431 matches:

| league | market depth | overround |
|---|---|---|
| La Liga | deep | 2.66% |
| Premier League | deep | 2.68% |
| MLS | medium | 2.97% |
| Championship | medium | 3.07% |
| Eredivisie | medium | 3.33% |
| League Two | thin | 3.71% |
| Scottish League One | thin | **5.71%** |

Scottish League One carries more than double the margin of the Premier League. Books
compete on price where the volume is, and where nobody is looking they take what they like.

### Rejected: thin markets are not mispriced

The obvious follow on was that thin leagues would also be priced less accurately. To test
it I compared each league's observed calibration error against the error you would expect
from **sampling noise alone**, because with a few thousand matches you will see some
apparent error even if the prices are perfect. A ratio near 1.0 means indistinguishable
from perfectly calibrated.

| league | observed | noise | ratio |
|---|---|---|---|
| La Liga | 1.76pp | 1.40pp | 1.26 |
| Scottish League One | 2.44pp | 2.09pp | 1.17 |
| Championship | 0.99pp | 1.15pp | 0.86 |
| Premier League | 1.07pp | 1.32pp | 0.81 |
| Eredivisie | 1.19pp | 1.47pp | 0.81 |
| MLS | 0.69pp | 0.86pp | 0.80 |
| League Two | 0.81pp | 1.18pp | 0.68 |

**Every ratio falls between 0.68 and 1.26.** Not a single league shows mispricing that can
be distinguished from noise, so the hypothesis is rejected. It independently reproduces the
received wisdom that Pinnacle's closing line is effectively unbeatable.

That matters for the project rather than derailing it. It means a simulated sharp cannot
get an edge just by picking an obscure league, so their edge has to come from timing,
meaning beating the closing line. That is both the realistic mechanism and the one I
watched operate at Fanatics.

## Running it

```bash
pip install -r requirements.txt
python -m src.ingest      # downloads and harmonizes the market layer
python -m src.build_db    # builds the DuckDB dimensional model
```

Data is not committed, since `src/ingest.py` rebuilds it from football-data.co.uk.

## Repo layout

| path | what it is |
|---|---|
| `SCOPE.md` | The design document: question, framing, data, leagues, milestones |
| `docs/assumptions.md` | Every simulation parameter and its justification |
| `docs/findings.md` | Results as they land, with the queries that produced them |
| `sql/` | Staging, the dimensional model, and the analysis queries |
| `src/` | Download, harmonize, build the database |

## The answer

**Closing line value separates an adverse account after five settled bets (AUC 0.98) and is
essentially perfect by forty. Realized profit never exceeds 0.62 and after two hundred bets is
indistinguishable from a coin flip.** A bet either wins or loses, so profit is a very noisy read
on a probability. CLV scores the decision rather than the outcome.

4,000 simulated accounts, 477,697 bets into the real market. The book holds 5.1% to 5.5%
against every recreational segment and loses 3.4% to sharps, which is roughly where a real
book sits.

### But the useful finding is the second one

| accounts restricted | adverse caught | profitable cut | change in book profit |
|---|---|---|---|
| 760 (20%) | 86 of 86 | 674 | **-£202,000** |
| 380 (10%) | 86 of 86 | 294 | -£92,000 |
| 190 (5%) | 86 of 86 | 104 | -£29,000 |
| 114 (3%) | 86 of 86 | 28 | +£20,000 |
| 38 (1%) | 38 of 86 | 0 | **+£27,000** |

**Every policy catches all 86 adverse accounts by the time it restricts 5% of the book. Going
further only removes profitable customers.** The sharps take about £51,000 in total.
Restricting the top 20% by CLV costs £202,000.

619 recreational whales generate £3.05m of profit; 86 sharps take £51,000. A policy that trades
one for the other is a bad trade even when it correctly identifies sharps.

Timing is not the binding constraint: acting after **twenty** bets already captures 92% of what
a perfect-foresight oracle achieves. Where the threshold sits is what decides whether the policy
makes or loses money.

### The mistake worth recording

My first version labelled semi-sharps as adverse, because they are skilled. The cost model then
reported a *negative* cost for failing to restrict them, which was the model saying the label
was wrong rather than the arithmetic. Semi-sharps sit at the 94th percentile of CLV and the book
holds **+4.7%** on them. Adverse is an economic property, not a skill property. That distinction
is exactly what the skill-by-value framing existed to catch, and I still got it wrong first.

## What this does not establish

- **The bettors are my assumptions**, documented in `docs/assumptions.md`. A simulation cannot
  tell you how real customers behave. It can tell you how an estimator behaves against a known
  truth, which is the only claim made.
- **Archetypes are cleanly separated by construction.** Real accounts sit on a continuum, so the
  detection curve is an upper bound, not a forecast.
- **One market type.** Match result only. Parlays, in-play and Asian handicap have different
  margin structures.
- **The 0.1 stake factor is a stand-in** for a number a real desk sets per account.

## Running the simulation

```bash
python -m src.simulate     # 4,000 accounts betting into the real market
python -m src.detect       # detection curves and policy costs
python -m src.figures      # four charts
python -m src.export_web   # JSON for the write-up
```

Bettors decide on the opening price and their own private estimate. **They never see a closing
price.** That constraint was written into SCOPE.md before any code existed, because letting a
bettor see the close would make the CLV validation circular.

Write up at [max-nudelman.github.io](https://max-nudelman.github.io/projects/stake-factor.html).
