"""
Simulate bettor accounts placing bets into the real market layer.

THE DESIGN CONSTRAINT THAT MATTERS
Bettors decide using the OPENING price and their own private estimate. They never
observe the closing price. Closing prices are used for exactly two things, both of
them after the fact:

  1. as the proxy for the true probability when generating a bettor's private
     estimate, and
  2. to score closing line value once the bet is already placed.

Why the closing price is an acceptable proxy for truth: the Week 2 market-layer
analysis in docs/findings.md tested all seven leagues for mispricing against a
sampling-noise baseline and found every ratio between 0.68 and 1.26, meaning no
league was distinguishable from perfectly calibrated. If closing lines are
calibrated, the devigged closing probability is the best available estimate of
truth, and saying so out loud is better than inventing a latent variable.

WHAT MAKES A BETTOR SHARP
Not a secret edge over the market. A sharp is simply someone whose private estimate
is closer to the truth than the opening price is. They bet early, into prices that
have not yet absorbed everyone else's information, which is precisely the mechanism
the market-layer work identified as the only one available.
"""
from __future__ import annotations
import numpy as np, pandas as pd, duckdb
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "data/processed/stakefactor.duckdb"
BOOK = "Avg"          # the market-average price, so no single book's quirks drive results
SEED = 20260908

# --- archetypes -------------------------------------------------------------
# est_sd     : how far a bettor's private probability estimate sits from truth.
#              0.02 is a genuinely strong model; 0.12 is roughly noise.
# fav_bias   : systematic pull toward the favourite, the documented recreational bias.
# edge_req   : minimum perceived edge before they will place a bet.
# late_share : share of bets placed at the closing price rather than the open.
#              Sharps bet early because that is where the stale prices are.
# stake_mu   : median stake in currency units.
# bets       : (low, high) number of bets over the period.
ARCHETYPES = {
    "sharp":              dict(est_sd=.025, fav_bias=.00,  edge_req=.035, late_share=.05,
                               stake_mu=180, stake_cv=.45, bets=(120, 420), share=.02),
    "semi_sharp":         dict(est_sd=.055, fav_bias=.01,  edge_req=.025, late_share=.25,
                               stake_mu=90,  stake_cv=.55, bets=(80, 300),  share=.06),
    "recreational":       dict(est_sd=.110, fav_bias=.05,  edge_req=.000, late_share=.85,
                               stake_mu=22,  stake_cv=.80, bets=(20, 160),  share=.72),
    "recreational_whale": dict(est_sd=.115, fav_bias=.06,  edge_req=.000, late_share=.90,
                               stake_mu=310, stake_cv=.70, bets=(90, 400),  share=.14),
    "bonus_abuser":       dict(est_sd=.100, fav_bias=-.02, edge_req=.005, late_share=.50,
                               stake_mu=45,  stake_cv=.20, bets=(60, 220),  share=.06),
}
N_ACCOUNTS = 4000


def devig(p):
    """Proportional devig: rescale raw implied probabilities so they sum to one."""
    return p / p.sum(axis=1, keepdims=True)


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
    wide = wide.reset_index()

    for ph in ("open", "close"):
        raw = 1.0 / wide[[f"{ph}_H", f"{ph}_D", f"{ph}_A"]].to_numpy()
        p = devig(raw)
        for i, s in enumerate("HDA"):
            wide[f"p_{ph}_{s}"] = p[:, i]
    return wide


