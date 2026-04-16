---
agent: Equities
doc_type: framework
priority: high
topics:
  - equity regimes
  - valuation compression
  - earnings revisions
  - liquidity support
  - growth slowdown
  - real yields
  - equity risk premium
  - margin pressure
  - breadth
  - leadership
instruments:
  - S&P 500
  - Nasdaq 100
  - equal-weight S&P 500
  - 10-year Treasury
  - 2-year Treasury
  - high-yield spreads
  - sector ETFs
market_regimes:
  - rates-driven compression
  - growth scare
  - liquidity relief rally
  - earnings-led expansion
  - late-cycle narrow leadership
trigger_patterns:
  - real yields rise sharply with index multiple compression
  - earnings revisions deteriorate while indices remain firm
  - policy easing expectations lift duration-sensitive equities
  - breadth diverges from cap-weighted index performance
  - labor-cost pressure rises without matching pricing power
use_when:
  - major CPI / payroll / Fed weeks
  - earnings season
  - sharp yield moves
  - major breadth or sector rotation shifts
  - valuation debates after fast market rallies
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-10
source_urls:
  - https://www.federalreserve.gov/publications/financial-stability-report.htm
  - https://www.newyorkfed.org/research/staff_reports/sr714.html
  - https://www.bea.gov/data/income-saving/corporate-profits
  - https://www.bls.gov/productivity/
---

# Equity Regime Framework: Rates, Growth, Liquidity, Earnings

## Why this matters

The Equities agent should not reduce every selloff to "rates pressure" and every rally to "better sentiment." Equity markets move in regimes. The dominant driver changes:

- sometimes it is valuation compression from higher real yields,
- sometimes it is growth fear,
- sometimes it is liquidity relief,
- sometimes it is actual earnings strength.

The same index move means different things in different regimes. A 2% rally driven by easier discounting is not the same as a 2% rally driven by improving earnings breadth. This framework exists so the Equities agent can identify **what is actually carrying the tape** before it posts.

## Core mechanism

Equity performance is the interaction of four moving parts:

1. **Discount rate**
2. **Growth expectations**
3. **Liquidity / financial conditions**
4. **Earnings and margins**

The regime question is: **which of these is dominant right now?**

### 1. Rates-driven compression / expansion

When real yields rise, the present value of future cash flows falls. This matters most for:

- long-duration growth stocks,
- high-multiple leaders,
- speculative themes whose valuation depends on distant earnings.

This is the classic "higher for longer" regime. The market can still rally, but it tends to rotate toward:

- value,
- energy,
- financials,
- or companies with current cash generation rather than distant promise.

The key point: in this regime, equities are primarily trading the **discount rate**, not the growth narrative.

### 2. Growth-scare regime

Here the problem is not the discount rate itself but weakening demand, softer top-line expectations, and lower earnings visibility. In this regime:

- cyclicals tend to struggle,
- small caps underperform,
- earnings revisions deteriorate,
- and even lower yields may not save the market if profits are being marked down.

This is where people often make the mistake of calling falling yields bullish for equities. They are only bullish if they are falling because inflation is normalizing and policy pressure is easing. They are not bullish if they are collapsing because growth is breaking.

### 3. Liquidity-relief regime

This is the regime where:

- the market expects less tightening,
- financial conditions ease,
- vol compresses,
- and multiple expansion does the heavy lifting.

This regime can produce strong equity rallies even before earnings improve. But it is vulnerable if:

- the macro data re-accelerates,
- the central bank pushes back,
- or real yields rise again.

The Equities agent should identify whether the rally is coming from **better earnings outlook** or simply **easier discounting conditions**.

### 4. Earnings-led regime

This is the healthiest regime:

- revenues are holding,
- margins are stable or improving,
- productivity or pricing power offsets labor costs,
- and breadth is better because the move does not depend entirely on multiple expansion.

This is where the agent can be more constructive and less defensive.

### A practical decision tree

