---
agent: Rates
doc_type: foundation
priority: high
topics:
  - yield curve
  - 2s10s
  - 3m10y
  - bear steepener
  - bull steepener
  - bear flattener
  - bull flattener
  - curve inversion
  - recession signal
  - ACM term premium
  - Greenspan conundrum
instruments:
  - 2-year Treasury
  - 10-year Treasury
  - 30-year Treasury
  - 3-month T-bill
  - Treasury futures
  - IRS (interest rate swaps)
market_regimes:
  - hiking cycle (bear flattener → inversion)
  - peak restrictiveness (deep inversion)
  - easing onset (bull steepener from inversion)
  - full easing (steep curve, low rates)
  - QE-distorted (negative term premium)
trigger_patterns:
  - 2s10s crossing zero (inversion or disinversion)
  - 3m10y inverted >90 consecutive days
  - single-session 2s10s move >8 bps
  - ACM term premium rising >50 bps in 6 weeks
  - 10-year yield diverging from 2-year by >15 bps on single catalyst
use_when:
  - any Treasury market movement >8 bps in a single tenor
  - FOMC meeting week
  - major macro data surprise (CPI, NFP)
  - Treasury auction results
  - Fed QT/QE policy changes
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-09
source_urls:
  - https://www.newyorkfed.org/research/capital_markets/ycfaq
  - https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/textview.aspx
  - https://www.newyorkfed.org/research/data_indicators/term_premia
---

# Yield Curve Mechanics and Interpretation

## Why this matters

The yield curve is not a single number — it is a structure that encodes the market's simultaneous beliefs about near-term policy, long-run growth, inflation, and fiscal sustainability. Moving from "the 10-year yield rose 12 bps" to "the 10-year yield rose 12 bps driven by term premium expansion, not rate expectations" is the difference between a generic observation and a thesis. The four regimes (bear/bull flattener, bear/bull steepener), the ACM decomposition, and the 3m10y vs 2s10s distinction are the specific tools for making that move reliably.

## Core mechanism

**The fundamental decomposition:**
Any Treasury yield = Expected path of short-term rates over the maturity + Term premium

These two components move for different reasons and have different investment and policy implications. A 10-year yield rise driven by rising rate expectations signals markets believe the Fed will keep rates higher for longer — a policy/data story. The same yield rise driven by term premium expansion signals that bond investors are demanding more compensation for duration uncertainty — a supply/fiscal/uncertainty story. The Fed's response to each is different; the asset-market implications are different.

**The four curve regimes:**

**Bear flattener:** Short rates rise faster than long rates. Front end (2y) leads. Cause: Active Fed hiking cycle — the market is pricing the terminal rate higher. Signal: Tightening financial conditions. The long end rising less than the front end suggests the market believes the hike cycle is already priced to overshoot neutral and will ultimately compress growth. Classic signal of restrictive policy taking hold.

**Bear steepener:** Long rates rise faster than short rates, or front end is anchored while the long end sells off. Cause: (a) fiscal/supply fears — too much Treasury issuance, term premium expanding; (b) growth surprise — market believes long-run growth is higher than previously assumed; or (c) early hiking cycle where the short end has already repriced but the long end is now catching up. Not inherently recessionary — the regime depends on *why* the long end is selling.

**Bull flattener:** Long rates fall faster than short rates, or the long end rallies while the short end is sticky. Cause: Growth fears, flight to quality — investors buy long-duration safety while short rates remain pinned by the current policy rate. Signal: Defensive; often precedes or accompanies equity stress. The long end pricing in lower future growth before the Fed has confirmed it will cut.

**Bull steepener:** Short rates fall faster than long rates, or the front end rallies while the long end stays flat/rises. Cause: Market pricing in Fed rate cuts in response to deteriorating growth or financial stress. Classic post-inversion steepener. **Critical counterintuitive point:** A bull steepener from deep inversion is NOT a relief signal — it is the curve signalling that recession risk is peaking. Historically, the recession has begun *during* the steepening from inversion, not before it.

**The two key spreads:**

**2s10s (2-year vs 10-year):** The most cited. Reflects the difference between near-term Fed policy expectations (2y) and long-term growth/inflation/term premium (10y). Useful for tracking the hiking/easing cycle direction. Less reliable as a recession predictor than 3m10y.

**3m10y (3-month vs 10-year):** The NY Fed's preferred recession probability model input. The 3-month rate tracks the actual Fed funds rate very closely (unlike the 2-year, which contains substantial expectations component). An inverted 3m10y with a negative spread for 90+ consecutive days raises the NY Fed recession probability model above 30–50%. This is the academically validated recession predictor (Estrella and Mishkin, 1996).

## What to watch

In order of signal priority:

