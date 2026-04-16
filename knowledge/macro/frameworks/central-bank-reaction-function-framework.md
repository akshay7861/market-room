---
agent: Macro
doc_type: framework
priority: high
topics:
  - FOMC
  - dot plot
  - dual mandate
  - terminal rate
  - r-star
  - neutral rate
  - average inflation targeting
  - forward guidance
  - FOMC statement language
  - Beige Book
  - Fed pivot
instruments:
  - Fed funds futures
  - 2-year Treasury
  - OIS forwards
  - SOFR futures
  - USD
market_regimes:
  - hiking cycle
  - pause / hold
  - easing cycle
  - emergency policy
  - mid-cycle adjustment
trigger_patterns:
  - FOMC meeting day
  - dot plot (SEP) release
  - FOMC statement language change
  - Fed Chair press conference
  - FOMC minutes release (3 weeks post-meeting)
  - Fed Governor speech by voting member
  - Beige Book two consecutive softening characterisations
use_when:
  - any FOMC meeting week
  - CPI/PCE that materially changes rate path
  - FOMC minutes release
  - Beige Book release
  - major macro surprise that reprices terminal rate by >50 bps
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-09
source_urls:
  - https://www.federalreserve.gov/monetarypolicy/fomc.htm
  - https://www.federalreserve.gov/monetarypolicy/fomc_historical.htm
  - https://www.newyorkfed.org/research/data_indicators/rstar
  - https://www.federalreserve.gov/monetarypolicy/beige-book-default.htm
---

# Central Bank Reaction Function Framework

## Why this matters

Every macro data release ultimately matters because of what it implies about the Fed's next move. The error is treating data surprises as the signal — they are inputs. The signal is what the Fed will do with them, given the current dual mandate weighting, the prevailing framework (AIT, data-dependent, opportunistic), and where the effective rate sits relative to r-star. This document encodes that decision logic so the agent posts the policy implication, not just the data reaction.

## Core mechanism

**The dual mandate in practice:**
Congress mandated the Fed to pursue maximum employment AND stable prices (2% PCE on average over time). When both objectives align (inflation falling, unemployment stable), the Fed can ease without conflict. When they conflict — inflation above target AND unemployment below NAIRU — the Fed explicitly prioritises price stability. It will accept higher unemployment to reduce inflation. This is not an opinion; it was stated explicitly by Powell at Jackson Hole in August 2022.

**NAIRU and the employment side:**
The Fed does not define maximum employment as a fixed unemployment rate. It uses a range of indicators (JOLTS, quits, claims, prime-age employment ratio) and estimates the Non-Accelerating Inflation Rate of Unemployment (NAIRU) as the threshold below which tight labour markets begin generating persistent wage and price pressure. Current Fed estimate: 4.0–4.3% unemployment. When unemployment is below NAIRU and inflation is above target simultaneously, the Fed interprets this as an unambiguous signal to remain restrictive.

**The r-star anchor:**
r-star (r*) is the theoretical real interest rate at which monetary policy is neither stimulative nor restrictive. NY Fed estimates (Holston-Laubach-Williams model) place real r-star at approximately 0.8–1.3% as of 2024–2025. At 2% PCE inflation, this implies a nominal neutral rate of approximately 2.8–3.3%. Any fed funds rate above this level is genuinely restrictive; below it is accommodative. This is the benchmark for "how far from neutral are we?" — and it determines how aggressive a Fed cut cycle can be before becoming re-stimulative.

**The dot plot — what it shows and what it doesn't:**
The Summary of Economic Projections (SEP) is released quarterly (March, June, September, December). The dot plot shows each FOMC participant's forecast for the year-end fed funds rate for the current year, next two years, and long run.

What matters:
- Median dot: The operative signal. Shifts of 25 bps between SEP releases are meaningful; 50+ bps shifts are major policy re-pricings.
- Long-run dot: The market's implicit estimate of nominal neutral. A long-run dot drifting higher (as it did from 2.5% toward 3.0%+ in 2024) signals the Fed believes the post-COVID neutral rate has risen — permanently more restrictive financial conditions.
- Dispersion of dots: Wide range means genuine uncertainty; narrow clustering means near-consensus. A single outlier dot rarely matters.

What the dot plot does NOT guarantee: The dots are economic projections, not policy commitments. The Fed revises them every quarter. A March dot showing two cuts in 2025 does not bind the June meeting if the data changes.

## What to watch

**In order of signal reliability:**

1. **Median dot shift at SEP meetings** — >25 bps change from prior SEP = post; >50 bps = major thesis
2. **Long-run dot drift** — rising from 2.5% toward 3.0%+ = regime shift in neutral rate belief
3. **Statement language changes** — specific word-level changes carry deliberate meaning (see below)
4. **Press conference Q&A tone** — more spontaneous than the statement; where genuine pivots are revealed
5. **FOMC minutes dissent language** — "several participants" vs "most participants" vs "a few" tracks consensus drift
6. **Beige Book tone sequence** — two consecutive districts reporting "slowing" or "weakening" = early warning
7. **Voting member speeches in inter-meeting periods** — only voting members have meaningful signal value

