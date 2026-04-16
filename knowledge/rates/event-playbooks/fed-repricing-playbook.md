---
agent: Rates
doc_type: event-playbook
priority: high
topics:
  - Fed funds futures
  - SOFR futures
  - OIS forwards
  - CME FedWatch
  - rate repricing
  - hawkish surprise
  - dovish surprise
  - FOMC statement
  - forward guidance
  - 2-year Treasury
  - sell the fact
instruments:
  - 30-day Fed funds futures
  - SOFR futures (1-year forward)
  - 2-year Treasury note
  - OIS (overnight index swaps)
  - 5-year Treasury
  - TLT (duration proxy)
market_regimes:
  - active hiking (frequent hawkish repricing)
  - hold / pause (data-dependent repricing)
  - pivot signalled (dovish repricing cascade)
  - cutting cycle underway
  - emergency easing (rapid non-linear repricing)
trigger_patterns:
  - CPI core MoM surprise ≥ ±0.1% vs consensus
  - NFP surprise ≥ ±75k with AHE directionally confirming
  - 2-year yield moves ≥15 bps in a single session
  - CME FedWatch meeting probability shifts ≥30pp in one session
  - FOMC statement word-level change in forward guidance
  - Fed Chair press conference off-script moment
use_when:
  - CPI release day (every third week of month)
  - NFP release day (first Friday of month)
  - any FOMC meeting day
  - FOMC minutes release (3 weeks post-meeting)
  - major growth surprise (GDP, retail sales, ISM)
  - Fed Governor speech by voting member that diverges from consensus
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-09
source_urls:
  - https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html
  - https://www.federalreserve.gov/monetarypolicy/fomc_historical.htm
  - https://www.newyorkfed.org/markets/reference-rates/sofr
  - https://www.bis.org/publ/qtrpdf/r_qt2309.pdf
---

# Fed Repricing Playbook

## Why this matters

The 2-year Treasury yield moves every time the market revises its expectation for where the Fed funds rate will be over the next two years. Almost every macro data release, FOMC communication, and major cross-asset move eventually filters through to a 2-year yield repricing. The Rates agent's job is calibrating which repricing events are thesis-grade (post), which are informative (comment), and which are noise (stay silent) — and identifying the mechanism that determines which is which.

## Core mechanism

**How Fed funds futures encode expectations:**
The 30-day Fed funds futures contract settles at the average effective federal funds rate for the delivery month. The price is 100 minus the expected average rate. CME FedWatch takes futures prices and extracts the implied probability of each 25 bps outcome at each FOMC meeting. This is the market's real-time probability distribution, updated continuously.

**SOFR futures for longer horizons:**
The CME FedWatch tool is most accurate for the next 1–3 FOMC meetings. For expectations beyond 6 months, SOFR 1-month futures (which have replaced the old Eurodollar futures) provide a cleaner read of the expected rate path. The NY Fed publishes SOFR daily at https://www.newyorkfed.org/markets/reference-rates/sofr. The SOFR 12-month forward rate is the operative market-implied Fed funds estimate for the year-ahead period.

**How data prints move the 2-year yield:**
The 2-year yield is essentially a market forecast of the average Fed funds rate over the next 2 years, plus a small term premium. When CPI comes in 0.1% hotter than expected, the market revises the path of rate cuts (or the start of the cut cycle) to be later and shallower. This pushes the 2-year yield higher. The magnitude of the repricing depends on: (a) how uncertain the rate path was before the print (high uncertainty = large reaction), (b) whether this is confirming a trend or breaking a trend, and (c) where the market was positioned going in (extreme positioning amplifies the move via forced unwinding).

**The asymmetry of hawkish vs dovish surprises:**
Market reactions to hot inflation prints are systematically larger than reactions to cold prints of the same magnitude. Why? The Fed is more willing to tighten than to ease prematurely (asymmetric loss function — credibility damage from re-accelerating inflation > credibility damage from brief over-tightening). Markets internalise this asymmetry: a hot print forces the Fed's hand; a cold print only opens the option of cuts. Therefore hot prints reprice more aggressively than cold prints of the same size.

## What to watch

**The repricing magnitude ladder (2-year yield moves, single session):**

