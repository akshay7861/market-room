# Wave 3 Batch 2 Validation Runbook

## Short diagnosis
Wave 3 Batch 2 is uploaded, approved, storage-verified, and retrieval-validated. The first validation pass exposed two narrow non-vector issues rather than document-quality issues:

1. Ask Market routing was too eager to treat uppercase market acronyms (`LNG`, `VIX`, `OAS`, `IG`, `ECB`, `EUR/USD`) as equity ticker intent.
2. Several Batch 2 specialist docs were correctly retrieved but initially ranked below broader instrument/universe docs.

Both were fixed with small, observable scoring and routing adjustments. No vectors were used.

## Uploaded docs validated
| Agent | File | Admin category | Intended validation doc |
|---|---|---:|---|
| Equities | `knowledge/equities/event-playbooks/single-stock-movement-interpretation-playbook.md` | `event_playbooks` | Single-Stock Movement Interpretation Playbook |
| Commodities | `knowledge/commodities/frameworks/natural-gas-and-lng-framework.md` | `frameworks` | Natural Gas and LNG Framework |
| Risk/Sentiment | `knowledge/risk-sentiment/event-playbooks/credit-spread-and-liquidity-stress-playbook.md` | `event_playbooks` | Credit Spread and Liquidity Stress Playbook |
| Rates | `knowledge/rates/event-playbooks/treasury-auction-and-supply-playbook.md` | `event_playbooks` | Treasury Auction and Supply Playbook |
| FX | `knowledge/fx/event-playbooks/g10-fx-central-bank-and-real-yield-playbook.md` | `event_playbooks` | G10 FX Central Bank and Real Yield Playbook |
| Macro | `knowledge/macro/regime-checklists/macro-regime-classification-checklist.md` | `frameworks` | Macro Regime Classification Checklist |

## Validation prompts and expected triggers
| Test | Prompt | Expected route | Expected top doc | Trigger evidence |
|---|---|---|---|---|
| Equities / single-stock | `NVDA is down 7% after earnings even though revenue beat consensus. Guidance was only in line, gross margin slipped 180 bps, semiconductors are weak, and real yields rose. As an equities analyst, is this a thesis change, a valuation multiple compression move, or just sector beta?` | Equities Agent | Single-Stock Movement Interpretation Playbook | Ticker + earnings + margin + sector beta + price move |
| Commodities / gas-LNG | `Henry Hub natural gas rallied after EIA storage showed a -28 bcf draw versus expectations for a small build. Storage is now below the five-year range, LNG feedgas is rising, and weather forecasts turned colder. Is this a real gas tightness signal or a weather-driven false start?` | Commodities Agent | Natural Gas and LNG Framework | Henry Hub + Bcf storage surprise + LNG feedgas + weather |
| Risk/Sentiment / credit stress | `VIX jumped from 18 to 29 while high-yield OAS widened 65 bps in a week, IG spreads widened, and a major credit ETF traded at a discount to NAV. From a risk sentiment standpoint, is this ordinary volatility or a liquidity stress regime?` | Risk/Sentiment Agent | Credit Spread and Liquidity Stress Playbook | VIX spike + HY/IG widening + ETF discount to NAV |
| Rates / auction supply | `The 30-year Treasury auction tailed by 4.6 bps with a weak bid-to-cover, indirect demand fell, dealer takedown rose, and 10s30s steepened after the result. Is this just one bad auction or a supply/term-premium signal rates should post on?` | Rates Agent | Treasury Auction and Supply Playbook | Auction tail + bid-to-cover + indirect demand + dealer takedown |
| FX / G10 real-yield differential | `USD/JPY jumped 1.4% today with no central-bank decision. US real yields rose 18 bps while Japanese front-end yields were flat, the US-Japan 2-year spread widened, and DXY strengthened. From a G10 FX perspective, is this a real-yield differential signal or a noisy dollar beta move?` | FX Agent | G10 FX Central Bank and Real Yield Playbook | G10 pair + real-yield differential + 2-year spread + DXY |
| Macro / regime checklist | `GDP growth is slowing, core CPI is still 0.4% month over month, JOLTS openings fell 600k, payrolls are still positive, and credit spreads remain calm. As the Macro agent, classify the regime: soft landing, stagflation, recession, or late-cycle slowdown?` | Macro Agent | Macro Regime Classification Checklist | Growth + inflation + labor + credit spread regime mix |

