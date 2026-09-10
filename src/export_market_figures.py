"""Market layer figures for the web write-up.

Three sources, kept separate on purpose:

  1. sql/01_league_efficiency.sql and sql/03_calibration_vs_noise.sql, run
     unchanged. Those are Pinnacle closing prices, because Pinnacle is the
     industry reference for a sharp close and mixing books would confound
     margin with book identity.

  2. The average-price layer that the browser simulation bets into, used for
     the open versus close comparison. Opening prices are only widely
     populated for the average, so this comparison cannot be run on Pinnacle.

  3. A paired test on those two, because "the close is better than the open"
     is the load-bearing claim of the whole project and an unqualified
     assertion is not evidence.
"""
from __future__ import annotations
import json, math
from pathlib import Path
import duckdb, numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = ROOT / "outputs"


def league_tables(con) -> tuple[list, list]:
    eff = con.execute((ROOT / "sql/01_league_efficiency.sql").read_text()).df()
    noise = con.execute((ROOT / "sql/03_calibration_vs_noise.sql").read_text()).df()
    return eff.to_dict("records"), noise.to_dict("records")


def load_avg_layer() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    m = json.loads((OUTPUTS / "market-layer.json").read_text())
    o = np.stack([np.array(m["openH"]), np.array(m["openD"]), np.array(m["openA"])], 1) / 100
    c = np.stack([np.array(m["closeH"]), np.array(m["closeD"]), np.array(m["closeA"])], 1) / 100
    po = 1 / o; po /= po.sum(1, keepdims=True)
    pc = 1 / c; pc /= pc.sum(1, keepdims=True)
    win = np.array([[r == "H", r == "D", r == "A"] for r in m["result"]], dtype=float)
    return po, pc, win


def calibration_bins(p: np.ndarray, win: np.ndarray, n_bins: int = 9) -> list[dict]:
    x, y = p.ravel(), win.ravel()
    edges = np.linspace(0, 0.9, n_bins + 1)
    rows = []
    for i in range(n_bins):
        m = (x >= edges[i]) & (x < edges[i + 1])
        if m.sum() < 50:
            continue
        rows.append(dict(lo=round(float(edges[i]), 3), hi=round(float(edges[i + 1]), 3),
                         n=int(m.sum()), predicted=round(float(x[m].mean()), 4),
                         actual=round(float(y[m].mean()), 4)))
    return rows


def main() -> None:
    con = duckdb.connect(str(ROOT / "data/processed/stakefactor.duckdb"), read_only=True)
    eff, noise = league_tables(con)
    con.close()

    po, pc, win = load_avg_layer()
    brier_open = ((po - win) ** 2).sum(1)
    brier_close = ((pc - win) ** 2).sum(1)
    gain = brier_open - brier_close          # positive means the close was better
    n = len(gain)

    rng = np.random.default_rng(1)
    boot = np.array([gain[rng.integers(0, n, n)].mean() for _ in range(4000)])
    ci = [float(np.percentile(boot, 2.5)), float(np.percentile(boot, 97.5))]

    # Where does the close's advantage come from? Split by how far the price moved.
    move = np.abs(pc - po).max(1)
    cuts = np.quantile(move, [0, 0.25, 0.5, 0.75, 1.0])
    bands = []
    for i in range(4):
        m = (move >= cuts[i]) & (move <= cuts[i + 1]) if i == 3 else (move >= cuts[i]) & (move < cuts[i + 1])
        g = gain[m]
        bands.append(dict(
            lo_pp=round(float(cuts[i] * 100), 2), hi_pp=round(float(cuts[i + 1] * 100), 2),
            matches=int(m.sum()), gain=round(float(g.mean()), 6),
            ci95=round(float(1.96 * g.std(ddof=1) / math.sqrt(m.sum())), 6),
        ))

    out = dict(
        league_efficiency=eff,
        calibration_vs_noise=noise,
        calibration=dict(open=calibration_bins(po, win), close=calibration_bins(pc, win)),
        movement_bands=bands,
        headline=dict(
            matches=n,
            brier_open=round(float(brier_open.mean()), 5),
            brier_close=round(float(brier_close.mean()), 5),
            gain=round(float(gain.mean()), 6),
            gain_ci95=[round(ci[0], 6), round(ci[1], 6)],
            t_stat=round(float(gain.mean() / (gain.std(ddof=1) / math.sqrt(n))), 2),
            move_median_pp=round(float(np.median(move) * 100), 2),
            move_p90_pp=round(float(np.percentile(move, 90) * 100), 2),
            favourite_flipped=round(float((po.argmax(1) != pc.argmax(1)).mean()), 4),
        ),
    )
    p = ROOT / "outputs/market-figures.json"
    p.write_text(json.dumps(out, separators=(",", ":"), default=float))
    print(f"wrote {p.relative_to(ROOT)}  {p.stat().st_size/1024:.0f} KB")
    print(json.dumps(out["headline"], indent=1))


if __name__ == "__main__":
    main()
