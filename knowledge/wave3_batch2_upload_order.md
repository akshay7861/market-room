# Wave 3 Batch 2 Upload Order

**Status:** Prepared, not uploaded  
**Goal:** Upload the six high-frequency specialist docs in an order that makes validation easiest.  
**Rule:** No vectors. Existing Admin markdown upload only.

---

## Recommended Upload Order

| order | file path | agent | doc type | admin category | upload alone or with related files? | likely useful market cases? |
|---|---|---|---|---|---|---|
| 1 | `knowledge/equities/event-playbooks/single-stock-movement-interpretation-playbook.md` | Equities | event-playbook | `event_playbooks` | upload alone | Yes |
| 2 | `knowledge/commodities/frameworks/natural-gas-and-lng-framework.md` | Commodities | framework | `frameworks` | upload alone | Yes |
| 3 | `knowledge/risk-sentiment/event-playbooks/credit-spread-and-liquidity-stress-playbook.md` | Risk/Sentiment | event-playbook | `event_playbooks` | upload alone | Yes |
| 4 | `knowledge/rates/event-playbooks/treasury-auction-and-supply-playbook.md` | Rates | event-playbook | `event_playbooks` | upload alone | Yes |
| 5 | `knowledge/fx/event-playbooks/g10-fx-central-bank-and-real-yield-playbook.md` | FX | event-playbook | `event_playbooks` | upload alone | Yes |
| 6 | `knowledge/macro/regime-checklists/macro-regime-classification-checklist.md` | Macro | regime-checklist | `frameworks` | upload alone | Yes |

---

## Why This Order

Upload Equities first because single-stock questions are the most visible beta risk. Then upload Commodities and Risk/Sentiment because gas/LNG and credit stress are common places for generic answers. Rates and FX follow because they are more instrument-specific and easier to validate. Macro uploads last because its regime checklist is broad and should not crowd out sharper specialist docs during initial validation.

---

## Post-Upload Retrieval Checklist

After each upload:

- `status = completed`
- `reviewStatus = approved`
- real title stored
- YAML stripped
- `## Coverage` present
- `## Triggers` present
- `## Use When` present
- `## Instruments` present
- intended doc ranks first for targeted Ask Market validation prompt
- output uses mechanism/threshold/false-signal logic from the doc

---

## Validation Prompts To Use After Upload

| Agent | Prompt focus |
|---|---|
| Equities | Stock up/down after earnings or upgrade; decide company catalyst vs sector/factor/macro beta. |
| Commodities | Gas storage surprise plus LNG outage; separate US Henry Hub from global LNG. |
| Risk/Sentiment | VIX up with HY/IG spread confirmation; classify equity-only vol vs systemic stress. |
| Rates | Weak 10-year or 30-year auction; decide supply/term premium vs Fed path. |
| FX | Central bank surprise in EUR/USD or USD/JPY; decide priced-in hike vs real-yield surprise. |
| Macro | Mixed CPI/labor/growth signals; classify regime without overreacting to one print. |

---

## Ready For Upload

Wave 3 Batch 2 is ready for upload after a final file existence check.
