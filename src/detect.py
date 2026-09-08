"""
The headline question: how many settled bets does it take to tell a sharp bettor
from a lucky recreational one, and what does acting too early or too late cost?

TWO CANDIDATE SIGNALS
  Realized P&L   what the account has actually won. The obvious thing to look at,
                 and what most people reach for first.
  CLV            closing line value. Whether the prices they took beat the market's
                 final word, regardless of whether the bets came in.

These are not equally good, and the difference is the point of the project. A bet
either wins or loses, so P&L is a very noisy read on a probability. CLV scores the
decision rather than the outcome, so it carries information from the moment the bet
is placed.

WHY THIS IS NOT CIRCULAR
The archetypes are known by construction, so I am not discovering that sharps exist.
I am measuring how fast an estimator converges on a truth I already know, which is
the one question simulation is genuinely the right tool for.
"""
from __future__ import annotations
import numpy as np, pandas as pd, duckdb
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "data/processed/stakefactor.duckdb"
# ADVERSE IS AN ECONOMIC LABEL, NOT A SKILL LABEL.
# The first version of this file had semi_sharp in here, on the reasoning that
# they are skilled. The cost model then reported a NEGATIVE cost for failing to
# restrict them, which was the model telling me the label was wrong: the book
# holds +4.7% on semi-sharps. They are skilled AND profitable, and cutting them
# destroys value. That distinction is the entire reason this project segments on
# skill BY economic value rather than collapsing them into one axis.
ADVERSE = {"sharp"}
KS = [5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300]


def auc(scores, labels):
    """Area under the ROC curve, computed from ranks. No sklearn dependency."""
    labels = np.asarray(labels, bool); scores = np.asarray(scores, float)
    n1, n0 = labels.sum(), (~labels).sum()
    if n1 == 0 or n0 == 0:
        return np.nan
    order = scores.argsort()
    ranks = np.empty(len(scores)); ranks[order] = np.arange(1, len(scores) + 1)
    return (ranks[labels].sum() - n1 * (n1 + 1) / 2) / (n1 * n0)


def load(con):
    b = con.execute("""
        SELECT b.account_id, b.placed_at, b.stake, b.pnl, b.clv, a.true_archetype
        FROM sim_bet b JOIN sim_account a USING (account_id)
        ORDER BY b.account_id, b.placed_at, b.bet_id
    """).df()
    b["adverse"] = b.true_archetype.isin(ADVERSE)
    b["k"] = b.groupby("account_id").cumcount() + 1
    return b


def detection_curve(b):
    """For each k, how separable are adverse accounts using each signal?"""
    rows = []
    for k in KS:
        d = b[b.k <= k]
        g = d.groupby("account_id").agg(
            n=("k", "size"), adverse=("adverse", "first"),
            clv=("clv", "mean"),
            roi=("pnl", "sum"), handle=("stake", "sum"))
        g = g[g.n == k]                       # only accounts with a full k bets
        if len(g) < 200:
            continue
        g["roi"] = g.roi / g.handle
        rows.append(dict(k=k, accounts=len(g), adverse=int(g.adverse.sum()),
                         auc_clv=auc(g.clv, g.adverse),
                         auc_roi=auc(g.roi, g.adverse)))
    return pd.DataFrame(rows)