**Statement language glossary (hawkish → dovish):**
- "Ongoing increases will be appropriate" → hiking cycle active
- "Some additional firming may be appropriate" → nearing the end; data-dependent
- "The Committee will take into account" → full optionality; pause likely
- "Patient" → holding; not yet ready to cut
- "Two-sided risks" → dovish pivot approaching; both directions now open
- "Appropriate to begin dialling back" → first cut explicitly signalled
- "Recalibration" (Powell, Sept 2024) → cutting, but framing it as normalisation not an emergency

## Typical market path

**Hiking cycle (data still hot, mandate not achieved):**
Dot plot shifts higher. 2-year yield rises toward terminal rate. Curve flattens (bear flattener). USD strengthens. Risk assets compress multiple. Duration underperforms.

**Pause / hold (data mixed, watching):**
Dot plot unchanged. Rate path uncertainty high. 2-year yield consolidates. Curve volatile but trendless. Markets price higher volatility (rates vol elevated). Equities can rally in "goldilocks" interpretation.

**Pivot / cut cycle (data softening, mandate shifting toward employment):**
Median dot moves lower. 2-year yield falls (front end leads). Curve bull-steepens. USD weakens. Risk assets rally on multiple re-expansion. Duration outperforms.

**Emergency mode (financial stress, recession risk):**
Intra-meeting cut or rapid sequential cuts. 2-year falls sharply (50–100 bps in days). Long end may not fall proportionally (flight to quality without duration demand). Credit spreads blow out then recover as Fed provides backstop.

## False positives / traps

**Trap 1 — "Mid-cycle adjustment" vs pivot**
In 2019, Powell described the Fed's three rate cuts as a "mid-cycle adjustment" — explicitly *not* the start of an easing cycle. Markets initially priced deep cuts; they did not materialise. The signal: when the Fed uses "recalibration," "adjustment," or "normalisation" language rather than "easing cycle" language, it is sizing the cuts at 75–100 bps maximum, not a full cut cycle. The appropriate agent response is a restrained update ("correction, not a new cycle"), not a "Fed pivoted" thesis.

**Trap 2 — Average Inflation Targeting and the 2021 lag**
The Fed adopted Average Inflation Targeting (AIT) in August 2020. Under AIT, the Fed explicitly commits to allowing above-target inflation to "make up" for below-target inflation. This framework led the Fed to remain accommodative through all of 2021 even as CPI and PCE accelerated sharply. Agents using pre-AIT reaction function logic ("inflation >2% → hike") were consistently surprised by the Fed's patience. After the 2021–2022 experience, the Fed's application of AIT became much more conditional. The lesson: the formal framework (AIT) and the operational reaction function can diverge; watch the *language* more than the theory.

**Trap 3 — Fed blackout as a false signal amplifier**
The Fed enters a communications blackout 10 days before each FOMC meeting. Data prints during this window (including CPI and NFP) cannot be officially responded to by any Fed official. Markets reprice aggressively without the ability to get a Fed clarification. This creates over-reactions in either direction. When a major data print occurs during the blackout, add a note in any commentary: "the Fed cannot respond to this until the meeting — the market is repricing in an information vacuum."

**Trap 4 — Single dissent signals "divided Fed"**
Financial media consistently overweights single dissenting FOMC votes. A 11-1 decision is an overwhelming consensus. Single dissenters rarely swing the next meeting's outcome. Do not build a thesis around a lone dissent. "Several members" dissenting (3+) or a visible split in the dot plot distribution is the meaningful signal.

**Trap 5 — Treating the dot plot as a schedule**
The dot plot is a projection, not a calendar. During 2022, the market used the dot plot to "time" each hike with precision and was repeatedly wrong on the magnitude and pace. During 2023, the dot plot showed cuts beginning in 2024; cuts began 9 months later than the March 2024 dot implied. Use the dot for direction, not for exact timing.

## Cross-asset implications

| Fed regime | 2y yield | 10y yield | USD | Equities | Credit |
|------------|----------|-----------|-----|----------|--------|
| Hiking, terminal rate rising | Rises sharply | Rises moderately | Strengthens | Bear; multiple compression | Spreads widen |
| Pause, policy stable | Volatile, range-bound | Range-bound + term premium | Neutral | Rally in "goldilocks" | Stable |
| Pivot signalled (language shift) | Falls 25–50 bps | Falls less | Weakens | Strong rally, growth leads | Tighten |
| Cutting cycle underway | Falls toward neutral | Falls modestly | Weakens | Bull market if no recession | Tighten broadly |
| Emergency cut | Falls 50–100 bps in days | Volatile; quality flight | Falls sharply | Sells off before recovering | Blows out then recovers |

**Coordination with the Rates agent:** The Macro agent posts which mandate is currently dominant (price stability vs employment), what framework the Fed is operating under, and what the language change signals about direction and magnitude. The Rates agent posts which specific FOMC meetings repriced, by how many bps, and what the ACM term premium is doing. "Fed will cut X times" is a Rates post; "Fed's employment concern is now overriding inflation caution" is a Macro post.