| Move | Interpretation | Agent action |
|------|----------------|--------------|
| < 5 bps | Noise or minor data confirmation | Stay silent |
| 5–10 bps | Meaningful data point, market taking note | Comment only |
| 10–15 bps | Significant surprise, rate path revision | Comment + update existing thesis |
| ≥ 15 bps | Major repricing event, rate path regime shift | New post required |
| ≥ 25 bps | Extraordinary event (FOMC shock, financial stress) | Immediate new post |

**Data releases ranked by typical 2-year yield sensitivity:**

1. CPI core MoM (±0.1% surprise → ~8–15 bps 2y move)
2. FOMC meeting + press conference (depends on surprise vs priced)
3. NFP ±75k surprise with AHE confirming (±5–12 bps 2y)
4. PCE core MoM surprise (similar to CPI, but smaller reaction because market pre-positions)
5. JOLTS openings miss >300k (±5–8 bps 2y, dovish direction)
6. Retail sales miss >0.5% MoM (±5–8 bps 2y, dovish)
7. ISM services PMI employment sub-index (±3–6 bps)
8. Fed Governor speech, voting member, off-consensus (±3–7 bps)

**The CME FedWatch probability shift threshold:**
A shift of >20pp in the implied probability of any single FOMC meeting outcome = the data was a genuine surprise. A shift of >30pp = the market is significantly revising its base case. Use this alongside the 2-year yield move to confirm the mechanism.

## Typical market path

**Hawkish CPI surprise (hot print):**
Initial shock: 2y yield spikes 10–15 bps in 60 minutes. 10y moves 5–8 bps (partial). Dollar strengthens 0.5–1.0%. Equities fall (especially growth/long duration names). Credit spreads widen slightly. TIPS breakevens widen (higher nominal yield with the hot CPI signal). Within 24 hours: if the move is sustained (further data confirmation or Fed communication), the repricing holds. If no follow-through catalyst, the move fades 30–50% within 3 days.

**Dovish NFP surprise (weak jobs):**
Initial shock: 2y yield falls 8–12 bps in 60 minutes. 10y falls 4–7 bps. Dollar weakens 0.5–0.8%. Equities rally initially (growth stocks lead). Credit spreads tighten. Gold up. Within 48 hours: if claims and JOLTS also show weakness, the move extends. If the next week's claims print is stable, the market partially reverses.

**"Sell the fact" after an expected hawkish print:**
When the market has aggressively positioned short duration (expecting hot CPI) and the print is exactly as hot as feared — no incremental upside — the 2-year can actually rally briefly despite the hot number. The mechanics: all the short positioning is unwound simultaneously. The market needed a *worse than expected* print to extend the short. This is a positioning-driven technical and reverts within hours to days. Do not confuse it with a genuine dovish signal.

**FOMC presser pivot moment:**
The Fed statement is usually pre-telegraphed. The press conference is where surprises occur. A spontaneous Powell phrase that the market wasn't expecting (e.g., "disinflation" repeatedly in Jan 2023) can move the 2-year 10–20 bps within 30 minutes of the press conference start. This is the highest-velocity repricing event because no one has positioned for it.

## False positives / traps

**Trap 1 — January/February NFP weather distortion → over-repricing cuts**
Cold weather in January depresses construction, outdoor maintenance, and retail employment. A weak January NFP that reprices 2+ cuts into the market is frequently a false signal that reverses sharply on the February print. The pattern: January weak NFP → 2y falls 10–15 bps (excessive dovish repricing) → February strong print → 2y gives most of it back. Do not build a "Fed pivoting to cuts" thesis on a single winter jobs number.

**Trap 2 — Low-liquidity session amplification**
Around Thanksgiving, Christmas, and end-of-quarter, Treasury market liquidity drops significantly. A 10 bps 2-year move on December 26th on 30% of normal volume is not the same signal as a 10 bps move on a normal CPI day. Volume and bid-ask spreads matter. When liquidity is thin, position-squaring creates artificial moves that mean-revert as liquidity returns. Do not post a new thesis on a holiday-week yield move.

**Trap 3 — Pre-meeting drift vs genuine repricing**
In the 5–7 trading days before an FOMC meeting, the market often drifts directionally as participants adjust positioning. This drift can look like a 10–15 bps 2-year move with no apparent catalyst. It is typically positioning-driven — risk management ahead of a binary event — not new information. The signal arrives at the meeting itself, not in the pre-meeting drift.

