# Wave 3 Batch 3 Upload Order

## Upload order by priority

| order | file path | agent | doc type | admin category | upload alone or with related files | useful market cases | recommended upload batch |
|---:|---|---|---|---|---|---|---|
| 1 | `knowledge/equities/frameworks/valuation-growth-quality-factor-framework.md` | Equities | framework | `frameworks` | upload alone | Yes | Wave 3 Batch 3 |
| 2 | `knowledge/risk-sentiment/frameworks/flows-positioning-and-degrossing-framework.md` | Risk/Sentiment | framework | `frameworks` | upload alone | Yes | Wave 3 Batch 3 |
| 3 | `knowledge/rates/instrument-guides/sofr-fed-funds-ois-market-guide.md` | Rates | instrument-guide | `instrument_guides` | upload alone | Yes | Wave 3 Batch 3 |
| 4 | `knowledge/macro/frameworks/fiscal-policy-and-liquidity-transmission-framework.md` | Macro | framework | `frameworks` | upload alone | Yes | Wave 3 Batch 3 |
| 5 | `knowledge/fx/frameworks/em-fx-risk-and-dollar-liquidity-framework.md` | FX | framework | `frameworks` | upload alone | Yes | Wave 3 Batch 3 |
| 6 | `knowledge/commodities/event-playbooks/metals-growth-and-energy-transition-playbook.md` | Commodities | event-playbook | `event_playbooks` | upload alone | Yes | Wave 3 Batch 3 |

## Admin upload steps

For each file:

1. Open the Admin agent knowledge panel.
2. Select the matching agent.
3. Select the exact admin category from the table above.
4. Upload the markdown file directly.
5. Confirm job status is `completed`.
6. Confirm `reviewStatus` is `approved`.
7. Confirm stored markdown starts with the real title, not YAML.
8. Confirm `## Coverage` and `## Triggers` are present.

## Naming mismatch risk

YAML `doc_type` values are singular and hyphenated. Admin categories are plural and underscore-based.

Use these mappings:

| YAML doc_type | Admin category |
|---|---|
| `framework` | `frameworks` |
| `instrument-guide` | `instrument_guides` |
| `event-playbook` | `event_playbooks` |

## Post-upload retrieval checklist

- Each agent has exactly one new Batch 3 approved doc.
- No Batch 3 doc stores YAML frontmatter.
- Each Batch 3 doc has `## Coverage`, `## Triggers`, `## Use When`, and `## Instruments`.
- Targeted validation prompt retrieves the intended doc top-1 or top-2.
- Output shows the new mechanism, not generic agent memory.
- Existing Wave 1, Wave 2, Wave 3 Batch 1, and Wave 3 Batch 2 retrieval still works.

