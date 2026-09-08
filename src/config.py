"""League selection and data-source configuration.

Every league in this project was chosen to sit at a specific point on the market
efficiency gradient. Volume was NOT a selection criterion -- see SCOPE.md 3c.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"

# football-data.co.uk publishes two different schemas.
#   "main"  -> one file per league PER SEASON, rich columns, opening AND closing odds
#   "extra" -> one file per COUNTRY with all seasons stacked, fewer columns
MAIN_URL = "https://www.football-data.co.uk/mmz4281/{season}/{code}.csv"
EXTRA_URL = "https://www.football-data.co.uk/new/{code}.csv"

# football-data.co.uk was fully down (503) during development. The Wayback Machine
# serves the CSVs intact and is used as an automatic fallback. Verified 2026-09-07.
WAYBACK = "https://web.archive.org/web/2025/{url}"

# Seasons in football-data's compressed notation: 2425 == the 2024/25 season.
# We start at 2019/20, which is roughly when the closing-odds (C-suffix) columns
# became widely populated. VERIFY this at ingest -- it is an assumption.
SEASONS = ["1920", "2021", "2122", "2223", "2324", "2425"]

LEAGUES = [
    # code    name                    country      tier          schema
    ("E0",    "Premier League",       "England",   "sharp",      "main"),
    ("SP1",   "La Liga",              "Spain",     "sharp",      "main"),
    ("E1",    "Championship",         "England",   "mid",        "main"),
    ("N1",    "Eredivisie",           "Netherlands","mid",       "main"),
    ("E3",    "League Two",           "England",   "thin",       "main"),
    ("SC2",   "Scottish League One",  "Scotland",  "thin",       "main"),
    ("USA",   "MLS",                  "USA",       "relatable",  "extra"),
]

# Columns we try to harmonize to. Anything missing is filled with NaN rather than
# raising -- different leagues genuinely carry different columns, and pretending
# otherwise is how you get a pipeline that works on E0 and silently breaks on MLS.
#
# Naming: PS* = Pinnacle, B365* = Bet365. A "C" after the book code means CLOSING.
#   PSH  = Pinnacle home, opening      PSCH = Pinnacle home, closing
CANONICAL = {
    "date": ["Date"],
    "home": ["HomeTeam", "Home"],
    "away": ["AwayTeam", "Away"],
    "home_goals": ["FTHG", "HG"],
    "away_goals": ["FTAG", "AG"],
    "result": ["FTR", "Res"],

    # --- 1X2 OPENING (main format only; MLS has none) ---
    "pin_open_h": ["PSH"], "pin_open_d": ["PSD"], "pin_open_a": ["PSA"],
    "b365_open_h": ["B365H"], "b365_open_d": ["B365D"], "b365_open_a": ["B365A"],
    "max_open_h": ["MaxH"], "max_open_d": ["MaxD"], "max_open_a": ["MaxA"],
    "avg_open_h": ["AvgH"], "avg_open_d": ["AvgD"], "avg_open_a": ["AvgA"],

    # --- 1X2 CLOSING (both formats; MLS 99.9% populated) ---
    "pin_close_h": ["PSCH"], "pin_close_d": ["PSCD"], "pin_close_a": ["PSCA"],
    # NOTE: "B36CA" is a genuine typo in football-data's extra-format header.
    "b365_close_h": ["B365CH"], "b365_close_d": ["B365CD"],
    "b365_close_a": ["B365CA", "B36CA"],
    "max_close_h": ["MaxCH"], "max_close_d": ["MaxCD"], "max_close_a": ["MaxCA"],
    "avg_close_h": ["AvgCH"], "avg_close_d": ["AvgCD"], "avg_close_a": ["AvgCA"],

    # --- OVER/UNDER 2.5 (main format only) ---
    "pin_open_o25": ["P>2.5"], "pin_open_u25": ["P<2.5"],
    "pin_close_o25": ["PC>2.5"], "pin_close_u25": ["PC<2.5"],

    # --- ASIAN HANDICAP (main format only) ---
    "ah_line_open": ["AHh"], "ah_line_close": ["AHCh"],
    "pin_open_ah_h": ["PAHH"], "pin_open_ah_a": ["PAHA"],
    "pin_close_ah_h": ["PCAHH"], "pin_close_ah_a": ["PCAHA"],

    # --- MATCH STATE (main format only; powers the live extension) ---
    "ht_home_goals": ["HTHG"], "ht_away_goals": ["HTAG"],
    "shots_h": ["HS"], "shots_a": ["AS"],
    "sot_h": ["HST"], "sot_a": ["AST"],
    "corners_h": ["HC"], "corners_a": ["AC"],
    "yellows_h": ["HY"], "yellows_a": ["AY"],
    "reds_h": ["HR"], "reds_a": ["AR"],
}

# Which analyses each schema can support. Set from VERIFIED column inspection
# (2026-09-07), not assumption. See SCOPE.md 3c.
SCHEMA_CAPABILITIES = {
    "main":  {"line_movement": True,  "market_types": True,  "live_state": True},
    "extra": {"line_movement": False, "market_types": False, "live_state": False},
}
