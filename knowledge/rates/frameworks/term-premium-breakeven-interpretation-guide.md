---
agent: Rates
doc_type: framework
priority: high
topics:
  - term premium
  - ACM model
  - TIPS breakevens
  - real yields
  - inflation expectations
  - 5y5y forward
  - inflation risk premium
  - duration risk
  - fiscal supply
  - QE compression
instruments:
  - 10-year TIPS
  - 5-year TIPS
  - 5y5y inflation forward
  - nominal 10-year Treasury
  - OIS forwards
  - inflation swaps
market_regimes:
  - QE era (negative term premium)
  - post-QE normalisation
  - fiscal supply shock (term premium rising)
  - reflation (breakevens widening)
  - flight to quality (TIPS liquidity stress)
trigger_patterns:
  - ACM term premium rising >50 bps in 6 weeks
  - 10-year real yield crossing 0% in either direction
  - 5y5y breakeven above 2.5%
  - 5y5y breakeven above 2.7% for more than 10 trading days
  - TIPS breakeven collapsing during equity stress (liquidity signal)
  - nominal yield rising while real yield is flat (breakeven expansion only)
use_when:
  - Treasury auction week (especially 10y and 30y)
  - FOMC QT/QE decision
  - CPI prints (breakevens reprice)
  - fiscal deficit announcements or debt ceiling events
  - equity market stress events (TIPS liquidity check)
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-09
source_urls:
  - https://www.newyorkfed.org/research/data_indicators/term_premia
  - https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/textview.aspx?data=tips
  - https://www.clevelandfed.org/indicators-and-data/inflation-expectations
  - https://www.newyorkfed.org/research/data_indicators/inflation-compensation
---

# Term Premium and Breakeven Interpretation Guide

## Why this matters

The 10-year nominal yield is a single number that embeds multiple fundamentally different signals. Without decomposing it, a term premium shock gets misread as a growth story, and a TIPS liquidity squeeze becomes a false deflation call. The three-level decomposition — nominal into real + breakeven, breakeven into expected inflation + risk premium, and ACM term premium into the supply/uncertainty residual — is what converts a yield observation into a rates thesis.

## Core mechanism

**The nominal yield decomposition:**

10-year nominal yield = Expected average short rate over 10 years + Term premium

**The real yield and breakeven relationship:**

10-year nominal yield = 10-year TIPS real yield + 10-year TIPS breakeven inflation

**Combining both:**

10-year TIPS breakeven = Expected inflation + Inflation risk premium

The critical insight is that breakeven inflation is *not* simply what the market thinks CPI will average. It includes a risk premium for the *uncertainty* around that expectation. When the inflation risk premium expands (even if expected inflation is stable), breakevens widen. This is a hedge, not a forecast upgrade.

**What the ACM term premium measures:**
The Adrian-Crump-Moench (ACM) model, published by the NY Fed, extracts the term premium from a multi-factor term structure model that accounts for the expected rate path. The residual — what's left after accounting for where the market expects short rates to be — is the term premium. It reflects: fiscal supply pressure (more issuance = more duration absorbed = higher compensation required), inflation uncertainty, convexity demand, and the presence or absence of central bank price-insensitive buying (QE).

**The regime shift around zero real yield:**
The 10-year TIPS yield crossing zero in either direction is one of the most important thresholds in fixed income. Positive real yields = genuinely restrictive financial conditions regardless of the nominal level. Negative real yields = accommodative regardless of how high nominal yields look. The entire 2020–2021 period had deeply negative real yields (sometimes -1.5% or lower) even as nominal yields rose from 0.5% to 1.5%. Financial conditions were still stimulative. The key policy regime shift came when real yields crossed zero in mid-2022 — financial conditions became genuinely restrictive for the first time since 2018.

## What to watch

In priority order:

