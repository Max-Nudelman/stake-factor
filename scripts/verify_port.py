"""Replicate the TypeScript port's structure in Python and check it reproduces
the published run. This validates the ALGORITHM, not the TS code itself."""
import json, numpy as np

M = json.load(open('web/data/market-layer.json'))
n = M['matches']
oo = np.stack([np.array(M['openH']), np.array(M['openD']), np.array(M['openA'])], 1)/100
oc = np.stack([np.array(M['closeH']), np.array(M['closeD']), np.array(M['closeA'])], 1)/100
po = (1/oo); po /= po.sum(1, keepdims=True)
pc = (1/oc); pc /= pc.sum(1, keepdims=True)
winner = np.array([ "HDA".index(c) for c in M['result'] ])

A = {
 "sharp":              dict(est_sd=.025, fav_bias=.00,  edge_req=.035, late_share=.05, stake_mu=180, stake_cv=.45, bets=(120,420), share=.02),
 "semi_sharp":         dict(est_sd=.055, fav_bias=.01,  edge_req=.025, late_share=.25, stake_mu=90,  stake_cv=.55, bets=(80,300),  share=.06),
 "recreational":       dict(est_sd=.110, fav_bias=.05,  edge_req=.000, late_share=.85, stake_mu=22,  stake_cv=.80, bets=(20,160),  share=.72),
 "recreational_whale": dict(est_sd=.115, fav_bias=.06,  edge_req=.000, late_share=.90, stake_mu=310, stake_cv=.70, bets=(90,400),  share=.14),
 "bonus_abuser":       dict(est_sd=.100, fav_bias=-.02, edge_req=.005, late_share=.50, stake_mu=45,  stake_cv=.20, bets=(60,220),  share=.06),
}
rng = np.random.default_rng(7)
names = list(A); pr = np.array([A[k]['share'] for k in names]); pr/=pr.sum()
kinds = rng.choice(names, 4000, p=pr)

acc_kind, starts, counts = [], [], []
stake_l, pnl_l, clv_l = [], [], []
for kind in kinds:
    a = A[kind]
    nb = rng.integers(*a['bets'])
    idx = np.sort(rng.choice(n, size=nb, replace=False))     # date order, as in the port
    truth = pc[idx]
    est = truth + rng.normal(0, a['est_sd'], truth.shape)
    if a['fav_bias']:
        fav = np.argmax(po[idx], 1); est[np.arange(len(idx)), fav] += a['fav_bias']
    est = np.clip(est, .01, .99); est /= est.sum(1, keepdims=True)
    late = rng.random(len(idx)) < a['late_share']
    pref = np.where(late[:,None], pc[idx], po[idx])
    oref = np.where(late[:,None], oc[idx], oo[idx])
    edge = est - pref
    pick = np.argmax(edge, 1); r = np.arange(len(idx))
    take = edge[r, pick] >= a['edge_req']
    if not take.any(): continue
    sel, rows, rr = pick[take], idx[take], r[take]
    st = np.clip(rng.lognormal(np.log(a['stake_mu']), a['stake_cv'], take.sum()), 1, None).round(2)
    price = oref[rr, sel]; closing = oc[rows, sel]
    won = winner[rows] == sel
    acc_kind.append(kind); starts.append(len(stake_l)); counts.append(int(take.sum()))
    stake_l += st.tolist(); pnl_l += np.where(won, st*(price-1), -st).tolist()
    clv_l += (price/closing - 1).tolist()

stake=np.array(stake_l); pnl=np.array(pnl_l); clv=np.array(clv_l)
kind=np.array(acc_kind); start=np.array(starts); cnt=np.array(counts)
print(f"accounts {len(kind):,}  bets {len(stake):,}")

print("\n=== SEGMENTS (live port structure) vs PUBLISHED ===")
pub = {s['kind']: s for s in json.load(open('web/data/published-run.json'))['segments']}
print(f"{'segment':<20}{'n':>6}{'hold':>9}{'pub hold':>10}{'mCLV':>9}{'pub mCLV':>10}")
for k in names:
    m = kind==k
    h=sum(stake[start[i]:start[i]+cnt[i]].sum() for i in np.where(m)[0])
    bp=-sum(pnl[start[i]:start[i]+cnt[i]].sum() for i in np.where(m)[0])
    cv=np.concatenate([clv[start[i]:start[i]+cnt[i]] for i in np.where(m)[0]])
    p=pub[k]
    print(f"{k:<20}{m.sum():>6}{bp/h:>9.4f}{p['book_hold']:>10.4f}{cv.mean():>9.4f}{p['mean_clv']:>10.4f}")

def auc(s,l):
    s=np.asarray(s,float); l=np.asarray(l,bool)
    n1,n0=l.sum(),(~l).sum()
    if n1==0 or n0==0: return np.nan
    o=s.argsort(); rk=np.empty(len(s)); rk[o]=np.arange(1,len(s)+1)
    return (rk[l].sum()-n1*(n1+1)/2)/(n1*n0)

print("\n=== DETECTION CURVE vs PUBLISHED ===")
pubc={c['k']:c for c in json.load(open('web/data/published-run.json'))['curve']}
print(f"{'k':>5}{'n':>7}{'adv':>5}{'aucCLV':>9}{'pub':>8}{'aucP&L':>9}{'pub':>8}")
for K in [5,10,15,20,30,40,50,75,100]:
    sel=np.where(cnt>=K)[0]
    if len(sel)<200: continue
    mc=np.array([clv[start[i]:start[i]+K].mean() for i in sel])
    roi=np.array([pnl[start[i]:start[i]+K].sum()/stake[start[i]:start[i]+K].sum() for i in sel])
    adv=np.array([kind[i]=='sharp' for i in sel])
    if adv.sum()==0: continue
    p=pubc.get(K,{})
    print(f"{K:>5}{len(sel):>7}{adv.sum():>5}{auc(mc,adv):>9.4f}{p.get('auc_clv',float('nan')):>8.4f}{auc(roi,adv):>9.4f}{p.get('auc_roi',float('nan')):>8.4f}")

print("\n=== POLICY at k=30 vs PUBLISHED ===")
pubp={round(p['threshold'],2):p for p in json.load(open('web/data/published-run.json'))['policy']}
K=30
sel=np.where(cnt>=K)[0]
mc=np.array([clv[start[i]:start[i]+K].mean() for i in sel])
fut=np.where(cnt>K)[0]
bpf={i:-pnl[start[i]+K:start[i]+cnt[i]].sum() for i in fut}
print(f"{'thr':>6}{'restr':>7}{'caught':>7}{'wrong':>7}{'gain':>12}{'pub gain':>12}")
for q in [.80,.90,.95,.97,.98,.99]:
    cut=set(sel[mc>=np.quantile(mc,q)])
    adv=np.array([kind[i]=='sharp' for i in sel])
    caught=int(sum(1 for i,a in zip(sel,adv) if a and i in cut))
    wrong=int(sum(1 for i,a in zip(sel,adv) if not a and i in cut))
    dn=sum(bpf.values()); wp=sum(v*(0.1 if i in cut else 1) for i,v in bpf.items())
    p=pubp.get(round(q,2),{})
    print(f"{q:>6.2f}{len(cut):>7}{caught:>7}{wrong:>7}{wp-dn:>12,.0f}{p.get('gain',float('nan')):>12,.0f}")
