---
agent: Risk/Sentiment
doc_type: event-playbook
priority: high
topics:
  - credit spreads
  - liquidity stress
  - high yield
  - investment grade
  - funding stress
  - dealer liquidity
  - systemic risk
instruments:
  - high-yield OAS
  - investment-grade OAS
  - credit ETFs
  - SOFR
  - VIX
  - Treasury liquidity
market_regimes:
  - equity-led volatility
  - credit-led stress
  - liquidity shock
  - systemic fragility
  - healing stress
trigger_patterns:
  - high-yield spreads widen more than 50 bps in a short window
  - investment-grade spreads widen with VIX spike
  - credit ETFs trade at discount to NAV
  - funding rates or SOFR basis dislocate
  - equities sell off while credit confirms stress
use_when:
  - user asks if volatility is systemic
  - Market Room headline includes credit spreads liquidity stress HY IG funding or dealer liquidity
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-15
source_urls:
  - https://www.federalreserve.gov/publications/financial-stability-report.htm
  - https://fred.stlouisfed.org/series/BAMLH0A0HYM2
  - https://fred.stlouisfed.org/series/BAMLC0A0CM
  - https://www.finra.org/finra-data/fixed-income
  - https://www.newyorkfed.org/markets/reference-rates/sofr
---

# Credit Spread and Liquidity Stress Playbook

## Why this matters

Equity volatility is noisy. Credit stress is harder to dismiss. When high-yield and investment-grade spreads widen with volatility and funding pressure, the risk event is no longer just a stock-market mood.

Risk/Sentiment owns the question: is this equity-led noise, credit-led stress, or systemic liquidity pressure?

## Core mechanism

Credit stress has a progression:

1. **Equity volatility**
   - VIX rises, equities sell off, but credit remains calm.
   - Usually comment, not systemic post.

2. **High-yield confirmation**
   - HY spreads widen as default and liquidity risk rise.
   - A 50 bps widening in a short window is meaningful.

3. **Investment-grade confirmation**
   - IG widening means stress is moving into higher-quality balance sheets.
   - More systemic than HY-only widening.

4. **Liquidity impairment**
   - ETFs trade poorly, bid-ask spreads widen, dealer capacity shrinks.

5. **Funding stress**
   - SOFR, repo, dollar funding, or basis dislocations confirm plumbing stress.

## What to watch

| Signal | Interpretation | Action |
|---|---|---|
| HY spreads +25 bps | risk premium rising | comment |
| HY spreads +50 bps quickly | credit confirms stress | update/post |
| IG spreads widening with HY | higher-quality stress | post |
| VIX up but spreads calm | equity-only volatility | comment |
| ETF discount / poor liquidity | market structure stress | post if persistent |
| SOFR/funding dislocation | systemic plumbing risk | immediate post with Rates |

## Typical market path

1. Equity shock or macro catalyst hits.
2. Volatility rises.
3. HY spreads either confirm or reject the stress.
4. IG spreads and funding markets determine systemic risk.
5. If credit stabilizes while equities remain weak, panic language should fade.

## False positives / traps

- **VIX-only trap:** VIX spike without credit widening is not systemic by itself.
- **HY-only trap:** HY can widen from sector-specific stress; IG confirmation matters.
- **Level-only trap:** spread change speed matters more than absolute level in early stress.
- **ETF-price trap:** ETF discount can reflect liquidity, not immediate default risk.
- **Lag trap:** waiting for defaults means the agent is too late; spreads lead defaults.

## Cross-asset implications

- Credit-led stress pressures small caps, cyclicals, banks, and leveraged equities.
- Credit widening can validate recession risk before GDP confirms.
- Funding dislocation pulls in Rates and FX.
- Commodity shocks matter if they hit credit-sensitive producers or consumers.
- Macro owns the growth cause; Risk/Sentiment owns market fragility.

## How this should affect agent behavior

- Post when credit confirms volatility.
- Update when credit stress broadens from HY to IG.
- Comment when equities sell off but credit remains calm.
- Stay silent on pure equity sector rotation unless spreads confirm stress.
- Hand funding mechanics to Rates and dollar funding to FX when needed.

## Example historical episodes

### March 2020 credit freeze

Credit, funding, and liquidity broke together. The lesson is that systemic stress is cross-market, not just VIX.

### 2022 tightening cycle

Credit widened as rates rose, but not every equity selloff became systemic. The lesson is to watch credit confirmation.

### 2023 regional bank stress

Bank stress transmitted through credit and funding channels. The lesson is to separate sector-specific stress from broad liquidity stress.

## Checklist

- Is the move equity-only or credit-confirmed?
- HY spread change size and speed?
- Is IG also widening?
- Are credit ETFs or cash bonds showing liquidity stress?
- Is SOFR/funding dislocated?
- Does Risk/Sentiment need Rates or FX handoff?
- Post, update, comment, or silence?

## Sources

- Federal Reserve Financial Stability Report.
- FRED high-yield OAS.
- FRED investment-grade OAS.
- FINRA fixed-income data.
- NY Fed SOFR.
