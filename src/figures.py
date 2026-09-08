"""Figures for the Stake Factor project. Matplotlib, styled to match the write-up."""
from __future__ import annotations
import numpy as np, pandas as pd, duckdb, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB   = ROOT / "data/processed/stakefactor.duckdb"
OUT  = ROOT / "outputs/figures"; OUT.mkdir(parents=True, exist_ok=True)

INK, LINE, TEXT, MUTED = "#0B0D10", "#262C35", "#E8EAED", "#A0A8B4"
ACC, WARN, BLUE, DIM   = "#5EE6A8", "#F5A524", "#7FB2F0", "#6C7684"
plt.rcParams.update({
    "figure.facecolor": INK, "axes.facecolor": INK, "savefig.facecolor": INK,
    "text.color": TEXT, "axes.labelcolor": MUTED, "xtick.color": MUTED,
    "ytick.color": MUTED, "axes.edgecolor": LINE, "grid.color": LINE,
    "font.size": 11, "axes.titlesize": 14, "axes.titleweight": "bold",
    "figure.dpi": 150,
})

def style(ax, title, sub=None, cap=None):
    # Pad has to scale with the number of subtitle lines or the title lands on
    # top of them. A fixed pad worked for one-line subtitles and collided on two.
    nlines = sub.count("\n") + 1 if sub else 0
    ax.set_title(title, loc="left", pad=16 + 15 * nlines, color=TEXT)
    if sub:
        ax.text(0, 1.018, sub, transform=ax.transAxes, color=MUTED,
                fontsize=9.6, va="bottom", linespacing=1.5)
    if cap:
        ax.text(0, -0.20, cap, transform=ax.transAxes, color=DIM,
                fontsize=8.4, va="top", linespacing=1.4)
    ax.grid(True, lw=.4, alpha=.55); ax.set_axisbelow(True)
    for s in ("top", "right"): ax.spines[s].set_visible(False)

con = duckdb.connect(str(DB), read_only=True)
curve = pd.read_csv(ROOT/"data-clean/detection_curve.csv")
pol   = pd.read_csv(ROOT/"data-clean/policy_costs.csv")

# --- FIG 1: THE ARGUMENT ----------------------------------------------------
fig, ax = plt.subplots(figsize=(9.4, 5.2))
c = curve.dropna(subset=["auc_clv"])
ax.axhline(.5, color=DIM, ls="--", lw=.8)
ax.plot(c.k, c.auc_clv, color=ACC, lw=2.4, marker="o", ms=5, label="Closing line value")
ax.plot(c.k, c.auc_roi, color=WARN, lw=2.4, marker="o", ms=5, label="Realized profit and loss")
ax.text(c.k.max()*.62, .53, "coin flip", color=DIM, fontsize=9)
ax.set_xscale("log"); ax.set_xticks([5,10,20,30,50,100]); ax.set_xticklabels([5,10,20,30,50,100])
ax.set_ylim(.42, 1.03); ax.set_xlabel("Settled bets observed"); ax.set_ylabel("AUC")
ax.legend(frameon=False, labelcolor=MUTED, loc="center right")
style(ax, "One of these tells you after five bets. The other never tells you.",
      "How well each signal separates a genuinely adverse account from everyone else, after k settled bets.\nAUC of 0.5 is a coin flip and 1.0 is perfect separation. Closing line value is already at 0.98 by bet five.",
      "Closing line value scores the decision. Profit and loss scores the outcome, which after 200 bets is still mostly variance.")
fig.tight_layout(); fig.savefig(OUT/"01-detection.png", bbox_inches="tight"); plt.close(fig)

# --- FIG 2: skill is not the same as adversity ------------------------------
g = con.execute("""
    SELECT a.true_archetype AS kind, b.account_id, avg(b.clv) AS clv
    FROM sim_bet b JOIN sim_account a USING(account_id)
    GROUP BY 1,2 HAVING count(*) >= 30
""").df()
econ = con.execute("""
    SELECT a.true_archetype kind, -sum(b.pnl)/sum(b.stake) AS book_hold, -sum(b.pnl) AS book_pnl
    FROM sim_bet b JOIN sim_account a USING(account_id) GROUP BY 1
""").df().set_index("kind")
order = ["recreational_whale","recreational","bonus_abuser","semi_sharp","sharp"]
pretty = {"recreational_whale":"Recreational whale","recreational":"Recreational",
          "bonus_abuser":"Bonus abuser","semi_sharp":"Semi-sharp","sharp":"Sharp"}
