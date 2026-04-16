# Wave 3 Batch 1 Ingestion Plan

**Status:** Ready for upload planning, not uploaded  
**Scope:** Six coverage-universe maps  
**Rule:** Upload through the existing Admin direct markdown workflow. No vectors.

---

## Ingestion Table

| filename | agent | doc_type | recommended upload batch | one-line description | generate market cases later? | best suited for |
|---|---|---|---|---|---|---|
| `knowledge/macro/instrument-guides/macro-indicator-universe-and-release-map.md` | Macro | instrument-guide | Wave 3 Batch 1 | Release hierarchy and handoff map for macro indicators. | Yes | both |
| `knowledge/rates/instrument-guides/rates-instrument-universe-and-signal-map.md` | Rates | instrument-guide | Wave 3 Batch 1 | Instrument map for curve, SOFR, OIS, futures, TIPS, and breakevens. | Yes | both |
| `knowledge/commodities/instrument-guides/commodities-instrument-universe-and-driver-map.md` | Commodities | instrument-guide | Wave 3 Batch 1 | Commodity universe map beyond WTI: products, gas, LNG, metals, curves, inventories. | Yes | both |
| `knowledge/fx/instrument-guides/fx-pair-universe-and-driver-map.md` | FX | instrument-guide | Wave 3 Batch 1 | Pair-level FX ownership map across G10, EM, carry, safe havens, and dollar liquidity. | Yes | both |
| `knowledge/risk-sentiment/instrument-guides/risk-sentiment-indicator-universe-and-signal-map.md` | Risk/Sentiment | instrument-guide | Wave 3 Batch 1 | Measurable risk-sentiment indicator map across vol, credit, positioning, breadth, and funding. | Yes | both |
| `knowledge/equities/instrument-guides/equity-universe-and-sector-coverage-map.md` | Equities | instrument-guide | Wave 3 Batch 1 | Equity universe ownership map for stocks, sectors, ETFs, ADRs, themes, filings, and live quotes. | Yes | both |

---

## Why All Six Should Upload Together

These are not deep playbooks that depend on each other. They are parallel ownership maps. Uploading all six together improves:

- routing precision,
- retrieval coverage,
- handoff behavior,
- Ask Market answer scope,
- Market Room agent silence discipline.

---

## Market Cases To Generate Later

| Agent | Suggested market cases |
|---|---|
| Macro | CPI surprise handoff to Rates; payroll surprise with revision risk; retail sales nominal vs real demand trap. |
| Rates | 2-year yield repricing; long-end term-premium move; SOFR/funding dislocation. |
| Commodities | WTI inventory draw; gas storage surprise; copper rally without inventory confirmation. |
| FX | USD safe-haven rally despite lower yields; USD/JPY intervention risk; AUD move driven by China/copper. |
| Risk/Sentiment | VIX spike without credit confirmation; HY spread widening; crowded positioning reversal. |
| Equities | green stock watchlist question; single-stock move from factor beta; sector ETF outperformance versus broad index. |

---

## Upload Preconditions

- Confirm no vector workflow is used.
- Upload as direct markdown files.
- Select the Admin category that corresponds to `instrument-guides` if available.
- If Admin does not expose `instrument-guides`, use `foundations` temporarily and note the mismatch in the upload runbook.
- Confirm YAML is stripped after upload.
- Confirm `## Coverage` and `## Triggers` are injected into stored `distilledMarkdown`.
