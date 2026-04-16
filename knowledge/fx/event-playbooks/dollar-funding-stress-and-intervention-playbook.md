---
agent: FX
doc_type: event-playbook
priority: high
topics:
  - dollar funding stress
  - cross-currency basis
  - central bank swap lines
  - intervention credibility
  - safe-haven USD demand
  - offshore dollar shortage
  - EM reserve defense
  - basis normalization
  - quarter-end stress
  - liquidity crisis
instruments:
  - DXY
  - EURUSD
  - USDJPY
  - EUR/USD cross-currency basis
  - USD/JPY cross-currency basis
  - EFFR
  - Fed swap lines
  - EM FX reserves
market_regimes:
  - stable funding regime
  - quarter-end technical stress
  - offshore dollar shortage
  - central bank intervention regime
  - systemic liquidity crisis
trigger_patterns:
  - EUR/USD basis trades below -30 bps outside quarter-end
  - USD/JPY basis moves below -100 bps
  - EFFR trades above IOER or other administered-rate anchors
  - Fed announces or expands central bank swap line usage
  - EM central bank sells reserves aggressively to defend FX
use_when:
  - broad USD rallies that exceed rate-differential justification
  - quarter-end or balance-sheet stress windows
  - EM FX disorderly selloffs
  - central bank intervention headlines
  - any session where cross-currency basis becomes part of the market narrative
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-10
source_urls:
  - https://www.newyorkfed.org/markets/international-market-operations/central-bank-liquidity-swaps
  - https://www.federalreserve.gov/releases/h41/
  - https://www.bis.org/statistics/gli.htm
  - https://www.imf.org/en/Publications/GFSR
  - https://www.newyorkfed.org/markets/reference-rates/effr
---

# Dollar Funding Stress and Intervention Playbook

## Why this matters

The FX agent already has two active tools:

- Batch 1 explains when spot should follow carry and rate differentials.
- Batch 2 explains when central-bank divergence should create a fresh FX trade.

This playbook exists for the situations where both of those mechanisms stop being enough. In dollar funding stress, the market stops asking which currency offers the better macro story and starts asking who needs dollars immediately, who can obtain them, and whether official intervention can slow the disorder.

The core operating mistake is to label every sharp USD rally as "hawkish Fed" or "safe-haven demand." A large subset of violent dollar moves is actually a funding event. If the FX agent misses that distinction, it will post the wrong thesis at exactly the moment the room needs a stress diagnosis.

## Core mechanism

Dollar funding stress begins when the global demand for immediate dollar liquidity rises faster than the market's ability or willingness to provide it. That usually appears in three layers:

1. domestic funding stress,
2. offshore funding stress,
3. policy intervention.

### 1. Domestic funding stress

The earliest sign can be in US money markets rather than spot FX. If overnight dollar funding trades rich to policy anchors, balance sheets are tightening before the FX market fully admits it. That is why EFFR behavior matters:

- EFFR printing persistently above administered anchors suggests balance-sheet scarcity,
- secured and unsecured funding become less interchangeable,
- banks become less willing to intermediate marginal dollar demand.

That is not yet a currency thesis by itself, but it is the first condition for one.

### 2. Offshore funding stress

The FX translation of dollar scarcity shows up in the cross-currency basis. When non-US institutions need dollars and cannot obtain them cleanly in cash markets, they pay up through the swap market. The more negative the basis becomes, the more expensive it is to transform local funding into dollars.

This is the key hierarchy:

- **basis stable**: rate differentials and divergence remain the correct FX lens,
- **basis modestly negative near quarter-end**: likely balance-sheet technicals,
- **basis breaks through stress thresholds outside quarter-end**: funding stress is becoming the dominant mechanism,
- **basis collapses and official facilities are activated**: the market is in crisis-management mode.

In this regime, spot can move harder than policy differentials justify because the marginal buyer is not expressing a macro view. The marginal buyer needs dollars.

### 3. Policy intervention

Once funding stress is live, the policy question changes from "who is more hawkish?" to "who can restore dollar liquidity credibly?" There are two broad intervention channels:

- **Fed / central-bank swap lines**
- **local currency defense by reserve sales, derivatives intervention, or emergency rate hikes**

Swap lines matter because they attack the shortage directly. They are not symbolic. They increase the supply of dollars to foreign central banks, which can then relay dollars to domestic institutions. That tends to compress basis and reduce panic in USD funding markets.

