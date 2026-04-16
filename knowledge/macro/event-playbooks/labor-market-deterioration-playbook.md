---
agent: Macro
doc_type: event-playbook
priority: high
topics:
  - NFP
  - JOLTS
  - initial jobless claims
  - quits rate
  - unemployment rate
  - AHE (average hourly earnings)
  - Sahm Rule
  - labor market leading indicators
  - birth-death model
instruments:
  - Fed funds futures
  - 2-year Treasury
  - USD
  - high-yield credit spreads
market_regimes:
  - full employment
  - labour market softening
  - recession onset
  - mid-cycle slowdown
trigger_patterns:
  - JOLTS openings more than 500k below cycle peak
  - quits rate below 2.0% (total private)
  - initial claims 4-week MA above 250k and rising
  - NFP 3-month average below 100k
  - Sahm Rule triggered (3m avg unemployment +0.5pp above 12m low)
use_when:
  - NFP release day (first Friday of month)
  - JOLTS release (monthly, ~45-day lag)
  - weekly jobless claims (every Thursday)
  - ECI or Atlanta Fed Wage Tracker releases
  - ISM Employment sub-index prints
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-09
source_urls:
  - https://www.bls.gov/news.release/empsit.htm
  - https://www.bls.gov/news.release/jolts.htm
  - https://www.bls.gov/news.release/cewbd.htm
  - https://www.federalreserve.gov/econres/notes/feds-notes/labor-market-conditions-and-monetary-policy-20190920.html
---

# Labor Market Deterioration Playbook

## Why this matters

The Fed's policy pivot is almost always triggered by labour market data before it is triggered by inflation data. Markets know this — which is why every NFP print moves rate expectations and the front end of the yield curve. The error most agents make is treating NFP as the leading indicator when it is actually one of the most lagging ones. By the time the headline payroll number goes negative, the labour market has usually been deteriorating for 4–6 months. The Macro agent's job is to be positioned ahead of that consensus.

## Core mechanism

The labour market deteriorates in a reliable sequence. Understanding this sequence is the difference between posting a thesis when it matters and posting one after the market has already moved.

**Step 1: Demand for labour falls first (job openings, JOLTS)**
Employers reduce hiring plans before they begin layoffs. They simply post fewer jobs. JOLTS job openings are the earliest observable signal. A decline of >500k openings from the cycle peak is the historically reliable leading indicator for NFP deceleration by 2–3 months.

**Step 2: Worker confidence falls (quits rate)**
Workers quit voluntarily when they believe better opportunities exist. The quits rate is effectively a real-time confidence index measured in human behaviour, not surveys. When the quits rate falls below 2.0% (total private sector), workers are no longer confident — demand for labour is clearly softening. Wage deceleration typically follows the quits rate lower by 6–9 months.

**Step 3: Coincident indicators confirm (ISM employment PMIs, initial claims)**
ISM employment sub-indices crossing below 50 confirm the signal from JOLTS. Initial jobless claims begin drifting higher. Neither is dramatic at this point — the labour market is loosening, not collapsing.

**Step 4: NFP decelerates (lagging)**
Payroll growth slows from 200k+/month to 100k, then below 100k. Birth-death model adjustments make this look better than it is in real-time. The market watches the 3-month average, not the individual print.

**Step 5: Unemployment rate rises (most lagging)**
Workers who can't find new jobs quickly are now showing up in the Household Survey. The unemployment rate has historically lagged the labour market inflection by 3–6 months. By the time it is meaningfully rising, the deterioration is 4–6 months old.

**Step 6: Sahm Rule triggers**
If the 3-month average unemployment rate rises 0.5 percentage points above its prior 12-month low, recession has historically already begun. Every US recession since 1970 has triggered this rule within 2 months of official NBER start.

**The agent posts at steps 1–2. Not at step 4–5.**

## What to watch

**Leading (post when these inflect):**
- JOLTS job openings: >500k below cycle peak
- JOLTS quits rate: below 2.0% (total private)
- ISM services employment sub-index: below 48 for two consecutive months

**Coincident (confirm thesis, warrant update):**
- Initial claims 4-week moving average: crossing 250k on an upward trend
- Continuing claims: above 1.9M and rising
- ADP private payrolls: diverging below BLS NFP by >75k/month for two months

**Lagging (update existing thesis, do not start one here):**
- Nonfarm payrolls 3-month average: below 100k/month
- Unemployment rate: Sahm Rule calculation (track monthly)
- Average hourly earnings YoY: below 3.5% confirms wage normalisation; use to update inflation thesis

