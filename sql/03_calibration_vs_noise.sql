-- ============================================================================
-- WEEK 2, AXIS 2 (final): calibration error MEASURED AGAINST SAMPLING NOISE.
--
-- SECOND CONFOUND (and the reason this file exists):
--   Mean |predicted - actual| is positive even for a PERFECTLY calibrated
--   market, purely from sampling. It shrinks as 1/sqrt(n). So a small league
--   always looks worse calibrated than a large one, regardless of pricing.
--   Scottish League One has 2,907 outcomes; MLS has 17,355. Comparing their
--   raw calibration errors compares their sample sizes.
--
--   Fix: for each bucket, compute the error EXPECTED under perfect calibration
--   and report the ratio. For a binomial proportion the mean absolute deviation
--   is approximately sqrt(2*p*(1-p)/(pi*n)).
--
--   ratio ~= 1.0  -> indistinguishable from a perfectly calibrated market
--   ratio >> 1.0  -> real, exploitable mispricing
-- ============================================================================

WITH close_1x2 AS (
    SELECT match_id,
           MAX(CASE WHEN selection='H' THEN price END) AS price_h,
           MAX(CASE WHEN selection='D' THEN price END) AS price_d,
           MAX(CASE WHEN selection='A' THEN price END) AS price_a
    FROM fact_odds
    WHERE book='PS' AND market_type='1X2' AND phase='close'
    GROUP BY match_id
),
priced AS (
    SELECT m.league_code, m.result, c.price_h, c.price_d, c.price_a,
           (1.0/c.price_h + 1.0/c.price_d + 1.0/c.price_a) AS booksum
    FROM close_1x2 c JOIN fact_match m USING (match_id)
    WHERE m.result IN ('H','D','A')
      AND c.price_h>1 AND c.price_d>1 AND c.price_a>1
),
outcomes AS (
    SELECT league_code,(1.0/price_h)/booksum AS p,CASE WHEN result='H' THEN 1 ELSE 0 END AS hit FROM priced
    UNION ALL
    SELECT league_code,(1.0/price_d)/booksum,CASE WHEN result='D' THEN 1 ELSE 0 END FROM priced
    UNION ALL
    SELECT league_code,(1.0/price_a)/booksum,CASE WHEN result='A' THEN 1 ELSE 0 END FROM priced
),
bucketed AS (
    SELECT league_code,p,hit,
           NTILE(10) OVER (PARTITION BY league_code ORDER BY p) AS bucket
    FROM outcomes
),
by_bucket AS (
    SELECT league_code, bucket, count(*) AS n,
           avg(p) AS predicted, avg(hit) AS actual
    FROM bucketed GROUP BY league_code, bucket
),
compared AS (
    SELECT *,
           abs(predicted - actual) AS observed_err,
           -- expected |error| under PERFECT calibration, from sampling alone
           sqrt(2.0 * predicted * (1.0 - predicted) / (pi() * n)) AS noise_err
    FROM by_bucket
)
SELECT
    l.tier,
    l.league_name,
    sum(c.n)                                                        AS outcomes,
    round(sum(c.observed_err*c.n)/sum(c.n)*100, 2)                  AS observed_pp,
    round(sum(c.noise_err   *c.n)/sum(c.n)*100, 2)                  AS noise_pp,
    -- The number that actually means something:
    round(sum(c.observed_err*c.n)/sum(c.noise_err*c.n), 2)          AS ratio
FROM compared c
JOIN dim_league l USING (league_code)
GROUP BY l.tier, l.league_name
ORDER BY ratio DESC;
