---
agent: Risk/Sentiment
doc_type: event-playbook
priority: high
topics:
  - volatility regime
  - fragility activation
  - VIX term structure
  - VVIX
  - vol spike anatomy
  - gamma and hedging flows
  - complacency
  - de-risking cascade
  - vol recovery path
  - short-vol crowding
instruments:
  - VIX
  - VIX9D
  - VIX3M
  - VVIX
  - S&P 500
  - high-yield spreads
  - Treasury term premium
market_regimes:
  - complacency regime
  - normal vol regime
  - active stress regime
  - crisis vol regime
  - post-spike normalization
trigger_patterns:
  - VIX rises above 25 from below
  - VIX rises above 35 regardless of starting level
  - VIX9D inverts above VIX and VIX3M
  - VVIX spikes before or alongside a vol breakout
  - VIX falls from above 30 back through 20
use_when:
  - sudden equity selloffs
  - vol spikes from low base
  - term structure inversion
  - repeated gap-down sessions
  - questions about whether fear is active or fading
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-10
source_urls:
  - https://www.cboe.com/tradable_products/vix/
  - https://www.federalreserve.gov/publications/financial-stability-report.htm
  - https://www.imf.org/en/Publications/GFSR
  - https://www.newyorkfed.org/research/data_indicators/term_premia
  - https://www.bis.org/publ/qtrpdf/
---

# Volatility Regime and Fragility Playbook

## Why this matters

The Batch 1 positioning framework tells the Risk/Sentiment agent when the tape is crowded or fragile. This playbook tells the agent when fragility has actually **activated** through volatility.

The mistake to avoid is treating every VIX move the same. A move to 25 from 12 is a regime change. A move to 25 from 22 is often just an extension of stress already in the market. Starting base matters as much as absolute level.

This document is the operating guide for deciding when volatility is:

- background noise,
- a tradable warning,
- an active stress regime,
- or a fading shock that should be updated rather than escalated.

## Core mechanism

Volatility is not just fear. It is the price of hedging plus the feedback effects created when investors and dealers adjust risk into a falling market.

### Four volatility regimes

| Regime | VIX zone | What it means |
|---|---|---|
| Complacency | <15 | market assumes catalysts will stay contained |
| Normal | 15-25 | ordinary uncertainty, no systemic stress by itself |
| Active stress | >25 | hedging demand and fragility are now affecting price action |
| Crisis | >35 | positioning is no longer orderly; de-risking dominates |

The signal is strongest when the market moves **between** regimes quickly.

### Vol spike anatomy

The standard sequence is:

1. a catalyst hits,
2. spot falls,
3. implied vol rises,
4. hedging flows amplify the move,
5. correlations rise,
6. forced de-risking becomes more likely.

That is why vol spikes are rarely just "investors got scared." They are often mechanical as well as narrative-driven.

### Why term structure matters

VIX alone is incomplete. The shape of vol tells you what kind of risk the market is pricing.

| Structure | Interpretation |
|---|---|
| VIX9D < VIX < VIX3M | calm market with no near-term shock pricing |
| VIX9D > VIX | near-term event fear is dominant |
| VIX9D > VIX > VIX3M | acute near-term stress, usually thesis-grade |

An inversion is often more informative than the headline VIX level because it says the market sees immediate stress, not just general uncertainty.

### Why VVIX matters

VVIX is the market's price of volatility-of-volatility. A rising VVIX with only a modest VIX move often signals the next stress regime is incubating. If VVIX leads and VIX follows, the agent should treat that as early fragility activation, not noise.

## What to watch

1. **VIX level and starting base**
   - VIX above 25 from a sub-15 base is a stronger regime break than VIX at 25 after several stressed sessions.

2. **VIX term structure**
   - Watch whether VIX9D lifts above VIX and VIX3M.
   - A full inversion is the cleanest "near-term shock" signal.

3. **VVIX**
   - Rising VVIX ahead of or alongside VIX is a warning that hedging demand is becoming more unstable.

4. **Credit confirmation**
   - A vol spike with widening HY spreads is much more serious than a vol spike without credit confirmation.

5. **Rates cross-check**
   - Sharp rate-vol or term-premium moves often precede equity-vol regime change.

### Useful operating thresholds

| Signal | Threshold | Interpretation |
|---|---|---|
| VIX breakout | crosses 25 from below | post fragility thesis if positioning is also crowded |
| VIX crisis signal | crosses 35 | immediate post regardless of other conditions |
| VIX starting-base shock | +8 or more from sub-15 base | structural break, not routine wobble |
| Term-structure inversion | VIX9D > VIX > VIX3M | market pricing near-term shock |
| Stress exit | VIX falls from 30+ back through 20 | update: stress regime exiting, not fully resolved |

## Typical market path

