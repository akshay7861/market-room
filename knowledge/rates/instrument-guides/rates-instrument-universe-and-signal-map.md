---
agent: Rates
doc_type: instrument-guide
priority: high
topics:
  - rates instrument universe
  - Treasury curve
  - bills
  - SOFR
  - OIS
  - TIPS
  - breakevens
  - futures
  - auction signals
  - handoff rules
instruments:
  - 3-month T-bill
  - 2-year Treasury
  - 5-year Treasury
  - 10-year Treasury
  - 30-year Treasury
  - Treasury futures
  - SOFR futures
  - OIS
  - TIPS
  - breakevens
market_regimes:
  - hawkish repricing
  - dovish repricing
  - bear steepening
  - bull steepening
  - term premium shock
  - money-market stress
trigger_patterns:
  - 2-year yield moves more than 10 bps in one session
  - 10-year yield moves more than 12 bps in one session
  - curve slope changes more than 8 bps
  - real yield or breakeven move explains nominal yield move
  - SOFR or fed funds basis widens
  - Treasury auction tails materially versus when-issued yield
use_when:
  - user asks about yields duration bonds curve Fed repricing or Treasury market
  - Market Room headline includes auction yield curve SOFR TIPS breakeven OIS or term premium
  - agent must decide which rates instrument owns the signal
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-15
source_urls:
  - https://home.treasury.gov/policy-issues/financing-the-government/interest-rate-statistics
  - https://www.federalreserve.gov/releases/h15/
  - https://www.newyorkfed.org/markets/reference-rates/sofr
  - https://www.treasurydirect.gov/auctions/
  - https://www.cmegroup.com/markets/interest-rates.html
---

# Rates Instrument Universe and Signal Map

## Why this matters

The Rates agent should not answer every bond question as "the Fed is hawkish" or "yields rose." Rates has an instrument stack. Each part of the curve and each derivative market answers a different question.

The agent's edge is decomposing the move: policy path, growth, inflation, real yield, term premium, supply, liquidity, or money-market plumbing.

## Core mechanism

Rates instruments form a signal ladder:

1. **Bills and front-end rates**
   - Reflect near-term policy and liquidity.
   - Owned by Rates unless the core issue is banking stress, where Risk/Sentiment should join.

2. **2-year Treasury**
   - Best liquid summary of Fed policy expectations over the next two years.
   - A 10-15 bps move is usually update-worthy; 15 bps or more is often thesis-grade.

3. **5-year Treasury**
   - Bridges policy path, medium-term growth, and inflation expectations.
   - Useful when the market reprices the whole cycle, not only the next meeting.

4. **10-year and 30-year Treasuries**
   - Mix expected short rates, term premium, growth, inflation risk, and supply.
   - Long-end moves require decomposition before posting.

5. **TIPS and breakevens**
   - Split nominal yields into real yield and inflation compensation.
   - If nominal yields rise but breakevens fall, do not call it an inflation scare.

6. **SOFR, OIS, and futures**
   - Translate policy expectations into meeting probabilities and forward rates.
   - Best for "what did the market price" questions.

## What to watch

| Instrument | Main question answered | Strong signal | False signal |
|---|---|---|---|
| 3-month bill | near-term policy / liquidity | bill dislocation vs OIS | year-end technical noise |
| 2-year Treasury | Fed path | move greater than 10 bps | calling every move a Fed pivot |
| 10-year Treasury | policy plus term premium | move greater than 12 bps with curve context | assuming long-end rise means inflation |
| 2s10s / 3m10y | growth and recession signal | slope move greater than 8 bps | treating disinversion as bullish automatically |
| TIPS real yield | discount-rate pressure | 10y real yield up more than 10 bps | ignoring liquidity premium |
| Breakevens | inflation compensation | 5y5y or 10y BEI regime shift | reading risk-off liquidity collapse as deflation |
| SOFR futures | policy path by meeting | meeting probability shift greater than 20pp | thin session repricing |

## Typical market path

1. Catalyst arrives: CPI, payrolls, FOMC, auction, refunding, risk event.
2. Front end moves first if policy is the mechanism.
3. Curve shape shows whether the market is repricing policy, growth, or term premium.
4. TIPS and breakevens identify whether nominal yield movement is real-rate or inflation-compensation led.
5. Futures and OIS translate the move into policy expectations.
6. Rates posts only after the instrument hierarchy points to a coherent mechanism.

## False positives / traps

- **Fed-only trap:** long-end yields can rise because of term premium or supply even when Fed expectations are unchanged.
- **Inflation-label trap:** a nominal yield rise with flat or falling breakevens is not an inflation scare.
- **Curve-bullish trap:** bull steepening after inversion can mean recession risk is arriving, not that the outlook is improving.
- **Liquidity trap:** TIPS and bill dislocations can reflect liquidity stress rather than clean macro signal.
- **Auction overreaction trap:** one tail is not a supply crisis unless dealer takedown, indirect demand, and follow-through confirm.

## Cross-asset implications

- Front-end repricing drives USD and rate-sensitive equities.
- Real-yield shocks pressure duration equities, gold, and clean-energy stocks.
- Term-premium shocks hit long-duration assets and can spill into mortgage and credit markets.
- Bull steepeners often require Macro and Risk/Sentiment context.
- Money-market stress belongs jointly to Rates and Risk/Sentiment.

## How this should affect agent behavior

- Own yield, curve, futures, TIPS, breakeven, SOFR, and auction mechanics.
- Do not own the macro release itself unless the user asks specifically for rates interpretation.
- Post if the move is large and decomposable.
- Update if the move confirms an existing rates thesis.
- Comment if price action is real but mechanism is not yet clear.
- Stay silent if the issue is mainly equity earnings, oil inventories, or FX intervention.

## Example historical episodes

### 2022 front-end repricing

The 2-year yield repriced sharply as the Fed shifted from inflation tolerance to aggressive hikes. The right instrument was the front end, not the 30-year.

### 2023 term-premium shock

Long yields rose even when some inflation expectations were not accelerating. The lesson is that supply, QT, and term premium can dominate the long end.

### March 2023 banking stress

Front-end yields fell violently as policy expectations repriced after bank failures. The move was not a normal dovish macro print; Risk/Sentiment and funding stress mattered.

### 2024-2025 data repricing

CPI and payroll surprises repeatedly moved SOFR and Fed funds expectations. The agent needed to translate the yield move into meeting probability and policy-path implications.

## Checklist

- Which rates instrument moved first?
- Is the move front-end, belly, long-end, real-yield, breakeven, or curve-led?
- Is policy path, term premium, inflation compensation, liquidity, or supply the mechanism?
- Is the move above posting threshold?
- Do SOFR/OIS/futures confirm?
- Do TIPS and breakevens support the interpretation?
- Which other agent should join?

## Sources

- US Treasury interest-rate statistics for official curve data.
- Federal Reserve H.15 for official selected interest rates.
- NY Fed SOFR for secured overnight funding rates.
- TreasuryDirect for auction mechanics and auction results.
- CME interest-rate markets for futures instruments and policy-path pricing.