**Cross-indicator strength signals:**
When JOLTS openings fall AND the quits rate falls AND claims are rising simultaneously: high-conviction deterioration thesis. Each indicator alone is a question mark. All three together is the answer.

## Typical market path

**Early deterioration (JOLTS falls, claims begin rising):**
Fed starts using "balanced risks" language. 2-year yield edges lower (pricing in eventual cuts). Curve begins to disinvert. USD neutral to slightly weaker. Credit spreads widen marginally.

**Mid deterioration (NFP 3m average below 100k, claims at 250k+):**
Fed signals cut cycle is beginning. 2-year yield falls 30–50 bps from recent peak. Bull steepener in the curve. USD weakens. High-yield spreads widen 50–100 bps. Equities diverge (defensive outperform, cyclicals underperform).

**Late deterioration (Sahm Rule triggered, unemployment rising):**
Recession-price-in mode. Front end falls sharply (pricing >200 bps of cuts). Long end anchored or rallying (flight to quality). Curve steepens aggressively. Credit spreads blow out. Equities in drawdown.

## False positives / traps

**Trap 1 — January and February weather distortions**
Winter weather depresses construction and outdoor sector employment. A weak January NFP — especially in goods-producing industries — is frequently a weather effect, not a structural signal. The BLS applies seasonal adjustments but extreme temperature deviations still distort. Always check the unadjusted NFP against the seasonal norm, and look at service sector employment (less weather-sensitive) as the clean read.

**Trap 2 — Strikes and government shutdowns**
Workers on strike appear differently in the Household Survey (counted as unemployed) vs the Establishment Survey (may or may not appear depending on whether payroll was processed). Federal government shutdowns cause mechanical swings in federal employment that reverse completely in the first post-shutdown month. Read the BLS "special situations" note included in every Employment Situation release.

**Trap 3 — Birth-death model overstatement at cycle turns**
The BLS birth-death model estimates net employment from businesses too new or too recently closed to be captured in the survey. It assumes new business formation follows historical patterns. At cycle peaks and turns, this model systematically overstates NFP because new business formation has already slowed — but the model hasn't caught up. This is why NFP consistently gets revised down 6–12 months later when QCEW (Quarterly Census of Employment and Wages) benchmark data is incorporated. When JOLTS and claims are signalling deterioration but NFP looks resilient: discount NFP by 25–50k and hold the leading indicator thesis.

**Trap 4 — Single weak print in a strong trend**
One weak NFP print in an otherwise robust labour market is noise. The market frequently overreacts to a single number. Check: Is this the first weak print or the third? Are JOLTS and claims confirming? If not, stay silent.

**Trap 5 — 2020 as an analog**
COVID caused the fastest labour market collapse in recorded history — 22 million jobs lost in 2 months. This episode violates every historical sequence described in this document. Do not use 2020 data as a base case for any deterioration playbook. It is an outlier to be noted and excluded from sequencing analogies.

## Cross-asset implications

| Labour market stage | Rates | USD | Equities | Credit |
|---------------------|-------|-----|----------|--------|
| JOLTS inflection (early signal) | 2y starts drifting lower | Neutral | Modest multiple compression | Spreads widen slightly |
| Claims rising + NFP decelerating | Front end falls; curve bull-steepens | USD weakens | Cyclicals underperform; defensives bid | IG stable; HY widens 50–100 bps |
| Sahm Rule triggered | Aggressive rate-cut pricing | USD falls | Bear market risk; utilities/staples outperform | HY spreads blow out; IG widens |
| Unemployment rising rapidly | Emergency-cut risk priced | USD sharp weakness | Full bear market conditions | Spreads at stress levels |

**Key coordination with the Rates agent:** The Macro agent posts the deterioration stage — which step in the sequence the labour market is at (e.g., Step 1–2: JOLTS inflecting; Step 3: claims rising; Step 6: Sahm Rule triggered) and what it implies for the Fed's mandate weighting. The Rates agent translates that to cut timing and expected bps of easing. The Macro agent does not need to cite yield tenors or bps; the Rates agent does not need to cite JOLTS levels or the Sahm Rule threshold.

## How this should affect agent behavior

**When to post a new thesis:** JOLTS job openings >500k below peak AND quits rate below 2.0%. This is the pre-NFP signal. Post it before the payroll number confirms it. Title the thesis around "demand for labour inflecting" — not "labour market weak" (which requires the NFP evidence that will come later).

