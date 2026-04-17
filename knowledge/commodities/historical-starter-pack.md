# Commodities Agent — Market Frameworks & Playbooks

_Last updated: 2026-04-17. Sector memory for the Commodities Agent. Use these frameworks to reason about supply tightness, demand signals, and the inflation transmission chain — not just to describe price levels._

---

## Oil Market Structure Framework

Oil price is determined by the interplay of physical supply tightness, financial positioning, and geopolitical risk premium. Each driver has a different persistence:

| Driver | Typical persistence | How to detect | Signal quality |
|--------|-------------------|--------------|---------------|
| Geopolitical risk premium | 2–6 weeks | Spike without inventory draw | Fade unless supply is actually disrupted |
| OPEC production discipline | 3–12 months | Saudi OSP adjustments, quota compliance | High — structural |
| Inventory tightness | 1–3 months | EIA weekly draws >5mb | High — physical reality |
| Demand destruction (high price) | 3–6 months | Gasoline demand data, PMI falls | Medium — lagged |
| Financial positioning | Days to weeks | COT net speculative positioning | Low — reverting |

**Most important rule**: a spike in WTI NOT accompanied by consecutive inventory draws is a positioning/geopolitical move and should be faded within 3–6 weeks. A sustained rally WITH weekly draws >5mb for 3+ consecutive weeks is structural and should be held.

---

## WTI Price Regime Map

Use these price zones as the framework, not support/resistance levels:

**WTI below $65/bbl:**
- US shale producers hesitate to expand drilling (break-even for most is $55–65)
- OPEC likely to cut production to support price
- Refinery margins compress; downstream margins improve
- Signal: supply destruction eventually coming; hold for reversal unless demand is collapsing

**WTI $65–$80/bbl:**
- Shale break-even zone — production growth is modest
- OPEC comfortable (fiscal break-even for Saudi is ~$80–85)
- No demand destruction
- "Goldilocks" zone for the oil market

**WTI $80–$95/bbl:**
- Shale activity picks up; OPEC may ease quotas
- Inflation impulse starts materialising in headline CPI in 2–3 months
- EM importers face balance of payments pressure
- Demand begins to soften in price-sensitive markets

**WTI above $95/bbl:**
- Demand destruction begins within 3–6 months
- Geopolitical premium likely embedded
- US President may release SPR
- Inflation feeds CPI with 2–3 month lag; Fed constrained from cutting
- Historically unsustainable for >6 months without a supply crisis

---

## EIA Inventory Signal

The weekly EIA petroleum status report is the most direct physical signal for oil. Learn to read it:

**Bullish draws:**
- Crude stocks declining >5mb in a single week = significant draw; price positive
- 3+ consecutive weeks of draws = genuine tightness
- Cushing inventories (delivery point for WTI futures) drawing → price backwardation

**Bearish builds:**
- Crude stocks building >3mb = oversupply; price negative
- 3+ consecutive builds = demand shortfall or supply surge
- SPR release adds to builds without reflecting real demand picture

**Gasoline demand read-through:**
- Gasoline demand above 9mb/day = healthy US consumer
- Below 8mb/day = demand destruction beginning (historically associated with recessions)
- Seasonal adjustment matters: demand always drops in Q1; compare YoY not MoM

**Backwardation vs contango:**
- Backwardation (spot > futures) = market is tight now; incentive to deliver immediately
- Contango (futures > spot) = oversupplied; incentive to store
- Curve flipping from contango to backwardation = the most reliable "physical tightness is real" signal

---

## Copper as Global Demand Barometer

Copper is "Dr. Copper" — it has the most industrial applications of any metal and is the best single-metal proxy for global industrial demand.

**Copper signals:**
- Copper YoY >+20% = China / global industrial acceleration — supports oil, EM, and cyclical equities
- Copper YoY flat while oil rising = financial-driven oil move, not demand-driven (more likely to fade)
- Copper YoY <-10% = global industrial slowdown — typically precedes PMI weakness by 1–2 months
- Copper and oil both falling = genuine global demand contraction signal

**China copper import premium:**
- When China pays a large premium (SHFE copper vs LME copper premium elevated) = genuine Chinese demand
- When the premium is at or below parity = either stockpiling or weak underlying demand

**Trap**: copper is also traded as a financial asset. Single-week spikes driven by ETF flows or short covering are NOT demand signals. Sustained trend over 4+ weeks is the signal.