def simulate(seed=SEED):
    rng = np.random.default_rng(seed)
    con = duckdb.connect(str(DB))
    mk = load_market(con)
    mk = mk.sort_values("match_date").reset_index(drop=True)
    n_matches = len(mk)
    print(f"market layer: {n_matches:,} matches with complete open and close prices")

    names = list(ARCHETYPES)
    probs = np.array([ARCHETYPES[a]["share"] for a in names]); probs /= probs.sum()
    kinds = rng.choice(names, size=N_ACCOUNTS, p=probs)

    accounts, bets = [], []
    p_open  = mk[["p_open_H",  "p_open_D",  "p_open_A"]].to_numpy()
    p_close = mk[["p_close_H", "p_close_D", "p_close_A"]].to_numpy()
    o_open  = mk[["open_H",  "open_D",  "open_A"]].to_numpy()
    o_close = mk[["close_H", "close_D", "close_A"]].to_numpy()
    won_mat = np.stack([(mk["result"] == s).to_numpy() for s in "HDA"], axis=1)

    bet_id = 0
    for acct, kind in enumerate(kinds, start=1):
        a = ARCHETYPES[kind]
        n_bets = rng.integers(*a["bets"])
        idx = rng.choice(n_matches, size=n_bets, replace=False if n_bets < n_matches else True)

        truth = p_close[idx]                                   # never shown to the bettor
        est = truth + rng.normal(0, a["est_sd"], truth.shape)   # their private read
        if a["fav_bias"]:
            fav = np.argmax(p_open[idx], axis=1)
            est[np.arange(len(idx)), fav] += a["fav_bias"]
        est = np.clip(est, .01, .99); est /= est.sum(axis=1, keepdims=True)

        late = rng.random(len(idx)) < a["late_share"]
        price_ref = np.where(late[:, None], p_close[idx], p_open[idx])   # what they can see
        odds_ref  = np.where(late[:, None], o_close[idx], o_open[idx])

        edge = est - price_ref
        pick = np.argmax(edge, axis=1)
        r = np.arange(len(idx))
        take = edge[r, pick] >= a["edge_req"]
        if not take.any():
            continue

        sel_i   = pick[take]
        rows    = idx[take]
        rr      = r[take]
        stake   = np.clip(rng.lognormal(np.log(a["stake_mu"]),
                                        a["stake_cv"], take.sum()), 1, None).round(2)
        price   = odds_ref[rr, sel_i]
        closing = o_close[rows, sel_i]
        won     = won_mat[rows, sel_i]
        pnl     = np.where(won, stake * (price - 1), -stake)

        accounts.append(dict(account_id=acct, true_archetype=kind,
                             signup_date=mk["match_date"].iloc[rows.min()]))
        bets.append(pd.DataFrame(dict(
            bet_id=np.arange(bet_id, bet_id + take.sum()),
            account_id=acct,
            match_id=mk["match_id"].to_numpy()[rows],
            market_type="1X2",
            selection=np.array(list("HDA"))[sel_i],
            stake=stake,
            price_taken=price,
            closing_price=closing,
            placed_at=pd.to_datetime(mk["match_date"].to_numpy()[rows]),
            settled_at=pd.to_datetime(mk["match_date"].to_numpy()[rows]),
            won=won,
            pnl=pnl,
            league_code=mk["league_code"].to_numpy()[rows],
            at_close=late[rr],
        )))
        bet_id += take.sum()

    acc_df = pd.DataFrame(accounts)
    bet_df = pd.concat(bets, ignore_index=True)

    # closing line value: the only honest per-bet measure of skill available before
    # results accumulate. Positive means the price beat the market's final word.
    bet_df["clv"] = bet_df["price_taken"] / bet_df["closing_price"] - 1.0

    con.execute("DROP TABLE IF EXISTS sim_account"); con.execute("DROP TABLE IF EXISTS sim_bet")
    con.execute("CREATE TABLE sim_account AS SELECT * FROM acc_df")
    con.execute("CREATE TABLE sim_bet AS SELECT * FROM bet_df")
    con.close()

    print(f"accounts: {len(acc_df):,}   bets: {len(bet_df):,}")
    print(bet_df.merge(acc_df, on="account_id").groupby("true_archetype").agg(
        accounts=("account_id", "nunique"), bets=("bet_id", "size"),
        mean_clv=("clv", "mean"), total_pnl=("pnl", "sum"),
        handle=("stake", "sum")).assign(
        hold=lambda d: -d.total_pnl / d.handle).round(4))
    return acc_df, bet_df


if __name__ == "__main__":
    simulate()
