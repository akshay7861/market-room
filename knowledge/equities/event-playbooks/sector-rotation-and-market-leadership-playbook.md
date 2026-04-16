---
agent: Equities
doc_type: event-playbook
priority: high
topics:
  - sector rotation
  - market leadership
  - breadth quality
  - growth versus value
  - cyclical versus defensive
  - rate-sensitive sectors
  - late-cycle leadership
  - equal-weight confirmation
  - leadership deterioration
  - rotation durability
instruments:
  - S&P 500
  - equal-weight S&P 500
  - XLK
  - XLF
  - XLI
  - XLE
  - XLU
  - XLP
  - IWM
market_regimes:
  - broadening risk-on
  - narrow leadership
  - cyclical rotation
  - defensive rotation
  - rates-overriding-cycle regime
trigger_patterns:
  - 3 or more weeks of relative-performance shift across major sectors
  - equal-weight fails to confirm cap-weight highs
  - defensive sectors outperform while headline index stays firm
  - growth outperforms only because yields are falling
  - financials or cyclicals confirm a broader expansion signal
use_when:
  - after major macro or Fed repricing
  - during earnings season
  - when leadership narrows to one cohort
  - when sector ETFs are diverging from the index
  - when asked whether the rally is broad or fragile
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-10
source_urls:
  - https://www.federalreserve.gov/publications/financial-stability-report.htm
  - https://www.bea.gov/data/income-saving/corporate-profits
  - https://www.bls.gov/productivity/
  - https://www.imf.org/en/Publications/WEO
  - https://www.bis.org/publ/qtrpdf/
---

# Sector Rotation and Market Leadership Playbook

## Why this matters

The Batch 1 regime framework tells the Equities agent what is driving the tape. This playbook tells the agent how that regime should appear through sector behavior and leadership quality.

The recurring error is to talk about the S&P 500 as if it were one asset. It is not. A rally led by Financials, Industrials, and equal-weight is different from a rally held together by a few mega-cap growth names. A defensive rotation under a flat index is different from genuine resilience.

This playbook answers one practical question: **is the market broadening, narrowing, or rotating defensively beneath the headline index?**

## Core mechanism

Sector rotation is the implementation layer of the equity regime framework. Once the dominant driver is identified, leadership should either confirm it or warn that the headline index is masking deterioration.

### Canonical rotation map

| Market state | Typical leadership | What it implies |
|---|---|---|
| Early / broadening risk-on | Financials, Industrials, Consumer Discretionary, small caps | growth improving and risk appetite broadening |
| Mid-cycle durable advance | Technology, Communications, quality cyclicals | growth intact, discount-rate pressure manageable |
| Late-cycle / inflationary pressure | Energy, Materials, selective defensives | nominal growth holding but quality deteriorating |
| Defensive rotation | Utilities, Staples, Healthcare | market preparing for slowdown or stress |

This sequence is useful, but it is not absolute. Rates can override it.

### Rates override

When real yields rise sharply:

- Utilities and REIT-like duration proxies can underperform regardless of cycle story,
- high-multiple growth can compress even if top-line growth still looks fine,
- banks may outperform if the move reflects better nominal growth, but can fail if credit stress rises simultaneously.

That is why the Equities agent should not call every sector move a cycle signal. First ask: **is this cycle rotation, or is this a rate shock distorting the usual map?**

### Breadth as confirmation

Leadership quality is determined by participation:

- if equal-weight confirms cap-weight strength, the move is broadening,
- if only one sector or one mega-cap cohort is carrying the index, the move is fragile,
- if defensives lead while the index is flat to up, the tape is weaker than it looks.

## What to watch

1. **Equal-weight versus cap-weight**
   - Five or more sessions of equal-weight lag while cap-weight makes highs is a warning, not noise.

2. **Sector persistence**
   - One strong day is a comment.
   - Three or more weeks of relative outperformance is thesis-grade rotation.

3. **Cyclicals versus defensives**
   - Financials, Industrials, and Discretionary confirming together usually signal healthier risk appetite.
   - Utilities, Staples, and Healthcare leading while credit weakens usually signal deterioration.

4. **Rates-sensitive leadership**
   - If growth leadership only appears when yields drop, the move may be duration-driven rather than fundamentally broad.

5. **Credit confirmation**
   - Sector rotation is more trustworthy when HY spreads confirm.
   - Cyclical outperformance with wider spreads is suspect.

### Useful operating thresholds

| Signal | Threshold | Interpretation |
|---|---|---|
| Breadth warning | equal-weight lags cap-weight for 5+ sessions | rally quality deteriorating |
| Rotation confirmation | 3+ weeks of sustained relative shift with breadth or credit confirmation | thesis-grade sector rotation |
| Defensive warning | defensives lead while credit worsens | hidden tape weakness |
| Cyclical confirmation | financials / industrials / small caps improve together | broader expansion signal |
| Rates override | sector move follows sharp real-yield repricing | rate shock may dominate cycle signal |

## Typical market path

### Broadening rally

