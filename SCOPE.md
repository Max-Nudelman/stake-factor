# Bettor Segmentation — Project Scope

**Status:** scoped 2026-09-07. Sport switched to soccer 2026-09-07. No code written yet.
**Owner:** Max Nudelman
**Working title:** *Stake Factor: Detecting Adverse Accounts Before the Money Is Gone*
(not "bettor clustering" — name the decision, not the algorithm)

---

## 1. The question

> **How many settled bets does it take to tell a sharp bettor from a lucky recreational
> one — and what does acting too early or too late cost the book?**

Clustering is step four of six, not the headline. This framing is chosen deliberately:
it is a question about *estimator behavior against known truth*, which simulation is the
correct tool for, rather than a question about discovering truth, which simulation would
only fake.

### Supporting questions
1. What account-level features actually separate skill from luck, and how fast does each
   one become informative?
2. Do unsupervised segments recover economically meaningful groups, or just volume tiers?
3. What is the expected cost of a stake-factor policy — lost recreational revenue from
   false positives vs. adverse handle from false negatives?
4. Does in-play (live) sharpness look different from prematch sharpness?
5. **Once accounts are restricted, what is their bet flow worth as a signal?** Restriction
   is not the end of the pipeline — a pinned account becomes a low-cost sensor.
6. Who gets wrongly restricted, and is that error rate uniform across customers?

## 2. Framing commitments

- **Axis is skill x economic value, not profitable vs. adverse.** A high-volume
  recreational parlay bettor is the most valuable account on the book. A $50 sharp is
  adverse but cheap. Bonus abusers are a third category CLV will not catch.
- **Output is a continuous stake factor, not a binary label.** That is the dial that was
  actually turned on the desk.
- **Segment on process, not outcome.** Features are CLV, bet timing, market selection,
  stake behavior. NOT realized P&L or win rate — a season of results is mostly variance
  for anyone under a few thousand bets. Demonstrating this explicitly is a core finding,
  not a footnote.

## 3. Data

**Hybrid: real market layer, simulated bettors. Sport = soccer (European club football).**

