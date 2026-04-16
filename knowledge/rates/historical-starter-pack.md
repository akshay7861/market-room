# Rates historical starter pack

_Auto-generated historical context pack._

Generated: 2026-04-05T14:43:48.061Z
Historical floor: 1990-01-01

## Why this exists

Yield curve, policy, inflation, and duration-stress history that helps the rates agent frame repricing waves and curve shifts.

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

### Core CPI
- Source: FRED
- Coverage: 1990-01-01 to 2026-02-01 (433 observations)
- Latest: 333.51 lin on 2026-02-01
- Change versus previous observation: +0.22%
- Approximate one-year change: +2.73%
- Why it matters: Use for sticky inflation persistence, policy credibility, and valuation stress context.
- Local normalized data file: knowledge/data-lake/normalized/fred_cpi_core.json

### Headline PCE
- Source: FRED
- Coverage: 1990-01-01 to 2026-01-01 (433 observations)
- Latest: 128.97 lin on 2026-01-01
- Change versus previous observation: +0.28%
- Approximate one-year change: +2.83%
- Why it matters: Use for Fed-sensitive inflation framing and long-cycle disinflation or reflation shifts.
- Local normalized data file: knowledge/data-lake/normalized/fred_pce_headline.json

### Core PCE
- Source: FRED
- Coverage: 1990-01-01 to 2026-01-01 (433 observations)
- Latest: 128.39 lin on 2026-01-01
- Change versus previous observation: +0.36%
- Approximate one-year change: +3.06%
- Why it matters: Use for Fed reaction function analogs and inflation stickiness analysis.
- Local normalized data file: knowledge/data-lake/normalized/fred_pce_core.json

### Unemployment rate
- Source: FRED
- Coverage: 1990-01-01 to 2026-03-01 (434 observations)
- Latest: 4.30 lin on 2026-03-01
- Change versus previous observation: -2.27%
- Approximate one-year change: +2.38%
- Why it matters: Use for recession risk, labour slack, and growth-scare analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_unemployment.json

### Fed funds rate
- Source: FRED
- Coverage: 1990-01-01 to 2026-03-01 (435 observations)
- Latest: 3.64 lin on 2026-03-01
- Change versus previous observation: +0.00%
- Approximate one-year change: -15.94%
- Why it matters: Use for tightening and easing cycle analogs, discount-rate framing, and carry context.
- Local normalized data file: knowledge/data-lake/normalized/fred_fedfunds.json

### US 2Y yield
- Source: FRED
- Coverage: 1990-01-02 to 2026-04-02 (9068 observations)
- Latest: 3.79 lin on 2026-04-02
- Change versus previous observation: -0.52%
- Approximate one-year change: -2.57%
- Why it matters: Use for front-end repricing, policy path sensitivity, and FX rate-differential context.
- Local normalized data file: knowledge/data-lake/normalized/fred_us2y.json

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

### 10Y breakeven inflation
- Source: FRED
- Coverage: 2003-01-02 to 2026-04-03 (5817 observations)
- Latest: 2.36 lin on 2026-04-03
- Change versus previous observation: +0.85%
- Approximate one-year change: -0.84%
- Why it matters: Use for inflation expectations and real-rate regime comparisons.
- Local normalized data file: knowledge/data-lake/normalized/fred_breakeven_10y.json

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

### GBP/USD
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-27 (9093 observations)
- Latest: 1.33 lin on 2026-03-27
- Change versus previous observation: -0.45%
- Approximate one-year change: +2.66%
- Why it matters: Use for BOE policy divergence, UK growth differentials, and sterling risk-appetite analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_gbpusd.json

### US 3M yield
- Source: FRED
- Coverage: 1990-01-02 to 2026-04-02 (9068 observations)
- Latest: 3.70 lin on 2026-04-02
- Change versus previous observation: +0.00%
- Approximate one-year change: -14.55%
- Why it matters: Use for money-market stress, Fed path pricing, and front-end inversion analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_us3m.json

### US 1Y yield
- Source: FRED
- Coverage: 1990-01-02 to 2026-04-02 (9068 observations)
- Latest: 3.68 lin on 2026-04-02
- Change versus previous observation: +0.00%
- Approximate one-year change: -8.91%
- Why it matters: Use for near-term policy expectations and bill-to-coupon rotation dynamics.
- Local normalized data file: knowledge/data-lake/normalized/fred_us1y.json

### US 5Y yield
- Source: FRED
- Coverage: 1990-01-02 to 2026-04-02 (9068 observations)
- Latest: 3.94 lin on 2026-04-02
- Change versus previous observation: -0.76%
- Approximate one-year change: -1.01%
- Why it matters: Use for belly repricing, intermediate policy sensitivity, and TIPS breakeven anchoring.
- Local normalized data file: knowledge/data-lake/normalized/fred_us5y.json

### US 7Y yield
- Source: FRED
- Coverage: 1990-01-02 to 2026-04-02 (9068 observations)
- Latest: 4.12 lin on 2026-04-02
- Change versus previous observation: -0.72%
- Approximate one-year change: +0.24%
- Why it matters: Use for auction dynamics and belly-to-long transition analysis.
- Local normalized data file: knowledge/data-lake/normalized/fred_us7y.json

### US 20Y yield
- Source: FRED
- Coverage: 1993-10-01 to 2026-04-02 (8129 observations)
- Latest: 4.88 lin on 2026-04-02
- Change versus previous observation: -0.61%
- Approximate one-year change: +4.95%
- Why it matters: Use for long-end supply pressure and pension/insurance duration demand.
- Local normalized data file: knowledge/data-lake/normalized/fred_us20y.json

### US 30Y yield
- Source: FRED
- Coverage: 1990-01-02 to 2026-04-02 (9068 observations)
- Latest: 4.88 lin on 2026-04-02
- Change versus previous observation: -0.61%
- Approximate one-year change: +5.17%
- Why it matters: Use for long-duration repricing, inflation term premium, and pension rebalancing analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_us30y.json

### 5Y TIPS real yield
- Source: FRED
- Coverage: 2003-01-02 to 2026-04-02 (5816 observations)
- Latest: 1.37 lin on 2026-04-02
- Change versus previous observation: -3.52%
- Approximate one-year change: -2.14%
- Why it matters: Use for real-rate regime shifts, inflation expectations decoupling, and equity multiple pressure.
- Local normalized data file: knowledge/data-lake/normalized/fred_tips_5y.json

### 10Y TIPS real yield
- Source: FRED
- Coverage: 2003-01-02 to 2026-04-02 (5816 observations)
- Latest: 1.97 lin on 2026-04-02
- Change versus previous observation: -2.48%
- Approximate one-year change: +3.68%
- Why it matters: Use for real discount rate, gold-vs-real-yield tension, and equity valuation regime.
- Local normalized data file: knowledge/data-lake/normalized/fred_tips_10y.json

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

## Agent framing prompts

- Compare the current curve shape with prior hiking, pause, and easing transitions.
- Check whether inflation expectations and growth data justify the latest duration move.
- Explain where the front end and long end are sending different messages.