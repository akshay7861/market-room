# Wave 3 Batch 3 Validation Runbook

## Short diagnosis

Wave 3 Batch 3 is uploaded, approved, storage-verified, retrieval-validated, and output-validated.

The first validation pass found three narrow non-vector issues:

1. `SOFR` / `OIS` prompts were being mistaken for equity ticker intent.
2. A fiscal/liquidity prompt explicitly asking Macro still leaned Rates because it contained Treasury and coupon issuance language.
3. The Equities factor framework was retrieved but ranked below older earnings-quality and single-stock docs.

All three were fixed with small routing and scoring changes. No vectors were used.

## Validation prompts

| Test | Prompt | Expected route | Expected top doc |
|---|---|---|---|
| Equities / factors | `A high-multiple software stock beat revenue by 4%, but the stock fell 9% because free cash flow missed, operating margin compressed 220 bps, and 10-year real yields rose. As Equities, is this valuation compression, earnings quality deterioration, or just sector beta?` | Equities Agent | Valuation, Growth, Quality, and Factor Framework |
| Risk/Sentiment / degrossing | `The market is selling off faster than the news explains: crowded AI winners are down with cyclicals, high-short-interest names are squeezing higher, VIX is rising, and correlations are jumping. As Risk/Sentiment, is this discretionary risk-off or forced degrossing?` | Risk/Sentiment Agent | Flows, Positioning, and Degrossing Framework |
| Rates / SOFR-OIS | `SOFR fixed 18 bps above effective fed funds with no CPI or FOMC catalyst, RRP balances are draining, bill yields are rich versus OIS, and repo rates jumped around quarter-end. As Rates, is this policy repricing or money-market plumbing stress?` | Rates Agent | SOFR, Fed Funds, and OIS Market Guide |
| Macro / fiscal liquidity | `Treasury announced a larger TGA rebuild after the debt ceiling, coupon issuance is rising, RRP is draining, and equities are falling even without a bad macro release. As Macro, is this fiscal impulse, liquidity drain, or a Rates auction issue?` | Macro Agent | Fiscal Policy and Liquidity Transmission Framework |
| FX / EM dollar liquidity | `The Mexican peso is weakening despite high carry. DXY is rising, cross-currency basis is widening, reserves are falling, and local rates are still high. As FX, is this still a carry opportunity or EM dollar-liquidity stress?` | FX Agent | EM FX Risk and Dollar Liquidity Framework |
| Commodities / metals | `Copper rallied 4% while LME inventories fell for the third week, but gold also rose even though real yields moved higher and DXY was firm. As Commodities, is this a growth metals signal, monetary metals risk signal, or just positioning?` | Commodities Agent | Metals Growth and Energy Transition Playbook |

## Logs to inspect

Use:

```bash
wrangler tail --format pretty | grep -E "\\[routing\\]|\\[knowledge:|\\[memory-inject:"
```

Successful logs show:

- `[routing]` selected the intended agent.
- `[knowledge:{agent}]` ranked the expected Batch 3 doc first.
- The injected snippet list starts with the intended Batch 3 doc.
- `[memory-inject:{agent}]` still appears.

## Live validation results

| Test | Route result | Top retrieval result | Output behavior | Pass |
|---|---|---|---|---|
| Equities / factors | Equities Agent | Valuation, Growth, Quality, and Factor Framework, score 144.0 | Output separated revenue beat, free-cash-flow miss, margin compression, real-yield multiple pressure, and sector beta. | Yes |
| Risk/Sentiment / degrossing | Risk/Sentiment Agent | Flows, Positioning, and Degrossing Framework, score 87.5 | Output identified forced degrossing, crowded AI winners, short-covering, rising VIX, and correlation jump. | Yes |
| Rates / SOFR-OIS | Rates Agent | SOFR, Fed Funds, and OIS Market Guide, score 163.5 | Output called money-market plumbing stress, not policy repricing, using SOFR/fed funds basis, RRP, bills, repo, and quarter-end. | Yes |
| Macro / fiscal liquidity | Macro Agent | Fiscal Policy and Liquidity Transmission Framework, score 111.5 | Output treated TGA rebuild, coupon issuance, and RRP drain as liquidity/fiscal transmission, not only auction mechanics. | Yes |
| FX / EM dollar liquidity | FX Agent | EM FX Risk and Dollar Liquidity Framework, score 79.0 | Output explained carry being overwhelmed by dollar liquidity stress, reserves, basis, and DXY. | Yes |
| Commodities / metals | Commodities Agent | Metals Growth and Energy Transition Playbook, score 100.0 | Output separated copper growth/inventory tightness from gold risk/monetary-metal divergence. | Yes |

## Small fixes made during validation

| File | Change | Why |
|---|---|---|
| `apps/api/src/lib/services/marketQuestionsService.ts` | Added `asked-sector-frame` routing boost for phrases like `As Macro`, `As Rates`, and `From an FX perspective`. | Makes explicit user routing intent stronger than incidental instrument terms. |
| `apps/api/src/lib/services/marketQuestionsService.ts` | Added SOFR/OIS/RRP/repo/bill-yield phrases to non-equity intent guard. | Prevents money-market acronyms from being treated as stock tickers. |
| `apps/api/src/lib/services/knowledgeSnippetService.ts` | Added equity-factor, SOFR/OIS plumbing, and fiscal-liquidity query/doc boosts. | Ensures the sharper Batch 3 docs beat older broader docs when the trigger clearly matches. |

## Success criteria

Wave 3 Batch 3 is validated if:

- all six docs are approved and stored correctly,
- all six prompts route to the intended agent,
- all six intended Batch 3 docs rank first,
- outputs show the specific mechanism taught by the doc,
- no vector path is involved,
- dynamic memory and approved-knowledge logs still appear.

## Gate decision

Wave 3 Batch 3 gate is cleared.

Wave 3 is complete across all six agents.

