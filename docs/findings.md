# Findings

## Week 2 — market efficiency (real data, no simulation)

Source: Pinnacle closing 1X2 prices, 19,431 matches, 7 leagues. Queries in `sql/`.

### Axis 1 — overround CONFIRMS the hypothesis
Books charge far more margin in thin markets.

| League | Tier | Overround |
|---|---|---:|
| La Liga | sharp | 2.66% |
| Premier League | sharp | 2.68% |
| MLS | relatable | 2.97% |
| Championship | mid | 3.07% |
| Eredivisie | mid | 3.33% |
| League Two | thin | 3.71% |
| Scottish League One | thin | **5.71%** |

Scottish League One charges more than **double** the Premier League. Books compete on
margin where the volume is; where nobody is watching they take what they like.

### Axis 2 — closing lines are efficient EVERYWHERE. Hypothesis rejected.
Calibration error measured against the error expected from sampling noise alone
(`ratio ~ 1.0` = indistinguishable from perfect calibration):

| League | Tier | Observed | Noise | Ratio |
|---|---|---:|---:|---:|
| La Liga | sharp | 1.76pp | 1.40pp | 1.26 |
| Scottish League One | thin | 2.44pp | 2.09pp | 1.17 |
| Championship | mid | 0.99pp | 1.15pp | 0.86 |
| Premier League | sharp | 1.07pp | 1.32pp | 0.81 |
| Eredivisie | mid | 1.19pp | 1.47pp | 0.81 |
| MLS | relatable | 0.69pp | 0.86pp | 0.80 |
| League Two | thin | 0.81pp | 1.18pp | 0.68 |

**Every ratio is between 0.68 and 1.26.** No league shows mispricing distinguishable from
noise. This independently reproduces the received wisdom that Pinnacle's closing line is
near-unbeatable.

### Why this makes the project stronger
1. It validates the method against a known real-world result.
2. It sharpens the core claim: if nobody beats the close, a sharp's edge must come from
   beating the price BEFORE it converges — which is precisely what CLV measures.
3. It corrects the thin-league story. Thin leagues are not more *mispriced*; they are more
   *expensive*. A sharp needs a bigger edge there just to break even.

### Consequence for the feature table (SCOPE.md 4)
"Sharps skew to thin/inefficient divisions" is now an OPEN QUESTION, not an assumption.
The data supports the opposite reading at least as well. To be tested, not asserted.

### The methodological arc — keep this in the writeup
1. **Raw Brier score** — confounded by how predictable a league inherently is. Caught by an
   implausible result: the Eredivisie ranked best-priced, ahead of the Premier League. It is
   top-heavy (Ajax/PSV/Feyenoord), so outcomes are simply easier to forecast.
2. **Calibration error** — confounded by sample size. Mean |predicted − actual| is positive
   even under perfect calibration and shrinks as 1/sqrt(n), so small leagues always look
   worse. Scottish League One has 2,907 outcomes vs. MLS's 17,355.
3. **Calibration vs. sampling noise** — clean.

Two confounds, each caught by a result that looked wrong rather than by luck.

### Next
Closing lines being efficient makes **open-to-close line movement** the axis that matters:
how much room exists between the opening price and the close for a sharp to capture. That
is the direct real-data analogue of CLV. Available for the six European leagues; not for
MLS, which has no opening prices.
