# Risk / Sentiment historical starter pack

_Auto-generated historical context pack._

Generated: 2026-04-05T14:43:48.061Z
Historical floor: 1990-01-01

## Why this exists

Volatility, credit, cross-asset proxy, and crypto regime history that helps the risk agent spot positioning stress and risk-on or risk-off transitions.

Use this pack as durable sector memory. It is meant to help the agent compare current conditions with older cycles, squeezes, disinflations, inventory shocks, valuation resets, and recovery phases.

## How to use it

- Upload this markdown into the relevant agent memory after a quick human review.
- Pair it with event playbooks, policy reports, and post-mortems rather than treating it as a standalone forecast engine.
- Refresh it periodically so new regimes get added without losing the long historical anchors.

## Series included

### Headline CPI
- Source: FRED
- Coverage: 1990-01-01 to 2026-02-01 (433 observations)
- Latest: 327.46 lin on 2026-02-01
- Change versus previous observation: +0.27%
- Approximate one-year change: +2.66%
- Why it matters: Use for inflation regime changes, policy pressure, and real-income squeeze context.
- Local normalized data file: knowledge/data-lake/normalized/fred_cpi_headline.json

### Unemployment rate
- Source: FRED
- Coverage: 1990-01-01 to 2026-03-01 (434 observations)
- Latest: 4.30 lin on 2026-03-01
- Change versus previous observation: -2.27%
- Approximate one-year change: +2.38%
- Why it matters: Use for recession risk, labour slack, and growth-scare analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_unemployment.json

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

### Fed funds rate
- Source: FRED
- Coverage: 1990-01-01 to 2026-03-01 (435 observations)
- Latest: 3.64 lin on 2026-03-01
- Change versus previous observation: +0.00%
- Approximate one-year change: -15.94%
- Why it matters: Use for tightening and easing cycle analogs, discount-rate framing, and carry context.
- Local normalized data file: knowledge/data-lake/normalized/fred_fedfunds.json

### US 10Y yield
- Source: FRED
- Coverage: 1990-01-02 to 2026-04-02 (9068 observations)
- Latest: 4.31 lin on 2026-04-02
- Change versus previous observation: -0.46%
- Approximate one-year change: +0.94%
- Why it matters: Use for duration shock analogs, equity multiple pressure, and macro discount-rate context.
- Local normalized data file: knowledge/data-lake/normalized/fred_us10y.json

### 10Y minus 2Y curve
- Source: FRED
- Coverage: 1990-01-02 to 2026-04-03 (9069 observations)
- Latest: 0.51 lin on 2026-04-03
- Change versus previous observation: -1.92%
- Approximate one-year change: +50.00%
- Why it matters: Use for curve inversion or steepening analogs and recession timing context.
- Local normalized data file: knowledge/data-lake/normalized/fred_curve_10y2y.json

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

### Broad trade-weighted dollar
- Source: FRED
- Coverage: 2006-01-02 to 2026-03-27 (5072 observations)
- Latest: 120.89 lin on 2026-03-27
- Change versus previous observation: +0.41%
- Approximate one-year change: -4.10%
- Why it matters: Use for dollar squeeze, global liquidity, and policy-divergence regime comparisons.
- Local normalized data file: knowledge/data-lake/normalized/fred_broad_dollar.json

### WTI crude spot
- Source: EIA
- Coverage: 1990-01 to 2026-03 (435 observations)
- Latest: 90.84 $/BBL on 2026-03
- Change versus previous observation: +40.82%
- Approximate one-year change: +33.12%
- Why it matters: Use for commodity inflation regimes and crude-demand versus policy interactions.
- Local normalized data file: knowledge/data-lake/normalized/eia_wti_monthly.json

### GLD monthly
- Source: Alpha Vantage
- Coverage: 2004-12-31 to 2026-04-02 (257 observations)
- Latest: 429.41 on 2026-04-02
- Change versus previous observation: -0.20%
- Approximate one-year change: +41.36%
- Why it matters: Use for gold-risk, real-yield tension, and inflation-hedge analogs when spot history is not available from a stable free feed.
- Local normalized data file: knowledge/data-lake/normalized/av_gld_monthly.json

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