### Complacency break

The sequence is:

- VIX suppressed,
- market leadership narrow or crowded,
- modest catalyst lands,
- VIX jumps sharply from low base,
- breadth worsens quickly.

This is often the highest-value Risk/Sentiment post because the market was not positioned for the move.

### Active stress regime

The sequence is:

- VIX above 25,
- term structure flattens or inverts,
- credit widens,
- gap behavior worsens,
- market starts trading flow and hedging pressure, not just fundamentals.

This is not the time for soft language. The agent should say stress is active.

### Crisis regime

The sequence is:

- VIX above 35,
- forced selling or liquidation dynamics,
- violent cross-asset correlation,
- high headline noise but also high mechanical flow impact.

At this point the agent should post immediately, not wait for additional confirmation.

### Recovery phase

The sequence is:

- VIX stops rising,
- then falls,
- but breadth, credit, and leadership determine whether the recovery is real.

Falling vol is constructive only if other confirmation improves. Falling VIX alone is not a full all-clear.

## False positives / traps

### Trap 1 — Treating VIX 25 as one thing

It is not. VIX 25 from 12 is a shock. VIX 25 from 22 is often just ordinary stress extension. Starting point changes the interpretation.

### Trap 2 — Assuming a lower VIX means the problem is over

VIX can fall before breadth, credit, or positioning truly repair. Lower vol can mean forced hedges are coming off, not that fragility is gone.

### Trap 3 — Treating high VIX as automatically bearish

High VIX that is rolling lower is historically one of the most constructive tactical setups. The agent should distinguish **high and rising** from **high and falling**.

### Trap 4 — Ignoring vol term structure

A moderate headline VIX can still hide acute near-term stress if VIX9D is above VIX and VIX3M. That inversion is often the more important signal.

### Trap 5 — Calling every vol spike systemic

Some spikes are event-specific hedging and reverse quickly. It becomes systemic only if credit, breadth, and follow-through confirm.

## Cross-asset implications

| Vol regime | Rates | FX | Equities | Commodities |
|---|---|---|---|---|
| Complacency | rates moves absorbed | carry-friendly FX | narrow leadership can persist | cyclical commodities supported |
| Active stress | rate moves hit tape harder | USD / funding FX strengthen | breadth weakens fast | commodity beta gets sold |
| Crisis | correlations rise sharply | funding currencies dominate | forced selling / deleveraging | even strong physical stories get liquidated |
| Recovery | rates vol matters for durability | USD may give back stress gains | breadth must improve to trust rally | commodities recover if risk and growth stabilize |

The Risk/Sentiment agent should own the question: **is volatility only higher, or has volatility changed the market regime?**

## How this should affect agent behavior

### When to post a new thesis

Post when:

- VIX crosses 25 from below and positioning is already crowded,
- term structure inverts,
- or VVIX and credit confirm a real shock regime.

### When to post immediately

Post immediately when:

- VIX crosses 35,
- or the market gaps repeatedly while vol structure is inverted.

### When to update

Update when:

- VIX is still elevated but rolling lower,
- stress is leaving crisis mode,
- or the same fragility thesis remains valid but confirmation has improved or faded.

### When to comment

Comment when:

- VIX rises but stays inside the 15-25 zone,
- term structure is not inverted,
- and credit / breadth do not confirm regime change.

### When to stay silent

Stay silent when:

- a one-day vol pop fades immediately,
- no confirmation arrives from credit, breadth, or gap behavior,
- and the market remains in the normal regime.

## Example historical episodes

### February 2018 volmageddon

Low-vol complacency broke violently as inverse-vol positioning amplified the move. The lesson: crowded short-vol regimes can break far harder than the initial catalyst suggests.

### March 2020 COVID crash

VIX moved into crisis territory and cross-asset correlations surged. The lesson: once crisis vol is active, forced de-risking dominates narrative precision.

### 2022 rate-vol stress

Persistent rates volatility helped keep equity vol structurally elevated. The lesson: equity fragility can be driven by rates/term-premium instability even without one discrete crisis headline.

## Checklist

- [ ] What VIX regime is the market in right now?
- [ ] Did VIX cross 25 or 35 from below?
- [ ] What was the starting base before the move?
- [ ] Is VIX9D above VIX and VIX3M?
- [ ] Is VVIX confirming stress acceleration?
- [ ] Are credit and breadth confirming the vol move?
- [ ] Is this an active stress regime or just a one-day hedge event?
- [ ] Is vol high and rising, or high and falling?
- [ ] Should this be a new thesis, update, comment, or silence?

## Sources

- CBOE VIX methodology and term-structure references
- Federal Reserve Financial Stability Report
- IMF Global Financial Stability Report
- New York Fed term premium data and stress context
- BIS Quarterly Review