fig, ax = plt.subplots(figsize=(9.4, 5.4))
for i, k in enumerate(order):
    v = g.clv[g.kind == k].to_numpy()
    col = WARN if econ.loc[k,"book_hold"] < 0 else ACC
    ax.scatter(v, np.full(len(v), i) + np.random.default_rng(i).normal(0,.07,len(v)),
               s=12, alpha=.45, color=col, edgecolors="none")
    ax.text(.145, i, f"book holds {econ.loc[k,'book_hold']*100:+.1f}%", color=MUTED,
            fontsize=9, va="center")
ax.axvline(0, color=DIM, lw=.8)
ax.set_yticks(range(len(order))); ax.set_yticklabels([pretty[k] for k in order])
ax.set_xlim(-.06,.20); ax.set_xlabel("Mean closing line value per bet")
style(ax, "Skilled and adverse are not the same thing",
      "Each dot is one account. Amber means the book loses money on that segment, green means it makes money.\nSemi-sharps sit at the 94th percentile of closing line value and are still profitable to serve.",
      "This is why the output is a stake factor rather than a restrict-or-not label. A cut-off drawn on skill alone removes the wrong people.")
fig.tight_layout(); fig.savefig(OUT/"02-skill-vs-value.png", bbox_inches="tight"); plt.close(fig)

# --- FIG 3: the cost of acting too early ------------------------------------
fig, ax = plt.subplots(figsize=(9.4, 5.2))
x = (1 - pol.threshold) * 100
ax.axhline(0, color=DIM, lw=.9)
ax.plot(x, pol.gain, color=ACC, lw=2.4, marker="o", ms=6)
ax.fill_between(x, pol.gain, 0, where=pol.gain < 0, color=WARN, alpha=.16)
ax.fill_between(x, pol.gain, 0, where=pol.gain >= 0, color=ACC, alpha=.16)
for _, r in pol.iterrows():
    ax.annotate(f"{int(r.restricted)} cut", ((1-r.threshold)*100, r.gain),
                textcoords="offset points", xytext=(0,10 if r.gain>0 else -16),
                ha="center", color=MUTED, fontsize=8.6)
ax.set_xlabel("Share of accounts restricted, %")
ax.set_ylabel("Change in book profit versus doing nothing")
ax.yaxis.set_major_formatter(lambda v, p: f"{v/1000:+.0f}k")
style(ax, "Restricting too many people costs more than the sharps ever take",
      "Every policy catches all 86 genuinely adverse accounts by the time it restricts 5% of the book.\nGoing further only removes profitable customers.",
      "The 86 sharps cost the book about 51,000 in total. Restricting the top 20% of accounts by closing line value costs 202,000.")
fig.tight_layout(); fig.savefig(OUT/"03-policy-cost.png", bbox_inches="tight"); plt.close(fig)

# --- FIG 4: where the money actually is -------------------------------------
seg = con.execute("""
    SELECT a.true_archetype AS kind, count(DISTINCT b.account_id) AS accounts,
           sum(b.stake) AS handle, -sum(b.pnl) AS book_pnl
    FROM sim_bet b JOIN sim_account a USING(account_id) GROUP BY 1
""").df().set_index("kind").loc[order]
fig, ax = plt.subplots(figsize=(9.4, 4.8))
cols = [WARN if v < 0 else ACC for v in seg.book_pnl]
ax.barh(range(len(seg)), seg.book_pnl, color=cols, height=.62)
ax.axvline(0, color=DIM, lw=.9)
for i,(k,r) in enumerate(seg.iterrows()):
    ax.text(r.book_pnl + (60000 if r.book_pnl>0 else -60000), i,
            f"{int(r.accounts)} accounts", va="center",
            ha="left" if r.book_pnl>0 else "right", color=MUTED, fontsize=9)
ax.set_yticks(range(len(seg))); ax.set_yticklabels([pretty[k] for k in seg.index])
ax.xaxis.set_major_formatter(lambda v,p: f"{v/1e6:+.1f}M")
ax.set_xlim(-.6e6, 3.9e6); ax.set_xlabel("Book profit over the period")
style(ax, "619 accounts make the book. 86 accounts cost it.",
      "Recreational whales generate 3.05 million of profit. The genuinely adverse accounts take 51 thousand.\nAny policy that trades one for the other is a bad trade.",
      "This asymmetry is the reason the interesting question is not 'who is sharp' but 'what does acting on that cost'.")
fig.tight_layout(); fig.savefig(OUT/"04-segments.png", bbox_inches="tight"); plt.close(fig)

print("wrote:")
for p in sorted(OUT.glob("*.png")): print("  ", p.relative_to(ROOT))
