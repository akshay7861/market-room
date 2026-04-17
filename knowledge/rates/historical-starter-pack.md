# Rates Agent — Market Frameworks & Playbooks

_Last updated: 2026-04-17. Sector memory for the Rates Agent. Use these frameworks to reason about duration, curve shape, and policy repricing — not just to describe where yields are._

---

## Duration Regime Framework

Duration positioning is primarily driven by real yields and the inflation regime. Use this as the baseline framework before looking at any other signal:

| 10Y Real Yield (TIPS) | Equity multiple impact | Duration stance | Historical context |
|----------------------|----------------------|----------------|-------------------|
| Above +2.0% | P/E compressed 2–3 turns | Short duration / underweight long end | 2022–2023 regime |
| +1.0% to +2.0% | Neutral to mild compression | Neutral duration, watch curve shape | Transitional zone |
| 0% to +1.0% | Supportive for multiples | Mild long duration ok | Pre-tightening normal |
| Negative | Full financial conditions ease | Long duration, long risk assets | 2009–2021 regime |

**Current**: 10Y TIPS at 1.89% — in the "Neutral to mild compression" zone. Duration is not a screaming buy or sell; curve shape and near-term data surprises matter more than the outright level here.

---

## Curve Shape Playbook

The yield curve is the market's real-time vote on the policy path. Learn to read each shape:

**Bull steepener (2Y falls, 10Y stable or rises slightly):**
- Signals: market pricing faster Fed cuts than previously expected
- Cause: weak jobs data, credit stress, banking stress, recession fear
- Risk asset implication: initially negative (fear-driven), then positive if cuts materialize
- Recent examples: March 2023 (SVB), March 2020 (COVID)

**Bear steepener (2Y stable, 10Y rises):**
- Signals: term premium rising — market demanding more compensation for holding long duration
- Cause: fiscal supply concerns (too many Treasuries), inflation uncertainty, foreign selling
- Risk asset implication: NEGATIVE — not a growth signal; it's a supply/credibility signal
- This is the most dangerous steepener for equities: yields rise for the wrong reason
- 2023 pattern: 10Y went from 3.5% to 5% as a bear steepener. Equities fell 10%.

**Bull flattener (2Y stable, 10Y falls):**
- Signals: growth slowing, disinflation, safe haven flows into long duration
- Cause: weak data, geopolitical risk, flight to safety
- Risk asset implication: mixed — usually precedes further equity weakness but bonds outperform

**Bear flattener (2Y rises, 10Y stable):**
- Signals: Fed hiking or market pricing more hikes
- Cause: hot inflation data, strong labour market, Fed hawkish pivot
- Risk asset implication: negative for growth/tech; financials initially benefit (steeper NIM expectations)

**Current**: 10Y–2Y at +0.53. Re-steepened after 2022–2023 inversion. Question is WHICH steepener: bull (recession coming, cuts priced) or bear (term premium rising). Watch 30Y–10Y spread — if it's widening simultaneously, it's a bear steepener (supply/inflation premium), not a bull steepener.

---

## Fed Pivot Timing Framework

The Fed does not pivot on one print. The documented sequence:

1. **"Data dependent" language**: Fed stops forward guidance. This is the first signal the hiking cycle is ending. Typically 2–3 meetings before the actual pause.
2. **Pause**: Fed holds while "watching the data." This can last 3–6 months. Market often mis-prices the first cut as imminent.
3. **First cut**: Requires EITHER (a) core PCE below 3% AND NFP trending below 150K, OR (b) financial stress (HY OAS >500bps, bank failures, credit crunch).
4. **Rate of cuts**: historically the first 3–4 cuts are 25bps each. Larger cuts (50bps) only happen if unemployment is rising sharply OR there is a financial crisis.

**The market consistently prices too many cuts too early.** At the time of the first cut, fed funds futures have historically priced 100–150bps of cuts in the following 6 months; the actual delivery has been 50–75bps except in crisis (2008, 2020). Fade aggressive easing curves unless there is a credit or recession signal.

---

## Key Yield Level Thresholds

**10Y Treasury:**
- Above 4.5%: historically expensive to hold equities; multiple compression pressure intensifies
- 4.0%–4.5%: the "new normal" post-COVID zone; equity market can sustain at this level with good earnings
- Below 3.5%: meaningful easing or flight to safety; watch whether it's a growth scare or a genuine ease
- Below 3.0%: recessionary or crisis zone; Fed already cutting aggressively