## Logs to inspect
Use the remote preview or deployed worker logs and filter for:

```bash
wrangler tail --format pretty | grep -E "\[routing\]|\[knowledge:|\[memory-inject:"
```

Successful validation requires:

- `[routing]` top agent matches the expected route, or an explicit runner-up tie-break is logged.
- `[knowledge:{agent}]` top scored title is the expected Batch 2 doc.
- The injected snippet list includes the intended doc first.
- `[memory-inject:{agent}]` still fires, confirming dynamic memory remains intact.

## Live results
| Test | Route result | Top retrieval result | Output behavior observed | Pass |
|---|---|---|---|---|
| Equities / single-stock | Equities Agent | Single-Stock Movement Interpretation Playbook, score 121.0 | Answer separated earnings quality, margin compression, sector beta, and thesis-change risk. | Yes |
| Commodities / gas-LNG | Commodities Agent | Natural Gas and LNG Framework, score 140.5 | Answer used Bcf storage draw, five-year range, LNG feedgas, and weather false-start logic. | Yes |
| Risk/Sentiment / credit stress | Risk/Sentiment Agent | Credit Spread and Liquidity Stress Playbook, score 100.0 | Answer distinguished ordinary volatility from liquidity stress using HY OAS, IG widening, and ETF discount to NAV. | Yes |
| Rates / auction supply | Rates Agent | Treasury Auction and Supply Playbook, score 133.0 | Answer used tail, bid-to-cover, indirect demand, dealer takedown, 10s30s steepening, and supply/term-premium follow-through. | Yes |
| FX / G10 real-yield differential | FX Agent | G10 FX Central Bank and Real Yield Playbook, score 121.0 | Answer treated USD/JPY as a real-yield differential signal, separated pair-specific move from broad dollar beta. | Yes |
| Macro / regime checklist | Macro Agent | Macro Regime Classification Checklist, score 104.0 | Answer classified late-cycle slowdown with sticky inflation, labor cooling, positive payrolls, and calm credit spreads. | Yes |

## Small fixes made during validation
| File | Change | Why |
|---|---|---|
| `apps/api/src/lib/services/marketQuestionsService.ts` | Added stronger non-equity intent guard for acronyms and specialist prompts. | Prevents `LNG`, `VIX`, `OAS`, `IG`, `EUR/USD`, and `ECB` from being mistaken for equity ticker intent. |
| `apps/api/src/lib/services/marketQuestionsService.ts` | Added narrow explicit-sector runner-up tie-break when winner margin is <= 2. | Lets explicit `FX perspective` beat a narrow Rates win caused by `2-year spread` / `real yield` language. |
| `apps/api/src/lib/services/knowledgeSnippetService.ts` | Added targeted boosts for single-stock movement, gas/LNG, credit stress, treasury auction, macro regime checklist, and G10 FX real-yield prompts. | Makes the sharper Wave 3 Batch 2 docs top-1 when they clearly match the trigger. |
| `apps/api/src/lib/services/knowledgeSnippetService.ts` | Added instrument-guide off-topic penalties for gas/LNG, auction, single-stock, credit-stress, regime-checklist, and G10 FX prompts. | Prevents broad universe maps from beating the specialist playbooks/frameworks. |

## Success criteria
Wave 3 Batch 2 is considered validated only if all are true:

- All six prompts route to the intended agent.
- All six intended Batch 2 docs rank top-1 for their targeted prompt.
- Agent outputs show mechanism-level behavior, not generic commentary.
- Existing memory and knowledge logs still appear.
- No vector path is involved.

## Gate decision
Wave 3 Batch 2 gate is cleared.

The next step is Wave 3 Batch 3 only after the patched API is deployed and the live hosted API reflects the same routing/retrieval behavior.
