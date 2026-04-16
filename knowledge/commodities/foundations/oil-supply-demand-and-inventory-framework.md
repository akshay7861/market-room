---
agent: Commodities
doc_type: foundation
priority: high
topics:
  - EIA weekly petroleum report
  - crude oil inventories
  - Cushing Oklahoma
  - refinery utilization
  - WTI vs Brent spread
  - gasoline and distillate stocks
  - seasonal adjustment
  - SPR (Strategic Petroleum Reserve)
  - US crude production
  - API survey
instruments:
  - WTI crude futures (CL1, CL2)
  - Brent crude futures (CO1)
  - WTI-Brent spread
  - gasoline futures (RB1)
  - heating oil / distillate futures (HO1)
  - ULSD (ultra-low sulphur diesel)
market_regimes:
  - supply deficit (inventories drawing below seasonal norms)
  - supply surplus (inventories building above seasonal norms)
  - demand destruction (demand below seasonal expectations)
  - refinery disruption (feedstock demand reduced, crude builds artificially)
  - geopolitical supply disruption
trigger_patterns:
  - crude draw >4M bbl vs consensus expectation
  - crude build >5M bbl vs consensus expectation
  - Cushing stocks below 25M bbl
  - Cushing stocks above 45M bbl
  - refinery utilization below 85%
  - WTI-Brent spread moves >$3 in one week
  - STEO trajectory diverged by 3+ consecutive weekly prints
use_when:
  - every Wednesday 10:30am ET (EIA Weekly Petroleum Status Report)
  - Tuesday evening API preview
  - monthly EIA Short-Term Energy Outlook (STEO) release
  - OPEC meeting weeks (as context for supply picture)
  - major weather events affecting refinery or pipeline operations
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-09
source_urls:
  - https://www.eia.gov/petroleum/supply/weekly/
  - https://www.eia.gov/steo/
  - https://www.eia.gov/dnav/pet/pet_sum_sndw_dcus_nus_w.htm
  - https://www.iea.org/data-and-statistics/data-product/oil-information
---

# Oil Supply-Demand and Inventory Framework

## Why this matters

The EIA Weekly Petroleum Status Report is the most significant routine data release in the commodity markets — released every Wednesday at 10:30am ET, it is the market's primary real-time read on US supply-demand balance. But reading the number in isolation is not enough. A 5 million barrel crude draw in summer means something completely different from the same draw in winter. A crude build during low refinery utilization is not a bearish demand signal — it is a refinery disruption artifact. The Commodities agent's job is to contextualise every print against the seasonal baseline, the STEO trajectory, the Cushing situation, and the refinery operating rate before drawing any conclusion.

## Core mechanism

**The EIA report structure:**
The report covers the US petroleum supply chain from crude oil through refined products. The components in order of market importance:

**1. Crude oil stocks (commercial, excluding SPR)**
The headline number. Reported in millions of barrels. The EIA also reports the change from the prior week and the year-ago comparison. The market focus is on the *surprise relative to the API survey* (released Tuesday evening) and the *surprise relative to analyst consensus* (Bloomberg survey). The absolute level matters less than the directional surprise.

**2. Cushing, Oklahoma crude stocks**
Cushing is the physical delivery hub for WTI futures contracts. The Cushing stock level is the most direct physical-market indicator of prompt WTI supply. At low Cushing levels (<25M bbl), physical buyers competing for prompt delivery push the front of the WTI curve into backwardation and narrow the WTI-Brent spread. At high Cushing levels (>45M bbl), the hub is congested; WTI trades at a discount to Brent as producers seek other outlets.

**3. Refinery inputs and utilization rate**
Expressed as a percentage of total operable capacity (approximately 18M bbl/day for the US). This determines how much crude is being consumed by refiners. Low utilization (below 85%) = refineries processing less crude, which causes crude to build even if actual demand for oil products (gasoline, diesel) is robust. This is the most common source of misread crude data: a crude build during refinery maintenance is not a bearish demand signal.

**4. Gasoline stocks and demand (implied)**
Most important April–September (driving season). Implied gasoline demand is calculated from product supplied data — a 4-week moving average is more reliable than single-week implied demand, which is noisy. A gasoline stock draw during driving season with improving implied demand is a bullish refined product signal.

**5. Distillate stocks (diesel/heating oil)**
Most important October–March (heating season + industrial/trucking demand). Low distillate stocks (approaching 100M bbl in winter) create a tight heating oil market and support diesel prices, which in turn support refinery margins and crude throughput demand.

**The API preview — Tuesday evening:**
The American Petroleum Institute releases its own private industry survey on Tuesday evening (~4:30pm ET). The API survey covers crude, gasoline, and distillates but is less comprehensive than EIA. It is a directional preview, not a substitute. A large API draw that is confirmed by EIA the following morning is a reinforcing signal. An API draw that EIA contradicts generates sharp intraday volatility on Wednesday morning as longs who built on the API signal must reassess.

## What to watch

In order of importance:

