# Wave 3 Batch 2 Ingestion Plan

**Status:** Prepared, not uploaded  
**Scope:** Six high-frequency specialist playbooks/frameworks  
**Rule:** Use existing Admin direct markdown workflow. No vectors.

---

## Ingestion Table

| filename | agent | doc_type | recommended upload batch | one-line description | generate market cases later? | best suited for |
|---|---|---|---|---|---|---|
| `knowledge/macro/regime-checklists/macro-regime-classification-checklist.md` | Macro | regime-checklist | Wave 3 Batch 2 | Regime classifier for expansion, slowdown, recession, stagflation, soft landing, and reflation. | Yes | both |
| `knowledge/rates/event-playbooks/treasury-auction-and-supply-playbook.md` | Rates | event-playbook | Wave 3 Batch 2 | Auction and refunding playbook for supply-driven term-premium moves. | Yes | both |
| `knowledge/commodities/frameworks/natural-gas-and-lng-framework.md` | Commodities | framework | Wave 3 Batch 2 | Natural gas/LNG balance framework covering storage, weather, production, and regional spreads. | Yes | both |
| `knowledge/fx/event-playbooks/g10-fx-central-bank-and-real-yield-playbook.md` | FX | event-playbook | Wave 3 Batch 2 | G10 policy surprise and real-yield playbook for pair-specific FX moves. | Yes | both |
| `knowledge/risk-sentiment/event-playbooks/credit-spread-and-liquidity-stress-playbook.md` | Risk/Sentiment | event-playbook | Wave 3 Batch 2 | Credit/liquidity stress playbook separating equity volatility from systemic stress. | Yes | both |
| `knowledge/equities/event-playbooks/single-stock-movement-interpretation-playbook.md` | Equities | event-playbook | Wave 3 Batch 2 | Single-stock move interpretation playbook for earnings, guidance, factor beta, sector beta, and market structure. | Yes | both |

---

## Admin Category Mapping

| Doc type in YAML | Admin category to select |
|---|---|
| `regime-checklist` | `frameworks` unless `regime_checklists` is added later |
| `event-playbook` | `event_playbooks` |
| `framework` | `frameworks` |

The current backend supports:

- `foundations`
- `frameworks`
- `event_playbooks`
- `instrument_guides`
- `house_view_notes`

So the Macro regime checklist should upload as `frameworks` for now. This is not a retrieval blocker because metadata and content drive scoring.

---

## Suggested Market Cases Later

| Agent | Case examples |
|---|---|
| Macro | Stagflation mix; disinflationary soft landing; slowdown mistaken for recession. |
| Rates | Weak 30-year auction tail; refunding coupon shift; strong auction after concession. |
| Commodities | Gas storage surprise; LNG outage bearish Henry Hub but bullish global LNG; weather reversal trap. |
| FX | Fed-ECB divergence; USD/JPY intervention risk; hike already priced but currency fades. |
| Risk/Sentiment | VIX spike with calm credit; HY spread widening into systemic stress; IG confirmation. |
| Equities | Beat-and-raise stock falls on margins; upgrade follows price action; sector beta mistaken for company catalyst. |

---

## Upload Preconditions

- Wave 3 Batch 1 remains uploaded and validated.
- Upload one file per agent.
- Confirm `status = completed`.
- Confirm `reviewStatus = approved`.
- Confirm YAML stripped.
- Confirm `## Coverage`, `## Triggers`, `## Use When`, and `## Instruments` present where frontmatter contains those fields.
