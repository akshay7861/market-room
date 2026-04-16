---
agent: Macro
doc_type: regime-checklist
priority: high
topics:
  - macro regime classification
  - expansion
  - slowdown
  - recession
  - stagflation
  - disinflation
  - reflation
  - cross-agent handoff
instruments:
  - GDP
  - CPI
  - PCE
  - unemployment rate
  - JOLTS
  - yield curve
  - financial conditions
market_regimes:
  - expansion
  - slowdown
  - recession
  - stagflation
  - disinflation
  - reflation
trigger_patterns:
  - growth and inflation indicators move in opposite directions
  - unemployment rises 0.3 percentage point or more from cycle low
  - JOLTS and payrolls confirm labor cooling
  - inflation remains sticky while activity slows
  - curve signal and financial conditions conflict with headline data
use_when:
  - user asks what macro regime we are in
  - economic data gives mixed inflation growth and labor signals
  - Market Room needs a regime label before cross-asset interpretation
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-15
source_urls:
  - https://www.bea.gov/data/gdp/gross-domestic-product
  - https://www.bls.gov/cpi/
  - https://www.bls.gov/charts/employment-situation/civilian-unemployment-rate.htm
  - https://www.federalreserve.gov/publications/financial-stability-report.htm
  - https://fred.stlouisfed.org/series/T10Y2Y
---

# Macro Regime Classification Checklist

## Why this matters

Macro should not label every strong print as expansion or every weak print as recession. Regime classification requires a mix of growth, inflation, labor, policy, and financial-condition evidence.

This checklist tells Macro when to post a regime call, when to update, and when to stay silent because the data is still mixed.

## Core mechanism

Macro regimes are defined by the direction of **growth**, **inflation**, and **labor slack**:

| Regime | Growth | Inflation | Labor | Policy implication |
|---|---|---|---|---|
| Expansion | firm or accelerating | stable | tight but not overheating | risk assets can absorb policy |
| Slowdown | decelerating | easing or mixed | cooling | Fed reaction depends on inflation |
| Recession | contracting | usually falling later | deteriorating | policy easing pressure rises |
| Stagflation | weakening | sticky or rising | softening | worst mix for policy and equities |
| Disinflationary soft landing | resilient | falling | cooling gradually | best mix for duration and risk |
| Reflation | accelerating | rising from low base | improving | cyclical support, rates pressure |

The key is not the label. The key is the **transition**. Agents should post when evidence moves from one regime bucket to another.

## What to watch

- Growth: real GDP, real final sales, retail sales, ISM, industrial production.
- Inflation: CPI, core CPI, PCE, core PCE, supercore, wages.
- Labor: JOLTS, quits, claims, payrolls, unemployment rate.
- Financial conditions: curve slope, credit spreads, equity breadth, dollar.
- Policy: Fed guidance, dots, real policy rate relative to neutral.

## Typical market path

1. Leading indicators turn first: JOLTS, claims, ISM, curve, credit.
2. Coincident indicators follow: payrolls, spending, production.
3. Lagging indicators confirm: unemployment, GDP revisions, corporate profits.
4. Markets reprice before the label is obvious.
5. Macro posts the transition, not the after-the-fact label.

## False positives / traps

- **GDP-only trap:** one negative GDP print can reflect trade or inventory noise, not recession.
- **Payroll-only trap:** payrolls can stay strong after labor demand has already weakened.
- **Inflation-only trap:** sticky inflation with strong growth is not stagflation.
- **Curve-only trap:** inversion is a warning, not the regime itself.
- **Soft-landing overclaim:** disinflation plus one resilient activity print is not enough; labor must cool without breaking.

## Cross-asset implications

- Soft landing supports equities, credit, and controlled bull steepening.
- Stagflation pressures equities and bonds simultaneously while supporting USD and some commodities.
- Recession risk favors duration but hurts cyclicals and credit.
- Reflation helps cyclicals and commodities but can pressure rates-sensitive growth.
- Mixed regimes require Risk/Sentiment confirmation before using systemic language.

## How this should affect agent behavior

- Post only when at least two of growth, inflation, and labor move the regime together.
- Update when one leg changes but the regime remains intact.
- Comment when a data point conflicts with the current regime but lacks confirmation.
- Stay silent if the question is instrument-specific and another agent owns it.
- Hand off rates pricing to Rates, commodity inflation source to Commodities, stock/sector implications to Equities, FX translation to FX, and fragility to Risk/Sentiment.

## Example historical episodes

### 2007-2008 slowdown to recession

Labor and credit weakened before recession was obvious in headline GDP. The regime transition was visible in leading indicators first.

### 2018-2019 mid-cycle slowdown

Growth slowed and the Fed pivoted without a full recession. The lesson is that slowdown is not automatically recession.

### 2021-2022 inflation shock

Growth remained acceptable while inflation accelerated. That was overheating/inflation shock before it became a tightening cycle.

### 2023-2024 soft-landing debate

Inflation cooled while labor softened gradually. The regime call depended on whether labor cooling stayed orderly.

## Checklist

- Is growth accelerating, stable, or decelerating?
- Is inflation sticky, falling, or re-accelerating?
- Is labor cooling or deteriorating?
- Are leading indicators confirming?
- Are financial conditions confirming or contradicting?
- Did at least two macro legs move together?
- Which agent owns the market-price expression?
- Is this a post, update, comment, or silence?

## Sources

- BEA GDP for growth and revision structure.
- BLS CPI for inflation.
- BLS unemployment data for labor slack.
- Federal Reserve Financial Stability Report for financial-condition context.
- FRED yield curve data for recession-risk signal context.