---

## Gold Regime Framework

Gold is primarily a real yield trade, secondarily a dollar trade, and only thirdly an "inflation hedge" in the short run.

**Gold bull conditions:**
- 10Y TIPS real yield falling below +1.5% (inverse relationship, r ≈ -0.70 historically)
- Dollar weakening (USD/gold inverse correlation ~-0.45)
- Central bank buying (structural demand — China, India, EM central banks since 2022)
- Geopolitical uncertainty (flight to safety alongside JPY and CHF)

**Gold bear conditions:**
- 10Y TIPS real yield rising above +2.0% (opportunity cost of holding gold becomes significant)
- Dollar strengthening sharply (reduces non-USD purchasing power for gold)
- Risk appetite rising (investors rotate from gold to risk assets)

**Level context**: GLD at ~$440 (Apr 2026) = gold near all-time highs in nominal terms. At 1.89% real yields, gold is priced for real yields to decline further. If real yields rise back above 2.0%, gold faces 5–10% downside.

---

## Commodity-to-CPI Transmission Chain

Use these lags when connecting commodity moves to macro policy implications:

| Commodity | CPI transmission | Lag | Magnitude |
|-----------|----------------|-----|-----------|
| WTI crude | Energy CPI (gasoline) | 4–8 weeks | ~1:0.1 (10% WTI rise ≈ 0.8pp headline CPI) |
| WTI crude (sustained) | Core CPI via transportation, petrochemicals | 2–4 months | Lower, ~0.3pp per 10% WTI |
| Natural gas | Utility CPI | 2–3 months | Regional; more acute in winter |
| Wheat | Food CPI | 3–5 months | Larger in EM than DM |
| Copper | Producer price index → core goods inflation | 4–6 months | Modest direct; larger indirect |

**Policy implication**: WTI rising >20% YoY historically feeds into headline CPI by +0.8–1.2pp within 3 months. This is Fed-relevant — a sustained oil spike can close the rate-cutting window even if core PCE is behaving.

---

## Geopolitical Premium Playbook

Not all geopolitical events create lasting oil moves:

**Geopolitical moves that FADE within 3–6 weeks (supply not actually disrupted):**
- Tensions in Middle East without actual production stoppage
- Sanctions announced but not yet implemented
- Political instability in a non-OPEC producer

**Geopolitical moves that HOLD (supply actually disrupted):**
- Strait of Hormuz closure / serious threat (17mb/day flows through Hormuz)
- Major OPEC producer (Saudi, UAE, Iraq) production stoppage
- Sanctions with actual enforcement cutting >1mb/day from supply

**Rule**: ask "Is oil ACTUALLY not flowing?" before deciding whether a geopolitical spike is structural. If the answer is "not yet, but risk is elevated," the move is a premium to fade within 1–2 months as the risk premium decays.

---

## Failure Modes to Avoid

**1. Extrapolating geopolitical oil spikes.** Supply shock spikes that are NOT accompanied by actual inventory draws typically fade within 3–6 weeks. The 2022 Russia-Ukraine spike: WTI from $92 to $130 in 3 weeks. Half of that premium unwound within 6 weeks. The physical draw only materialized 3–4 months later via export route disruptions.

**2. Using copper alone as China confirmation without corroborating iron ore and steel.** Copper can be driven by ETF flows and financial demand. When copper rises but iron ore (steelmaking) is flat or falling, the China industrial signal is NOT confirmed. Check multiple metals.

---

## Key Levels Reference

| Instrument | Current | Note |
|-----------|---------|------|
| WTI crude | ~$91/bbl | Upper part of sustainable range; OPEC discipline holding |
| Brent crude | ~$103/bbl | WTI/Brent spread ~$12 — elevated (geopolitical premium) |
| US crude stocks | ~873K MBBL | Above 5-year average — not structurally tight yet |
| Copper | ~$12,529/MT | +271% YoY — significant China/industrial demand signal |
| Natural gas | ~$2.79/MMBtu | Below $3 — low; utility cost deflation |
| Wheat | ~$194/MT | Elevated vs. 5Y average; food inflation risk |
| GLD (gold proxy) | ~$440 | Near all-time highs; priced for real yield decline |
| WTI YoY% | +34% | Above 20% — CPI feed-through in 2–3 months |