Reserve defense is different. A central bank can slow spot disorder for a time, but if reserves are thin, the current account is weak, or domestic rates are already restrictive, the market will fade intervention quickly. The FX agent should judge the credibility of intervention, not merely acknowledge that it occurred.

### Decision hierarchy

When USD is surging, think in this order:

1. **Is there evidence of dollar scarcity or just normal safe-haven demand?**
2. **Is the basis move technical, cyclical, or crisis-grade?**
3. **Is the intervention addressing the shortage itself or just defending spot?**
4. **Has basis begun to normalize after intervention, or is spot merely pausing?**

## What to watch

1. **EUR/USD cross-currency basis**
   - Below `-15 bps` near quarter-end can be technical.
   - Below `-30 bps` outside quarter-end is real stress.
   - Beyond `-60 bps` is acute funding stress.

2. **USD/JPY basis**
   - JPY funding markets can signal broader system stress early.
   - Around `-100 bps` is systemic, not routine.

3. **EFFR relative to administered policy anchors**
   - Repeated rich prints suggest domestic dollar tightness is rising before it is obvious in spot.

4. **Fed swap line announcements and H.4.1 usage**
   - Announcement alone is meaningful.
   - Actual drawings are stronger confirmation that the market moved from fear to utilization.

5. **Spot behavior versus the basis**
   - If DXY is surging and basis is worsening, the move is stress-led.
   - If DXY is surging but basis is calm, the move is more likely divergence or risk aversion.

6. **Intervention scale and reserve context**
   - A one-off official headline without credible reserves, domestic follow-through, or basis stabilization is usually cosmetic.

### Operating thresholds

| Signal | Threshold | Interpretation |
|---|---|---|
| EUR/USD basis | below `-30 bps` outside quarter-end | post: offshore dollar stress |
| EUR/USD basis | below `-60 bps` | post immediately: acute funding crisis |
| USD/JPY basis | below `-100 bps` | systemic stress condition |
| EFFR behavior | persistent rich prints to policy anchors | domestic stress building |
| Fed swap lines | new facility, widened terms, or material drawings | policy response has become part of thesis |
| EM reserve defense | >`$3bn` single-session defense or repeated interventions | intervention credibility must be judged explicitly |

## Typical market path

### Quarter-end technical stress

This is the false-alarm template:

- basis widens modestly,
- dealers protect balance sheet,
- spot may overreact briefly,
- quarter-end passes,
- basis normalizes without large policy action.

That is usually a **comment**, not a fresh crisis thesis.

### Funding squeeze without policy response yet

The more serious path looks like:

- domestic funding frictions rise,
- basis widens outside normal windows,
- USD rallies broadly, especially against funding-dependent currencies,
- high-beta FX underperforms even if local stories are not deteriorating,
- the market starts talking about swap lines or official liquidity.

That is usually a **new thesis** regime because the mechanism has changed.

### Policy intervention and stabilization

Once swap lines or credible local intervention appear:

- spot may stop panicking immediately,
- basis improvement matters more than spot bounce,
- a partial reversal can occur before the macro narrative changes,
- the true confirmation is basis compression plus reduced urgency in funding indicators.

The FX agent should update only after the shortage is easing, not because spot pauses for one session.

### Failed defense

The classic failed-defense path is:

- EM central bank sells reserves or signals support,
- spot initially stabilizes,
- reserves prove inadequate or policy is not credible,
- basis/funding conditions remain poor,
- spot resumes the disorderly move.

That is not "market irrationality." It is the market concluding that intervention addressed symptoms, not access to dollars.

## False positives / traps

### Trap 1 — Treating quarter-end basis widening as crisis by default

Quarter-end and year-end basis stress can be mechanical. Balance-sheet windows matter. A move below `-15 bps` during those periods is not enough for a new crisis post unless it persists beyond the window or spreads across currencies.

### Trap 2 — Confusing safe-haven USD demand with funding stress

A risk-off dollar rally can happen with basis still orderly. In that case, the market is paying for safety, not scrambling for funding. The basis is the tie-breaker.

### Trap 3 — Treating intervention headlines as credibility

Intervention is only credible if one of these improves:

- spot disorder slows for more than one session,
- basis stabilizes,
- reserve usage is large enough to matter,
- the central bank's policy stance aligns with defense.

Without that, intervention is narrative, not mechanism.

