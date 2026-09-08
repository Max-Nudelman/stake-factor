# Tableau Public — extract specification

## Constraints
- Tableau Public connects to **files** (CSV/Excel/JSON), not databases.
- Everything published is **public on the web**. Acceptable here: inputs are public odds
  data plus simulated bettors. Nothing proprietary or employer-specific is ever exported.
- Therefore: export purpose-built aggregates, never bet-level data. Bet-level across 7
  leagues x 6 seasons x thousands of accounts is millions of rows and will crawl.

## The three extracts (written to outputs/tableau/)

### 1. league_efficiency.csv — one row per league x season
The two-axis gradient. Produced in Week 1, from real data only, before any simulation.

| column | meaning |
|---|---|
| league, league_code, country, tier, season | keys |
| matches | sample size (always show this - thin leagues have thin samples) |
| overround_open, overround_close | `1/H + 1/D + 1/A - 1`, the book's margin |
| clv_brier / log_loss | closing-line accuracy: how well price predicts result |
| fav_longshot_bias | calibration error by price bucket |
| beatable_gap | accuracy error minus margin — where an edge can actually exist |

### 2. accounts.csv — one row per simulated account
| column | meaning |
|---|---|
| account_id | key |
| true_archetype | ground truth (simulation only — flag clearly as such in the viz) |
| assigned_segment | what the clustering decided |
| clv, bets_placed, avg_stake, stake_cv | core features |
| parlay_rate, league_tier_mix, market_type_mix, draw_rate | behavioral features |
| time_to_post_median | speed of hitting new markets |
| proximity_to_restricted | the collusion proxy — and false-positive source |
| ltv_estimate, stake_factor_assigned | the economic output |

### 3. detection_curves.csv — one row per (bets_observed x threshold)
| column | meaning |
|---|---|
| bets_observed | 10, 25, 50, 100, 250 |
| threshold | decision cutoff |
| precision, recall, f1 | detection quality |
| false_pos_cost, false_neg_cost, net_cost | the economic tradeoff |
| segment | optional breakdown |

## Dashboard narrative (three views, in this order)
1. **The market** — which leagues are beatable, and why it is two axes not one.
2. **The customers** — skill x value quadrants; where the money actually is.
3. **The decision** — detection curves and the cost of acting too early or too late.

The third view is the point. Views 1 and 2 exist to make it legible.
