-- ============================================================================
-- WEEK 2, AXIS 2 (corrected): calibration, not raw accuracy.
--
-- WHY THIS REPLACES BRIER (keep this note -- it is the interesting part):
--   The first version of this analysis ranked leagues by Brier score and put
--   the Eredivisie top, ahead of the Premier League. That is not a pricing
--   result -- the Eredivisie is top-heavy (Ajax/PSV/Feyenoord), so outcomes
--   are inherently more predictable. Brier confounds HOW PREDICTABLE a league
--   is with HOW WELL IT IS PRICED.
--
--   Calibration separates them. Bucket every priced outcome by its implied
--   probability, then ask: in the bucket where the market said ~30%, did it
--   happen ~30% of the time? A well-calibrated market is unbeatable however
--   predictable it is; a miscalibrated one is exploitable however chaotic.
--
-- BEATABILITY = calibration error vs. overround. An edge only exists where
-- mispricing is larger than the margin you must overcome to collect it.
-- ============================================================================

WITH close_1x2 AS (
    SELECT
        match_id,
        MAX(CASE WHEN selection = 'H' THEN price END) AS price_h,
        MAX(CASE WHEN selection = 'D' THEN price END) AS price_d,
        MAX(CASE WHEN selection = 'A' THEN price END) AS price_a
    FROM fact_odds
    WHERE book = 'PS' AND market_type = '1X2' AND phase = 'close'
    GROUP BY match_id
),

priced AS (
    SELECT m.league_code, m.result, c.price_h, c.price_d, c.price_a,
           (1.0/c.price_h + 1.0/c.price_d + 1.0/c.price_a) AS booksum
    FROM close_1x2 c
    JOIN fact_match m USING (match_id)
    WHERE m.result IN ('H','D','A')
      AND c.price_h > 1 AND c.price_d > 1 AND c.price_a > 1
),

-- Back to long form: one row per (match, selection), with the vig stripped out
-- and a 0/1 flag for whether it actually happened. UNION ALL rather than three
-- joins -- these are the same shape stacked, not related tables.
outcomes AS (
    SELECT league_code, (1.0/price_h)/booksum AS p,
           CASE WHEN result='H' THEN 1 ELSE 0 END AS hit FROM priced
    UNION ALL
    SELECT league_code, (1.0/price_d)/booksum,
           CASE WHEN result='D' THEN 1 ELSE 0 END FROM priced
    UNION ALL
    SELECT league_code, (1.0/price_a)/booksum,
           CASE WHEN result='A' THEN 1 ELSE 0 END FROM priced
),

-- NTILE splits each league's outcomes into 10 equal-sized probability buckets.
-- Equal-N buckets (rather than fixed 0-10%, 10-20% bands) keep every bucket
-- statistically meaningful even in a 969-match league, where fixed bands would
-- leave the extremes nearly empty.
bucketed AS (
    SELECT league_code, p, hit,
           NTILE(10) OVER (PARTITION BY league_code ORDER BY p) AS bucket
    FROM outcomes
),

by_bucket AS (
    SELECT league_code, bucket,
           count(*)    AS n,
           avg(p)      AS predicted,   -- what the market said would happen
           avg(hit)    AS actual       -- what actually happened
    FROM bucketed
    GROUP BY league_code, bucket
)

SELECT
    l.tier,
    l.league_name,
    sum(b.n)                                              AS outcomes,
    -- Sample-weighted mean absolute calibration error, in percentage points.
    round(sum(abs(b.predicted - b.actual) * b.n) / sum(b.n) * 100, 2) AS calib_err_pp,
    -- Worst single bucket: an average can hide one badly broken price range,
    -- which is exactly where a sharp bettor would live.
    round(max(abs(b.predicted - b.actual)) * 100, 2)      AS worst_bucket_pp
FROM by_bucket b
JOIN dim_league l USING (league_code)
GROUP BY l.tier, l.league_name
ORDER BY calib_err_pp;