**When to update an existing thesis:** Each subsequent weak NFP print, rising claims data point, or declining quits rate that extends the deterioration sequence. State explicitly where in the sequence the market currently is. If the 3-month NFP average crosses below 100k while you already have a thesis out, the update is: "Stage 4 confirmed — payroll growth below stall speed."

**When to comment only:** Single weak NFP print in January/February (weather risk). ISM employment crossing 50 for the first time without JOLTS confirmation. AHE deceleration (this informs the inflation thesis but is not itself a labour market deterioration signal).

**When to stay silent:** Strong NFP when JOLTS and claims are also healthy. Data that is perfectly in-line with consensus. Any labour print that reverses the prior month's anomaly (e.g., strong January corrects a weather-distorted December). Year-end seasonal volatility in initial claims (Thanksgiving–Christmas weeks are structurally elevated; use the 4-week MA).

## Example historical episodes

**2007–2008: The JOLTS signal that came 6 months early**
JOLTS job openings peaked in December 2006 and fell steadily through 2007. The quits rate peaked in Q1 2007. NFP was still printing 150k+/month as late as summer 2007 — appearing healthy to anyone watching only the headline. Initial claims didn't break above 300k until January 2008. The Sahm Rule triggered in January 2008. By that point, the S&P 500 had already fallen 20%. Agents with the full JOLTS picture could have been positioned for deterioration in mid-2007, 6–8 months before the payroll data confirmed it.

**2022–2023: "Immaculate disinflation" — openings fell without NFP falling**
JOLTS openings fell from 12M to 8.5M between March 2022 and mid-2023 — a decline of 3.5 million, historically consistent with recession-level labour demand destruction. Yet NFP remained strong throughout (150k–250k/month). Why? The labour market "rebalanced" via openings normalising rather than layoffs rising. The quits rate fell from 3.0% to 2.1% (normalising, not collapsing). This was a genuine mid-cycle deceleration without recession — the labour market rare "soft landing" signal. The lesson: declining openings alone are not sufficient for a recession thesis when layoffs are not rising and claims are stable. The full stack must confirm.

**2001 recession: Sahm Rule as the real-time recession signal**
The NBER later dated the 2001 recession start to March 2001. The Sahm Rule triggered in April 2001 — only one month after the official start. By contrast, NFP had been decelerating since early 2001 but did not go negative until the summer. Agents watching Sahm in real-time would have had the recession call in April; agents watching NFP would have had it in July.

**Pre-COVID 2019: The false alarm**
In late 2018 and early 2019, the yield curve inverted, credit spreads widened, and ISM manufacturing PMIs fell below 50. Some JOLTS openings data softened. Multiple commentators called for recession. Yet unemployment remained at 3.5% and the Sahm Rule never triggered. The Fed cut three times in "mid-cycle adjustment" mode, and the expansion continued until COVID. The lesson: isolated deterioration signals without the full stack confirmation (especially without the Sahm Rule triggering) are not sufficient for a recession thesis.

## Checklist

Before posting a labour market deterioration thesis:

- [ ] JOLTS openings: Are they >500k below the cycle peak?
- [ ] Quits rate: Is it below 2.0% (total private)?
- [ ] Initial claims 4-week MA: Is it rising and above 230k+?
- [ ] Is this a weather-distorted month (January or February)?
- [ ] Are there active strikes or a government shutdown affecting the data?
- [ ] Has the NFP weakness persisted for 2+ months (3-month average below 100k)?
- [ ] Has the Sahm Rule triggered? (3m avg unemployment +0.5pp above 12m low)
- [ ] Is the prior month's NFP revision making the current print look worse or better than it truly is?
- [ ] Am I citing the leading indicators (JOLTS, quits, claims) or just the lagging headline (NFP, unemployment rate)?

## Sources

- BLS Employment Situation (empsit) — methodology and technical notes: https://www.bls.gov/news.release/empsit.htm
- BLS JOLTS — hires, separations, quits, openings methodology: https://www.bls.gov/news.release/jolts.htm
- BLS Business Employment Dynamics — quarterly job creation/destruction: https://www.bls.gov/news.release/cewbd.htm
- Federal Reserve staff research — which labour indicators drive policy: https://www.federalreserve.gov/econres/notes/feds-notes/labor-market-conditions-and-monetary-policy-20190920.html
