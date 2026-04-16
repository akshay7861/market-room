# Commodities historical starter pack

_Auto-generated historical context pack._

Generated: 2026-04-05T14:43:48.061Z
Historical floor: 1990-01-01

## Why this exists

Commodity spot prices and inventory anchors that help the commodities agent reason about supply shocks, inflation impulse, and margin pressure.

Use this pack as durable sector memory. It is meant to help the agent compare current conditions with older cycles, squeezes, disinflations, inventory shocks, valuation resets, and recovery phases.

## How to use it

- Upload this markdown into the relevant agent memory after a quick human review.
- Pair it with event playbooks, policy reports, and post-mortems rather than treating it as a standalone forecast engine.
- Refresh it periodically so new regimes get added without losing the long historical anchors.

## Series included

### Industrial production
- Source: FRED
- Coverage: 1990-01-01 to 2026-02-01 (434 observations)
- Latest: 102.55 lin on 2026-02-01
- Change versus previous observation: +0.15%
- Approximate one-year change: +1.44%
- Why it matters: Use for cyclical growth, manufacturing regime, and commodity-demand analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_industrial_production.json

### 10Y breakeven inflation
- Source: FRED
- Coverage: 2003-01-02 to 2026-04-03 (5817 observations)
- Latest: 2.36 lin on 2026-04-03
- Change versus previous observation: +0.85%
- Approximate one-year change: -0.84%
- Why it matters: Use for inflation expectations and real-rate regime comparisons.
- Local normalized data file: knowledge/data-lake/normalized/fred_breakeven_10y.json

### Copper spot
- Source: FRED
- Coverage: 1992-01-01 to 2026-02-01 (410 observations)
- Latest: 12,951.35 lin on 2026-02-01
- Change versus previous observation: -0.27%
- Approximate one-year change: +298.86%
- Why it matters: Use for industrial cycle strength and China-sensitive growth analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_copper.json

### Henry Hub natural gas
- Source: FRED
- Coverage: 1997-01-07 to 2026-03-30 (7339 observations)
- Latest: 2.88 lin on 2026-03-30
- Change versus previous observation: -3.68%
- Approximate one-year change: -26.72%
- Why it matters: Use for energy inflation, utility pressure, and supply-shock analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_nat_gas.json

### WTI crude spot
- Source: EIA
- Coverage: 1990-01 to 2026-03 (435 observations)
- Latest: 90.84 $/BBL on 2026-03
- Change versus previous observation: +40.82%
- Approximate one-year change: +33.12%
- Why it matters: Use for commodity inflation regimes and crude-demand versus policy interactions.
- Local normalized data file: knowledge/data-lake/normalized/eia_wti_monthly.json

### Brent crude spot
- Source: EIA
- Coverage: 1990-01 to 2026-03 (435 observations)
- Latest: 102.01 $/BBL on 2026-03
- Change versus previous observation: +43.90%
- Approximate one-year change: +40.26%
- Why it matters: Use for global oil shock comparisons and crude benchmark spread framing.
- Local normalized data file: knowledge/data-lake/normalized/eia_brent_monthly.json

### US crude oil ending stocks
- Source: EIA
- Coverage: 1990-01-05 to 2026-03-27 (1891 observations)
- Latest: 876,700 MBBL on 2026-03-27
- Change versus previous observation: +0.58%
- Approximate one-year change: +4.84%
- Why it matters: Use for inventory tightness, supply cushion, and commodity-scarcity regime analogs.
- Local normalized data file: knowledge/data-lake/normalized/eia_us_crude_stocks.json

### GLD monthly
- Source: Alpha Vantage
- Coverage: 2004-12-31 to 2026-04-02 (257 observations)
- Latest: 429.41 on 2026-04-02
- Change versus previous observation: -0.20%
- Approximate one-year change: +41.36%
- Why it matters: Use for gold-risk, real-yield tension, and inflation-hedge analogs when spot history is not available from a stable free feed.
- Local normalized data file: knowledge/data-lake/normalized/av_gld_monthly.json

### XLE monthly
- Source: Alpha Vantage
- Coverage: 1999-12-31 to 2026-04-02 (317 observations)
- Latest: 59.25 on 2026-04-02
- Change versus previous observation: -3.28%
- Approximate one-year change: +51.94%
- Why it matters: Use for equity-energy linkage, oil beta, and inflation-through-margins analogs.
- Local normalized data file: knowledge/data-lake/normalized/av_xle_monthly.json

### AUD/USD
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-27 (9093 observations)
- Latest: 0.69 lin on 2026-03-27
- Change versus previous observation: -0.33%
- Approximate one-year change: +9.21%
- Why it matters: Use for risk-on/off confirmation, China growth proxy, and commodity-demand-through-FX analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_audusd.json

### USD/CAD
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-27 (9093 observations)
- Latest: 1.39 lin on 2026-03-27
- Change versus previous observation: +0.22%
- Approximate one-year change: -2.98%
- Why it matters: Use for oil-linked FX moves, BOC divergence, and commodity-currency regime analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_usdcad.json

### NOK/USD
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-27 (9093 observations)
- Latest: 9.73 lin on 2026-03-27
- Change versus previous observation: +0.58%
- Approximate one-year change: -7.21%
- Why it matters: Use for oil-driven carry, Norges Bank policy, and petrocurrency regime shifts.
- Local normalized data file: knowledge/data-lake/normalized/fred_nokusd.json

### WTI crude daily
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-30 (9110 observations)
- Latest: 104.69 lin on 2026-03-30
- Change versus previous observation: +3.39%
- Approximate one-year change: +50.68%
- Why it matters: Use for daily oil regime, inflation impulse, and demand-supply dynamics at high frequency.
- Local normalized data file: knowledge/data-lake/normalized/fred_wti_daily.json

### Brent crude daily
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-30 (9192 observations)
- Latest: 121.88 lin on 2026-03-30
- Change versus previous observation: +0.34%
- Approximate one-year change: +57.81%
- Why it matters: Use for global crude benchmark, WTI-Brent spread dynamics, and OPEC regime analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_brent_daily.json

### Aluminum
- Source: FRED
- Coverage: 1992-01-01 to 2026-02-01 (410 observations)
- Latest: 3,065.19 lin on 2026-02-01
- Change versus previous observation: -2.20%
- Approximate one-year change: +15.42%
- Why it matters: Use for industrial demand, autos/construction, China smelter capacity, and energy-cost transmission.
- Local normalized data file: knowledge/data-lake/normalized/fred_aluminum.json

### Wheat
- Source: FRED
- Coverage: 1992-01-01 to 2026-02-01 (410 observations)
- Latest: 174.75 lin on 2026-02-01
- Change versus previous observation: +3.25%
- Approximate one-year change: -8.07%
- Why it matters: Use for food inflation, supply-shock analogs (drought, conflict), and agricultural regime shifts.
- Local normalized data file: knowledge/data-lake/normalized/fred_wheat.json

## Agent framing prompts

- Compare today’s commodity tape with prior supply shocks, demand slumps, and inventory squeezes.
- Translate raw-material moves into inflation, margins, and policy risk.
- Call out whether inventory direction confirms or contradicts the price signal.