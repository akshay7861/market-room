# Wave 3 Batch 2 Review Summary

**Status:** Docs written, not uploaded  
**Generated:** 2026-04-15  
**Scope:** Six high-frequency specialist playbooks/frameworks built on Wave 3 Batch 1 coverage maps

---

## Files Created

| Agent | File | Doc Type | What it adds |
|---|---|---|---|
| Macro | `knowledge/macro/regime-checklists/macro-regime-classification-checklist.md` | regime-checklist | Converts macro releases into regime labels only when growth, inflation, labor, and financial conditions align. |
| Rates | `knowledge/rates/event-playbooks/treasury-auction-and-supply-playbook.md` | event-playbook | Teaches auction tails, bid-to-cover, indirect demand, dealer takedown, refunding, and supply-driven term premium. |
| Commodities | `knowledge/commodities/frameworks/natural-gas-and-lng-framework.md` | framework | Adds gas-specific balance logic: storage, weather, production, LNG feedgas, and regional gas stress. |
| FX | `knowledge/fx/event-playbooks/g10-fx-central-bank-and-real-yield-playbook.md` | event-playbook | Makes G10 FX policy divergence pair-specific and conditional on surprise, real yields, and priced-in expectations. |
| Risk/Sentiment | `knowledge/risk-sentiment/event-playbooks/credit-spread-and-liquidity-stress-playbook.md` | event-playbook | Separates equity volatility from credit-confirmed systemic stress using HY/IG spreads, liquidity, and funding signals. |
| Equities | `knowledge/equities/event-playbooks/single-stock-movement-interpretation-playbook.md` | event-playbook | Gives Equities a causal checklist for single-stock moves: company catalyst, sector beta, factor beta, macro beta, and market structure. |

---

## What Each File Adds

- Macro now has a regime checklist so it does not overreact to one economic release.
- Rates now has a supply/auction playbook so long-end moves are not always misread as Fed or inflation stories.
- Commodities now has a gas/LNG framework so gas is not treated like oil.
- FX now has a G10 central-bank event playbook so policy divergence is interpreted pair-by-pair.
- Risk/Sentiment now has a credit confirmation playbook so VIX-only stress calls become more disciplined.
- Equities now has a single-stock movement playbook so stock questions get causal decomposition rather than one-headline narratives.

---

## Overlaps Or Weak Areas Still Remaining

| Area | Why it remains | Batch 3 completion need |
|---|---|---|
| Macro fiscal/liquidity | Batch 2 covers regimes but not TGA/QT/refunding liquidity transmission. | `fiscal-policy-and-liquidity-transmission-framework.md` |
| Rates money-market plumbing | Auction supply is covered; SOFR/OIS/fed-funds basis still needs its own guide. | `sofr-fed-funds-ois-market-guide.md` |
| Commodities metals | Gas/LNG is covered; copper/gold/lithium still need deeper distinct logic. | `metals-growth-and-energy-transition-playbook.md` |
| FX EM stress | G10 policy divergence is covered; EM FX still needs reserves, carry, current account, and dollar liquidity. | `em-fx-risk-and-dollar-liquidity-framework.md` |
| Risk/Sentiment flows | Credit stress is covered; forced flows/degrossing/CTA/dealer positioning still need a framework. | `flows-positioning-and-degrossing-framework.md` |
| Equities factors | Single-stock causality is covered; valuation/growth/quality factor framework still needs deeper treatment. | `valuation-growth-quality-factor-framework.md` |

---

## Tightening Notes

The docs were written to avoid generic finance filler:

- each doc includes thresholds or decision rules,
- each doc has explicit false-positive sections,
- each doc names handoff boundaries,
- each doc is meant for live Ask Market and Market Room interpretation,
- none of the docs should be treated as final source summaries.

---

## What Batch 3 Must Complete

Batch 3 should add the remaining synthesis and edge-case frameworks:

1. `knowledge/macro/frameworks/fiscal-policy-and-liquidity-transmission-framework.md`
2. `knowledge/rates/instrument-guides/sofr-fed-funds-ois-market-guide.md`
3. `knowledge/commodities/event-playbooks/metals-growth-and-energy-transition-playbook.md`
4. `knowledge/fx/frameworks/em-fx-risk-and-dollar-liquidity-framework.md`
5. `knowledge/risk-sentiment/frameworks/flows-positioning-and-degrossing-framework.md`
6. `knowledge/equities/frameworks/valuation-growth-quality-factor-framework.md`

Do not write Batch 3 until Batch 2 is uploaded and retrieval-validated.