### Trap 4 — Missing the difference between swap lines and reserve sales

Swap lines supply dollars into the system. Reserve sales recycle a country's own dollar buffer. The first can stabilize the plumbing. The second can merely postpone repricing.

### Trap 5 — Assuming a stronger USD always validates the Fed-divergence thesis

If EUR/USD, AUD/USD, EM FX, and funding-sensitive crosses are all breaking at once while basis deteriorates, the correct read is often that carry and divergence have been superseded by dollar shortage.

## Cross-asset implications

| Funding regime | Rates | Risk assets | Credit | Commodities |
|---|---|---|---|---|
| Technical basis widening | front-end calm | limited effect | little spillover | little spillover |
| Offshore funding stress | short-end stress, flight to liquidity | equities fragile, especially beta | spreads widen | cyclical commodities can weaken on deleveraging |
| Swap-line stabilization | front-end stress eases | relief bounce possible | spreads stop widening first | commodity reaction usually lags FX |
| Failed EM defense | local rates and sovereign risk rise | EM risk assets underperform | external spreads wider | commodity exporters can still see FX disorder |

The room-level division of labor should be explicit:

- FX diagnoses whether the move is divergence, stress, or intervention failure.
- Risk/Sentiment should translate that into fragility and de-grossing risk.
- Macro can comment on policy plumbing, but not replace the FX mechanism call.

## How this should affect agent behavior

### When to post a new thesis

- EUR/USD basis trades below `-30 bps` outside quarter-end.
- USD/JPY basis approaches or breaks `-100 bps`.
- Fed activates or materially expands swap-line support.
- EM central bank launches aggressive reserve defense and credibility is now the central question.
- DXY is rallying in excess of what carry/divergence alone can explain and basis confirms stress.

### When to update an existing thesis

- Basis starts compressing after policy action.
- Spot stabilizes and the market transitions from panic to policy containment.
- An existing divergence thesis is being overridden by a new funding signal.

### When to comment only

- Quarter-end technical widening below crisis thresholds.
- Official intervention chatter without action or credible scale.
- One-session spot overshoots that are not confirmed by basis or funding data.

### When to stay silent

- USD is stronger, but basis is calm and the move is already explained by active carry or central-bank divergence logic.
- Intervention headlines add no new information and repeat already-priced policy support.

## Example historical episodes

### 2008 global dollar shortage

The dollar rally was not fundamentally about superior US growth. It was about a global scramble for dollar funding as private intermediation failed. Swap lines became decisive because they addressed the shortage directly rather than defending spot in one currency at a time.

### September 2019 repo stress

This was not a classic global FX panic, but it is a useful domestic precursor template. Funding pressure appeared in money markets first, reminding the agent that dollar stress can begin in plumbing before it becomes obvious in spot FX.

### March 2020 pandemic dollar squeeze

USD surged broadly, basis collapsed, and funding conditions overtook ordinary macro narratives. The turning point was not a better growth outlook; it was policy liquidity. This is the reference case for acute stress overwhelming normal carry logic.

### 2022 JPY intervention episodes

USDJPY's macro direction still reflected rate differentials, but intervention risk changed the tradeability of the view. The lesson is not that intervention defeats macro. It is that intervention changes path, volatility, and position sizing even when the macro direction remains intact.

## Checklist

- Is the basis move outside quarter-end or year-end technical windows?
- Is EUR/USD basis below `-30 bps` or only modestly negative?
- Is USD/JPY basis signaling broader system stress?
- Is EFFR behavior suggesting domestic dollar tightness too?
- Is DXY moving more than carry/divergence alone can explain?
- Has the Fed activated or expanded swap lines?
- Is intervention supplying dollars, or just defending spot?
- Is basis compressing after intervention, or only price action pausing?
- Is the correct call a funding-stress post, an intervention-credibility update, or only a technical comment?

## Sources

- NY Fed — Central Bank Liquidity Swap Operations: official operating framework for swap-line intervention and usage.
- Federal Reserve H.4.1: weekly confirmation of swap-line drawings and crisis-era liquidity activity.
- BIS Global Liquidity Indicators: structural context for offshore dollar dependence and the global credit backdrop.
- IMF Global Financial Stability Report: historical stress episodes, false-signal patterns, and intervention effectiveness.
- NY Fed EFFR reference page: first-line domestic funding signal when balance-sheet scarcity starts to matter.
