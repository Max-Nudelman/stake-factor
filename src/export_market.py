"""Market layer as JSON, so the browser can run the simulation on real prices.

The whole design constraint of this project is that bettors act on the OPENING
price and are scored against the CLOSING price. A web simulation that invented
its own prices would quietly drop that constraint, so this ships the same rows
`simulate.py` uses: every match carrying complete average open and close 1X2
prices, in date order.

Odds are stored as integer hundredths and results as one character per match,
which is what keeps a 13,638 match layer inside a few hundred kilobytes.
"""
from __future__ import annotations
import json, duckdb
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOK = "Avg"          # matches simulate.py: no single book's quirks drive results


def load_market(con):
    df = con.execute(f"""
        SELECT o.match_id, o.phase, o.selection, o.price,
               m.match_date, m.league_code, m.result
        FROM fact_odds o
        JOIN fact_match m USING (match_id)
        WHERE o.market_type = '1X2' AND o.book = '{BOOK}'
    """).df()
    wide = df.pivot_table(index=["match_id", "match_date", "league_code", "result"],
                          columns=["phase", "selection"], values="price").dropna()
    wide.columns = [f"{a}_{b}" for a, b in wide.columns]
    return wide.reset_index().sort_values("match_date").reset_index(drop=True)


def main() -> None:
    con = duckdb.connect(str(ROOT / "data/processed/stakefactor.duckdb"), read_only=True)
    mk = load_market(con)

    def hundredths(col: str) -> list[int]:
        return [int(round(v * 100)) for v in mk[col]]

    out = {
        "matches": int(len(mk)),
        "book": BOOK,
        "dateRange": [str(mk.match_date.min()), str(mk.match_date.max())],
        "leagues": {k: int(v) for k, v in mk.league_code.value_counts().items()},
        "openH": hundredths("open_H"), "openD": hundredths("open_D"), "openA": hundredths("open_A"),
        "closeH": hundredths("close_H"), "closeD": hundredths("close_D"), "closeA": hundredths("close_A"),
        "result": "".join(mk.result.tolist()),
    }
    p = ROOT / "outputs/market-layer.json"
    p.write_text(json.dumps(out, separators=(",", ":")))
    print(f"wrote {p.relative_to(ROOT)}  {len(mk):,} matches  {p.stat().st_size/1024:.0f} KB")
    con.close()


if __name__ == "__main__":
    main()
