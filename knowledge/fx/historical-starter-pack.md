# FX historical starter pack

_Auto-generated historical context pack._

Generated: 2026-04-05T14:43:48.061Z
Historical floor: 1990-01-01

## Why this exists

Dollar and cross-asset regime anchors that help the FX agent compare current moves with prior dollar squeeze, carry unwind, and policy-divergence episodes.

Use this pack as durable sector memory. It is meant to help the agent compare current conditions with older cycles, squeezes, disinflations, inventory shocks, valuation resets, and recovery phases.

## How to use it

- Upload this markdown into the relevant agent memory after a quick human review.
- Pair it with event playbooks, policy reports, and post-mortems rather than treating it as a standalone forecast engine.
- Refresh it periodically so new regimes get added without losing the long historical anchors.

## Series included

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

### Broad trade-weighted dollar
- Source: FRED
- Coverage: 2006-01-02 to 2026-03-27 (5072 observations)
- Latest: 120.89 lin on 2026-03-27
- Change versus previous observation: +0.41%
- Approximate one-year change: -4.10%
- Why it matters: Use for dollar squeeze, global liquidity, and policy-divergence regime comparisons.
- Local normalized data file: knowledge/data-lake/normalized/fred_broad_dollar.json

### EUR/USD
- Source: FRED
- Coverage: 1999-01-04 to 2026-03-27 (6829 observations)
- Latest: 1.15 lin on 2026-03-27
- Change versus previous observation: -0.19%
- Approximate one-year change: +6.63%
- Why it matters: Use for rate-divergence regime, carry unwind, ECB vs Fed policy-divergence analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_eurusd.json

### GBP/USD
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-27 (9093 observations)
- Latest: 1.33 lin on 2026-03-27
- Change versus previous observation: -0.45%
- Approximate one-year change: +2.66%
- Why it matters: Use for BOE policy divergence, UK growth differentials, and sterling risk-appetite analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_gbpusd.json

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

### USD/CAD
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-27 (9093 observations)
- Latest: 1.39 lin on 2026-03-27
- Change versus previous observation: +0.22%
- Approximate one-year change: -2.98%
- Why it matters: Use for oil-linked FX moves, BOC divergence, and commodity-currency regime analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_usdcad.json

### USD/CHF
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-27 (9093 observations)
- Latest: 0.80 lin on 2026-03-27
- Change versus previous observation: +0.44%
- Approximate one-year change: -9.63%
- Why it matters: Use for safe-haven flow detection, SNB intervention episodes, and funding-stress analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_usdchf.json

### NZD/USD
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-27 (9093 observations)
- Latest: 0.58 lin on 2026-03-27
- Change versus previous observation: -0.35%
- Approximate one-year change: +0.37%
- Why it matters: Use for risk sentiment, RBNZ policy, and Asia-Pacific growth analogs.
- Local normalized data file: knowledge/data-lake/normalized/fred_nzdusd.json

### NOK/USD
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-27 (9093 observations)
- Latest: 9.73 lin on 2026-03-27
- Change versus previous observation: +0.58%
- Approximate one-year change: -7.21%
- Why it matters: Use for oil-driven carry, Norges Bank policy, and petrocurrency regime shifts.
- Local normalized data file: knowledge/data-lake/normalized/fred_nokusd.json

### SEK/USD
- Source: FRED
- Coverage: 1990-01-02 to 2026-03-27 (9093 observations)
- Latest: 9.45 lin on 2026-03-27
- Change versus previous observation: +0.49%
- Approximate one-year change: -5.73%
- Why it matters: Use for European cyclicality, Riksbank policy shifts, and Nordic growth proxy.
- Local normalized data file: knowledge/data-lake/normalized/fred_sekusd.json

## Agent framing prompts

- Compare current dollar behaviour with prior divergence, carry unwind, and dollar shortage episodes.
- Check whether rate differentials and risk sentiment are reinforcing each other.
- Explain which cross-asset signal most clearly supports or challenges the FX view.