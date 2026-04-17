# Risk/Sentiment Agent — Market Frameworks & Playbooks

_Last updated: 2026-04-17. Sector memory for the Risk/Sentiment Agent. Use these frameworks to call the risk regime — risk-on or risk-off — and to identify when the market is pricing risk correctly vs. incorrectly._

---

## The Prime Directive

Your job is not to describe how the market is feeling. Your job is to call whether the current risk pricing is RIGHT or WRONG relative to the underlying signals.

- **Risk is underpriced** when: VIX is low, HY spreads are tight, breadth is narrow, and leading indicators are deteriorating. This is the "calm before the storm" setup.
- **Risk is overpriced** when: VIX is elevated, HY spreads are wide, breadth is improving, and leading indicators are stabilizing. This is the "washout opportunity" setup.
- **Risk is correctly priced**: rare. The market usually overshoots in both directions.

Always take a side: risk regime is either **risk-on**, **risk-off**, or **transitioning** (with a specific trigger that will resolve it). "Uncertain" is not a regime call.

---

## VIX Regime Framework

VIX is not just a number — it has regime properties:

| VIX Level | Regime | Positioning implication | Historical context |
|-----------|--------|------------------------|-------------------|
| <13 | Extreme complacency | Crowded longs; any shock will be amplified | Pre-2020 average; 2017 average was 11 |
| 13–17 | Low vol / risk-on | Normal bullish; modest short vol attractive | Bull market norm |
| 17–22 | Elevated awareness | Reduce leverage; monitor credit | Transitional |
| 22–28 | Stress | Genuine fear; flight to safety happening | 2018 Q4, 2015–2016 |
| 28–35 | High stress | De-risking accelerating; look for stabilization | 2011 (Euro crisis), 2018 Dec |
| 35–50 | Fear / capitulation | Forced selling; contrarian buy signal emerging | 2022 peak (~36) |
| >50 | Crisis | Systemic stress; Fed will likely intervene | 2020 peak (85), 2008 peak (80) |

**The VIX spike rule**: the FIRST spike above 25 is often a false alarm — markets frequently recover within 2–3 weeks. The SECOND spike to the same level or higher within 4–6 weeks confirms a regime shift. Never call a definitive risk-off regime on one spike.

**VIX term structure signal:**
- VIX spot > VIX 3-month futures (inverted term structure) = acute stress, possibly extreme
- VIX spot < VIX 3-month futures (normal slope) = market expects current vol to mean-revert; manageable

---

## Credit as the Leading Risk Indicator

HY credit spreads historically lead equity price moves by 2–6 weeks. Learn to read this lead relationship:

**The sequence in a risk-off episode:**
1. HY spreads start widening quietly (2–4 weeks before equities notice)
2. Equity index still near highs; breadth begins to narrow
3. HY spreads widen significantly (>50bps in 2 weeks)
4. Equities begin to sell off visibly
5. VIX spikes (often 2–3 weeks after HY first moved)

**The sequence in a risk-on recovery:**
1. HY spreads stabilize and tighten first (credit investors see value before equity investors)
2. Equity breadth improves (small caps, cyclicals outperform)
3. Index follows
4. VIX falls

**Key thresholds:**
- HY OAS <300bps: credit complacent — risk-on at maximum, but also the most fragile state
- HY OAS 300–450bps: normal credit environment
- HY OAS 450–600bps: caution zone — credit pricing some stress; equities should be watched
- HY OAS >600bps: stress; companies with below-investment-grade debt face financing strain
- HY OAS >800bps: systemic stress; multiple names default risk

**Current HY OAS ~285bps**: below 300bps. Credit is extremely tight. This is NOT confirming current equity strength — it's a sign that the market has priced out all downside risk. When credit is this tight, the asymmetry is skewed: spreads can widen 100bps on a shock while the recovery takes 6–12 months.

---

## Breadth as the Reality Check

Market breadth is the percentage of participants confirming the index move. Narrow breadth = fragile market regardless of index level.

**Healthy breadth signals:**
- >60% of S&P components above their 50-day moving average
- Advance/decline line making new highs alongside the index
- New 52-week highs > new 52-week lows (>100 per week net)
- IWM making new highs alongside SPY

**Warning signals:**
- Index at highs with <40% of components above 50-day MA
- "Stealth bear market": index flat but >50% of components down >20% from their highs (happened in 2021 Q4 before the actual index correction)
- Utilities and staples OUTPERFORMING within an apparently rising market = defensive rotation masquerading as strength
- Put/call ratio rising quietly over several weeks while market is complacent

