"""JSON for the interactive write-up, so the page and the analysis cannot diverge."""
from __future__ import annotations
import json, numpy as np, pandas as pd, duckdb
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
con = duckdb.connect(str(ROOT/"data/processed/stakefactor.duckdb"), read_only=True)

curve = pd.read_csv(ROOT/"data-clean/detection_curve.csv").dropna(subset=["auc_clv"])
pol   = pd.read_csv(ROOT/"data-clean/policy_costs.csv")
byk   = pd.read_csv(ROOT/"data-clean/policy_by_k.csv")

seg = con.execute("""
    SELECT a.true_archetype AS kind,
           count(DISTINCT b.account_id) AS accounts,
           count(*) AS bets,
           sum(b.stake) AS handle,
           -sum(b.pnl) AS book_pnl,
           -sum(b.pnl)/sum(b.stake) AS book_hold,
           avg(b.clv) AS mean_clv,
           avg(b.stake) AS avg_stake
    FROM sim_bet b JOIN sim_account a USING(account_id) GROUP BY 1
""").df()

# CLV distribution per archetype, as a histogram rather than 4,000 raw points
acct = con.execute("""
    SELECT a.true_archetype AS kind, avg(b.clv) AS clv
    FROM sim_bet b JOIN sim_account a USING(account_id)
    GROUP BY b.account_id, a.true_archetype HAVING count(*) >= 30
""").df()
edges = np.round(np.linspace(-.06, .20, 40), 4)
hist = {k: np.histogram(g.clv, bins=edges)[0].tolist() for k, g in acct.groupby("kind")}

out = dict(
    curve = curve.round(4).to_dict("records"),
    policy = pol.round(2).to_dict("records"),
    by_k = byk.round(4).to_dict("records"),
    segments = seg.round(4).to_dict("records"),
    clv_hist = dict(edges=edges.tolist(), counts=hist),
    stats = dict(accounts=int(acct.shape[0]), bets=int(seg.bets.sum()),
                 matches=int(con.execute("SELECT count(*) FROM fact_match").fetchone()[0])),
)
p = ROOT/"outputs/stakefactor-web.json"
p.write_text(json.dumps(out, separators=(",", ":")))
print("wrote", p.relative_to(ROOT), f"{p.stat().st_size/1024:.0f} KB")
