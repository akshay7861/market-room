# Wave 3 Batch 1 Review Summary

**Status:** Docs written, not uploaded  
**Scope:** Coverage-universe maps for all six agents  
**Generated:** 2026-04-15

---

## Files Created

| Agent | File | Doc Type | What it adds |
|---|---|---|---|
| Macro | `knowledge/macro/instrument-guides/macro-indicator-universe-and-release-map.md` | instrument-guide | Defines Macro's release universe, hierarchy, thresholds, revision traps, and handoff rules. |
| Rates | `knowledge/rates/instrument-guides/rates-instrument-universe-and-signal-map.md` | instrument-guide | Maps Treasury, SOFR, OIS, futures, TIPS, breakevens, auctions, and curve signals into one rates ownership guide. |
| Commodities | `knowledge/commodities/instrument-guides/commodities-instrument-universe-and-driver-map.md` | instrument-guide | Expands Commodities beyond WTI into products, natural gas, LNG, metals, inventories, curves, and physical-flow logic. |
| FX | `knowledge/fx/instrument-guides/fx-pair-universe-and-driver-map.md` | instrument-guide | Defines pair-level FX ownership across G10, EM, carry, safe havens, dollar liquidity, and intervention risk. |
| Risk/Sentiment | `knowledge/risk-sentiment/instrument-guides/risk-sentiment-indicator-universe-and-signal-map.md` | instrument-guide | Turns risk-on/risk-off into measurable volatility, credit, positioning, breadth, liquidity, and funding signals. |
| Equities | `knowledge/equities/instrument-guides/equity-universe-and-sector-coverage-map.md` | instrument-guide | Connects the 7,075-stock universe to sectors, themes, factors, filings, live quote use, and handoff rules. |

---

## What This Batch Adds

Wave 1 and Wave 2 taught specialist mechanisms. Wave 3 Batch 1 teaches **coverage boundaries**.

The main improvement is not more facts. It is clearer agent ownership:

- Macro owns economic releases and regime implications, not every market reaction.
- Rates owns yield instruments and decomposition, not every macro print.
- Commodities owns physical balances, curves, inventories, and commodity-specific supply/demand.
- FX owns pair-level drivers, not generic dollar/rates commentary.
- Risk/Sentiment owns fragility confirmation, not all red screens.
- Equities owns named stocks, sectors, themes, factors, filings, and live quote context.

---

## Overlaps And Weak Areas

| Area | Current overlap | Why acceptable for Batch 1 | Remaining weakness |
|---|---|---|---|
| Macro vs Rates | CPI/payroll/Fed events appear in both | Macro owns economic mechanism; Rates owns yield/futures translation | Batch 2 should sharpen regime classification and Treasury auction logic. |
| Commodities vs Macro | Oil/gas shocks can become inflation shocks | Commodities owns physical balance first; Macro owns durable inflation pass-through | Natural gas and metals still need deeper docs. |
| FX vs Rates | Rate differentials drive currencies | FX owns pair-level expression; Rates owns bps and curve mechanics | G10 central-bank playbook still needed. |
| Risk/Sentiment vs Equities | Equity selloffs and volatility overlap | Equities owns stock/sector cause; Risk owns systemic confirmation | Credit stress playbook still needed. |
| Equities vs Commodities | Energy stocks depend on commodities | Commodities owns physical price driver; Equities owns stock basket and margins | Single-stock movement playbook still needed. |

---

## Quality Notes

- All six docs use the same YAML and section structure used in prior Waves.
- Each doc includes ownership boundaries and handoff rules.
- Each doc includes false positives and traps.
- The docs are intentionally operational rather than encyclopedic.
- The strongest docs for immediate behavior improvement are likely Equities, Commodities, and Risk/Sentiment because those were the most likely to produce scope errors in user questions.

---

## What Batch 2 Should Create Next

Batch 2 should convert these maps into high-frequency trigger playbooks:

1. `knowledge/macro/regime-checklists/macro-regime-classification-checklist.md`
2. `knowledge/rates/event-playbooks/treasury-auction-and-supply-playbook.md`
3. `knowledge/commodities/frameworks/natural-gas-and-lng-framework.md`
4. `knowledge/fx/event-playbooks/g10-fx-central-bank-and-real-yield-playbook.md`
5. `knowledge/risk-sentiment/event-playbooks/credit-spread-and-liquidity-stress-playbook.md`
6. `knowledge/equities/event-playbooks/single-stock-movement-interpretation-playbook.md`

Do not write Batch 2 until Batch 1 is uploaded and validated.