def policy_pnl(b, k, thresh_q, stake_factor=0.10):
    """
    Price a stake-factor policy in the only currency that matters: what the book
    ends up with.

    The decision is not restrict-or-not, it is a dial. An account judged adverse
    after k bets keeps betting at `stake_factor` of its previous size. Everyone
    else is untouched. Accounts with fewer than k bets are never scored, so they
    are left alone, which is what actually happens on a desk.

    Every policy is measured against two reference points:
      do nothing        leave every account alone
      perfect foresight cut only the accounts that truly are adverse
    The second is not achievable, it is the ceiling. The interesting number is how
    much of that ceiling a policy built on k bets of evidence actually captures.
    """
    early, later = b[b.k <= k], b[b.k > k]
    if later.empty:
        return None

    scored = early.groupby("account_id").agg(clv=("clv", "mean"),
                                             adverse=("adverse", "first"),
                                             n=("k", "size"))
    scored = scored[scored.n == k]
    future = later.groupby("account_id").agg(book_pnl=("pnl", lambda s: -s.sum()),
                                             adverse=("adverse", "first"))

    cut_ids = set(scored.index[scored.clv >= scored.clv.quantile(thresh_q)])
    f = future.copy()
    f["factor"] = np.where(f.index.isin(cut_ids), stake_factor, 1.0)

    do_nothing = f.book_pnl.sum()
    with_policy = (f.book_pnl * f.factor).sum()
    oracle = (f.book_pnl * np.where(f.adverse, stake_factor, 1.0)).sum()

    tp = int(scored.adverse[scored.index.isin(cut_ids)].sum())
    fp = int((~scored.adverse[scored.index.isin(cut_ids)]).sum())
    fn = int(scored.adverse[~scored.index.isin(cut_ids)].sum())
    return dict(
        k=k, threshold=thresh_q, restricted=len(cut_ids),
        caught=tp, wrongly_cut=fp, missed=fn,
        do_nothing=do_nothing, with_policy=with_policy, oracle=oracle,
        gain=with_policy - do_nothing,
        share_of_oracle=(with_policy - do_nothing) / (oracle - do_nothing)
                        if oracle != do_nothing else np.nan)


def main():
    con = duckdb.connect(str(DB))
    b = load(con)
    print(f"accounts: {b.account_id.nunique():,}  bets: {len(b):,}  "
          f"adverse: {b.groupby('account_id').adverse.first().sum()}")

    curve = detection_curve(b)
    print("\n=== 1. TIME TO DETECTION (AUC, 0.5 = coin flip, 1.0 = perfect) ===")
    print(curve.round(3).to_string(index=False))

    hit_clv = curve.loc[curve.auc_clv >= .80, "k"]
    hit_roi = curve.loc[curve.auc_roi >= .80, "k"]
    print(f"\nbets needed to reach AUC 0.80 using CLV : {hit_clv.min() if len(hit_clv) else 'not reached'}")
    print(f"bets needed to reach AUC 0.80 using P&L : {hit_roi.min() if len(hit_roi) else 'not reached'}")

    print("\n=== 1b. WHERE EACH ARCHETYPE RANKS ON CLV ===")
    g30 = b[b.k <= 30].groupby("account_id").agg(
        clv=("clv", "mean"), kind=("true_archetype", "first"), n=("k", "size"))
    g30 = g30[g30.n == 30]
    g30["clv_pctile"] = g30.clv.rank(pct=True)
    print(g30.groupby("kind").agg(accounts=("clv", "size"),
                                  median_clv=("clv", "median"),
                                  median_pctile=("clv_pctile", "median")).round(3).to_string())
    print("Note where semi_sharp lands. A CLV cut-off alone restricts them too, and")
    print("the book makes money on them. Skill and adversity are not the same axis.")

    print("\n=== 2. WHAT A POLICY IS WORTH, at k = 30 ===")
    pol = pd.DataFrame([r for q in [.80, .90, .95, .97, .98, .99]
                        if (r := policy_pnl(b, 30, q))])
    money = ["do_nothing", "with_policy", "oracle", "gain"]
    print(pol.assign(**{c: pol[c].round(0) for c in money},
                     share_of_oracle=pol.share_of_oracle.round(3)).to_string(index=False))
    print("\ndo_nothing      : book profit from bet 31 onward with no policy at all")
    print("with_policy     : the same, restricting anyone above the CLV threshold")
    print("oracle          : the unreachable ceiling, restricting only the truly adverse")
    print("share_of_oracle : how much of that ceiling this policy actually captures")

    print("\n=== 3. HOW EARLY CAN YOU ACT? ===")
    early_pol = pd.DataFrame([r for kk in [10, 20, 30, 50, 75]
                              if (r := policy_pnl(b, kk, .98))])
    print(early_pol[["k","restricted","caught","wrongly_cut","missed","gain","share_of_oracle"]]
          .assign(gain=lambda d: d.gain.round(0),
                  share_of_oracle=lambda d: d.share_of_oracle.round(3)).to_string(index=False))

    curve.to_csv("data-clean/detection_curve.csv", index=False)
    pol.to_csv("data-clean/policy_costs.csv", index=False)
    early_pol.to_csv("data-clean/policy_by_k.csv", index=False)
    con.close()


if __name__ == "__main__":
    main()