**2Y Treasury (policy proxy):**
- Tracks Fed Funds with 1–2 meeting lag
- When 2Y is ABOVE Fed Funds rate: market pricing hikes → restrictive signal
- When 2Y is BELOW Fed Funds rate: market pricing cuts → easing expectation
- Current: 2Y at 3.76% vs Fed Funds 3.64% — market pricing roughly one 25bps cut in next 3 months

**10Y Breakeven inflation:**
- Above 2.5%: market doubts the Fed's ability to sustainably return to target. No cuts possible.
- 2.0%–2.5%: normal range; Fed has credibility; cut path possible
- Below 2.0%: disinflation signal; Fed can cut aggressively; watch for deflation risk

**Current breakeven at 2.39%**: in the normal range but elevated. Fed credibility intact but not fully established. One or two hot CPI prints would push this above 2.5% and close the easing window.

---

## Credit as a Rates Stress Signal

Credit spreads lead Treasury yields in risk-off episodes. HY OAS widens BEFORE the 10Y falls (as the flight to quality trade):

- **HY OAS <300bps**: credit complacent / tight. Risk-taking at maximum. Duration at its most expensive relative to credit risk.
- **HY OAS 300–450bps**: normal credit risk pricing. No stress signal.
- **HY OAS 450–600bps**: caution zone. Companies facing refinancing stress. Watch for 2Y rally (flight to safety) while 10Y holds (inflation uncertainty).
- **HY OAS >600bps**: credit stress. Financing conditions for leveraged companies is breaking down. Fed will eventually be forced to cut regardless of inflation.
- **HY OAS >800bps**: systemic stress. 2008 peak was 1800bps; 2020 COVID peak was 1100bps.

**Current HY OAS ~285bps**: below 300bps = credit complacent. This is a rates BEARISH signal (no fear priced = yields can stay higher for longer without financial accident forcing the Fed's hand).

---

## Term Premium and Supply Dynamics

The term premium is the extra yield investors demand for holding long-duration bonds vs rolling short-term bills. When it rises, long yields rise independent of policy expectations:

- **Term premium rising** (30Y-10Y spread widening, or 10Y real yield rising with breakevens stable): signals fiscal concern (supply) or inflation uncertainty. NEGATIVE for equities and risk assets.
- **Term premium falling**: flight to safety or disinflation. Positive for equities (lower discount rate).
- **Current 30Y at 4.87% vs 10Y at 4.26%**: 30Y–10Y spread = 61bps. When this exceeds 75bps and is widening, it historically precedes further long-end selloff as supply overwhelms demand.

Auction dynamics matter: weak 10Y or 30Y auctions (high yield tails, low bid-to-cover) are the most direct sign that term premium is rising structurally.

---

## Transmission to Equities

- **10Y rising 50bps from 4.0% to 4.5%**: forward P/E multiple compression of approximately 1.5–2 turns (from ~20x to ~18x). This is $200–300 on the S&P in current market terms.
- **10Y rising 50bps as a BEAR STEEPENER**: worse for equities than a bull-flattener rise, because growth expectations are not improving.
- **10Y falling 50bps**: typically adds 1.5–2 turns to the multiple, but ONLY if it's driven by disinflation (not recession fear). If the 10Y falls because recession fears spike, earnings estimates fall simultaneously, netting out.

---

## Failure Modes to Avoid

**1. Over-reacting to a single CPI print on the front end.** The 2Y is the most volatile tenor on CPI days. A single hot print typically adds 10–15bps to the 2Y intraday. This almost always partially reverses within 5 trading days. The 3-month trend matters, not the single print. Do not call a regime change from one number.

**2. Calling curve inversion as an immediate recession signal.** The historical lag from 2Y-10Y inversion to recession is 12–24 months. Equities can rally 15–25% during that period. Inversion is a warning, not a timing tool. Use the Sahm Rule (unemployment +0.5pp from cycle low) for timing.

---

## Key Levels Reference

| Instrument | Current | Note |
|-----------|---------|------|
| 10Y yield | 4.26% | Upper half of "new normal" zone |
| 2Y yield | 3.76% | Below FFR — market pricing ~1 cut near-term |
| 10Y–2Y spread | +0.53% | Re-steepened; watch bear vs bull character |
| 10Y breakeven | 2.39% | Fed credibility intact; one hot print = risk |
| 10Y TIPS real yield | 1.89% | Restrictive but below 2% peak |
| 30Y yield | 4.87% | 30Y–10Y at 61bps; watch for bear steepener |
| HY OAS | ~285bps | Below 300 = complacent; no forced Fed hand |
| IG OAS | ~80bps | Investment grade credit very tight |
| Fed Funds | 3.64% | ~150bps above estimated neutral rate |
