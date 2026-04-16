# Wave 3 Batch 3 Upload Runbook

## Short diagnosis

Wave 3 Batch 3 uploaded successfully through the existing Admin direct markdown workflow. The hosted Admin API remained disabled; upload was performed through local remote preview with a temporary local Admin token.

No vectors were used.

## Exact files uploaded

| File | Agent | Admin category | Market cases later |
|---|---|---|---|
| `knowledge/equities/frameworks/valuation-growth-quality-factor-framework.md` | Equities | `frameworks` | Yes |
| `knowledge/risk-sentiment/frameworks/flows-positioning-and-degrossing-framework.md` | Risk/Sentiment | `frameworks` | Yes |
| `knowledge/rates/instrument-guides/sofr-fed-funds-ois-market-guide.md` | Rates | `instrument_guides` | Yes |
| `knowledge/macro/frameworks/fiscal-policy-and-liquidity-transmission-framework.md` | Macro | `frameworks` | Yes |
| `knowledge/fx/frameworks/em-fx-risk-and-dollar-liquidity-framework.md` | FX | `frameworks` | Yes |
| `knowledge/commodities/event-playbooks/metals-growth-and-energy-transition-playbook.md` | Commodities | `event_playbooks` | Yes |

## Admin steps used

1. Started remote-preview API with remote D1 bindings.
2. Temporarily added a local Admin token for upload authorization.
3. Uploaded each markdown file to `/api/admin/agents/{agentId}/knowledge-store`.
4. Used direct markdown upload, not processing/distillation mode.
5. Selected backend Admin category values exactly:
   - `frameworks`
   - `instrument_guides`
   - `event_playbooks`
6. Verified processing jobs and stored markdown.
7. Removed the temporary local Admin token after upload/validation.

## Approval and storage confirmation

| Agent | Stored title | Status | Review | YAML stripped | Coverage | Triggers | Use When | Instruments |
|---|---|---|---|---|---|---|---|---|
| Equities | Valuation, Growth, Quality, and Factor Framework | completed | approved | Yes | Yes | Yes | Yes | Yes |
| Risk/Sentiment | Flows, Positioning, and Degrossing Framework | completed | approved | Yes | Yes | Yes | Yes | Yes |
| Rates | SOFR, Fed Funds, and OIS Market Guide | completed | approved | Yes | Yes | Yes | Yes | Yes |
| Macro | Fiscal Policy and Liquidity Transmission Framework | completed | approved | Yes | Yes | Yes | Yes | Yes |
| FX | EM FX Risk and Dollar Liquidity Framework | completed | approved | Yes | Yes | Yes | Yes | Yes |
| Commodities | Metals Growth and Energy Transition Playbook | completed | approved | Yes | Yes | Yes | Yes | Yes |

## Naming mismatch risk

YAML `doc_type` strings are not the same as Admin category values.

| YAML doc_type | Admin category used |
|---|---|
| `framework` | `frameworks` |
| `instrument-guide` | `instrument_guides` |
| `event-playbook` | `event_playbooks` |

## Ready for validation

Batch 3 passed upload and storage checks. Proceed to targeted retrieval validation only after confirming the stored markdown includes metadata sections and real titles.

