---
agent: Risk/Sentiment
doc_type: instrument-guide
priority: high
topics:
  - risk sentiment indicators
  - volatility
  - credit spreads
  - positioning
  - market breadth
  - liquidity
  - funding stress
  - cross-asset confirmation
  - handoff rules
instruments:
  - VIX
  - VIX9D
  - VIX3M
  - VVIX
  - high-yield spreads
  - investment-grade spreads
  - CFTC COT
  - SOFR
  - credit ETFs
  - equity breadth
market_regimes:
  - complacency
  - normal risk appetite
  - fragility
  - forced deleveraging
  - credit stress
  - liquidity shock
trigger_patterns:
  - VIX crosses 25 from below
  - VIX crosses 35
  - vol term structure inverts
  - high-yield spreads widen more than 50 bps in a short window
  - crowded positioning begins reversing
  - equities sell off while credit spreads widen and USD/JPY or CHF confirms stress
use_when:
  - user asks about risk sentiment volatility crowding credit stress panic or market fragility
  - Market Room headline includes VIX spreads positioning liquidity volatility credit or deleveraging
  - agent must decide whether risk is isolated or systemic
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-15
source_urls:
  - https://www.cboe.com/tradable_products/vix/
  - https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm
  - https://www.federalreserve.gov/publications/financial-stability-report.htm
  - https://fred.stlouisfed.org/categories/32297
  - https://www.finra.org/finra-data/fixed-income
---

# Risk/Sentiment Indicator Universe and Signal Map

## Why this matters

Risk/Sentiment should not say "risk-off" because equities are red. Its job is to decide whether a move is isolated, crowded, fragile, systemic, or already healing.

This agent owns cross-asset confirmation: volatility, credit, positioning, liquidity, breadth, and funding stress.

## Core mechanism

Risk regimes move through a sequence:

1. **Complacency**
   - Low volatility, tight spreads, crowded longs, narrow leadership.
   - Not bearish by itself, but fragile.

2. **Trigger**
   - CPI, Fed, earnings, geopolitical shock, funding headline, credit event.
   - Risk/Sentiment owns the fragility interpretation, not necessarily the catalyst itself.

3. **Confirmation**
   - Volatility rises, credit spreads widen, safe havens catch a bid, crowded trades unwind.
   - Without confirmation, it is a normal pullback.

4. **Forced flow**
   - Deleveraging, margin pressure, CTA trend breaks, option hedging, dealer balance-sheet limits.
   - This is where Risk/Sentiment should post strongly.

5. **Stabilization**
   - Vol falls, spreads stop widening, breadth improves, safe-haven demand fades.
   - The agent should update rather than keep repeating panic language.

## What to watch

| Indicator | What it measures | Strong signal | False signal |
|---|---|---|---|
| VIX | equity implied volatility | above 25 stress, above 35 crisis | high VIX falling can be bullish |
| VIX term structure | near-term shock pricing | VIX9D > VIX > VIX3M | event-week distortion |
| VVIX | vol-of-vol | spike before VIX confirms | thin option-market noise |
| HY spreads | credit stress | widening greater than 50 bps | equity-only selloff with calm credit |
| IG spreads | systemic credit sensitivity | widening with funding stress | slow drift without catalyst |
| COT positioning | crowding | extreme plus reversal | extreme without trigger |
| Breadth | participation | index up with weak breadth = fragile | single-day breadth noise |
| SOFR / funding | money-market stress | rate or basis dislocation | quarter-end technical |

## Typical market path

1. Equity or rates catalyst appears.
2. VIX and vol term structure react first.
3. Credit either confirms stress or rejects it.
4. Positioning determines whether the move accelerates.
5. Safe-haven FX, USD funding, and liquidity decide whether the event is systemic.
6. Risk/Sentiment posts only when cross-asset confirmation is present.

## False positives / traps

- **Red-index trap:** equities down 1% is not risk-off if credit, vol, and breadth are stable.
- **VIX-level trap:** VIX at 24 after falling from 35 is not the same as VIX at 24 after rising from 12.
- **Crowding-timing trap:** crowded positioning is vulnerability, not timing.
- **Credit-lag trap:** waiting for credit to fully break can make the post late; watch spread acceleration.
- **Macro-catalyst trap:** CPI or payrolls may trigger risk moves, but Macro owns the data interpretation.

## Cross-asset implications

- Confirmed risk-off usually supports USD, JPY, CHF, Treasuries, and quality equities.
- Credit-led stress is more serious than equity-only weakness.
- Vol spikes can force systematic deleveraging and worsen liquidity.
- Commodity shocks become risk events only when they spill into inflation, credit, or growth expectations.
- Equity leadership narrowing can warn before headline indices break.

## How this should affect agent behavior

- Require cross-asset confirmation before using systemic language.
- Post when volatility, credit, positioning, and liquidity align.
- Update when stress is fading or broadening.
- Comment when one indicator flashes but others do not confirm.
- Stay silent on pure stock, oil, FX, or Fed questions unless they create market fragility.
- Hand off catalyst interpretation to the relevant specialist while owning the risk-transmission layer.

## Example historical episodes

### February 2018 vol shock

Volatility products amplified equity weakness. The lesson is that low-vol crowding can turn a normal move into forced deleveraging.

### March 2020 liquidity shock

Vol, credit, USD funding, and Treasury liquidity all broke together. The lesson is that systemic risk requires cross-asset confirmation.

### 2022 bear market rallies

Equities repeatedly rallied while financial conditions and rates pressure remained restrictive. The lesson is that falling VIX alone does not prove risk has cleared.

### 2023 banking stress

Regional-bank stress transmitted through credit, rates, and risk appetite. The lesson is to separate sector stress from systemic stress by watching spreads and funding.

## Checklist

- Is this a risk event or just price movement?
- Are vol, credit, breadth, positioning, and funding aligned?
- Is the move isolated or cross-asset?
- Is positioning crowded and reversing?
- Are safe havens confirming?
- Which agent owns the original catalyst?
- Should Risk/Sentiment post, update, comment, or stay silent?

## Sources

- CBOE VIX for volatility index methodology and term structure.
- CFTC COT for positioning and crowding signals.
- Federal Reserve Financial Stability Report for vulnerability framework.
- FRED credit spread data for IG and HY spread monitoring.
- FINRA fixed income data for bond-market transaction context.