---

## Cross-Asset Risk-Off Signals — Hierarchy

When multiple signals align, conviction is high. Track them in order of reliability:

**Tier 1 (most reliable, lead the move):**
- HY credit spreads widening >50bps over 2 weeks
- USD/JPY falling with equities falling simultaneously (JPY carry unwind)
- 2Y Treasury yield falling sharply (market pricing emergency cuts)

**Tier 2 (confirming, coincident):**
- VIX rising through 25
- IWM underperforming SPY by >3% in a week
- Gold and JPY strengthening together
- Copper falling >5% in a week

**Tier 3 (lagging, broad confirmation):**
- Utility and staples sector outperformance sustained
- SPY below its 50-day moving average
- Fed language shifting dovish in response

**Rule**: if Tier 1 signals are firing but Tier 2 and 3 are not yet responding, the market is in early-stage risk-off. This is the highest conviction entry point for defensive positioning. By the time Tier 3 fires, the easy defensive move is already over.

---

## Positioning and Crowding Framework

The most dangerous trades are the ones everyone is already in:

**Detecting crowding:**
- CFTC COT reports: net speculative positioning at multi-year extremes → mean reversion risk
- ETF flow data: consistent inflows into a single sector/factor for >6 months → crowded
- Options skew: if the cost of downside protection (puts) is unusually cheap in a sector, the market is not paying for protection → crowded longs
- Magazine cover effect: when a theme is front-page mainstream financial news, the trade has already moved

**When crowded positions unwind:**
- The unwinding tends to be faster and larger than the build-up
- Crowded long + negative catalyst = gap down with no bids
- Crowded short + positive catalyst = violent short squeeze

**Current crowding concerns**: mega-cap tech has attracted persistent ETF inflows and now represents ~35% of SPY. Any significant negative catalyst for this group (regulatory, earnings miss, rate spike) will disproportionately hit the index due to concentration.

---

## Regime Transition Playbook

**Risk-off triggers (catalysts that start regime shifts):**
- Fed surprise hawkish: large upside CPI + Fed retracts cut expectations
- Credit event: major company default, banking stress, liquidity crisis
- Geopolitical escalation: actual supply disruption, not just headline risk
- Growth shock: NFP -200K or ISM Manufacturing <45

**Risk-on triggers (catalysts that end risk-off periods):**
- Fed dovish pivot (explicit) or surprise cut
- Credit stabilization: HY spreads stop widening for 2+ weeks
- Earnings clarity: major earnings season with upside guidance revision
- Geopolitical resolution or ceasefire

**The washout signal**: the single most reliable contrarian buy signal is VIX above 35 with HY spreads above 600bps AND a Fed official making an unscheduled statement. This combination has historically marked the bottom within 1–3 weeks in every episode since 1990.

---

## Failure Modes to Avoid

**1. Calling risk-off too early on the first VIX spike above 20.** The first spike is almost always faded within 2–3 weeks in a bull market. The second spike to the same level 4–6 weeks later, with HY spreads also widening, is the confirmation. Premature risk-off calls have cost more returns than late ones.

**2. Conflating the source of HY spread widening.** HY can widen because (a) growth is slowing (Treasury bullish — buy duration), (b) financial conditions are tightening due to Fed (Treasury bearish), or (c) sector-specific default risk. The policy and duration response is completely different for each. State the cause, not just the spread level.

---

## Key Levels Reference

| Instrument | Current | Regime signal |
|-----------|---------|--------------|
| VIX | ~18.17 | Normal; no stress signal |
| HY OAS | ~285bps | Below 300 — complacent; fragile state |
| IG OAS | ~80bps | Very tight; investment grade credit priced for perfection |
| BBB OAS | ~101bps | Tight; fallen angel risk not priced |
| 10Y–2Y spread | +0.53% | Re-steepening; monitor bear steepener character |
| SPY YoY | +27.7% | Extended; requires earnings delivery |
| IWM YoY | +39.7% | Recent bounce after breadth deterioration period |
| BTC | ~$74,719 | Risk appetite proxy; -20.7% YoY — lagging equities |
| Gold (GLD) | ~$440 | Safe-haven bid intact — ambiguous risk signal |
| USD/JPY | 159.22 | Above BOJ intervention zone — carry risk elevated |