1. **Crude draw/build vs consensus** — the surprise relative to expectation, not the absolute change
2. **Cushing stocks level and direction** — below 25M bbl or above 45M bbl are the threshold regions
3. **Refinery utilization rate** — contextualises whether crude change reflects throughput demand or operational anomaly
4. **Product stock changes (gasoline in summer, distillates in winter)** — refined product balance confirms or denies the crude signal
5. **US crude production weekly estimate** — directional trend over 4-week period
6. **STEO monthly forecast vs cumulative weekly actuals** — is the supply/demand balance tracking the model or diverging?
7. **WTI-Brent spread** — logistics and physical tightness signal; a sudden spread move can reveal regional imbalances before crude data confirms them

## Typical market path

**Large crude draw (>4M bbl surprise):**
WTI spikes immediately on EIA release (10:30am ET) — typically +1.5% to +3% in the first 15 minutes. If Cushing also drew and refinery utilization is normal (not depressed), the signal is confirmed: genuine demand exceeded supply at the physical hub. The move typically holds through the session. If the curve simultaneously moves into deeper backwardation (M1–M2 spread widens), physical players are confirming the signal with real positions.

**Large crude build (>5M bbl surprise):**
WTI falls -1.5% to -3% immediately. If Cushing built and utilization was high (refinery running hard but still building inventory), the signal is a genuine demand shortfall. If utilization was low (refinery maintenance), the build is artificial — expect the market to partially recover within 1–2 hours as the context is digested.

**Cushing below 25M bbl — WTI physical premium:**
As Cushing empties, physical players bid aggressively for prompt WTI delivery (they need the barrel at the hub). The WTI M1–M2 spread moves into strong backwardation (>$1.50/bbl). The WTI-Brent spread narrows or inverts as US tightness dominates global. In extreme cases, this is when WTI can trade at a premium to Brent — a signal visible before the EIA inventory data fully captures it.

## False positives / traps

**Trap 1 — Low refinery utilization masking demand**
This is the single most common misread. When refineries are in planned maintenance (Q1 seasonal) or experiencing an unplanned outage, they consume less crude. This causes crude to build regardless of end-product demand. A crude build during a period of utilization below 85% should trigger a utilization-adjusted interpretation: if gasoline and distillate stocks are drawing even while refineries are reducing throughput, actual product demand is strong. The crude build is the artifact, not the signal.

**Trap 2 — SPR releases distorting commercial stock comparisons**
The US Strategic Petroleum Reserve (SPR) holds approximately 350–400M bbl. When the Department of Energy releases oil from the SPR (as it did massively in 2022: ~180M bbl released), the releases appear in the weekly report as crude stock additions to commercial stocks (the oil flows from government storage to commercial buyers). A "commercial crude build" during an active SPR release period is entirely artificial — the commercial market hasn't become more supplied; the government has transferred storage from one bucket to another. Always check the weekly SPR change and separate it from commercial stock movements.

**Trap 3 — Gulf Coast hurricane distortions**
Gulf Coast refinery shutdowns from hurricanes (June–November season) simultaneously reduce crude demand (less throughput) and reduce gasoline supply (less production). This causes crude to build and gasoline to draw — an unusual combination that signals disruption, not a demand/supply fundamental shift. Single-event disruptions self-correct within 2–4 weeks. Post a comment noting the hurricane context; do not write a thesis on the supply/demand balance from a hurricane-week print.

**Trap 4 — API vs EIA divergence interpretation**
When the API survey shows a large draw but the EIA the next morning shows a build (or vice versa), the EIA is authoritative. The API draw was wrong — possibly because API coverage of small producers and regional terminals is incomplete. The WTI price movement driven by the API preview will reverse when EIA contradicts it. An agent posting on the API number without waiting for EIA confirmation is taking positioning risk on an imperfect preliminary estimate.

**Trap 5 — Year-over-year comparisons with 2020**
2020 saw demand destruction of approximately 10 million barrels per day in April — an unprecedented collapse. Year-over-year inventory comparisons that include 2020 as the base period are structurally distorted. A crude build that is "below year-ago levels" may simply reflect how extreme the 2020 base was. Use 5-year seasonal averages (available in the EIA report) rather than year-ago comparisons for context.

## Cross-asset implications

| Inventory signal | WTI/Brent | Energy equities | USD | Broader equities |
|-----------------|-----------|-----------------|-----|-----------------|
| Large crude draw + Cushing tight | Bullish +2–4% | Energy sector outperforms | Slightly bearish (commodity rally often USD-negative) | Mixed; energy offset by broad multiple concern |
| Large crude build + utilization normal | Bearish -2–3% | Energy underperforms | Slightly bullish | Depends on growth narrative |
| Refinery outage → crude build + product draw | WTI near-term neutral; refinery margins widen | Refiner stocks fall; upstream neutral | Neutral | Neutral |
| Cushing nearing capacity (>45M bbl) | WTI discount to Brent widens | Pipeline and storage equities potentially benefit | Neutral | Neutral |
| STEO trajectory divergence (3+ weeks) | Thesis-grade implication for 3-month price view | Sector positioning signal | Macro-driven | Macro-driven |