1. **ACM term premium (daily, from NY Fed)** — identify whether a yield move is expectations-driven or supply/risk-premium-driven. The interpretation completely changes.
2. **10-year TIPS real yield vs zero** — track which side of zero it's on. Crossing zero (up or down) is a thesis-grade event.
3. **5y5y inflation forward breakeven** — strips out short-term distortions. The cleanest read on medium-term inflation expectations. Above 2.5% = concern; 2.7%+ for 10+ days = post.
4. **Cleveland Fed inflation expectations model** — a more robust composite measure that combines TIPS, surveys, and forecast models. When Cleveland Fed diverges from raw TIPS breakevens, the TIPS move is likely liquidity or risk premium, not true expectation change.
5. **Nominal vs real yield divergence** — nominal rising with real flat = breakeven widening only (inflation fear); nominal rising with real rising proportionally = rate path expectation rising; nominal flat with real rising = deflation risk (breakeven compressing).
6. **Inflation risk premium component** — when this rises without expected inflation rising, it signals hedge demand for tail risk, not a base case inflation upgrade. Treat it as uncertainty, not conviction.

## Typical market path

**Term premium rising shock (fiscal/supply-driven):**
The long end sells off (bear steepener). Real yields rise alongside nominal yields. Breakevens remain stable or widen slightly (uncertainty, not necessarily inflation expectations rising). Credit spreads widen. Equities' long-duration names (growth stocks) compress multiples. Dollar strengthens as US real rates attract capital. Duration assets underperform broadly.

**Inflation expectations rising (demand-pull, sticky inflation):**
Breakevens widen (nominal rises faster than real). Real yields can be flat or slightly rising. The curve may bear flatten as the market prices a more hawkish Fed response. TIPS outperform nominal Treasuries (inflation protection in demand). Commodities supported. USD strengthens.

**TIPS liquidity stress (risk-off event):**
TIPS sell off faster than nominal Treasuries (investors sell the less liquid instrument into the quality flight). Real yields spike while nominal yields fall (because investors are buying nominals). Breakevens collapse — appearing to signal deflation, but actually signalling a TIPS liquidity crisis. This breakeven collapse is systematically misleading: after the stress clears, breakevens snap back.

**QE-era negative term premium:**
The Fed's balance sheet expansion creates an artificial price-insensitive buyer of duration. Term premium is suppressed to negative territory. Yield curve inversions occur at much lower economic "stress" thresholds because the curve has been mechanically compressed. In this regime, traditional inversion-based recession signals are unreliable (the curve inverts too easily).

## False positives / traps

**Trap 1 — TIPS breakeven collapse during risk-off = deflation signal**
The 2020 COVID crash is the textbook case. In March 2020, 5-year TIPS breakevens fell from 1.8% to 0.5% in two weeks. This was not a market call for 0.5% average CPI over 5 years. It was a TIPS liquidity crisis — investors couldn't find buyers for TIPS and sold them at any price. Nominal Treasuries rallied sharply (quality flight), TIPS sold off, and breakevens mechanically collapsed. Within 6 weeks, as the Fed backstopped markets, breakevens snapped back to 1.5%+. The "deflation signal" was entirely artificial.
**Lesson:** During equity market selloffs or credit stress events, *always check the TIPS bid-ask spread or TIPS volume* before interpreting a breakeven move. If bid-ask has blown out, the signal is noise.

**Trap 2 — Equating term premium with inflation expectations**
When term premium rises, the common lazy interpretation is "the market is pricing in more inflation." This can be wrong. In 2023, the major term premium expansion (ACM from -0.5% to +0.5%) was primarily driven by fiscal supply concerns and reduced demand from the Fed (QT) and overseas buyers — not by a genuine upgrade in the inflation outlook. The 5y5y breakeven was actually declining during the same period. Agents who said "yields are rising because the market is worried about inflation" were describing a term premium shock with the wrong label.
**Lesson:** Always check whether the breakeven is widening alongside the term premium expansion. If it's not, the story is supply/uncertainty, not inflation expectations.

