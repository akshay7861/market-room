# Wave 3 Batch 2 Upload Runbook

**Status:** Uploaded and storage-verified  
**Uploaded:** 2026-04-15  
**Scope:** Six Wave 3 Batch 2 specialist docs  
**Vector work:** none

---

## Short Diagnosis

Wave 3 Batch 2 uploaded successfully through the existing Admin direct markdown workflow.

Upload was performed through a local Wrangler remote-preview session connected to the remote D1 binding. A temporary local-only admin token was used for the session, then removed after verification. The remote preview server was stopped.

---

## Exact Files Uploaded

| Agent | Agent ID | Admin category | File |
|---|---|---|---|
| Equities | `equities-agent` | `event_playbooks` | `knowledge/equities/event-playbooks/single-stock-movement-interpretation-playbook.md` |
| Commodities | `commodities-agent` | `frameworks` | `knowledge/commodities/frameworks/natural-gas-and-lng-framework.md` |
| Risk/Sentiment | `risk-sentiment-agent` | `event_playbooks` | `knowledge/risk-sentiment/event-playbooks/credit-spread-and-liquidity-stress-playbook.md` |
| Rates | `rates-agent` | `event_playbooks` | `knowledge/rates/event-playbooks/treasury-auction-and-supply-playbook.md` |
| FX | `fx-agent` | `event_playbooks` | `knowledge/fx/event-playbooks/g10-fx-central-bank-and-real-yield-playbook.md` |
| Macro | `macro-agent` | `frameworks` | `knowledge/macro/regime-checklists/macro-regime-classification-checklist.md` |

---

## Upload Results

| File | Stored title | Status | Usage bytes |
|---|---|---|---|
| `single-stock-movement-interpretation-playbook.md` | Single-Stock Movement Interpretation Playbook | completed | 5,191 |
| `natural-gas-and-lng-framework.md` | Natural Gas and LNG Framework | completed | 5,057 |
| `credit-spread-and-liquidity-stress-playbook.md` | Credit Spread and Liquidity Stress Playbook | completed | 4,753 |
| `treasury-auction-and-supply-playbook.md` | Treasury Auction and Supply Playbook | completed | 5,302 |
| `g10-fx-central-bank-and-real-yield-playbook.md` | G10 FX Central Bank and Real Yield Playbook | completed | 5,066 |
| `macro-regime-classification-checklist.md` | Macro Regime Classification Checklist | completed | 5,669 |

---

## Storage Confirmation

All six files passed:

- `status = completed`
- `reviewStatus = approved`
- real title stored
- YAML stripped
- `## Coverage` present
- `## Triggers` present
- `## Use When` present
- `## Instruments` present

---

## Naming / Category Mismatch Risk

The Macro file uses:

```yaml
doc_type: regime-checklist
```

The current Admin category set does not include `regime_checklists`, so it was uploaded as:

```text
frameworks
```

This is acceptable for retrieval because the upload pipeline stores the title, summary, content, and injected metadata sections. A later admin taxonomy pass can add `regime_checklists` if needed.

---

## Ready For Validation

Wave 3 Batch 2 is ready for retrieval validation.

Validation should confirm:

- Equities retrieves `Single-Stock Movement Interpretation Playbook` for single-stock move/earnings/guidance/rating-change prompts.
- Commodities retrieves `Natural Gas and LNG Framework` for gas storage, LNG, weather, Henry Hub, and regional gas prompts.
- Risk/Sentiment retrieves `Credit Spread and Liquidity Stress Playbook` for HY/IG spread and systemic stress prompts.
- Rates retrieves `Treasury Auction and Supply Playbook` for auction tail, bid-to-cover, dealer takedown, and refunding prompts.
- FX retrieves `G10 FX Central Bank and Real Yield Playbook` for G10 policy surprise and real-yield differential prompts.
- Macro retrieves `Macro Regime Classification Checklist` for mixed growth/inflation/labor regime prompts.
