# Equities historical starter pack

_Auto-generated historical context pack._

Generated: 2026-04-05T14:43:48.061Z
Historical floor: 1990-01-01

## Why this exists

Index and sector proxy history that helps the equities agent read leadership, breadth concentration, and rotation across market regimes.

Use this pack as durable sector memory. It is meant to help the agent compare current conditions with older cycles, squeezes, disinflations, inventory shocks, valuation resets, and recovery phases.

## How to use it

- Upload this markdown into the relevant agent memory after a quick human review.
- Pair it with event playbooks, policy reports, and post-mortems rather than treating it as a standalone forecast engine.
- Refresh it periodically so new regimes get added without losing the long historical anchors.

## Series included

### Nonfarm payrolls
- Source: FRED
- Coverage: 1990-01-01 to 2026-03-01 (435 observations)
- Latest: 158,637 lin on 2026-03-01
- Change versus previous observation: +0.11%
- Approximate one-year change: +0.16%
- Why it matters: Use for labour momentum, soft-landing versus recession comparisons, and policy durability.
- Local normalized data file: knowledge/data-lake/normalized/fred_nonfarm_payrolls.json

### Retail sales
- Source: FRED
- Coverage: 1992-01-01 to 2026-02-01 (410 observations)
- Latest: 738,366 lin on 2026-02-01
- Change versus previous observation: +0.60%
- Approximate one-year change: +3.71%
- Why it matters: Use for consumer-strength, demand rotation, and growth breadth context.
- Local normalized data file: knowledge/data-lake/normalized/fred_retail_sales.json

### Industrial production
- Source: FRED
- Coverage: 1990-01-01 to 2026-02-01 (434 observations)
- Latest: 102.55 lin on 2026-02-01
- Change versus previous observation: +0.15%
- Approximate one-year change: +1.44%
- Why it matters: Use for cyclical growth, manufacturing regime, and commodity-demand analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_industrial_production.json

### Real GDP proxy
- Source: FRED
- Coverage: 1990-01-01 to 2025-10-01 (144 observations)
- Latest: 31,442.48 lin on 2025-10-01
- Change versus previous observation: +1.11%
- Approximate one-year change: +5.42%
- Why it matters: Use for long-cycle growth regime comparisons and macro narrative anchoring.
- Local normalized data file: knowledge/data-lake/normalized/fred_gdp.json

### US 10Y yield
- Source: FRED
- Coverage: 1990-01-02 to 2026-04-02 (9068 observations)
- Latest: 4.31 lin on 2026-04-02
- Change versus previous observation: -0.46%
- Approximate one-year change: +0.94%
- Why it matters: Use for duration shock analogs, equity multiple pressure, and macro discount-rate context.
- Local normalized data file: knowledge/data-lake/normalized/fred_us10y.json

### VIX
- Source: FRED
- Coverage: 1990-01-02 to 2026-04-01 (9156 observations)
- Latest: 24.54 lin on 2026-04-01
- Change versus previous observation: -2.81%
- Approximate one-year change: -27.01%
- Why it matters: Use for volatility spikes, de-risking episodes, and sentiment washout analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_vix.json

### US high-yield spread
- Source: FRED
- Coverage: 1996-12-31 to 2026-04-02 (7639 observations)
- Latest: 3.17 lin on 2026-04-02
- Change versus previous observation: +0.32%
- Approximate one-year change: -21.14%
- Why it matters: Use for credit stress, financing conditions, and cross-asset risk-off confirmation.
- Local normalized data file: knowledge/data-lake/normalized/fred_high_yield_spread.json

### Copper spot
- Source: FRED
- Coverage: 1992-01-01 to 2026-02-01 (410 observations)
- Latest: 12,951.35 lin on 2026-02-01
- Change versus previous observation: -0.27%
- Approximate one-year change: +298.86%
- Why it matters: Use for industrial cycle strength and China-sensitive growth analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_copper.json

### SPY monthly
- Source: Alpha Vantage
- Coverage: 1999-12-31 to 2026-04-02 (317 observations)
- Latest: 655.83 on 2026-04-02
- Change versus previous observation: +0.84%
- Approximate one-year change: +19.62%
- Why it matters: Use for broad US equity trend, drawdown analogs, and cross-asset comparison.
- Local normalized data file: knowledge/data-lake/normalized/av_spy_monthly.json

### QQQ monthly
- Source: Alpha Vantage
- Coverage: 1999-12-31 to 2026-04-02 (317 observations)
- Latest: 584.98 on 2026-04-02
- Change versus previous observation: +1.35%
- Approximate one-year change: +23.62%
- Why it matters: Use for growth leadership, duration sensitivity, and concentration regime analogs.
- Local normalized data file: knowledge/data-lake/normalized/av_qqq_monthly.json

### IWM monthly
- Source: Alpha Vantage
- Coverage: 2000-06-30 to 2026-04-02 (311 observations)
- Latest: 251.29 on 2026-04-02
- Change versus previous observation: +1.33%
- Approximate one-year change: +30.35%
- Why it matters: Use for domestic cyclicality, breadth, and financing-condition sensitivity.
- Local normalized data file: knowledge/data-lake/normalized/av_iwm_monthly.json

### XLE monthly
- Source: Alpha Vantage
- Coverage: 1999-12-31 to 2026-04-02 (317 observations)
- Latest: 59.25 on 2026-04-02
- Change versus previous observation: -3.28%
- Approximate one-year change: +51.94%
- Why it matters: Use for equity-energy linkage, oil beta, and inflation-through-margins analogs.
- Local normalized data file: knowledge/data-lake/normalized/av_xle_monthly.json

### XLF monthly
- Source: Alpha Vantage
- Coverage: 1999-12-31 to 2026-04-02 (317 observations)
- Latest: 49.53 on 2026-04-02
- Change versus previous observation: +0.32%
- Approximate one-year change: +3.14%
- Why it matters: Use for bank-beta, rate-sensitivity, and curve-linked equity analogs.
- Local normalized data file: knowledge/data-lake/normalized/av_xlf_monthly.json

### XLK monthly
- Source: Alpha Vantage
- Coverage: 1999-12-31 to 2026-04-02 (317 observations)
- Latest: 135.99 on 2026-04-02
- Change versus previous observation: +2.33%
- Approximate one-year change: +30.26%
- Why it matters: Use for long-duration equity leadership and policy-sensitivity analogs.
- Local normalized data file: knowledge/data-lake/normalized/av_xlk_monthly.json

### VIX near-term (9-day)
- Source: FRED
- Coverage: 2007-12-04 to 2026-04-01 (4610 observations)
- Latest: 24.86 lin on 2026-04-01
- Change versus previous observation: -2.70%
- Approximate one-year change: +13.15%
- Why it matters: Use for vol term structure, hedging urgency, and short-dated fear spikes vs longer-dated vol.
- Local normalized data file: knowledge/data-lake/normalized/fred_vxvcls.json

## Agent framing prompts

- Compare index leadership with prior narrow-breadth, broadening, and derating regimes.
- Check whether rates and credit conditions support or fight the current equity trend.
- Separate tactical momentum from durable earnings or sector-rotation change.