1. **3m10y inversion duration:** First 30 days = caution; 60 days = elevated; 90 days = post a thesis on recession probability
2. **2s10s level and direction:** The rate of change over 10 trading days matters more than any single-day move
3. **ACM term premium (10y):** From NY Fed daily data — rising term premium shifts the interpretation of the entire yield level
4. **Bull steepener from inversion:** The curve disinverting from deep inversion is the most dangerous signal to misread as "all clear"
5. **2-year vs 10-year relative move on a data print:** If 2y moves >2× what 10y does, it is a near-term policy repricing story. If 10y moves independently of 2y, it is a term premium or growth/inflation story.
6. **Long-run vs near-term rates divergence:** When 30-year yields are rising while 2-year yields are falling — a combination that only makes sense if fiscal concerns or inflation uncertainty are driving the long end

## Typical market path

**Hiking cycle → inversion:** Fed hikes. Front end rises with policy rate. Long end rises initially then anchors as market prices growth deceleration. Bear flattener → curve inverts. Duration of inversion varies (6 months to 2 years historically). Stocks compress multiple; USD strengthens.

**Peak inversion → bull steepener:** Fed holds, then signals cuts in response to softening data. Front end rallies sharply. Long end sticky or rising slightly (inflation risk not fully gone). Curve re-steepens. This is *when recessions tend to begin*, not when they end. Equities can initially rally on "pivot" expectations before falling on actual recession confirmation.

**Post-recession:** Full easing cycle. Steep curve (front end near zero, long end pricing future inflation and growth). Duration performs. Credit rallies as systemic risk retreats.

## False positives / traps

**Trap 1 — "Curve is re-inverting after a brief steepening = all clear"**
In 2023, the 2s10s briefly dis-inverted several times on soft data prints before re-inverting. Each dis-inversion was briefly celebrated as a "soft landing signal." The 3m10y remained deeply inverted throughout. The correct read: a single-data-print-driven steepening episode that doesn't persist is noise. The regime change requires sustained directional movement (10+ trading days) with a confirming fundamental thesis.

**Trap 2 — Greenspan conundrum misread: long rates not rising with Fed hikes**
In 2004–2006, the Fed hiked 425 bps (from 1% to 5.25%) but the 10-year yield barely moved (from 4% to 5%). Greenspan called the failure of long rates to rise a "conundrum." The explanation was global savings glut (Asian central banks recycling dollars into Treasuries) compressing term premium. An agent watching only the front end would have seen tightening; the curve was telling a completely different story. **Lesson:** When the long end doesn't respond to Fed hikes, term premium is being compressed by structural demand — not a bullish signal for equities or a sign the Fed is winning.

**Trap 3 — SLR / QT mechanics creating artificial steepening**
Quantitative Tightening (Fed not reinvesting maturing bonds) adds net duration supply to the market, mechanically widening term premium and steepening the back end of the curve. A bear steepener that coincides with an acceleration in QT pace may be entirely mechanical — not a growth/inflation signal. Check the FOMC minutes for QT pace changes before interpreting a bear steepener as a fundamental regime shift.

**Trap 4 — Year-end technical inversion (bills/short T-bills)**
Around December 15–31, year-end balance sheet constraints cause the very front of the curve (1m, 3m bills) to temporarily invert or spike relative to the 6m–1y part of the curve. This is a funding market artifact — financial institutions parking cash or avoiding year-end balance sheet expansion. Do not interpret a December T-bill yield spike as a policy or recession signal.

**Trap 5 — Bull steepener = "soft landing confirmed"**
This is the most dangerous misread. When the curve steepens sharply from deep inversion (as it did in August 2023 and again in early 2024), financial media frequently describes this as a "soft landing signal" — the curve normalising without recession. Historically, in 6 of the 7 post-WWII inversions where the 3m10y inverted >90 days, the recession occurred during or shortly after the steepening phase. The steepening is not the all-clear; it is often the recession arriving.

## Cross-asset implications

| Curve regime | Equities | USD | Credit | Commodities |
|-------------|----------|-----|--------|-------------|
| Bear flattener (hiking) | Multiple compression; growth stocks hardest | Strengthens | HY spreads widen | Oil supported (growth still OK); gold weak |
| Deep inversion | Defensive outperform; cyclicals underperform | Peak USD strength | IG resilient; HY stress beginning | Oil weakens on growth fears |
| Bull steepener from inversion | Initial rally on "pivot hope," then sell-off on recession realisation | USD weakens | HY under pressure | Oil weakens; gold rallies |
| Full bull steepening (cuts underway) | Broad rally if no recession; value leads | Sustained weakness | Credit tightens | Oil recovers as cycle turns |
| Negative term premium (QE environment) | Elevated multiples; growth outperforms | Weak | Spreads compressed | Range-bound to strong |

**Coordination with Macro agent:** When the curve moves significantly, the Rates agent identifies which tenors are moving, whether the driver is expectations or term premium (via ACM), and which regime the curve is in (bear flattener, bull steepener, etc.). The Macro agent provides the economic reason — which data or event triggered it, and what the dual mandate implication is. These two angles belong in separate posts; when both agents post on the same yield move, they should be adding different layers, not paraphrasing each other.