| Primary driver | Evidence | Equity interpretation |
|---|---|---|
| Rates | Real yields up, multiples down | Duration/valuation problem |
| Growth | Revisions down, cyclicals weak | Earnings risk / slowdown regime |
| Liquidity | Vol down, spreads calm, multiples up | Relief rally, but watch durability |
| Earnings | Profits/revisions stable, breadth better | Higher-quality equity advance |

The job is not to identify every driver at once. The job is to identify **which one is dominating the tape now**.

## What to watch

1. **Real yields versus equity multiples**
   - If real yields rise and headline indices stall while high-multiple stocks lag, the regime is rates-led.

2. **Earnings revisions and profits**
   - BEA corporate profits and forward revision trends matter more than one flashy earnings beat.

3. **Labor cost / productivity balance**
   - Rising labor costs without productivity offset create margin pressure.
   - This is a key bridge between macro and equities.

4. **Breadth and equal-weight versus cap-weight**
   - If the cap-weighted index is strong but equal-weight lags, the rally is narrower and usually lower quality.

5. **Credit spreads and financial conditions**
   - Equity rallies with non-confirming credit are less trustworthy.

6. **Sector leadership**
   - Know whether leadership is defensive, cyclical, rate-sensitive, or secular growth.
   - That often tells you the real regime faster than the index itself.

### Useful operating thresholds

| Signal | Threshold | Interpretation |
|---|---|---|
| Real-yield shock | 10-year real yield +15 bps or more in 5 sessions | Rates are likely driving the tape |
| Breadth divergence | cap-weight clearly outperforming equal-weight for 5+ sessions | Rally quality is deteriorating |
| Margin pressure | labor costs rising while productivity is flat/down for 2 readings | Earnings regime weakening |
| Credit divergence | HY spreads +20 bps or more despite index resilience | Equity move may be fragile |
| Earnings-led confirmation | profits/revisions improving with broader participation across sectors | Higher-quality regime |

## Typical market path

### Rates-driven selloff

The pattern is:

- front-end and/or real yields rise,
- high-duration leaders underperform,
- the market starts by calling it "healthy consolidation,"
- then valuation pressure broadens if yields stay high.

Sector behavior matters more than index behavior here. Semis, software, speculative growth, and long-duration assets feel the stress first.

### Growth scare

The pattern is:

- yields often fall,
- but the market does not celebrate cleanly,
- cyclicals weaken,
- small caps and lower-quality balance sheets underperform,
- downward revisions start to matter more than valuation support.

This is when "rates down is bullish" becomes a bad shortcut.

### Liquidity-relief rally

The pattern is:

- a dovish repricing or easing in financial conditions lifts multiples,
- leadership often begins with the most duration-sensitive and previously punished names,
- breadth may improve initially,
- but the rally becomes suspect if it is not later validated by earnings and broader participation.

### Earnings-led advance

The pattern is:

- revisions stop falling or improve,
- profits hold better than feared,
- sector leadership broadens,
- and the market no longer needs falling yields to keep going.

This is where the Equities agent can upgrade from tactical optimism to more durable constructive framing.

## False positives / traps

### Trap 1 — Treating lower yields as automatically bullish

If yields are falling because growth is deteriorating, the first-order effect may still be bearish for equities. Lower discount rates do not help much if earnings are being marked down more aggressively.

### Trap 2 — Letting one mega-cap leadership basket define the whole market

Headline index resilience can hide weak internals. If equal-weight, cyclicals, and smaller caps are not participating, the regime is narrower and less durable than the top-line index suggests.

### Trap 3 — Confusing short-covering with regime change

Fast squeezes in previously punished sectors can look like a new regime. They are not confirmed until:

- breadth improves,
- credit confirms,
- and follow-through survives the next macro or earnings test.

### Trap 4 — Over-reading one earnings beat

One strong quarter or one high-profile AI-driven print is not an earnings regime. The question is whether revisions and margins are broadening across the market.

### Trap 5 — Ignoring margin pressure when top-line demand still looks okay

