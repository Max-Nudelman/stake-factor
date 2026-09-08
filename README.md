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

## Status

Market layer, dimensional model and calibration queries are done. Still ahead: the bettor
simulation, account level feature engineering, the time to detection curves that answer the
headline question, and the cost model that prices false positives against false negatives.

Write up at [max-nudelman.github.io](https://max-nudelman.github.io/projects/stake-factor.html).
