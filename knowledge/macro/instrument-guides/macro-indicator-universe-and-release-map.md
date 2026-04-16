---
agent: Macro
doc_type: instrument-guide
priority: high
topics:
  - macro indicator universe
  - economic release hierarchy
  - inflation
  - labor market
  - growth
  - revisions
  - policy reaction windows
  - agent handoff rules
instruments:
  - CPI
  - payrolls
  - unemployment rate
  - JOLTS
  - GDP
  - PCE
  - retail sales
  - ISM
  - FOMC calendar
market_regimes:
  - inflation shock
  - labor deterioration
  - growth slowdown
  - soft landing
  - stagflation
  - reflation
trigger_patterns:
  - CPI or PCE surprise greater than 0.1 percentage point versus consensus
  - payroll surprise greater than 75k
  - unemployment rate rises 0.2 percentage point or more in one report
  - JOLTS openings change greater than 500k over three months
  - GDP or retail sales surprise changes growth regime
  - macro release falls inside FOMC reaction window
use_when:
  - user asks about economic data
  - Market Room sees CPI payroll GDP JOLTS PCE retail sales or ISM headline
  - agent needs to decide whether Macro owns the catalyst
  - agent must hand off to Rates FX Equities or Risk/Sentiment
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-15
source_urls:
  - https://www.bls.gov/cpi/
  - https://www.bls.gov/news.release/empsit.toc.htm
  - https://www.bls.gov/jlt/
  - https://www.bea.gov/data/gdp/gross-domestic-product
  - https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
---

# Macro Indicator Universe and Release Map

## Why this matters

The Macro agent owns the economic mechanism, not every headline with an economic word in it. Its job is to decide whether a data point changes the inflation path, labor path, growth path, or central-bank reaction function. If the main story is price action in yields, equities, FX, oil, or credit, Macro should either support another agent or stay out.

This doc is the release map. It tells Macro which indicators matter first, which are confirmation, which are lagging, and when a surprise is large enough to post.

## Core mechanism

Macro releases matter through four channels:

1. **Inflation channel**
   - CPI and PCE affect policy through core services, shelter, goods, energy pass-through, and expectations.
   - Macro owns the inflation diagnosis.
   - Rates owns the bps repricing.

2. **Labor channel**
   - JOLTS and quits lead.
   - Claims and ISM employment confirm.
   - Payrolls are high-frequency but noisy.
   - Unemployment and Sahm Rule are regime-confirming.

3. **Growth channel**
   - GDP is broad but lagged.
   - Retail sales, ISM, industrial production, and real income help infer momentum.
   - One strong activity print is not a growth regime shift unless labor and income confirm.

4. **Policy reaction channel**
   - The same release matters more inside an FOMC reaction window.
   - A CPI surprise one week before FOMC is more thesis-relevant than the same surprise after guidance has already reset.

## What to watch

| Release family | Primary indicators | Macro read | Action threshold |
|---|---|---|---|
| Inflation | CPI, core CPI, PCE, core PCE, supercore | persistence vs one-off noise | post if core surprise is greater than 0.1pp and mechanism is persistent |
| Labor | payrolls, unemployment, wages, JOLTS, quits, claims | cooling vs deterioration | post if payroll surprise exceeds 75k or unemployment rises 0.2pp with confirming data |
| Growth | GDP, retail sales, ISM, industrial production | demand acceleration vs slowdown | post only if at least two indicators shift the same way |
| Income | real wages, disposable income, consumption | spending durability | comment unless it changes recession or inflation thesis |
| Policy | FOMC calendar, SEP, speeches | reaction window | update if data changes likely Fed language or dots |

## Typical market path

1. Data surprise hits the tape.
2. Rates price the first reaction through the 2-year yield, OIS, Fed funds futures, or curve move.
3. Macro decides whether the surprise is persistent, broad, and policy-relevant.
4. Equities, FX, and Risk/Sentiment react depending on whether the data changes discount rates, earnings, dollar path, or fragility.
5. If revisions later erase the surprise, Macro should update or de-escalate the thesis.

## False positives / traps

- **Single-release regime trap:** one CPI, payroll, or retail sales print does not create a regime unless the internal composition confirms.
- **Lagging confirmation trap:** unemployment rising after JOLTS and claims already deteriorated is confirmation, not the first signal.
- **Revision trap:** payrolls and GDP can be revised enough to reverse the interpretation; always mention revision risk when the initial surprise is marginal.
- **Nominal growth trap:** strong nominal retail sales can be inflation rather than real demand.
- **Market-reaction trap:** a big 2-year yield move is Rates evidence. Macro should not claim ownership unless the economic mechanism changed.

## Cross-asset implications

- Sticky inflation with firm labor supports higher front-end yields and USD strength.
- Labor deterioration with falling inflation supports bull steepening risk and equity quality rotation.
- Growth acceleration with cooling inflation supports cyclical equities and risk appetite.
- Stagflationary data, weak growth plus sticky inflation, is the highest-risk macro mix for equities and credit.
- Commodity-led inflation needs Commodities confirmation before Macro treats it as durable inflation pressure.

## How this should affect agent behavior

- Post when a release changes the inflation, labor, or growth path.
- Update when the release confirms or invalidates an existing house view.
- Comment when the market reaction is large but the macro mechanism is not yet durable.
- Stay silent when the event is mostly instrument-specific: Treasury auction, oil inventory, stock upgrade, FX intervention headline, or credit-spread move.
- Hand off to Rates for yields, FX for currency pairs, Commodities for physical supply/demand, Equities for sector or stock implications, and Risk/Sentiment for crowding or volatility.

## Example historical episodes

### 2021-2022 inflation persistence

CPI prints that initially looked temporary became thesis-grade when core services and wages confirmed. The lesson is that Macro should not post only on headline energy; it should post when persistence appears in the underlying channel.

### 2022-2023 labor cooling without recession

JOLTS and quits softened before payrolls broke. The lesson is that labor deterioration has stages, and Macro should distinguish cooling from outright recession.

### 2023 disinflation with resilient activity

Inflation cooled while payrolls and spending remained firm. The lesson is that falling inflation is not automatically bearish growth; the mix matters.

### 2024-2025 data-dependent Fed regime

The market repeatedly repriced policy on CPI and payroll surprises. Macro's role was not to quote the bps move; it was to decide whether the data changed the Fed reaction function.

## Checklist

- Is the release owned by Macro or another agent?
- Is the surprise larger than the normal noise band?
- Is the internal composition persistent or one-off?
- Is there revision risk?
- Is this inside an FOMC reaction window?
- Does it change inflation, labor, growth, or policy reaction?
- Which agent should own the market-price implication?
- Should Macro post, update, comment, or stay silent?

## Sources

- BLS CPI for official inflation release structure.
- BLS Employment Situation for payrolls, unemployment, wages, and labor-force detail.
- BLS JOLTS for openings, quits, hires, and labor-market tightness.
- BEA GDP for broad growth and revision structure.
- Federal Reserve FOMC calendars for policy reaction timing.
