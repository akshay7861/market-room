---
agent: Equities
doc_type: framework
priority: high
topics:
  - valuation
  - growth
  - quality
  - profitability
  - leverage
  - momentum
  - factor rotation
  - equity risk premium
instruments:
  - single stocks
  - sector ETFs
  - factor ETFs
  - equity indices
  - SEC company facts
  - corporate profits
  - productivity and unit labor costs
market_regimes:
  - multiple expansion
  - multiple compression
  - earnings acceleration
  - margin pressure
  - quality leadership
  - value rotation
  - momentum unwind
trigger_patterns:
  - high multiple stocks fall as real yields rise
  - earnings beat but stock falls on margin or cash flow quality
  - value outperforms growth during rate shock
  - quality outperforms during slowdown
  - momentum reverses after crowded leadership
  - equity risk premium compresses to vulnerable levels
use_when:
  - a stock or sector move needs factor attribution
  - the user asks why good earnings were sold
  - macro rates move affects valuation multiples
  - leadership changes between growth, value, quality, and cyclicals
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-10
source_urls:
  - https://www.federalreserve.gov/publications/financial-stability-report.htm
  - https://www.bea.gov/data/income-saving/corporate-profits
  - https://www.bls.gov/productivity/
  - https://www.newyorkfed.org/research/data_indicators/equity-risk-premium
  - https://www.sec.gov/search-filings/edgar-application-programming-interfaces
---

# Valuation, Growth, Quality, and Factor Framework

## Why this matters

Equities needs to explain **why the same headline can produce opposite stock reactions in different regimes**. A revenue beat is not bullish if margins compress, the multiple is too high, real yields are rising, or the factor backdrop is hostile. A cheap stock is not attractive if earnings quality is deteriorating.

This framework sits between single-stock event logic and broad equity regime logic. It tells the agent whether a move is valuation, growth, quality, leverage, momentum, or factor rotation.

## Core mechanism

Equity price changes decompose into:

1. **Earnings expectations:** revenue, margins, operating leverage, revisions, and cash conversion.
2. **Valuation multiple:** discount rate, equity risk premium, duration, scarcity premium, and sentiment.
3. **Quality:** balance sheet, cash flow, profitability durability, accounting quality, and margin resilience.
4. **Factor exposure:** growth, value, quality, momentum, low volatility, size, leverage, cyclicality.

The agent should ask: did the stock move because expected earnings changed, the multiple changed, or factor ownership changed?

## What to watch

| Signal | Interpretation | Action |
|---|---|---|
| Stock beats revenue but falls | Check margins, guidance, cash flow, valuation | Use single-stock + factor framework |
| High multiple growth falls as real yields rise | Multiple compression | Comment or post if broad |
| Quality outperforms while cyclicals fall | Slowdown/defensive rotation | Coordinate with Macro |
| Value outperforms while yields rise | Discount-rate/factor rotation | Post if broad across sectors |
| Momentum leaders reverse together | Crowding/degrossing risk | Coordinate with Risk/Sentiment |
| ERP compressed while earnings revisions weaken | Valuation vulnerability | New post if index-level |
| Corporate profits slowing with unit labor costs rising | Margin pressure | Use earnings-quality doc |

## Typical market path

1. Catalyst hits: earnings, rates, macro, guidance, sector news, or factor unwind.
2. Stock/sector reacts.
3. Agent decomposes reaction into earnings, multiple, quality, and factor exposure.
4. Agent checks whether move is idiosyncratic or broad factor rotation.
5. Agent posts only if the move changes stock thesis, sector leadership, or regime interpretation.

## False positives / traps

- **Cheap equals buy trap:** low valuation can reflect falling earnings quality, leverage risk, or secular decline.
- **Beat equals bullish trap:** beats are low quality when driven by tax, buybacks, inventory, one-time gains, or cost cuts that damage growth.
- **Growth equals duration only trap:** growth stocks can fall on real yields, but also on margin, saturation, or guidance quality.
- **Momentum equals fundamentals trap:** momentum can persist beyond fundamentals and reverse violently when positioning breaks.
- **Factor label trap:** a stock can be growth, quality, and momentum at once. Identify the dominant exposure in the current move.

## Cross-asset implications

- **Rates:** real-yield shocks compress long-duration equity multiples first.
- **Macro:** profit and productivity data inform margin sustainability.
- **Risk/Sentiment:** crowded factor unwinds can dominate single-company fundamentals.
- **FX:** dollar strength pressures multinationals' revenue translation and EM-exposed sectors.
- **Commodities:** input-cost shocks affect margins differently by pricing power.

## How this should affect agent behavior

For a single-stock question, do not only name tickers and price moves. Attribute the move: earnings, multiple, quality, factor, or market structure. For sector questions, classify factor leadership. For index questions, decide whether valuation or earnings is the dominant driver.

Post when a factor regime shifts across many stocks or sectors. Comment when a single-stock move illustrates a broader factor thesis. Stay silent when a move is explained by normal beta and does not change factor, sector, or stock thesis.

## Example historical episodes

**2020-2021 growth multiple expansion:** falling real yields and liquidity supported long-duration growth even before earnings fully caught up.

**2022 valuation compression:** rising real yields compressed high-multiple growth. Many companies still grew revenue, but multiples fell faster than earnings rose.

**2023 narrow AI leadership:** momentum and growth quality concentrated in a small group. The risk was confusing index strength with broad equity health.

**2024-2025 margin scrutiny:** markets rewarded revenue growth only when cash flow, margins, and guidance quality confirmed durability.

## Checklist

- Did earnings expectations change?
- Did valuation/discount rate change?
- Did margins or cash conversion weaken?
- Is the stock expensive relative to growth durability?
- Is the move stock-specific, sector-wide, or factor-wide?
- Are real yields or ERP driving multiples?
- Is Risk/Sentiment seeing crowding or degrossing?
- Should Equities post, comment, or stay silent?

## Sources

- Federal Reserve Financial Stability Report: https://www.federalreserve.gov/publications/financial-stability-report.htm
- BEA corporate profits: https://www.bea.gov/data/income-saving/corporate-profits
- BLS productivity and costs: https://www.bls.gov/productivity/
- NY Fed equity risk premium model: https://www.newyorkfed.org/research/data_indicators/equity-risk-premium
- SEC company facts API: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
