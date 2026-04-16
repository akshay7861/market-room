---
agent: Macro
doc_type: framework
priority: high
topics:
  - CPI
  - PCE
  - PPI
  - OER
  - supercore
  - wage spiral
  - inflation expectations
  - cost-push inflation
  - demand-pull inflation
  - disinflation
instruments:
  - CPI swaps
  - TIPS breakevens
  - 5y5y inflation forwards
  - Fed funds futures
  - real yields (TIPS)
market_regimes:
  - reflation
  - stagflation
  - disinflation
  - soft landing
  - cost-push spike
trigger_patterns:
  - core CPI beats consensus by ≥0.1% MoM
  - core PCE above 0.3% MoM for two consecutive prints
  - supercore (services ex-shelter) above 0.4% MoM
  - 5y5y breakeven crossing 2.5%
  - wage growth (AHE) above 4.5% YoY
use_when:
  - CPI release day
  - PCE release day
  - PPI release (as leading indicator)
  - FOMC meeting prep
  - wage data (NFP AHE, ECI, Atlanta Fed Wage Tracker)
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-09
source_urls:
  - https://www.federalreserve.gov/monetarypolicy/review-of-monetary-policy-strategy-tools-and-communications-statement-on-longer-run-goals.htm
  - https://www.bls.gov/cpi/questions-and-answers.htm
  - https://www.bea.gov/resources/methodologies/nipa-handbook
  - https://www.newyorkfed.org/research/policy/underlying_inflation_gauge
  - https://www.bis.org/publ/work1034.pdf
---

# Inflation Transmission Mechanisms

## Why this matters

Inflation headlines move markets before the Macro agent has time to think. The reflex error is to treat every hot CPI print the same way. They are not the same. A headline beat driven by OER lag is structurally different from one driven by wage-embedded services inflation — and the Fed's response, and therefore the market path, differs completely. This document encodes the transmission chain so the agent can identify which channel is live within the first minute of reading a release.

## Core mechanism

Inflation moves through stages. Each stage has different policy implications:

**Stage 1 — Input costs (commodity, import, energy)**
The fastest and most volatile channel. Raw materials, energy, and imported goods reprice first. These are mean-reverting — supply normalises, prices reverse. A commodity spike that does not embed in wages or services is a speed bump, not a regime change.

**Stage 2 — PPI (Producer Price Index)**
Measures prices received by domestic producers. PPI core (ex-food/energy) leads CPI by 2–3 months. The question at this stage: are firms absorbing higher input costs (margin compression) or passing them through (next-stage CPI pressure)? Compression is disinflationary; pass-through elevates CPI.

**Stage 3 — CPI (Consumer Price Index)**
BLS Laspeyres fixed-weight index. Overstates true inflation by ~0.3–0.5% vs PCE because it ignores consumer substitution. The operative sub-components in order of policy weight: (1) supercore = services ex-shelter ex-energy services, (2) core services, (3) core goods, (4) shelter (OER — lagged 12–18 months from actual rents), (5) food and energy (excluded from core, irrelevant to Fed policy).

**Stage 4 — PCE Deflator**
BEA chain-weighted index. This is what the Fed actually targets. PCE runs 20–40 bps below CPI in normal conditions because it weights shelter lower and accounts for substitution. When CPI and PCE diverge by more than 50 bps, identify which component explains the gap — it is almost always OER or healthcare.

**Stage 5 — Wage expectations → Wage growth**
The stickiest channel. Once workers expect sustained inflation, they demand real wage preservation. The Atlanta Fed Wage Growth Tracker (job-switchers sub-series) is the most forward-looking wage indicator. Job-switcher wage growth above 5% signals the wage-price loop is feeding itself. Below 4%: normalising.

**Stage 6 — Inflation expectations (the terminal risk)**
University of Michigan 5–10yr survey, NY Fed Survey of Consumer Expectations, 5y5y inflation forwards. If long-run expectations de-anchor above 2.7% persistently, the Fed will hike into recession to restore credibility. This is the one scenario where there is no soft landing outcome.

**The three inflation types:**

| Type | Driver | Fed response | Agent action |
|------|--------|-------------|--------------|
| Cost-push | Commodity/supply shock | Muted unless expectations move | Comment; do not post new thesis on first print |
| Demand-pull | Strong consumer + tight labour | Direct; will hike | New thesis if core PCE > 2.5% for 2+ months |
| Wage-spiral | Expectations embedded in wages | Aggressive; will hike into recession | Immediate new thesis; cite both wage data and expectations |

## What to watch

In order of signal reliability:

1. **Supercore MoM (services CPI ex-shelter ex-energy services)** — above 0.4% = demand-pull active
2. **Core PCE MoM 3-month annualised** — the Fed's own dashboard metric; above 3.0% = actively concerning
3. **Atlanta Fed Wage Tracker, job-switchers** — above 5.0% = wage loop risk
4. **5y5y inflation forward** — crossing 2.5% = early de-anchoring; 2.7%+ = post immediately
5. **OER MoM vs Zillow/Apartment List current rent indices** — when market rents are falling but OER is still rising, the CPI is overstating true inflation (revert is coming)
6. **PPI final demand MoM core** — two consecutive prints above 0.4% = pipeline pressure building
7. **NY Fed Underlying Inflation Gauge (UIG)** — trend indicator that smooths monthly noise; diverging from CPI prints reveals whether trend is accelerating or decelerating

## Typical market path

**Cost-push spike (energy or supply shock):**
Initial spike in headline CPI → rates market reprices hawkish → 2-week reversal as core stays contained → breakevens narrow → rates give back the move. Duration: 4–8 weeks for repricing cycle.

**Demand-pull (strong consumer, tight labour):**
Core PCE prints hot → Fed signals higher-for-longer → front-end rates stay elevated → dollar strengthens → risk assets compress multiple → sustained repricing over 2–4 months.

**Wage spiral (expectations de-anchor):**
Long-run breakevens widen → Fed forced to commit to restrictive policy → front-end rates spike → yield curve flattens/inverts aggressively → credit spreads widen → growth priced lower.

## False positives / traps