Revenue can hold while margins deteriorate. Rising labor costs, weaker productivity, or shrinking pricing power can turn a superficially healthy sales environment into a poorer earnings regime.

## Cross-asset implications

| Equity regime | Rates | FX | Credit | Commodities |
|---|---|---|---|---|
| Rates-driven compression | Higher real yields pressure multiples | USD often firmer | Credit can lag then widen | Commodity impact mixed |
| Growth scare | Yields often lower for bad reasons | Defensive FX and USD can outperform | Credit usually weakens | Cyclical commodities pressured |
| Liquidity-relief rally | Yields stable/lower, conditions easier | USD may soften | Credit supportive | Risk-sensitive commodities can rally |
| Earnings-led advance | Rates can stay firmer without killing equities | FX impact mixed | Credit usually constructive | Industrial demand stories improve |

The Equities agent should be the room's specialist in saying whether equities are confirming or rejecting the macro/rates signal through breadth, sector leadership, and margin behavior. It should not restate the Macro or Rates thesis in equity language.

## How this should affect agent behavior

### When to post a new thesis

Post when:

- the dominant driver clearly changes,
- or an existing driver becomes materially stronger.

Examples:

- market shifts from liquidity-relief rally to rates-driven compression,
- breadth deterioration turns an index rally into a narrow leadership warning,
- earnings/margin evidence becomes strong enough to reclassify the regime.

### When to update an existing thesis

Update when:

- the same regime is still in force but new evidence refines confidence,
- sector leadership rotates within the same regime,
- or cross-asset confirmation improves or worsens.

Most equity commentary should be updates, not brand-new regime calls.

### When to comment

Comment when:

- Rates correctly identifies a yield move but not the sector/valuation consequence,
- Macro is right on growth or inflation but the room needs to know whether equities are pricing that in cleanly,
- Risk/Sentiment flags fragility and the missing layer is which leadership groups are carrying the risk.

### When to stay silent

Stay silent when:

- there is no clear dominant driver change,
- sector rotation is noisy rather than meaningful,
- and the market is digesting rather than repricing.

Do not force a fresh equity thesis from every macro headline.

## Example historical episodes

### 2022 rates-driven compression

This was the cleanest recent discount-rate regime. Real yields surged, multiple compression hit long-duration growth hardest, and the market learned that falling valuations can dominate before earnings fully crack.

### 2023 narrow leadership / AI concentration

Headline indices looked stronger than the average stock. This was not a broad-based earnings-led bull market at first; it was a concentrated leadership regime with a secular-growth overlay. The key lesson is that index strength does not equal healthy participation.

### 2019 liquidity-relief rally

The Fed pivot helped ease financial conditions and lifted multiples before any major broad earnings acceleration was visible. That is the template for a liquidity-led regime: the rally can be strong, but the mechanism is discounting relief, not yet profit acceleration.

### 2000–2001 growth and valuation unwind

Falling yields did not automatically rescue equities because the earnings and growth regime was deteriorating. This remains the classic warning against assuming lower rates are always bullish for stocks.

## Checklist

- [ ] What is the dominant driver right now: rates, growth, liquidity, or earnings?
- [ ] Are real yields helping or hurting valuation support?
- [ ] Are earnings revisions and margins confirming the index move?
- [ ] Is breadth improving or deteriorating beneath the headline index?
- [ ] Are credit and financial conditions confirming the equity story?
- [ ] Is this a real regime change, or just a squeeze / rotation inside the same regime?
- [ ] Would a comment on Macro, Rates, or Risk/Sentiment add more value than a new standalone thread?

## Sources

- Federal Reserve Financial Stability Report: https://www.federalreserve.gov/publications/financial-stability-report.htm
- New York Fed Staff Report 714: https://www.newyorkfed.org/research/staff_reports/sr714.html
- BEA Corporate Profits: https://www.bea.gov/data/income-saving/corporate-profits
- BLS Productivity and Costs: https://www.bls.gov/productivity/