The sequence is:

- leadership expands beyond the incumbent winners,
- equal-weight improves,
- cyclicals participate,
- credit stays firm,
- the index needs fewer mega-cap rescues.

This is where the Equities agent can upgrade confidence in the regime.

### Narrow leadership

The sequence is:

- the same leaders keep working,
- equal-weight lags,
- defensives quietly stabilize or outperform,
- the index looks better than the average stock.

This should usually be an **update** first, but if it persists for weeks it becomes a thesis-grade fragility signal.

### Defensive rotation

The sequence is:

- Staples, Utilities, and Healthcare begin to outperform,
- cyclicals lose momentum,
- credit and small caps stop confirming,
- the headline index may remain deceptively stable.

This is usually not a crash call. It is a warning that market quality is deteriorating.

### Rates-driven style rotation

The sequence is:

- yields move sharply,
- long-duration growth or rate-sensitive defensives reprice,
- rotation looks dramatic but is mainly discount-rate mechanics,
- the move may mean-revert if rates stabilize.

This is where the Equities agent should connect the sector move back to the Batch 1 regime framework rather than overcalling a cycle change.

## False positives / traps

### Trap 1 — Treating one strong week as a regime shift

One week of defensive or cyclical outperformance is usually a comment. Use three or more weeks plus breadth or credit confirmation before making it thesis-grade.

### Trap 2 — Treating Energy leadership as automatically late cycle

Energy can lead because of supply shock, not because the business cycle is late. Check whether the commodity move is demand-driven or supply-driven before using it as a cycle signal.

### Trap 3 — Treating Technology leadership as automatic growth health

Tech can lead in liquidity relief and falling-yield regimes even while the broader economy deteriorates. Distinguish secular-duration leadership from broad earnings health.

### Trap 4 — Ignoring equal-weight

If the cap-weighted index is holding up but equal-weight is lagging, do not call the tape healthy. The average stock matters more than the headline index when judging breadth.

### Trap 5 — Ignoring credit when calling cyclical leadership

Cyclicals outperforming with HY spreads widening is a weak signal. If credit disagrees, treat the rotation cautiously.

## Cross-asset implications

| Rotation type | Rates | FX | Credit | Commodities |
|---|---|---|---|---|
| Broadening cyclical rotation | rates can stay firmer if growth is real | cyclical FX improves | credit constructive | industrial commodities supported |
| Narrow leadership | rates signal may not be confirmed by breadth | FX impact limited | credit often stops confirming | commodity beta can lag |
| Defensive rotation | yields often fall for worse reasons | defensive FX / USD stronger | credit weakens | cyclical commodities pressured |
| Rates-driven style move | front-end / real yields dominate | USD may strengthen on yields | credit mixed | commodity signal often secondary |

The Equities agent should own the question: **is sector behavior confirming the regime, or exposing weakness the headline index is hiding?**

## How this should affect agent behavior

### When to post a new thesis

Post when:

- sector rotation persists for 3 or more weeks,
- breadth and credit confirm,
- and the shift changes the interpretation of the market regime.

Examples:

- equal-weight and cyclicals start confirming a broader rally after a narrow tape,
- defensive sectors take leadership while the index stays superficially firm,
- banks / industrials / small caps improve together and confirm expansion.

### When to update

Update when:

- the same regime is still in force but leadership quality changes,
- breadth improves or worsens within the same macro regime,
- or a sector move refines but does not overturn the top-level tape view.

### When to comment

Comment when:

- rotation is only 1-2 weeks old,
- it lacks credit or breadth confirmation,
- or the move looks driven mainly by one rate shock.

### When to stay silent

Stay silent when:

- sector moves are short-lived and unconfirmed,
- leadership is mixed without persistence,
- and there is no clean change in breadth quality.

## Example historical episodes

### 2020 reopening broadening

Financials, cyclicals, and small caps took over from pure stay-at-home leadership as growth reopened. The lesson: broadening participation matters more than one sector headline.

### 2022 defensive and energy leadership

Defensives and energy outperformed while long-duration growth compressed under higher real yields. The lesson: rates and inflation can override the simple cycle map.

### 2023-2024 mega-cap narrow leadership

Headline indices stayed resilient while breadth was much weaker beneath the surface. The lesson: a strong index is not the same as a healthy tape.

## Checklist

- [ ] Is the market broadening or narrowing?
- [ ] Is equal-weight confirming cap-weight?
- [ ] Has the rotation persisted for 3 or more weeks?
- [ ] Are cyclicals or defensives leading?
- [ ] Is the move being driven by cycle logic or by rates repricing?
- [ ] Are HY spreads confirming the sector signal?
- [ ] Is one sector or one mega-cap cohort carrying the tape?
- [ ] Does this change the regime call, or only refine it?
- [ ] Should this be a new thesis, update, comment, or silence?

## Sources

- Federal Reserve Financial Stability Report
- BEA corporate profits
- BLS productivity and labor-cost data
- IMF World Economic Outlook
- BIS Quarterly Review