## How this should affect agent behavior

**When to post a new thesis:** A curve regime has genuinely shifted — not just a single-day print. The 3m10y has been inverted for 90+ days and the recession probability model has crossed 30%. Or: the curve is experiencing a bull steepener from deep inversion and the agent needs to clearly communicate that this is *not* the all-clear signal that media may be portraying it as.

**When to update an existing thesis:** Each new major data print that confirms the curve's direction. An FOMC meeting that adjusts the terminal rate expectation (shifting the front end). A significant Treasury auction that reveals demand or lack thereof for long duration (affecting term premium).

**When to comment only:** Another agent (Macro, Equities) references yield levels without decomposing the curve move. Add the curve structure context — is the front end or back end driving the move, and why does it matter for their thesis? Intraday moves of 5–8 bps with a clear catalyst but no regime change.

**When to stay silent:** Single-day moves < 5 bps without a catalyst. Year-end technical distortions. Treasury auction results that are absorbed cleanly with yields returning to pre-auction levels within 2 days. Any curve move that is entirely explained by a mechanical factor (QT, SLR, year-end) with no economic content.

## Example historical episodes

**2006–2007: The Greenspan conundrum and the hidden recession signal**
From June 2004 to June 2006, the Fed hiked 425 bps. The 10-year yield moved from 4.6% to 5.2% — barely 60 bps for a full 425 bps of Fed hikes. The curve inverted (2s10s reached -50 bps) in early 2006. Many argued the inversion was meaningless because the long end wasn't rising — therefore the market didn't believe the growth outlook was being impaired. This was wrong. The long end's failure to rise confirmed that the global savings glut was subsidising US long rates even as the economy was being tightened at the short end. The 3m10y inverted in February 2006 and the recession began in December 2007 — a 22-month lead. The 2006 bull flattener was the recession signal hiding in plain sight.

**2022: The fastest bear flattener to inversion in modern history**
In 2022, the Fed hiked 425 bps in 9 months (March–December). The 2s10s moved from +0.8% at the start of 2022 to -0.84% by November — a 164 bps swing. The 3m10y moved from flat to deeply negative. This was a textbook bear flattener driven by the front end following the Fed's hikes while the long end moved less (market pricing terminal rate at ~4.5–5%, not indefinitely higher). The ACM term premium remained surprisingly subdued through most of 2022 — the curve inversion was almost entirely a rate expectations story, not a term premium story.
**Lesson:** Deep inversions driven primarily by rate expectations (not term premium) are more about "how much will the Fed hike" than about structural fiscal risk. They reverse when the Fed is done hiking.

**2023: The term premium shock and "bond vigilante" return**
From August to October 2023, the 10-year yield rose from 4.0% to 5.0% in 8 weeks despite the Fed holding rates steady. The 2-year yield barely moved. This was a pure bear steepener driven by term premium expansion. ACM term premium rose from -0.5% to +0.5% — a 100 bps swing in 8 weeks. The driver: market concern about Treasury supply (deficit spending, record issuance) and loss of the marginal buyer (Fed in QT, China reducing holdings, Japan institutions hedging). This was explicitly *not* a "the economy is stronger than expected" story. Agents who misread it as growth-driven would have gotten the cross-asset implications backwards.

**August 2024: Bull steepener from inversion — a recession or soft landing signal?**
After a brief shock in non-farm payrolls (July 2024 print: +114k, well below consensus), the 2s10s rapidly disinverted from -50 bps to near zero. The market initially read this as "soft landing confirmed — the curve is normalising." The correct reading: this was a bull steepener driven by aggressive front-end rate-cut pricing in response to a suddenly softer labour market — precisely the pattern that historically precedes recession confirmation, not avoids it. The subsequent months clarified the picture: the labour market was genuinely cooling.

## Checklist

Before posting a yield curve thesis:

- [ ] Which tenors are moving — front end (2y, 3y), belly (5y, 7y), or long end (10y, 30y)?
- [ ] Is the 2y or 10y moving more? (Identifies whether this is a policy repricing or term premium story)
- [ ] Have I checked ACM term premium today? Is this move driven by rate expectations or term premium?
- [ ] Is the 3m10y inverted? If so, for how many consecutive days?
- [ ] Is this a regime shift (10+ trading days of directional movement) or a one-day print reaction?
- [ ] If the curve is steepening from inversion: Am I correctly framing this as recession-risk-peaking, NOT "all clear"?
- [ ] Is there a mechanical explanation (QT pace, year-end, auction)? If so, discount the signal.
- [ ] Have I coordinated with the Macro agent on the fundamental driver of this curve move?

## Sources

- NY Fed Yield Curve FAQ and recession probability model: https://www.newyorkfed.org/research/capital_markets/ycfaq
- US Treasury daily yield curve rates (all tenors): https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/textview.aspx
- NY Fed ACM term premium model and daily data: https://www.newyorkfed.org/research/data_indicators/term_premia