**Cross-sector: Macro agent connection**
When crude draws coincide with strong refinery utilization and high gasoline demand, this is a signal of robust consumer activity — inform the Macro agent. When crude builds coincide with refinery outages in an otherwise healthy demand environment, isolate the signal correctly before the Macro agent draws conclusions about industrial demand.

## How this should affect agent behavior

**When to post a new thesis:** EIA surprise exceeds 4M bbl crude (draw) or 5M bbl (build) AND the mechanism is identifiable — demand surge, production shortfall, Cushing tightness, or seasonal anomaly. OR: STEO model trajectory is being violated by 3+ consecutive weeks of data. State the mechanism, the magnitude of the surprise, the STEO context, and the price implication with a timeframe.

**When to update an existing thesis:** Weekly EIA data that confirms the supply/demand balance described in the prior post. Even an in-line week is worth noting as trajectory confirmation. A Cushing stock move that validates the hub-tightness thesis. An STEO update that revises the supply/demand balance you had been tracking.

**When to comment only:** Prints within ±1–2M bbl of consensus with no anomaly in Cushing, utilization, or production. Another agent (Macro, Risk) cites oil prices without noting the inventory context — add the EIA context to their thread. Refinery disruption weeks where the crude build is clearly an artifact.

**When to stay silent:** API preview alone (wait for EIA to confirm). Hurricane-week distortions. Prints where SPR releases or fills dominate the stock change. Any week where the EIA number is within ±1M bbl of consensus and WTI was already pre-positioned for the result (the API preview did the work; EIA is a confirmation with no incremental information).

## Example historical episodes

**2022: Record SPR releases distorting the commercial supply picture**
In 2022, the Biden administration released approximately 180M bbl from the SPR between April and November — the largest SPR release in history. During this period, commercial crude stocks appeared to be building even as OPEC cut and Russian supply was disrupted. The apparent "bearish inventory" picture was entirely an SPR distortion. Traders who removed the SPR releases from the commercial inventory change saw that true underlying commercial demand was exceeding supply significantly — the correct read for crude prices, which rose to $130/bbl at the peak.
**Lesson:** Always isolate the SPR component before characterising the commercial supply/demand balance.

**2014–2016: US shale surge creating persistent builds — and then the OPEC capitulation**
From 2014 to early 2016, US crude production rose from 8M to 9.6M bbl/day. EIA weekly data showed persistent crude builds of 2–4M bbl/week for months. Cushing reached its practical storage capacity (approximately 70M bbl at the time) in early 2015. OPEC attempted to hold market share rather than cut production. The result: WTI fell from $100 to $26/bbl by February 2016. The EIA weekly data told this story every Wednesday — persistent builds, rising Cushing stocks, widening WTI-Brent contango. An agent reading only OPEC statements and geopolitical headlines would have missed the supply glut that the EIA data was signalling clearly throughout.
**Lesson:** Persistent multi-week builds that violate seasonal patterns, with Cushing approaching capacity limits and the curve in deep contango, are unambiguous bearish signals that override OPEC production restraint language.

**2023: EIA overestimating US production weekly vs monthly reconciliation**
During 2023–2024, the EIA's weekly crude production estimate (used in the weekly petroleum report) consistently exceeded the subsequent monthly figures when STEO reconciled the data. The weekly figures showed US production at 13.0–13.2 Mb/d; monthly reconciled data showed 12.6–12.8 Mb/d. This 300–400 kb/d gap meant that crude builds being attributed to high US production were partly a statistical artifact — once corrected, the supply/demand balance was tighter than the weekly data implied.
**Lesson:** The EIA weekly production estimate is a rough approximation. When multiple consecutive weeks show builds attributed to high US production, verify against the monthly STEO reconciliation before building a bearish production-surplus thesis.

## Checklist

Before posting an EIA inventory thesis:

- [ ] What was the crude stock change vs Bloomberg consensus (not vs API)?
- [ ] What is the Cushing stock level — in threshold zone (<25M or >45M bbl)?
- [ ] What is the current refinery utilization rate — is it depressed (<85%) for seasonal or operational reasons?
- [ ] Is there an active SPR release or fill? Have I separated SPR from commercial stocks?
- [ ] Is this a weather-distorted week (hurricane season, severe winter weather)?
- [ ] Are product stocks (gasoline in summer, distillates in winter) confirming or contradicting the crude signal?
- [ ] Is this consistent with the STEO trajectory, or is it a third consecutive weekly divergence (thesis-grade)?
- [ ] Have I checked the WTI-Brent spread direction as a corroborating physical market signal?
- [ ] Am I using the 5-year seasonal average for context rather than the distorted 2020 baseline?

## Sources

- EIA Weekly Petroleum Status Report (released every Wednesday 10:30am ET): https://www.eia.gov/petroleum/supply/weekly/
- EIA Short-Term Energy Outlook (monthly supply/demand balance): https://www.eia.gov/steo/
- EIA US petroleum balance table (structured weekly stock data): https://www.eia.gov/dnav/pet/pet_sum_sndw_dcus_nus_w.htm
- IEA Oil Information — global supply/demand balance: https://www.iea.org/data-and-statistics/data-product/oil-information