### BTCUSD monthly
- Source: Alpha Vantage
- Coverage: 2010-08-31 to 2026-04-05 (189 observations)
- Latest: 67,219.98 on 2026-04-05
- Change versus previous observation: -1.47%
- Approximate one-year change: -28.63%
- Why it matters: Use for speculative risk appetite, liquidity beta, and crypto-driven sentiment analogs.
- Local normalized data file: knowledge/data-lake/normalized/av_btc_monthly.json

### USD/JPY
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-27 (9093 observations)
- Latest: 160.16 lin on 2026-03-27
- Change versus previous observation: +0.32%
- Approximate one-year change: +6.94%
- Why it matters: Use for carry trade stress, BOJ policy shifts, yen intervention episodes, and liquidity shocks.
- Local normalized data file: knowledge/data-lake/normalized/fred_usdjpy.json

### AUD/USD
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-27 (9093 observations)
- Latest: 0.69 lin on 2026-03-27
- Change versus previous observation: -0.33%
- Approximate one-year change: +9.21%
- Why it matters: Use for risk-on/off confirmation, China growth proxy, and commodity-demand-through-FX analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_audusd.json

### USD/CHF
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-27 (9093 observations)
- Latest: 0.80 lin on 2026-03-27
- Change versus previous observation: +0.44%
- Approximate one-year change: -9.63%
- Why it matters: Use for safe-haven flow detection, SNB intervention episodes, and funding-stress analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_usdchf.json

### US 30Y yield
- Source: FRED
- Coverage: 1990-01-02 to 2026-04-02 (9068 observations)
- Latest: 4.88 lin on 2026-04-02
- Change versus previous observation: -0.61%
- Approximate one-year change: +5.17%
- Why it matters: Use for long-duration repricing, inflation term premium, and pension rebalancing analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_us30y.json

### ICE BofA IG OAS
- Source: FRED
- Coverage: 1996-12-31 to 2026-04-02 (7638 observations)
- Latest: 0.86 lin on 2026-04-02
- Change versus previous observation: -1.15%
- Approximate one-year change: -22.52%
- Why it matters: Use for credit conditions, funding environment, and risk-off transitions distinct from HY.
- Local normalized data file: knowledge/data-lake/normalized/fred_ig_oas.json

### ICE BofA BBB OAS
- Source: FRED
- Coverage: 1996-12-31 to 2026-04-02 (7639 observations)
- Latest: 1.09 lin on 2026-04-02
- Change versus previous observation: -0.91%
- Approximate one-year change: -21.58%
- Why it matters: Use for fallen-angel risk, credit quality migration, and crossover stress episodes.
- Local normalized data file: knowledge/data-lake/normalized/fred_bbb_oas.json

### WTI crude daily
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-30 (9110 observations)
- Latest: 104.69 lin on 2026-03-30
- Change versus previous observation: +3.39%
- Approximate one-year change: +50.68%
- Why it matters: Use for daily oil regime, inflation impulse, and demand-supply dynamics at high frequency.
- Local normalized data file: knowledge/data-lake/normalized/fred_wti_daily.json

### TED spread
- Source: FRED
- Coverage: 1990-01-02 to 2022-01-21 (7869 observations)
- Latest: 0.09 lin on 2022-01-21
- Change versus previous observation: +12.50%
- Approximate one-year change: -35.71%
- Why it matters: Use for interbank funding stress, systemic risk episodes, and credit-crunch analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_ted_spread.json

### VIX near-term (9-day)
- Source: FRED
- Coverage: 2007-12-04 to 2026-04-01 (4610 observations)
- Latest: 24.86 lin on 2026-04-01
- Change versus previous observation: -2.70%
- Approximate one-year change: +13.15%
- Why it matters: Use for vol term structure, hedging urgency, and short-dated fear spikes vs longer-dated vol.
- Local normalized data file: knowledge/data-lake/normalized/fred_vxvcls.json

## Agent framing prompts

- Compare current volatility, spreads, and proxy asset performance with prior de-risking and re-risking episodes.
- Check whether stress is broadening beyond one asset class or staying contained.
- Explain which cross-asset divergence matters most for market positioning right now.