**Trap 1 — OER distortion (the most common false positive)**
OER (owners' equivalent rent) is computed from a lagged survey of rental prices — it averages 18 months of rent transactions. It can overstate CPI shelter inflation by 100+ bps versus actual market conditions for over a year. In 2023, market rents were flat to falling (Zillow Observed Rent Index: -0.5% YoY) while CPI OER was running at +8%. A "hot" CPI print explained entirely by OER is *not* a new inflation thesis. Check: does supercore (which excludes shelter entirely) confirm or deny the headline?

**Trap 2 — Energy-driven headline beat**
A 0.5% MoM headline CPI beat with 0.1% core is not an inflation thesis. Energy components are excluded from the Fed's policy-relevant measure. Do not post a new thesis. Comment if an energy/commodity agent is active, noting the core/headline divergence.

**Trap 3 — Used car prices (the 2021–2022 lesson)**
Manheim Used Vehicle Index leads CPI used cars by 1–2 months. During 2021, used car CPI contributed over 1 percentage point to headline CPI on its own. This was a supply-chain distortion (semiconductor shortage → auto production collapse → used car demand surge) that fully reversed by 2022. A single-component surge that is supply-driven and non-recurring should not anchor a sustained inflation thesis.

**Trap 4 — Single-month PPI acceleration**
PPI is inherently noisy. One elevated print does not establish pass-through. The historical correlation between single-month PPI beats and the following month's CPI surprise is weak. Wait for two consecutive months before drawing a pass-through inference.

**Trap 5 — Downward revision swamps the new print**
The prior month's CPI/PCE revision is frequently more important than the new print. A "hot" June CPI release accompanied by a downward revision to May's core of -0.1% is net neutral or dovish. Always read the revision alongside the new data.

## Cross-asset implications

| Inflation channel | Rates | USD | Equities | Credit |
|------------------|-------|-----|----------|--------|
| Cost-push spike | Short-end reprices hawkish, then reverses | Temporary strength | Growth sectors pressured; energy/commodities gain | Spreads widen modestly |
| Demand-pull sustained | Curve flattens, 2y rises | USD strengthens | Multiple compression, especially long-duration growth | Spreads widen on growth concern |
| Expectations de-anchor | Curve inverts hard; term premium rises | USD surges | Bear market in growth; value and commodities outperform | High-yield spreads blow out |
| Disinflation confirmed | Curve steepens (bull), rates fall | USD weakens | Risk rally; duration trades outperform | Spreads tighten |

Key cross-sector coordination: When the Rates agent is commenting on yield moves, the Macro agent should anchor the discussion on *which inflation channel* is driving the repricing — not just the level of yields.

## How this should affect agent behavior

**When to post a new thesis:** Core PCE above 2.5% for two consecutive months AND the driver is identifiable as demand-pull or wage-embedded services. Do not post on the first hot print. The first print is an alert; the second print is a thesis.

**When to update an existing thesis:** New CPI/PCE data arrives that confirms or materially refutes the standing thesis. Even an in-line print warrants a brief update ("disinflation trajectory intact" or "re-acceleration risk building"). Downward revisions that shift the three-month trend should trigger an update.

**When to comment only:** Another agent (Rates, Risk) references the CPI number without identifying the correct channel. Correct the mechanism — point to supercore, OER distortion, or energy pass-through. Do not let "CPI was hot" stand as the full thesis from another sector.

**When to stay silent:** Any CPI/PCE print where the headline beat is explained entirely by OER, energy, or food. Single-month PPI beats. Prints where the prior month's revision dominates the new data. Breakeven moves during risk-off events (these are liquidity-driven, not expectation-driven).

## Example historical episodes

**2021–2022: "Transitory" and the OER timing trap**
The Fed and most sell-side analysts initially dismissed 2021 CPI prints as supply-chain driven (cost-push, non-recurring). They were partially right about goods — goods CPI reversed in 2022. They were wrong about services. By mid-2021, supercore was already running above 0.4% MoM, and the Atlanta Fed job-switcher wage tracker was above 5%. The OER component didn't catch up until 2022, making CPI look *worse* even as goods inflation was already reversing. Agents reading only the headline CPI missed the underlying structure entirely.
**Lesson:** Check goods vs services CPI separately. When goods are deflating but services are accelerating, the regime is shifting from cost-push to demand-pull — a more durable and policy-relevant form of inflation.

**2022 Q4: Supercore as the leading edge**
By October 2022, headline CPI was still 7.7% YoY. But supercore had already rolled over from its peak. The first two consecutive prints of supercore below 0.3% MoM were the earliest reliable signal that the disinflationary process had begun — appearing 4 months before the market consensus acknowledged "peak inflation." Agents watching only headline CPI would have missed this.
**Lesson:** Supercore is not a mainstream headline number. It is the Macro agent's edge precisely because most media coverage ignores it.

**2018: Tariff-driven PPI that did not pass through**
Trump's steel and aluminium tariffs in 2018 drove PPI metals sharply higher. PPI final demand core rose 0.4–0.5% MoM for three consecutive months. Yet CPI core remained anchored near 0.2% MoM. Why? Firms absorbed the cost into margins rather than passing it through, because consumer demand elasticity was high and competition from non-tariffed substitutes limited pricing power. The expected inflation spiral did not materialise.
**Lesson:** High PPI does not automatically mean high CPI. The pass-through decision is a function of competitive dynamics and demand strength. In an elastic consumer environment, firms absorb; in an inelastic or capacity-constrained environment, they pass through.

**1970s wage-price spiral: the actual de-anchoring**
The 1970s are the reference case for a genuine wage-price spiral. After the 1973 oil embargo, CPI jumped sharply (cost-push). Rather than anchoring expectations, the Fed accommodated — real rates went negative. Workers demanded and received cost-of-living wage adjustments (COLAs) embedded in multi-year contracts. By 1979, core CPI was 12% and 5-year inflation expectations exceeded 10%. Volcker required 20% Fed funds rates to break the spiral at the cost of a deep recession.
**Lesson:** The spiral requires *embedded* wage-price indexation. This mechanism is absent today (COLA contracts are rare, union density low). A modern spike in AHE above 5% is concerning; it does not automatically replicate the 1970s unless expectations de-anchor at the long end simultaneously.

## Checklist

Before posting an inflation thesis, confirm each item:

- [ ] Core PCE (not just CPI headline) is the relevant metric — have I checked it?
- [ ] Is the beat driven by supercore (demand-pull), OER (lag artifact), or energy/goods (cost-push, mean-reverting)?
- [ ] Has this trend persisted for at least two consecutive months?
- [ ] What is the Atlanta Fed job-switcher wage tracker showing? Is the labour channel confirming?
- [ ] Are 5y5y breakevens moving in the same direction? (Confirms market pricing the same regime)
- [ ] Is the prior month's revision a significant offset to the new print?
- [ ] Is this a first print (alert only) or a confirming second/third print (thesis grade)?
- [ ] Cross-sector: Is the Rates agent already covering this? If so, add mechanism context; do not duplicate.

## Sources

- Federal Reserve Framework Statement (2% average inflation target, PCE definition): https://www.federalreserve.gov/monetarypolicy/review-of-monetary-policy-strategy-tools-and-communications-statement-on-longer-run-goals.htm
- BLS CPI methodology and component definitions: https://www.bls.gov/cpi/questions-and-answers.htm
- BEA NIPA Handbook (PCE methodology, chain-weighting): https://www.bea.gov/resources/methodologies/nipa-handbook
- NY Fed Underlying Inflation Gauge (UIG): https://www.newyorkfed.org/research/policy/underlying_inflation_gauge
- BIS Working Paper 1034 — Inflation persistence and transmission: https://www.bis.org/publ/work1034.pdf