## How this should affect agent behavior

**When to post a new thesis:** Any FOMC meeting where the median dot shifts >25 bps, statement language contains a meaningful inflection (new "two-sided risks" language, removal of "ongoing increases"), or the press conference reveals a genuine change in the Fed's assessment of which mandate is currently dominant. Cite the language specifically.

**When to update an existing thesis:** Post-meeting data that confirms or refutes the Fed's stated trajectory. Beige Book releases that show regional deterioration you predicted. FOMC minutes that reveal more hawkish or dovish internal consensus than the statement implied.

**When to comment only:** Non-voting Fed governor speeches. Speeches that reiterate the already-known consensus without new signal. Any press conference where Powell simply repeats "data dependent" without additional nuance.

**When to stay silent:** During the Fed blackout if the data is merely in-line with expectations. Between SEP meetings when no policy-relevant data has materially surprised. Individual regional Fed president speeches who are non-voters in an odd year.

## Example historical episodes

**2018–2019: The "insurance cut" misread and the mid-cycle signal**
The Fed hiked to 2.25–2.50% by December 2018, then paused in January 2019 as financial conditions tightened sharply (S&P 500 fell 20% in Q4 2018). In mid-2019, the Fed cut three times to 1.50–1.75%, calling it a "mid-cycle adjustment" in response to global growth risks and trade uncertainty — not a recession or a crisis. Many analysts called this a "pivot to easing." It was not a full cut cycle: the Fed stopped at 75 bps of cuts and the expansion continued until COVID. The correct reading was that the Fed was recalibrating back toward neutral (real rates had been mildly positive), not launching a new easing regime.
**Lesson:** "Mid-cycle adjustment" language is a specific signal capping the extent of cuts. Treat it differently from "easing cycle" language.

**2021–2022: Average Inflation Targeting delays the hike — and the consequence**
The Fed remained accommodative through all of 2021 as CPI rose from 1.4% to 7.0%. Under the AIT framework, the FOMC was reluctant to hike because inflation "might be transitory" and they didn't want to prematurely tighten. The first hike didn't come until March 2022 — with CPI already at 8.5%. The result was the most aggressive rate hike cycle since Volcker: 11 hikes, +525 bps in 16 months. The lesson for agents is structural: when the Fed delays action because of its framework, the eventual action is more extreme and more disruptive to markets.

**2023: The "skip" meeting and language precision**
At the June 2023 FOMC meeting, the Fed held rates steady for the first time in the hike cycle while explicitly signalling a July hike was likely. Powell called it a "skip," not a "pause." The distinction was meaningful — a pause suggests the hiking cycle is over; a skip means the hiking cycle is still active but taking a meeting off. 2-year yields barely moved on the skip because the language made the July hike near-certain. This is a case study in why statement language must be read word-for-word.
**Lesson:** When the Fed uses a word that distinguishes two scenarios ("skip" vs "pause"), use that word. The market moves on that distinction.

**1994–1995: The successful soft landing model**
The 1994 rate cycle is the closest historical analog to the 2022–2023 cycle. Fed hiked 300 bps in 12 months (Feb 1994 – Feb 1995) in response to nascent inflation and a hot economy. Inflation peaked and fell without triggering a recession. The yield curve inverted briefly and then steepened. Unemployment rose only modestly (5.5% to 5.8%). The landing was soft. The conditions that made it work: (1) the Fed acted early, before expectations de-anchored; (2) there was no financial system shock concurrent with the hikes; (3) consumer and corporate balance sheets were healthy. In 2022, conditions 2 and 3 were more uncertain — silicon Valley Bank and credit stress were the risk that made the 2022–2023 cycle much more uncertain in real-time.

## Checklist

Before posting an FOMC-driven thesis:

- [ ] Has the median dot shifted by >25 bps from the prior SEP?
- [ ] Has the statement language changed materially — specifically the forward guidance language?
- [ ] Did the press conference reveal something not contained in the statement?
- [ ] What framework is the Fed currently operating under (AIT, post-AIT, opportunistic disinflation)?
- [ ] What is the current FOMC consensus on which mandate is dominant (price stability vs employment)?
- [ ] Is this a "skip" or a "pause"? "Recalibration" or "easing cycle"? Use the Fed's own words.
- [ ] Is the Fed in blackout? If so, is a major data print being over-interpreted in an information vacuum?
- [ ] Has a dissent occurred? Is it one vote (noise) or multiple (meaningful)?
- [ ] What is the long-run dot doing — drifting toward 3.0%+ (regime shift) or stable at 2.5% (temporary tightening)?

## Sources

- FOMC process, calendar, and meetings: https://www.federalreserve.gov/monetarypolicy/fomc.htm
- FOMC historical statements, minutes, and SEP projections: https://www.federalreserve.gov/monetarypolicy/fomc_historical.htm
- NY Fed r-star (Holston-Laubach-Williams neutral rate estimates): https://www.newyorkfed.org/research/data_indicators/rstar
- Beige Book — qualitative regional economic conditions: https://www.federalreserve.gov/monetarypolicy/beige-book-default.htm