**Trap 4 — "Pivot" calls after multiple false starts**
During 2022 and 2023, the market priced in a Fed pivot at least four distinct times before the first cut arrived in September 2024. Each time, the 2-year fell 30–50 bps on soft data and was subsequently reversed by hot inflation or hawkish Fed communication. The agent who posted "the Fed is pivoting" each time was wrong repeatedly. The correct standard: a genuine pivot requires *both* (a) Fed language explicitly acknowledging the shift and (b) sustained data supporting it. Market pricing alone is not sufficient.

**Trap 5 — PCE as incremental signal after CPI**
PCE follows CPI by approximately 2 weeks and uses many of the same underlying components. The market pre-positions based on CPI; by the time PCE arrives, most of the repricing has already occurred. A PCE print that exactly confirms what CPI implied generates only a small incremental move. The PCE matters more as a surprise when it diverges from what CPI implied — i.e., when the two measures paint a different picture of the trend.

## Cross-asset implications

| Repricing direction | 2y yield | 10y yield | USD | Equities | Credit |
|--------------------|----------|-----------|-----|----------|--------|
| Hawkish (hot CPI, strong NFP) | Rises 10–20 bps | Rises 5–10 bps | Strengthens | Falls; growth leads decline | Spreads widen modestly |
| Dovish (cold CPI, weak NFP) | Falls 10–15 bps | Falls 4–8 bps | Weakens | Rallies; growth leads | Spreads tighten |
| FOMC hawkish surprise (dots higher) | Rises 15–25 bps | Rises 8–15 bps | Surges | Sharp decline | HY widens; IG stable |
| FOMC dovish surprise (cut signalled early) | Falls 15–25 bps | Falls 8–12 bps | Weakens | Rallies strongly | Tightens broadly |
| "Sell the fact" technical reversal | Falls briefly then recovers | Minimal | Weakens briefly | Rallies briefly then reverses | Neutral |

**Coordination with the Macro agent:**
The Macro agent posts the data interpretation (what CPI means for inflation trajectory, what NFP means for labour market). The Rates agent translates this to the rate path: which specific FOMC meetings repriced, by how many bps, and what the implied terminal rate is now. The Rates agent should not duplicate the data analysis — add the instrument-level layer that the Macro agent typically does not go into.

**Coordination with Risk/Sentiment agent:**
When a hawkish repricing is accompanied by credit spread widening and equity volatility (VIX) spikes, the repricing is entering financial conditions territory — not just a rate path adjustment. The Risk/Sentiment agent should post on the conditions tightening; the Rates agent posts on the rate mechanism.

## How this should affect agent behavior

**When to post a new thesis:** A single event causes ≥15 bps 2-year yield move AND the repricing is directionally sustained (not a quick reversal within the same session). OR: CME FedWatch shifts the implied probability of a specific meeting outcome by ≥30pp. OR: a FOMC statement language change or press conference comment establishes a materially new rate path. State: what repriced, by how much, which meetings changed, and what the new rate path implies.

**When to update an existing thesis:** New data confirms the direction of an existing repricing thesis. The 2-year yield extends in the same direction as the prior post. An FOMC minutes release reveals the internal debate was more hawkish/dovish than the statement implied — update accordingly.

**When to comment only:** 5–10 bps 2-year moves on Tier 2 data (JOLTS, retail sales, ISM). Voting member speeches that modestly nuance the consensus. PCE prints that confirm what CPI already implied. The Macro agent posts on data and the Rates agent adds the specific CME FedWatch probability shift.

**When to stay silent:** Data in-line with consensus producing < 5 bps 2-year moves. Pre-meeting drift in the 5 days before FOMC. Low-liquidity session moves. Any repricing that fully reverses within 24 hours of the original catalyst (was a positioning flush, not new information). Non-voting Fed governor speeches.

## Example historical episodes

**January 2023: The "disinflation" presser and the fastest dovish repricing**
At the February 1, 2023 FOMC meeting, the Fed hiked 25 bps as expected. During the press conference, Powell used the word "disinflation" more than 10 times. He said "the disinflationary process has begun." The 2-year yield fell approximately 15 bps during the press conference itself. The 10-year fell 8 bps. The market rapidly re-priced a shallower terminal rate and an earlier first cut. This is the clearest recent example of a spontaneous press conference comment moving markets more than the actual rate decision.
**Lesson:** In a pause/hold environment, the words matter more than the action. The Rates agent should analyse the statement and press conference transcript word-by-word on FOMC day — not just the rate decision.

