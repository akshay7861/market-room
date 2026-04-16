---
agent: Risk/Sentiment
doc_type: foundation
priority: high
topics:
  - risk-on regime
  - risk-off regime
  - cross-asset transmission
  - credit spreads
  - safe-haven FX
  - correlation breakdown
  - regime identification
  - fractured signals
  - volatility confirmation
  - EM stress
instruments:
  - S&P 500
  - VIX
  - high-yield spreads
  - DXY
  - USDJPY
  - gold
  - EM FX
  - NY Fed term premium
market_regimes:
  - healthy risk-on
  - temporary risk-off shock
  - broad risk-off regime
  - fractured cross-asset regime
  - recovery / risk-on resumption
trigger_patterns:
  - at least three classic risk-off signals fire together
  - HY spreads widen while equities remain superficially stable
  - JPY and CHF rally with EM FX weakness
  - gold and USD move in atypical combination
  - SPX-VIX correlation weakens materially from its normal negative relationship
use_when:
  - any broad cross-asset reversal
  - sharp vol sessions
  - credit-led stress days
  - sessions where classic safe-haven relationships break
  - recovery rallies after prior de-risking
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-10
source_urls:
  - https://www.imf.org/en/Publications/GFSR
  - https://www.federalreserve.gov/publications/financial-stability-report.htm
  - https://www.bis.org/statistics/rpfx22.htm
  - https://www.newyorkfed.org/research/data_indicators/term_premia
---

# Risk-On / Risk-Off Transmission Guide

## Why this matters

The Risk/Sentiment agent already has two strong tools:

- Batch 1 identifies when the tape is crowded and fragile.
- Batch 2 identifies when volatility has actually changed regime.

This guide gives the missing transmission map. It answers a different question:

**If the market is moving into or out of risk-off, which assets should confirm it first, which should lag, and when is the pattern broken enough to justify a dislocation thesis instead of a standard regime call?**

The agent should not call every red session "risk-off." It should identify whether the move is:

- a local equity wobble,
- a proper cross-asset de-risking sequence,
- or a fractured regime where the usual correlations are breaking.

## Core mechanism

Risk-on and risk-off are not moods. They are cross-asset configurations driven by changes in risk tolerance, liquidity preference, and funding conditions.

### Canonical risk-on

In a clean risk-on regime:

- equities rise,
- high-yield spreads tighten,
- EM FX and beta-sensitive crosses improve,
- JPY and CHF soften,
- VIX stays suppressed or trends lower,
- gold is often quiet unless real yields are falling sharply.

The mechanism is simple: investors prefer growth-sensitive and carry-sensitive exposures when liquidity is available, volatility is manageable, and credit is not warning of hidden stress.

### Canonical risk-off

In a clean risk-off regime:

- equities fall,
- HY spreads widen,
- EM FX weakens,
- JPY and CHF strengthen,
- VIX rises,
- gold often benefits if the shock is growth/fear-led rather than dollar-scarcity-led.

The sequence matters. Risk-off usually starts with **credit and funding sensitivity**, not with an index headline. A proper transmission chain often looks like this:

1. credit spreads stop confirming,
2. EM FX or high-beta FX weakens,
3. equities lose breadth,
4. volatility rises,
5. safe-haven demand becomes broad.

### Fractured transmission

The highest-value calls come when the pattern breaks. Examples:

- equities down, VIX up, but gold down too,
- equities down but USD weak instead of strong,
- JPY rallying because of BOJ repricing rather than global risk aversion,
- credit calm while equities wobble on single-sector noise.

Those are not "exceptions" to ignore. They are the point. A fractured regime often tells the room that the market is not trading generic fear. It is trading a more specific mechanism such as:

- dollar funding demand,
- domestic rates shock,
- commodity supply shock,
- or local policy repricing.

### Regime-identification hierarchy

The Risk/Sentiment agent should diagnose cross-asset moves in this order:

1. **Credit**
2. **FX safe-haven and EM confirmation**
3. **Volatility structure**
4. **Rates / term-premium interpretation**
5. **Gold and commodity response**

That ordering prevents the common error of turning one SPX down day into a full regime call before cross-asset confirmation exists.

## What to watch

1. **High-yield spreads**
   - A widening of less than `25 bps` in one session is usually comment-level.
   - Larger moves with equity weakness are real confirmation.

2. **EM FX and high-beta FX**
   - EM FX often breaks before developed-market equities fully price the shift.
   - If EM FX is stable, the equity move may still be local rather than systemic.

3. **JPY / CHF behavior**
   - Useful confirmation only if domestic policy is not the main driver.
   - JPY strength during BOJ repricing must be treated carefully.

4. **VIX and term structure**
   - Risk-off is stronger when vol rises with follow-through and term structure stress.
   - One VIX pop without credit confirmation is not enough.

5. **Gold**
   - Gold up can confirm classic fear or easing expectations.
   - Gold down during equity stress often implies real-yield pressure or dollar funding demand.

6. **SPX-VIX correlation**
   - Below `-0.75` on a 90-day basis: normal regime intact.
   - Above `-0.50`: unusual correlation structure, possible cross-asset fracture.

7. **Term premium**
   - A sharp term-premium rise can be the upstream cause of the "risk-off" move rather than a downstream consequence. That matters for classification.

### Operating thresholds

| Signal | Threshold | Interpretation |
|---|---|---|
| Canonical risk-off count | `3 of 5` major signals aligned | post: risk-off regime |
| HY spread widening | `<25 bps` in one session | comment, not regime call by itself |
| SPX-VIX 90d correlation | above `-0.50` | correlation breakdown / fractured regime |
| VIX level | rising through `20` with credit confirmation | transition from noise toward real de-risking |
| Risk-on repair | equities up + credit tighter + EM FX stabilizing | update: risk-off episode easing |

