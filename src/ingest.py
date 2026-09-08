"""Download and harmonize football-data.co.uk CSVs into one tidy frame.

Two design decisions worth understanding, because you will be asked about them:

1. EVERY download is cached to data/raw/. football-data.co.uk is a small operation
   and its server is genuinely flaky (it was returning 503 throughout this project's
   scoping). Re-downloading on every run is both rude and unreliable. Cache once,
   work offline thereafter.

2. Missing columns are filled with NaN, never raised on. The main-format European
   files and the extra-format MLS file carry different columns by design. A pipeline
   that assumes one schema works on E0 and breaks silently on MLS.
"""

import time
import pandas as pd
import requests

from .config import (
    RAW, PROCESSED, MAIN_URL, EXTRA_URL, WAYBACK, SEASONS, LEAGUES, CANONICAL,
)

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36")


def _try(url: str, dest) -> bool:
    """One download attempt. Returns True only if the body is actually a CSV."""
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=60)
        # football-data serves HTML error pages, sometimes with a 200 status.
        # Checking the status alone will happily cache an error page as data.
        if r.status_code == 200 and not r.text.lstrip().startswith("<"):
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(r.content)
            return True
    except requests.RequestException:
        pass
    return False


def _wayback_snapshot(url: str) -> str | None:
    """Ask archive.org for the exact snapshot URL, rather than guessing a redirect."""
    try:
        r = requests.get("https://archive.org/wayback/available",
                         params={"url": url}, timeout=30)
        snap = r.json().get("archived_snapshots", {}).get("closest")
        if snap and snap.get("available"):
            return snap["url"]
    except (requests.RequestException, ValueError):
        pass
    return None


def fetch(url: str, dest, backoff: int = 5) -> bool:
    """Cache-first download, falling back to the Wayback Machine.

    football-data.co.uk was returning 503 across every path during development
    (10 attempts over 30 minutes), so Wayback is a real fallback, not a nicety.

    archive.org rate-limits bursts aggressively -- a naive loop over ~37 files
    silently loses most of them. So: resolve each snapshot through the availability
    API, back off exponentially on failure, and cache hard so this only runs once.
    """
    if dest.exists() and dest.stat().st_size > 1000:
        return True
    if _try(url, dest):
        return True

    # Two Wayback access paths with DIFFERENT coverage -- try both.
    # The availability API resolves an exact snapshot timestamp, but returns
    # "no snapshot" for plenty of URLs that the /web/<year>/ redirect resolves
    # fine (verified: new/USA.csv and the 2023-24 files). Relying on either one
    # alone silently loses files.
    for attempt in range(1, 5):
        snap = _wayback_snapshot(url)
        if snap and _try(snap, dest):
            print(f"  wayback ok (api): {dest.name}")
            return True
        if _try(WAYBACK.format(url=url), dest):
            print(f"  wayback ok (redirect): {dest.name}")
            return True
        wait = backoff * (2 ** (attempt - 1))
        print(f"  wayback attempt {attempt} failed for {dest.name}, waiting {wait}s")
        time.sleep(wait)
    return False


def _harmonize(df: pd.DataFrame) -> pd.DataFrame:
    """Map whatever columns this file happens to have onto our canonical names."""
    out = pd.DataFrame(index=df.index)
    for canon, candidates in CANONICAL.items():
        for c in candidates:
            if c in df.columns:
                out[canon] = df[c]
                break
        else:
            out[canon] = pd.NA
    return out


def load_league(code, name, country, tier, schema) -> pd.DataFrame:
    """Load one league across all configured seasons."""
    frames = []
    if schema == "main":
        for season in SEASONS:
            dest = RAW / f"{code}_{season}.csv"
            if not fetch(MAIN_URL.format(season=season, code=code), dest):
                print(f"  MISSING {code} {season}")
                continue
            raw = pd.read_csv(dest, encoding="latin-1", on_bad_lines="skip")
            h = _harmonize(raw)
            h["season"] = season
            frames.append(h)
    else:
        # Extra format: one file, all seasons, with an explicit Season column.
        dest = RAW / f"{code}_extra.csv"
        if not fetch(EXTRA_URL.format(code=code), dest):
            print(f"  MISSING {code} (extra)")
            return pd.DataFrame()
        raw = pd.read_csv(dest, encoding="latin-1", on_bad_lines="skip")
        h = _harmonize(raw)
        # Extra format carries a calendar-year Season (2012..2025), not "2425".
        h["season"] = raw["Season"].astype(str) if "Season" in raw.columns else pd.NA
        frames.append(h)

    if not frames:
        return pd.DataFrame()

    df = pd.concat(frames, ignore_index=True)
    df["league_code"] = code
    df["league"] = name
    df["country"] = country
    df["tier"] = tier
    df["schema"] = schema
    df["date"] = pd.to_datetime(df["date"], dayfirst=True, errors="coerce")
    return df.dropna(subset=["home", "away"])


def coverage_report(df: pd.DataFrame) -> pd.DataFrame:
    """How much of each odds column is actually populated, per league.

    This is the FIRST thing to look at. It tells you which leagues can support the
    closing-line-value analysis and which cannot -- which is a scope decision, not
    a detail. Run this before writing any analysis code.
    """
    cols = [c for c in CANONICAL if c.startswith(("pin_", "b365_"))]
    rows = []
    for (code, league), g in df.groupby(["league_code", "league"], sort=False):
        row = {"league_code": code, "league": league, "matches": len(g)}
        for c in cols:
            row[c] = round(g[c].notna().mean() * 100, 1)
        rows.append(row)
    return pd.DataFrame(rows)


def build(save: bool = True) -> pd.DataFrame:
    frames = []
    for spec in LEAGUES:
        print(f"Loading {spec[1]} ({spec[0]})...")
        d = load_league(*spec)
        if len(d):
            print(f"  {len(d)} matches")
            frames.append(d)
    if not frames:
        print("\nNo data retrieved -- football-data.co.uk is likely down. Try again later.")
        return pd.DataFrame()
    df = pd.concat(frames, ignore_index=True)

    # Odds columns arrive as object dtype -- football-data's files carry stray
    # whitespace and occasional non-numeric junk, and different leagues differ.
    # Coerce explicitly: bad values become NaN and show up in coverage_report()
    # rather than silently poisoning arithmetic later.
    numeric = [c for c in CANONICAL if c.startswith(("pin_", "b365_", "max_", "avg_", "ah_"))]
    numeric += ["home_goals", "away_goals", "ht_home_goals", "ht_away_goals",
                "shots_h", "shots_a", "sot_h", "sot_a", "corners_h", "corners_a",
                "yellows_h", "yellows_a", "reds_h", "reds_a"]
    for c in numeric:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    for c in ["home", "away", "result", "season", "league_code", "league",
              "country", "tier", "schema"]:
        df[c] = df[c].astype("string")

    if save:
        PROCESSED.mkdir(parents=True, exist_ok=True)
        df.to_parquet(PROCESSED / "matches.parquet", index=False)
        print(f"\nSaved {len(df)} matches to data/processed/matches.parquet")
    return df


if __name__ == "__main__":
    df = build()
    if len(df):
        print("\n=== ODDS COVERAGE BY LEAGUE (% of matches with the column populated) ===")
        print(coverage_report(df).to_string(index=False))
