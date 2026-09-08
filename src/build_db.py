"""Build the DuckDB warehouse from the cached football-data CSVs.

The interesting work here is the ODDS PIVOT: turning 118 wide columns into a
long fact table. See sql/schema.sql for why that matters.

football-data encodes book, market, selection and phase into column names:

    PSH      Pinnacle, 1X2, Home, OPENING
    PSCH     Pinnacle, 1X2, Home, CLOSING        <- the C means closing
    B365>2.5 Bet365,   over/under 2.5, Over, OPENING
    PC>2.5   Pinnacle, over/under 2.5, Over, CLOSING
    PAHH     Pinnacle, Asian handicap, Home, OPENING
    PCAHH    Pinnacle, Asian handicap, Home, CLOSING

Rather than regex-parsing those (fragile -- the naming is not fully regular),
we generate the expected names from an explicit book list and check presence.
Explicit beats clever when the source schema is this irregular.
"""

import duckdb
import pandas as pd

from .config import RAW, PROCESSED, ROOT, SEASONS, LEAGUES, SCHEMA_CAPABILITIES

DB_PATH = PROCESSED / "stakefactor.duckdb"

# Books quoting 1X2. 'Max'/'Avg' are market aggregates across books, not a
# single bookmaker -- useful as a market consensus, so we keep them and label
# them honestly rather than pretending they are a book.
BOOKS_1X2 = ["B365", "BW", "BF", "PS", "WH", "1XB", "VC", "IW", "LB", "SJ",
             "GB", "SB", "BS", "Max", "Avg", "BFE"]
BOOKS_OU = ["B365", "P", "Max", "Avg", "BFE"]
BOOKS_AH = ["B365", "P", "Max", "Avg", "BFE"]

# In O/U and AH columns Pinnacle is 'P', not 'PS'. Normalize so one book has
# one identifier across every market -- otherwise a GROUP BY book splits
# Pinnacle in two and every per-book number is quietly wrong.
BOOK_ALIAS = {"P": "PS"}


def _odds_column_map() -> list[tuple[str, str, str, str, str]]:
    """(column, book, market_type, selection, phase) for every price column.

    'C' inserted after the book code means closing. Note the irregularities:
    1X2 closing is PSCH but Asian handicap closing is PCAHH, and football-data
    ships a genuine typo, B36CA, for Bet365 closing away in the MLS file.
    """
    out = []
    for b in BOOKS_1X2:
        bk = BOOK_ALIAS.get(b, b)
        for sel, suf in [("H", "H"), ("D", "D"), ("A", "A")]:
            out.append((f"{b}{suf}",  bk, "1X2", sel, "open"))
            out.append((f"{b}C{suf}", bk, "1X2", sel, "close"))
    out.append(("B36CA", "B365", "1X2", "A", "close"))  # source typo

    for b in BOOKS_OU:
        bk = BOOK_ALIAS.get(b, b)
        out.append((f"{b}>2.5",  bk, "OU25", "O", "open"))
        out.append((f"{b}<2.5",  bk, "OU25", "U", "open"))
        out.append((f"{b}C>2.5", bk, "OU25", "O", "close"))
        out.append((f"{b}C<2.5", bk, "OU25", "U", "close"))

    for b in BOOKS_AH:
        bk = BOOK_ALIAS.get(b, b)
        out.append((f"{b}AHH",  bk, "AH", "H", "open"))
        out.append((f"{b}AHA",  bk, "AH", "A", "open"))
        out.append((f"{b}CAHH", bk, "AH", "H", "close"))
        out.append((f"{b}CAHA", bk, "AH", "A", "close"))
    return out


ODDS_MAP = _odds_column_map()


def _read_raw() -> pd.DataFrame:
    """Re-read the cached raw CSVs, keeping ALL columns.

    ingest.py deliberately narrows to a canonical subset for quick inspection.
    Here we want every book, so we go back to the raw files.
    """
    frames = []
    for code, name, country, tier, schema in LEAGUES:
        paths = ([RAW / f"{code}_{s}.csv" for s in SEASONS] if schema == "main"
                 else [RAW / f"{code}_extra.csv"])
        for path in paths:
            if not path.exists():
                continue
            df = pd.read_csv(path, encoding="latin-1", on_bad_lines="skip")
            df = df.rename(columns={"Home": "HomeTeam", "Away": "AwayTeam",
                                    "HG": "FTHG", "AG": "FTAG", "Res": "FTR"})
            if "Season" not in df.columns:
                df["Season"] = path.stem.split("_")[1]
            df["league_code"] = code
            df["schema"] = schema
            frames.append(df)
    return pd.concat(frames, ignore_index=True)


