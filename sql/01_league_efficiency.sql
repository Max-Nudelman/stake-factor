-- ============================================================================
-- WEEK 2 DELIVERABLE: the two-axis market efficiency table.
--
-- The claim "sharps bet inefficient leagues" is too simple. A market is
-- beatable only where MISPRICING EXCEEDS THE VIG, and those two things do not
-- move together:
--
--   Axis 1  OVERROUND      the book's margin. Often LOWER in marquee leagues,
--                          because books compete hardest where volume is.
--   Axis 2  BRIER SCORE    how well the closing price predicts the result.
--                          Reliably WORSE in thin leagues.
--
-- A thin league can be badly priced AND unprofitable, because margin eats the
-- edge. This query measures both separately so we can see where the gap opens.
--
-- Pinnacle only. Pinnacle is the industry reference for a sharp closing price,
-- and mixing books would confound margin differences with book identity.
-- ============================================================================

WITH close_1x2 AS (
    -- fact_odds is long, so H/D/A for one match are three ROWS. Conditional
    -- aggregation pivots them back to three COLUMNS. MAX() is just the picker
    -- here -- the GROUP BY guarantees one row per selection, so there is
    -- nothing to actually maximize.
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
    SELECT
        m.league_code,
        m.result,
        c.price_h, c.price_d, c.price_a,
        -- Decimal odds -> implied probability is 1/price. Summed across all
        -- three outcomes it exceeds 1.0; the excess IS the book's margin.
        (1.0/c.price_h + 1.0/c.price_d + 1.0/c.price_a) AS booksum
    FROM close_1x2 c
    JOIN fact_match m USING (match_id)
    WHERE m.result IN ('H','D','A')
      AND c.price_h > 1 AND c.price_d > 1 AND c.price_a > 1
),

scored AS (
    SELECT
        league_code,
        booksum - 1.0 AS overround,
        -- Divide each implied probability by booksum to strip the vig, giving
        -- a fair probability set that sums to 1. Without this the Brier score
        -- would penalise the book for charging a margin, which is not an
        -- accuracy failure.
        ((1.0/price_h)/booksum - CASE WHEN result='H' THEN 1 ELSE 0 END) ** 2 +
        ((1.0/price_d)/booksum - CASE WHEN result='D' THEN 1 ELSE 0 END) ** 2 +
        ((1.0/price_a)/booksum - CASE WHEN result='A' THEN 1 ELSE 0 END) ** 2
            AS brier
    FROM priced
)

SELECT
    l.tier,
    l.league_name,
    count(*)                                    AS matches,
    round(avg(s.overround) * 100, 2)            AS overround_pct,
    round(avg(s.brier), 4)                      AS brier,
    -- Confidence interval, because this is the whole argument and one tier is
    -- carried by a 969-match league. A gap inside the intervals is not a gap.
    round(1.96 * stddev(s.brier) / sqrt(count(*)), 4) AS brier_ci95
FROM scored s
JOIN dim_league l USING (league_code)
GROUP BY l.tier, l.league_name
ORDER BY avg(s.brier);
