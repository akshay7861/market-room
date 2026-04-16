# Wave 3 Batch 1 Upload Order

**Status:** Prepared, not uploaded  
**Goal:** Upload the six coverage-universe maps in the safest order for validation.  
**Rule:** No vectors. Direct Admin markdown upload only.

---

## Recommended Upload Order

| order | file path | agent | doc type | upload alone or with related files? | likely useful market cases? | recommended batch |
|---|---|---|---|---|---|---|
| 1 | `knowledge/equities/instrument-guides/equity-universe-and-sector-coverage-map.md` | Equities | instrument-guide | upload alone first | Yes | Wave 3 Batch 1 |
| 2 | `knowledge/commodities/instrument-guides/commodities-instrument-universe-and-driver-map.md` | Commodities | instrument-guide | upload alone | Yes | Wave 3 Batch 1 |
| 3 | `knowledge/risk-sentiment/instrument-guides/risk-sentiment-indicator-universe-and-signal-map.md` | Risk/Sentiment | instrument-guide | upload alone | Yes | Wave 3 Batch 1 |
| 4 | `knowledge/fx/instrument-guides/fx-pair-universe-and-driver-map.md` | FX | instrument-guide | upload alone | Yes | Wave 3 Batch 1 |
| 5 | `knowledge/rates/instrument-guides/rates-instrument-universe-and-signal-map.md` | Rates | instrument-guide | upload alone | Yes | Wave 3 Batch 1 |
| 6 | `knowledge/macro/instrument-guides/macro-indicator-universe-and-release-map.md` | Macro | instrument-guide | upload alone last | Yes | Wave 3 Batch 1 |

---

## Why This Order

Upload Equities first because the most visible beta-testing gap is user stock-name and sector coverage. Upload Commodities and Risk/Sentiment next because they are most prone to broad, generic answers without coverage maps. Upload FX, Rates, and Macro after that to reduce accidental capture by broad macro/rates language.

This is still one batch. The order only helps isolate upload/storage validation if one file has a category mismatch.

---

## Admin Category Mapping Risk

The docs use:

```yaml
doc_type: instrument-guide
```

If the Admin UI supports `instrument_guides`, use that category.

If the Admin UI only supports the older categories:

- `foundations`
- `frameworks`
- `event_playbooks`
- `house_view_notes`

then upload these six as `foundations` for now and note the category mismatch. The retrieval system mainly relies on title, summary, content, and injected metadata, so this is not a blocker, but it should be cleaned up later.

---

## Post-Upload Retrieval Checklist

After each upload:

- `status = completed`
- `reviewStatus = approved`
- real title stored, not filename slug
- YAML stripped from `distilledMarkdown`
- `## Coverage` present
- `## Triggers` present
- `## Use When` present
- `## Instruments` present
- retrieval logs show the intended doc for a targeted Ask Market prompt

---

## Which 3 Are Strongest And Should Validate First

1. `equity-universe-and-sector-coverage-map.md`
   - Most user-visible. It should improve stock-name, sector, ETF, and theme questions immediately.

2. `commodities-instrument-universe-and-driver-map.md`
   - Prevents the WTI-only failure mode and makes gas/metals/curve questions cleaner.

3. `risk-sentiment-indicator-universe-and-signal-map.md`
   - Converts vague sentiment language into measurable vol, credit, positioning, and liquidity checks.

---

## What Success Looks Like After Upload

- Equities answers stock questions with names, sectors, drivers, and caveats.
- Commodities names the exact commodity and avoids oil-only framing.
- Risk/Sentiment requires cross-asset confirmation before saying systemic risk.
- FX names the pair and driver leg.
- Rates decomposes which rates instrument moved.
- Macro distinguishes release ownership from market-price reaction.