def build():
    raw = _read_raw()
    raw = raw.dropna(subset=["HomeTeam", "AwayTeam"]).reset_index(drop=True)
    raw["match_id"] = raw.index + 1

    matches = pd.DataFrame({
        "match_id":    raw["match_id"],
        "league_code": raw["league_code"],
        "season":      raw["Season"].astype(str),
        "match_date":  pd.to_datetime(raw["Date"], dayfirst=True, errors="coerce"),
        "home_team":   raw["HomeTeam"],
        "away_team":   raw["AwayTeam"],
        "home_goals":  pd.to_numeric(raw.get("FTHG"), errors="coerce"),
        "away_goals":  pd.to_numeric(raw.get("FTAG"), errors="coerce"),
        "result":      raw.get("FTR"),
        "ht_home_goals": pd.to_numeric(raw.get("HTHG"), errors="coerce"),
        "ht_away_goals": pd.to_numeric(raw.get("HTAG"), errors="coerce"),
        "shots_h":   pd.to_numeric(raw.get("HS"),  errors="coerce"),
        "shots_a":   pd.to_numeric(raw.get("AS"),  errors="coerce"),
        "sot_h":     pd.to_numeric(raw.get("HST"), errors="coerce"),
        "sot_a":     pd.to_numeric(raw.get("AST"), errors="coerce"),
        "corners_h": pd.to_numeric(raw.get("HC"),  errors="coerce"),
        "corners_a": pd.to_numeric(raw.get("AC"),  errors="coerce"),
    })

    # --- the pivot: wide -> long -------------------------------------------
    ah_open  = pd.to_numeric(raw.get("AHh"),  errors="coerce")
    ah_close = pd.to_numeric(raw.get("AHCh"), errors="coerce")

    parts = []
    for col, book, market, sel, phase in ODDS_MAP:
        if col not in raw.columns:
            continue
        price = pd.to_numeric(raw[col], errors="coerce")
        keep = price.notna() & (price > 1.0)   # decimal odds below 1.0 are junk
        if not keep.any():
            continue
        part = pd.DataFrame({
            "match_id":    raw.loc[keep, "match_id"],
            "book":        book,
            "market_type": market,
            "selection":   sel,
            "phase":       phase,
            "price":       price[keep],
        })
        if market == "AH":
            line = ah_open if phase == "open" else ah_close
            part["handicap"] = (line[keep].values if line is not None
                                else pd.Series(dtype="float64"))
        else:
            # Explicit float dtype: an all-NA object column makes pandas warn on
            # concat and can silently change the resulting dtype.
            part["handicap"] = pd.Series([float("nan")] * len(part)).values
        parts.append(part)
    odds = pd.concat(parts, ignore_index=True)

    leagues = pd.DataFrame([
        {"league_code": c, "league_name": n, "country": co, "tier": t,
         "supports_line_movement": SCHEMA_CAPABILITIES[sc]["line_movement"],
         "supports_market_types":  SCHEMA_CAPABILITIES[sc]["market_types"],
         "supports_live_state":    SCHEMA_CAPABILITIES[sc]["live_state"]}
        for c, n, co, t, sc in LEAGUES
    ])

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        DB_PATH.unlink()
    con = duckdb.connect(str(DB_PATH))
    con.execute((ROOT / "sql" / "schema.sql").read_text())
    con.register("_l", leagues); con.execute("INSERT INTO dim_league SELECT * FROM _l")
    con.register("_m", matches); con.execute("INSERT INTO fact_match SELECT * FROM _m")
    con.register("_o", odds)
    con.execute("""INSERT INTO fact_odds
                   SELECT match_id, book, market_type, selection, phase, price, handicap
                   FROM _o""")

    print(f"Built {DB_PATH}")
    for t in ["dim_league", "fact_match", "fact_odds"]:
        n = con.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
        print(f"  {t:12s} {n:>10,} rows")
    print("\nfact_odds by market and phase:")
    print(con.execute("""
        SELECT market_type, phase, count(DISTINCT book) AS books, count(*) AS rows
        FROM fact_odds GROUP BY 1,2 ORDER BY 1,2
    """).df().to_string(index=False))
    con.close()


if __name__ == "__main__":
    build()