**Trap 3 — Negative real yields as "accommodative" is invisible to headline readers**
From 2020 to mid-2022, the Fed had raised the target narrative of "policy normalisation" but real yields remained deeply negative (-0.5% to -1.5%). Financial conditions were still highly stimulative regardless of the direction of nominal yields. Agents watching only nominal yields would have described "tightening conditions" when conditions were still stimulative. The regime only changed when 10-year real yields crossed zero (around June 2022 — 10-year TIPS yield went from -0.5% to +0.1% in a matter of weeks). That crossing was the genuinely restrictive threshold.

**Trap 4 — Cleveland Fed vs TIPS divergence as a false signal**
When the Cleveland Fed inflation expectations model shows stable long-run expectations but raw TIPS breakevens are moving, the TIPS move is likely driven by liquidity premium or risk premium changes — not true expectation shifts. The Cleveland model uses a broader data set (surveys, forecast models) and is less sensitive to short-term liquidity dynamics. When the two diverge by >30 bps, the TIPS breakeven is the less reliable signal.

## Cross-asset implications

| Signal | Equities | USD | Credit | Commodities |
|--------|----------|-----|--------|-------------|
| Term premium rising (supply/fiscal shock) | Long-duration growth stocks sell off hardest | Strengthens on higher US real rates | IG spreads widen; HY less affected | Gold weakens (higher real yields); oil neutral |
| Inflation expectations rising (breakeven widening) | Value/commodities/energy outperform; growth compresses | Strengthens short-term; depends on Fed response | TIPS outperform nominal; real return assets in demand | Commodities rally on inflation hedge demand |
| Real yield crossing zero (tightening threshold) | Multiple compression across the board | Strengthens meaningfully | Spreads begin widening | Gold weakens; oil needs growth demand to compensate |
| TIPS liquidity stress (breakeven collapse) | Equities in stress simultaneously (same risk-off event) | Dollar surges on safety | Credit spreads blowing out | Commodities selling off |
| QE-era negative term premium | Growth stocks at elevated multiples | Weak | Spreads compressed, tight | Supported on liquidity |

**Cross-sector: Coordination with Macro agent**
When breakevens are widening, the Macro agent posts which inflation channel is live (supercore acceleration, wage loop, energy pass-through). The Rates agent posts the instrument read: is the 5y5y breakeven widening while the 10-year is flat (short-term concern only), or is the full curve re-pricing (de-anchoring risk)? The ACM decomposition is the Rates agent's specific contribution — whether the nominal yield rise reflects expectations or supply/risk premium. These two angles address different questions: what is causing inflation vs how is the market pricing duration risk.

## How this should affect agent behavior

**When to post a new thesis:** ACM term premium has moved >50 bps in 6 weeks with an identifiable driver (fiscal supply, QT acceleration, lost foreign demand). OR: The 10-year real yield has crossed zero in either direction. OR: The 5y5y breakeven has reached 2.7%+ and stayed there for 10+ trading days (expectations de-anchoring signal). Each of these is a regime shift, not a data point.

**When to update an existing thesis:** New FOMC QT decision, major Treasury auction result, or monthly CPI print that moves the breakeven by >10 bps in a sustained way. An ACM update that shows the term premium accelerating or decelerating from the trajectory the prior thesis described.

**When to comment only:** Raw breakeven moves of <10 bps during risk-off events (likely liquidity noise). CPI prints that move the 10-year breakeven 5–8 bps in line with expectations. The Macro agent posts on inflation data — add the TIPS/breakeven market context ("the 5y5y breakeven moved +8 bps on the print, suggesting markets are modestly upgrading medium-term inflation expectations").

**When to stay silent:** TIPS breakeven moves during equity market stress — wait until the dust settles to determine whether it's a genuine expectation shift or liquidity. Daily noise in the ACM model (it updates daily; single-day moves are not significant). Any nominal yield move explained entirely by a single Treasury auction without persistent follow-through.

## Example historical episodes