## Typical market path

### Temporary risk-off shock

The sequence is shallow:

- equities sell off,
- VIX rises,
- but credit only moves modestly,
- EM FX holds in,
- and safe-haven demand is incomplete.

That is usually a **comment** or **update**, not a new regime post.

### Broad risk-off regime

The real regime sequence is more durable:

- HY spreads widen first or alongside equities,
- EM FX weakens,
- JPY / CHF strengthen,
- vol stays firm instead of fading intraday,
- leadership narrows and beta underperforms.

That is when the agent should post a full risk-off thesis.

### Fractured risk-off

This is the highest-value setup:

- equities and vol say risk-off,
- but one of the safe-haven or inflation assets behaves "wrong,"
- correlations stop following the classic map.

Examples:

- gold down with equity stress,
- USD weak during equity weakness,
- rates selling off at the same time as equities.

This often deserves a post even before a full risk-off regime is confirmed because the fracture reveals the true driver.

### Risk-on resumption

The recovery sequence usually starts with:

- credit stabilizing,
- EM FX and beta FX stopping their deterioration,
- vol easing,
- then equities broadening.

The right update usually comes before the headline index fully recovers.

## False positives / traps

### Trap 1 — Treating gold up as automatic risk-off confirmation

Gold can rise in a reflationary or easing-driven environment. If real yields are falling and equities are stable, gold strength is not enough to label the session defensive.

### Trap 2 — Treating JPY strength as pure fear signal

JPY can rally on BOJ repricing or domestic yield normalization. If that is the dominant cause, do not overstate global risk aversion.

### Trap 3 — Calling regime change on one equity down day

Without credit confirmation, FX confirmation, or vol follow-through, many equity selloffs are still local or technical. The agent should say that directly.

### Trap 4 — Ignoring fractured correlations

Gold down plus VIX up is not noise. It often means the market is demanding dollars or repricing real yields. The task is to name the fracture, not smooth it away.

### Trap 5 — Confusing lower yields with immediate risk-on repair

Yields can fall because growth expectations are breaking. Risk-on repair requires credit and FX stabilization, not just lower Treasury yields.

## Cross-asset implications

| Regime | Rates | FX | Credit | Commodities |
|---|---|---|---|---|
| Healthy risk-on | rates stable or rising for good growth reasons | EM FX and beta FX stronger | spreads tighter | cyclical commodities constructive |
| Broad risk-off | yields often lower, unless inflation or term premium is shock source | JPY/CHF/USD defensive, EM FX weaker | spreads wider | cyclicals softer |
| Fractured regime | rates signal can conflict with equities | safe-haven map is distorted | credit often tells truth first | gold/oil split reveals driver |
| Risk-on repair | rates stabilize, then rise for better reasons later | EM FX stabilizes before full equity repair | spreads tighten first | commodity demand story can recover late |

The division of labor should stay clean:

- Risk/Sentiment names the cross-asset configuration.
- FX explains whether the defensive move is standard risk-off or dollar funding stress.
- Equities explains whether the equity tape is broadening, narrowing, or only headline-deep.

## How this should affect agent behavior

### When to post a new thesis

- At least `3 of 5` canonical risk-off signals fire together.
- Correlation fracture is obvious and likely to mislead the room if unnamed.
- Credit and FX are both confirming a regime move that equities have not fully absorbed yet.

### When to update an existing thesis

- Risk-off symptoms are fading because credit tightens and EM FX stabilizes.
- A prior crowding thesis is now transitioning into broader cross-asset stress.
- A fractured regime resolves back into canonical risk-on or risk-off.

### When to comment only

- One or two signals move without cross-asset confirmation.
- HY spreads widen less than `25 bps` in a single session.
- JPY or gold move for local reasons that do not yet change the whole regime call.

### When to stay silent

- The move is already well explained by a single-asset catalyst and no broader transmission exists.
- Volatility is noisy but credit, FX, and breadth remain orderly.

## Example historical episodes

### 2008 global financial crisis

The clean risk-off template: credit blew out, equities collapsed, safe-haven demand broadened, and funding stress reinforced every leg of the move. This is the reference case for aligned cross-asset de-risking.

### 2011 euro-area stress

Risk-off was not only about equities. Credit, sovereign stress, EUR weakness, and periodic dollar-demand episodes all mattered. Useful reminder that cross-asset stress often begins in funding and spreads before equities fully capitulate.

### March 2020 pandemic shock

Initially looked like classic risk-off, then became fractured when dollar shortage and forced liquidation distorted gold and rates behavior. This is the best modern reference for why the agent must name fractures explicitly.

### 2022 inflation / real-yield shock

Not every drawdown was classic risk-off. Equities and bonds sold off together because inflation and real yields were the driver. This is the right episode to remember when the classic defensive playbook does not map cleanly.

## Checklist

- Are at least `3 of 5` canonical risk-off signals aligned?
- Is credit confirming or contradicting the equity move?
- Are EM FX and beta FX behaving defensively?
- Is JPY/CHF behavior truly global-risk-driven or locally policy-driven?
- Is gold confirming fear, or contradicting it?
- Is SPX-VIX correlation still in a normal regime?
- Are lower yields helping because inflation is easing, or because growth is breaking?
- Is the correct call a standard risk-off regime, a fractured regime, or just a temporary shock?

## Sources

- IMF Global Financial Stability Report: institutional framework for global risk appetite and cross-asset vulnerability.
- Federal Reserve Financial Stability Report: systemic interpretation of credit, valuation, funding, and volatility interactions.
- BIS Triennial FX Survey: structural backdrop for safe-haven FX and EM flow behavior in stress.
- NY Fed ACM Term Premium: rates signal needed to distinguish growth/fear risk-off from inflation or term-premium shock.
