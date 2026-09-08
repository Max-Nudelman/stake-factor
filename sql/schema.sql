-- ============================================================================
-- Stake Factor -- dimensional schema
--
-- Read this first; it explains WHY the tables look like this, not just what
-- they contain.
--
-- The source files are 118 columns wide. A single Premier League row carries
-- prices like PSH, PSCH, B365CH, PCAHH, Avg>2.5 -- book, market, selection and
-- open-vs-close all encoded in the COLUMN NAME. That is unusable: every new
-- question means naming new columns, and you cannot GROUP BY a column name.
--
-- So fact_odds is LONG: one row per (match, book, market, selection, phase),
-- with the price as a value. ~1.1M rows. Now "average overround by league" is
-- a GROUP BY instead of a hand-written expression over 24 columns.
-- This is the single most important modeling decision in the project.
-- ============================================================================

DROP TABLE IF EXISTS fact_bet;
DROP TABLE IF EXISTS fact_odds;
DROP TABLE IF EXISTS fact_match;
DROP TABLE IF EXISTS dim_account;
DROP TABLE IF EXISTS dim_league;

-- ---------------------------------------------------------------------------
-- dim_league: one row per competition.
-- `tier` is the analytical spine of the project -- leagues were selected to
-- span an efficiency gradient, not for volume.
-- `supports_line_movement` is FALSE for MLS, which has closing prices but no
-- opening prices. Encoding that capability in the data stops us from silently
-- computing a movement metric that is structurally NULL for one league.
-- ---------------------------------------------------------------------------
CREATE TABLE dim_league (
    league_code             VARCHAR PRIMARY KEY,
    league_name             VARCHAR NOT NULL,
    country                 VARCHAR NOT NULL,
    tier                    VARCHAR NOT NULL,  -- sharp | mid | thin | relatable
    supports_line_movement  BOOLEAN NOT NULL,
    supports_market_types   BOOLEAN NOT NULL,  -- over/under + Asian handicap
    supports_live_state     BOOLEAN NOT NULL   -- shots, corners, cards
);

-- ---------------------------------------------------------------------------
-- fact_match: one row per match. The grain everything else hangs off.
-- ---------------------------------------------------------------------------
CREATE TABLE fact_match (
    match_id      BIGINT PRIMARY KEY,
    league_code   VARCHAR NOT NULL REFERENCES dim_league(league_code),
    season        VARCHAR NOT NULL,
    match_date    DATE,
    home_team     VARCHAR,
    away_team     VARCHAR,
    home_goals    SMALLINT,
    away_goals    SMALLINT,
    result        VARCHAR,     -- 'H' | 'D' | 'A'
    ht_home_goals SMALLINT,
    ht_away_goals SMALLINT,
    shots_h       SMALLINT, shots_a   SMALLINT,
    sot_h         SMALLINT, sot_a     SMALLINT,
    corners_h     SMALLINT, corners_a SMALLINT
);

-- ---------------------------------------------------------------------------
-- fact_odds: THE long table. One row per price quoted.
--
--   market_type  '1X2' | 'OU25' | 'AH'
--   selection    1X2 -> 'H'|'D'|'A';  OU25 -> 'O'|'U';  AH -> 'H'|'A'
--   phase        'open' | 'close'
--   handicap     only populated for AH (the goal line, e.g. -0.75)
--
-- Why `phase` as a row rather than two price columns: it makes open-vs-close a
-- JOIN or a PIVOT you choose per question, instead of baking the comparison
-- into the schema. Line movement, CLV and closing accuracy all fall out of it.
-- ---------------------------------------------------------------------------
CREATE TABLE fact_odds (
    match_id     BIGINT NOT NULL REFERENCES fact_match(match_id),
    book         VARCHAR NOT NULL,   -- 'PS' (Pinnacle), 'B365', 'Max', 'Avg', ...
    market_type  VARCHAR NOT NULL,
    selection    VARCHAR NOT NULL,
    phase        VARCHAR NOT NULL,
    price        DOUBLE  NOT NULL,   -- decimal odds
    handicap     DOUBLE              -- NULL except for AH
);

-- ---------------------------------------------------------------------------
-- dim_account / fact_bet: populated by the SIMULATION (Week 3), not by real
-- data. Declared here so the model is legible end-to-end from day one.
--
-- `true_archetype` is ground truth and exists only because these bettors are
-- simulated. It must never be used as a model input -- only to score how well
-- detection worked. Flag it clearly wherever it surfaces.
-- ---------------------------------------------------------------------------
CREATE TABLE dim_account (
    account_id     BIGINT PRIMARY KEY,
    true_archetype VARCHAR NOT NULL,  -- GROUND TRUTH: scoring only, never a feature
    signup_date    DATE,
    geo_cell       VARCHAR,           -- coarse location, for the proximity proxy
    geo_density    DOUBLE             -- accounts per cell; drives false-positive rate
);

CREATE TABLE fact_bet (
    bet_id       BIGINT PRIMARY KEY,
    account_id   BIGINT NOT NULL REFERENCES dim_account(account_id),
    match_id     BIGINT NOT NULL REFERENCES fact_match(match_id),
    market_type  VARCHAR NOT NULL,
    selection    VARCHAR NOT NULL,
    stake        DOUBLE  NOT NULL,
    price_taken  DOUBLE  NOT NULL,   -- price the bettor got
    placed_at    TIMESTAMP,          -- drives time-to-post and the open/close window
    settled_at   TIMESTAMP,
    won          BOOLEAN,
    pnl          DOUBLE
);