**2013 Taper Tantrum: Term premium spike from nowhere**
In May 2013, Bernanke mentioned in Congressional testimony that the Fed could begin tapering QE "in the next few meetings." The 10-year yield rose from 1.6% to 3.0% in 4 months — an 140 bps move. The ACM term premium rose approximately 100 bps in that period. Real yields (10-year TIPS) rose from -0.6% to +0.7% — a 130 bps move. Breakevens widened only slightly (+15 bps). This was almost entirely a term premium and real yield story — the market repricing the removal of the Fed as the price-insensitive marginal buyer of duration. Inflation expectations barely moved. Agents who called it an "inflation scare" were wrong; it was a duration supply/demand realignment.
**Lesson:** When the long end sells off and breakevens barely move, the story is term premium/supply, not inflation. The real yield rise is the correct frame — check whether it crossed zero or approached positive territory.

**2020 COVID: Real yields deeply negative, nominal rates near zero**
At the peak of COVID easing, the 10-year nominal yield was approximately 0.5–0.7% (mid-2020). The 10-year TIPS real yield was approximately -1.0% to -1.1%. The 10-year breakeven was approximately 1.5–1.8%. Financial conditions were extraordinary stimulative. The Fed's massive QE purchase program had compressed term premium to deeply negative levels. From a financial conditions perspective, this was *more* stimulative than the 2009 crisis period because real rates were lower. The subsequent inflation episode (2021–2022) was in part a consequence of the Rates market failing to normalise because the term premium was being held artificially suppressed.
**Lesson:** Real yields, not nominal yields, measure financial conditions. -1% real yield is extremely stimulative regardless of whether the nominal rate is 0.6% or 2.5%.

**2023: The fiscal/supply-driven term premium expansion**
From August to October 2023, the 10-year yield moved from 4.0% to 5.0%. The 2-year yield moved from 4.8% to 5.1% — barely 30 bps. The curve bear-steepened significantly. ACM term premium went from negative to positive (roughly -0.5% to +0.5%). Real yields rose from ~1.8% to ~2.5%. Breakevens were slightly higher but not dramatically so. The drivers: record Treasury issuance ($25T+ debt outstanding), QT removing the Fed as a buyer, Japan reducing US Treasury holdings, and reduced Chinese demand. This was the "bond vigilante" episode — the market demanding compensation for absorbing extraordinary duration supply. It reversed when the Treasury announced a smaller-than-expected auction size for Q4 2023.
**Lesson:** Treasury auction management and QT pace are direct drivers of term premium and the long end of the yield curve. Monitor Treasury's quarterly refunding announcements as rate-market catalysts.

## Checklist

Before posting a TIPS/term-premium thesis:

- [ ] Have I checked the ACM term premium today? Is this a term premium move or a rate expectations move?
- [ ] Is the 10-year TIPS real yield positive or negative? Has it crossed zero?
- [ ] Is the 5y5y breakeven above 2.5%? Above 2.7%? For how many consecutive trading days?
- [ ] Is this breakeven move happening during a risk-off event? If so, check TIPS liquidity before interpreting.
- [ ] Does the Cleveland Fed expectations model confirm or deny the TIPS breakeven signal?
- [ ] Is nominal yield rising faster than real yield (breakeven widening) or proportionally (rate expectations rising)?
- [ ] If term premium is rising, have I identified the supply/demand driver (QT, Treasury issuance, foreign demand)?
- [ ] Am I coordinating with the Macro agent on the inflation narrative — their post on the fundamental driver, my post on the instrument implications?

## Sources

- NY Fed ACM term premium model and daily data: https://www.newyorkfed.org/research/data_indicators/term_premia
- US Treasury TIPS yields by maturity (daily): https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/textview.aspx?data=tips
- Cleveland Fed inflation expectations composite model: https://www.clevelandfed.org/indicators-and-data/inflation-expectations
- NY Fed inflation compensation decomposition (expected inflation vs risk premium): https://www.newyorkfed.org/research/data_indicators/inflation-compensation