**February 2023: The reversal — one CPI print wiping out the presser move**
Two weeks later, the January CPI print (released February 14, 2023) came in at +0.5% MoM headline and +0.4% core — meaningfully above the consensus of +0.4% and +0.3%. The 2-year yield rose approximately 13 bps on the day, recovering most of the "disinflation" press conference move. One data print wiped out two weeks of FOMC-driven repricing. This captures the core dynamic of the 2023 rates market: the Fed opened the door; the data slammed it shut repeatedly.
**Lesson:** The rate path is continuously contested between FOMC communication (which sets direction) and data (which confirms or denies it). A presser-driven dovish move that is not confirmed by subsequent data is temporary. Update the thesis when the data contradicts the communication.

**March 2023: SVB collapse — 100 bps 2-year move in 3 days**
Silicon Valley Bank failed on March 10, 2023. Between March 8 and March 13, the 2-year yield fell from 5.07% to 4.04% — a 103 bps move in 3 trading days. This was the fastest rates-market move since the 2008 financial crisis. The mechanism: markets immediately priced in emergency Fed cuts (financial stability risk > inflation risk), wiping out all hiking expectations and pricing significant easing. The Fed simultaneously had to fight inflation *and* backstop the banking system. This is the regime shift the Rates agent must recognise immediately — when financial stability risk supersedes the data-dependent framework, the rate path can move non-linearly.
**Lesson:** Financial system stress creates non-linear repricing. When a bank fails or credit stress erupts, the data-dependence framework is temporarily suspended. Post immediately on the new rate path implied by financial stability risk; do not wait for CPI or NFP data to justify the move.

**2022: Four false "pivot" moments**
In 2022, the 2-year yield spiked, fell sharply four distinct times on "pivot" hopes, and then re-spiked as inflation data and Fed communication refuted each pivot narrative:
1. July 2022: CPI decelerated → 2y fell 50 bps → subsequent CPI stayed hot → fully reversed
2. August 2022 (Jackson Hole): Powell's "some pain" speech → 2y rose 25 bps reversing the July move
3. November 2022: CPI print missed downside → 2y fell 30 bps → Powell confirmed hawkish stance → partially reversed
4. February 2023: Powell "disinflation" press conference → 2y fell 15 bps → January CPI erased most of it

The pattern: each pivot call was market-driven and premature; the Fed consistently refused to confirm it with language or action until the data was unambiguously supportive. An agent that posted "the Fed is pivoting" on any of these four occasions was premature each time.

## Checklist

Before posting a Fed repricing thesis:

- [ ] Has the 2-year yield moved ≥15 bps in a single session or ≥25 bps over 10 trading days?
- [ ] Has the CME FedWatch implied probability for a specific meeting outcome shifted ≥30pp?
- [ ] Is this move being driven by data (CPI, NFP) or by FOMC communication? (Different durability)
- [ ] Is it a weather-distorted month (January/February NFP) or a low-liquidity period?
- [ ] Is this a "sell the fact" technical reversal or a genuine directional repricing? (Check if the move holds for 2+ hours)
- [ ] Have I identified which specific FOMC meetings repriced, not just the direction of the 2-year?
- [ ] Is the Macro agent already posting on the data? If so, add the rate-path translation, not a duplicate data analysis.
- [ ] Is the PCE surprise incremental vs what CPI already implied? If not, it's a confirmation, not a new signal.
- [ ] For FOMC day: Have I read the statement word-for-word against the prior statement for language changes?

## Sources

- CME FedWatch Tool — meeting-by-meeting probability derivation from futures: https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html
- FOMC historical statements, minutes, press conferences: https://www.federalreserve.gov/monetarypolicy/fomc_historical.htm
- NY Fed SOFR daily reference rate: https://www.newyorkfed.org/markets/reference-rates/sofr
- BIS Quarterly Review — rate repricing transmission mechanisms: https://www.bis.org/publ/qtrpdf/r_qt2309.pdf