- Market layer: [football-data.co.uk](https://www.football-data.co.uk/notes.txt) — free
  per-league, per-season CSVs covering ~20+ European divisions in one consistent schema.
- Bettor layer: simulated accounts placing bets into that real market, generated from
  documented, parameterized archetypes.
- README claim: *"Bettor behavior is simulated from documented assumptions; the market
  they bet into is real."*

### Why soccer beats NFL for this project
1. **Real opening AND closing odds.** Closing prices are denoted by a `C` in the column
   code (`B365CH`, `PSCH`). Open-to-close movement is observed data, so **CLV is measured
   rather than modeled** — this removes the largest honesty caveat in the original scope.
2. **Pinnacle is included** (`PSH`/`PSD`/`PSA`, closing `PSCH`). Pinnacle's closing price
   is the industry-standard benchmark for beating the market. CLV is computed against the
   reference the industry actually uses, on real prices.
3. **A measurable market-efficiency gradient.** ~20+ divisions in one schema means league
   inefficiency (overround, closing-line accuracy) can be *measured*, not assumed. "Bets
   into inefficient markets" becomes a data-grounded feature. NFL offers one market;
   soccer offers a spectrum. This becomes a first-class deliverable, not a side note.
4. **Real market variety.** 1X2 (three-way, incl. the draw), Asian handicap, and
   over/under 2.5, from multiple books plus max/average aggregates. Overround is directly
   computable as `1/H + 1/D + 1/A - 1` per book per league.
5. **Match statistics** (shots, shots on target, corners, fouls, cards, half-time score,
   referee) give the live/in-play extension real match state to attach to.
6. Soccer is the largest in-play betting market globally — fits the live desk experience.

### The one real cost, and the mitigation
DraftKings, PrizePicks and Underdog are NFL/NBA-driven, so soccer is marginally less
on-the-nose there. Offsetting: it is an *advantage* at bet365, Sportradar, Genius Sports
and Caesars (global, soccer-first); the pipeline is sport-agnostic and says so; and an
optional stretch is to rerun it on one NFL season as a portability appendix.

### To verify at ingest (site was intermittently 503 during scoping)
- Which seasons carry the `C` closing-odds columns (believed ~2019-20 onward).
- Exact division-code coverage and per-league season depth.
- Terms of use for redistribution of any derived data in a public repo.

### Rejected alternatives
- *Pure simulation* — every distribution is one we chose; weak answer to "do these look
  like real bettors?"
- *Real public data only* — no public bettor-level data exists. Becomes a line-movement
  study, a different project.
- *NFL via nflfastR* — clean and citable, but closing lines only and a single market with
  no efficiency gradient.

## 3b. Desk mechanisms this models (from firsthand observation)

Presented in the writeup as **industry-general mechanisms with public sources**, not as any
employer's internal parameters, tooling, or process. No specific internal thresholds or
system descriptions get published.

### Restriction as a sensor network
Books commonly pin adverse accounts at a minimum stake factor rather than closing them.
The account stops being a liability and becomes an information source: restricted accounts
hitting a market implies a probable price discrepancy, which triggers a price review. So
restriction *starts* an information pipeline rather than ending one. This becomes the
project's final section.

**Validation use — the answer to "is your simulation made up?"**
Simulated sharps derive their edge estimate from information available **at market open
only**, and are never shown the closing price. We then test whether their aggregate bet
flow predicts the *real* open-to-close movement in the football-data files. If it does,
that is out-of-sample evidence that the behavioral model corresponds to something real,
against data the simulation never saw.

> **HARD CONSTRAINT:** if simulated bettors can see closing prices, this validation is
> circular and worthless. The firewall is enforced in code and stated in the README.

### Geolocation false positives
Proximity to a known restricted account is used as a collusion proxy, so bettors who merely
geolocate nearby get caught without colluding. This is a proxy-feature bias problem: the
error rate scales with population density, so urban recreational customers absorb more
false positives than rural ones. Modeled with account coordinates and a density parameter —
some accounts genuinely clustered as syndicates, others spatially coincidental. Scope is
deliberately small: coordinates and density, not a real geo pipeline.

### Two decision loops on different clocks
The same question runs at two latencies: **line changes** (fast, minutes, few signals) and
**customer management** (slow, months of settled bets). The 25/50/100/250-bet feature
windows are the slow loop. The live loop is a separate inference problem with its own cost
function.

### Two biases this creates — naming them is the deliverable
- **Censoring.** If accounts are surfaced *because* they are already restricted, labels are
  conditioned on the outcome and sharps who were never caught are unobserved. Simulation
  holds ground truth, so the magnitude of this bias is measurable — a result real books
  generally cannot produce.
- **Post-intervention feedback.** Restricted accounts change behavior (stop, shift markets,
  leave). The data-generating process differs after intervention, so models trained on
  post-restriction behavior are broken. Handled explicitly, not assumed away.

## 3c. League selection (locked 2026-09-07)

Chosen to span the efficiency gradient, not to maximize volume.

| Tier | Divisions | Role |
|---|---|---|
| Sharp / thick | Premier League (E0), La Liga (SP1) | Accurate closing lines, tight margins |
| Mid | Championship (E1), Eredivisie (N1) | The transition zone |
| Thin | League Two (E3), Scottish L1 or L2 (SC2/SC3) | Where mispricing should exceed vig |
| Relatability | **MLS (extra-format `new/USA.csv`)** | US-employer familiarity; schema-portability proof |

England's E0/E1/E3 gives a within-country pyramid, so tier can be compared without
cross-country confounds.

### The gradient has TWO opposing axes
A market is beatable only where **mispricing exceeds the vig**. These do not move together:

- **Overround** (`1/H + 1/D + 1/A - 1`) — the book's margin. Often *lower* in marquee
  markets, because books compete hardest where the volume is. Frequently *worse* for the
  bettor in thin leagues.
- **Closing-line accuracy** — how well price predicts result. Reliably worse in thin
  leagues.

So "sharps bet obscure leagues" is too simple: plenty of thin markets are badly priced and
still unprofitable because margin eats the edge. Measuring both axes separately and finding
where the gap opens is the Week 1 deliverable.

### MLS scope — VERIFIED 2026-09-07 (supersedes the earlier assumption)

Inspected directly. The earlier expectation that extra-format files lack closing odds was
**wrong** — the opposite is true.

`new/USA.csv`: 5,789 matches, seasons 2012-2025, **Pinnacle closing odds populated at
99.9%**. 25 columns vs. 118 in main-format files. It has closing prices and *no opening
prices*, no over/under, no Asian handicap, and no match statistics.

| Analysis | Main format | MLS |
|---|---|---|
| Two-axis efficiency table (Week 1) | yes | **yes** |
| Open-to-close line movement | yes | no (no opening prices) |
| Sensor-network validation | yes | no (needs movement) |
| Market-type selection features | yes | no (1X2 only) |
| Live / in-play extension | yes | no (no match state) |

So MLS **is** included in the headline Week 1 real-data finding, and excluded from the
movement-dependent work. Disclosed in the README as a stated design decision.

## 3d. Data source resilience

football-data.co.uk returned HTTP 503 on every path for the entire development session
(10 probes over 30 minutes). Mitigations, in order:

1. **Aggressive local caching** — `data/raw/` is written once and reused; the pipeline runs
   fully offline thereafter.
2. **Wayback Machine fallback** — serves the CSVs with all odds columns intact. Snapshots
   are resolved via the availability API with exponential backoff, because archive.org
   rate-limits bursts and a naive loop silently drops most of a 37-file batch.
3. **Ruled out:** the `footballcsv/cache.footballdata` GitHub mirror. It carries results
   only — every odds column is stripped, which makes it useless here.

Single-source dependency is a real project risk and is named in the README rather than
discovered by a reader.

## 3e. Architecture — SQL-first (decided 2026-09-08)

**DuckDB.** No server, `pip install`, reads the cached Parquet/CSV directly, full
Postgres-style window functions, single-file database a reviewer can clone and run.

### The split — stated plainly in the README, because a reader will find the .py files
| Layer | Tool | Work |
|---|---|---|
| Staging, dimensional model, odds normalization | SQL | ~1.1M-row `fact_odds` from 118 wide columns |
| Overround, closing-line accuracy, per-bet CLV | SQL | Week 2 |
| Account feature aggregation, detection counts | SQL | window functions over bet history |
| Bettor simulation | Python | Week 3 |
| Clustering + validation | Python | scikit-learn; there is no k-means in SQL worth writing |

### Why SQL is the right call here, not just a preference
Sportsbook analytics work *is* SQL against a warehouse fact table. A repo whose feature
engineering happens in SQL reads as job-ready. It also merges Max's daily SQL practice into
the project instead of competing with it, and the feature work exercises exactly the
constructs that appear in live screens: multi-way JOINs, CTEs, `ROW_NUMBER` for first-N-bet
windows, running `SUM/AVG OVER`, `LAG` for line movement, `NTILE` for price buckets.

### Schema
```
dim_league    league_code, name, country, tier, supports_line_movement
dim_account   account_id, true_archetype, signup_date, geo_cell
fact_match    match_id, league_code, season, match_date, home, away, goals, result
fact_odds     match_id, book, market_type, selection, phase(open|close), price
fact_bet      bet_id, account_id, match_id, market_type, selection,
              stake, price_taken, placed_at, settled_at, pnl
```

## 4. Features

Priors below. **Max to correct and extend from firsthand Fanatics experience** — the
differentiator is that this list came from a desk, not a blog post.

| Feature | Hypothesis |
|---|---|
| CLV (bet price vs. close) | Canonical signal, but noisy; needs volume |
| Time-to-post | Sharps hit new/mispriced markets within minutes |
| Stake sizing vs. estimated edge | Kelly-like scaling vs. flat or emotional sizing |
| Market depth | Alt lines, props, obscure leagues vs. main NFL sides |
| Parlay / SGP rate | Strongly recreational; the book's margin engine |
| Bet-to-deposit ratio, withdrawal cadence | Behavioral, not price-based |
| Correlated timing across accounts | Syndicate / steam-following signal |
| Geographic proximity to restricted accounts | Collusion proxy — and the main false-positive source |
| Co-movement with restricted-account flow | The sensor-network signal; cheap and fast |
| Live-market latency | Stale-line picking, in-play reaction speed — the rare angle |
| League tier selection | **OPEN QUESTION** — Week 2 found closing lines efficient in all 7 leagues; thin leagues are more *expensive* (higher vig), not more mispriced. Test, do not assume. See docs/findings.md |
| Market type mix | Asian handicap and totals (sharp) vs. home-favourite 1X2 (recreational) |
| Draw-market behavior | Recreational money avoids the draw; pricing it well is a skill signal |
| CLV vs. Pinnacle close | Measured against the industry reference book, on real prices |

### Open questions for Max
- What actually triggered you to pull up an account?
- What did the metrics on your screen look like?
- How fast did you decide?
- What did a false positive look like — restricting someone who was just running hot?

## 5. Build sequence

1. **Market layer** — ingest real odds/results across divisions; measure overround and
   closing-line accuracy per league to establish the efficiency gradient; assumptions
   document started here
2. **Simulation engine** — parameterized archetypes betting into the real market
3. **Feature engineering** — account features computed on settled-bet windows
   (at 25, 50, 100, 250 bets)
4. **Clustering** — with honest validation: stability across seeds, silhouette *plus* a
   "does k mean anything" check, and recovery rate against known ground truth
5. **Detection curves** — precision/recall of "sharp" as a function of settled bets
6. **Policy layer** — stake-factor rule, and the expected cost of its errors, including
   who absorbs the false positives (density-linked, not uniform)
7. **Sensor-network section** — value of restricted-account flow as a signal, plus the
   open-information-only validation against real closing line movement

## 6. Artifacts

- GitHub repo (README lands the finding on the first screen, before anyone opens a
  notebook)
- Written analysis
- Tableau Public dashboard (also clears the Tableau gap on target job postings)

## 7. Milestones (7 weeks)

| Week | Deliverable |
|---|---|
| 1 | Market layer ingested + DuckDB schema + assumptions doc v1 |
| 2 | League efficiency analysis in SQL (the two-axis table) |
| 3 | Simulation engine producing bet-level records |
| 4 | Feature pipeline in SQL at multiple settled-bet windows |
| 5 | Clustering + validation results (Python) |
| 6 | Detection curves + policy cost analysis + sensor-network validation |
| 7 | Writeup, README, Tableau Public dashboard |

**Scheduling note:** this runs alongside a daily SQL routine. Proposed split — SQL on
weekdays, project on weekends plus one weeknight.
