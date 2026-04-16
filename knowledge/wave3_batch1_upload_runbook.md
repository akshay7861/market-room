# Wave 3 Batch 1 Upload Runbook

**Status:** Uploaded and storage-verified  
**Uploaded:** 2026-04-15  
**Scope:** Six coverage-universe maps  
**Vector work:** none

---

## Short Diagnosis

Wave 3 Batch 1 uploaded successfully through the existing Admin direct markdown workflow.

The backend supports the `instrument_guides` category, so no fallback category workaround was needed.

The deployed hosted Admin API remains protected. Upload was performed through a local Wrangler remote-preview session connected to the remote D1 binding, using a temporary local-only admin token. The temporary token was removed and the preview session was stopped after upload.

---

## Exact Files Uploaded

| Agent | Agent ID | Admin category | File |
|---|---|---|---|
| Equities | `equities-agent` | `instrument_guides` | `knowledge/equities/instrument-guides/equity-universe-and-sector-coverage-map.md` |
| Commodities | `commodities-agent` | `instrument_guides` | `knowledge/commodities/instrument-guides/commodities-instrument-universe-and-driver-map.md` |
| Risk/Sentiment | `risk-sentiment-agent` | `instrument_guides` | `knowledge/risk-sentiment/instrument-guides/risk-sentiment-indicator-universe-and-signal-map.md` |
| FX | `fx-agent` | `instrument_guides` | `knowledge/fx/instrument-guides/fx-pair-universe-and-driver-map.md` |
| Rates | `rates-agent` | `instrument_guides` | `knowledge/rates/instrument-guides/rates-instrument-universe-and-signal-map.md` |
| Macro | `macro-agent` | `instrument_guides` | `knowledge/macro/instrument-guides/macro-indicator-universe-and-release-map.md` |

---

## Upload Results

| File | Stored title | Status | Usage bytes |
|---|---|---|---|
| `equity-universe-and-sector-coverage-map.md` | Equity Universe and Sector Coverage Map | completed | 6,661 |
| `commodities-instrument-universe-and-driver-map.md` | Commodities Instrument Universe and Driver Map | completed | 6,708 |
| `risk-sentiment-indicator-universe-and-signal-map.md` | Risk/Sentiment Indicator Universe and Signal Map | completed | 6,315 |
| `fx-pair-universe-and-driver-map.md` | FX Pair Universe and Driver Map | completed | 6,531 |
| `rates-instrument-universe-and-signal-map.md` | Rates Instrument Universe and Signal Map | completed | 6,971 |
| `macro-indicator-universe-and-release-map.md` | Macro Indicator Universe and Release Map | completed | 7,339 |

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
- stored category is `instrument_guides`

---

## Admin Steps Used

For each file:

1. Start a local Wrangler remote-preview session connected to the remote D1 binding.
2. Confirm agent IDs through `/api/admin/agents`.
3. POST the markdown file to `/api/admin/agents/{agentId}/knowledge-store`.
4. Use multipart form fields:
   - `category=instrument_guides`
   - `files=@<markdown file>`
5. Verify via `/api/admin/agents/{agentId}/knowledge-processing/jobs`.

---

## Naming Mismatch Risk

No blocker.

The markdown frontmatter uses:

```yaml
doc_type: instrument-guide
```

The Admin category uses:

```text
instrument_guides
```

This is expected. The upload pipeline stores the Admin category and strips frontmatter from the final `distilledMarkdown`.

---

## Ready For Validation

Wave 3 Batch 1 is ready for retrieval validation.

Validation should confirm:

- Equities retrieves `Equity Universe and Sector Coverage Map` for stock-name, sector, ETF, and watchlist prompts.
- Commodities retrieves `Commodities Instrument Universe and Driver Map` for non-oil commodity, gas, metals, curve, and inventory prompts.
- Risk/Sentiment retrieves `Risk/Sentiment Indicator Universe and Signal Map` for volatility, credit, positioning, and fragility prompts.
- FX retrieves `FX Pair Universe and Driver Map` for pair, dollar, yen, carry, and intervention prompts.
- Rates retrieves `Rates Instrument Universe and Signal Map` for curve, SOFR, OIS, TIPS, breakeven, and futures prompts.
- Macro retrieves `Macro Indicator Universe and Release Map` for CPI, payroll, JOLTS, GDP, PCE, and revision prompts.
