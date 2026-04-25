# Ask Market Chart Live Audit — April 20, 2026

## Scope

This audit reviews the live Ask Market chart testing performed in production after the Ask Market chart Waves A/B/C work.

Evidence sources:

- `backtest-charts-live-results.json`
- Latest 24 visible Ask Market threads from `GET /api/market-questions`
- Full thread payloads from `GET /api/market-questions/:threadId`

Important limitation:

- Direct D1 access failed with Cloudflare auth error `7403`, so the database could not be queried directly from Wrangler.
- The public API returns the latest 24 Ask Market threads. Claude's live backtest JSON contained the full 40-case result set, so this audit uses that for the complete pass/fail matrix.

## Executive Summary

Live chart backtest result:

- Total tests: `40`
- Passed: `26`
- Failed: `14`
- Pass rate: `65%`

The system is now reliable for WTI-centric charts, lagged WTI/CPI charts, WTI/dollar charts, WTI/SPY charts, and heatmaps. Heatmaps are the strongest area: `5/5` passed, including custom 4-asset and 7-asset maps.

The remaining failures are not mostly chart-rendering failures. They are chart-intent coverage failures:

- Missing non-WTI pair routing.
- Drawdown requests that do not include the word `chart` fail to trigger chart generation.
- Follow-up chart-type switching is incomplete.
- Follow-up heatmap subset filtering is incomplete.

## What Worked

### 1. WTI/CPI Core Charts

Passed:

- `Plot WTI vs inflation over the last 10 years`
- `Show WTI absolute price vs CPI YoY on two separate axes`
- `WTI absolute values vs CPI month over month percent on two axes`
- `Plot WTI YoY percent vs CPI index level over the last 10 years`

Observed behavior:

- Correctly separates WTI level from CPI YoY.
- Correctly separates WTI level from CPI MoM.
- Correctly renders WTI YoY vs CPI index.
- Correctly uses one axis when both series are `%`.
- Correctly uses two axes when units differ.

Status: strong.

### 2. WTI/Dollar and WTI/SPY Relationship Charts

Passed:

- `Chart WTI vs the dollar index YoY over the last 10 years`
- `Show me WTI YoY vs SPY YoY for the last 10 years`

Observed charts:

- `WTI YoY% vs Broad Dollar YoY%`
- `WTI YoY% vs SPY YoY%`

Status: strong for currently wired WTI relationships.

### 3. Lagged WTI/CPI Charts

Passed:

- `Plot WTI YoY vs CPI YoY lagged 3 months over the last 10 years`
- `Show WTI vs inflation lagged by 6 months`

Observed charts:

- `WTI YoY% vs CPI YoY%, CPI YoY% lagged 3m`
- `WTI YoY% vs CPI YoY%, CPI YoY% lagged 6m`

Status: strong for WTI/CPI lag charts.

### 4. Rolling Correlation for Wired Pairs

Passed:

- `Show 24 month rolling correlation of WTI vs CPI over the last 10 years`
- `Plot 12 month rolling correlation of WTI vs dollar`

Observed charts:

- `24m rolling correlation: WTI YoY% vs CPI YoY%`
- `12m rolling correlation: WTI YoY% vs Broad Dollar YoY%`

Status: strong for WTI/CPI and WTI/dollar.

### 5. Lead-Lag for Wired Pairs

Passed:

- `Show the lead-lag correlation of WTI vs inflation — does oil lead CPI?`
- `Which leads the other — the dollar or oil? Show lead-lag correlation`

Observed chart type:

- `bar`

Status: strong for WTI/CPI and WTI/dollar.

### 6. Heatmaps

Passed:

- Full cross-asset heatmap.
- 4-asset custom heatmap: oil, inflation, dollar, SPY.
- 7-asset custom heatmap: oil, inflation, dollar, SPY, VIX, HY, 10Y.
- Risk-regime heatmap: VIX, HY spreads, SPY, dollar.
- Inflation-regime heatmap: CPI, PCE, WTI, dollar, unemployment, 10Y.

Observed:

- Heatmap chart payloads render.
- Color scale looks acceptable.
- Custom 4x4 and full 7x7 maps work for new standalone prompts.

Status: best-performing chart family.

### 7. Edge Cases

Passed:

- Pure prose question: `What is your view on oil right now?` correctly did not render chart.
- Unsupported pair: `Plot gold vs platinum correlation` correctly did not render chart.
- Ambiguous equity drawdown with explicit `chart`: `Show me a drawdown chart of equities` rendered SPY drawdown.

Status: mostly good.

## What Failed

### Failure Group 1 — Missing Non-WTI Pair Routing

Failed:

- `Plot 10 year treasury yield vs SPY over the last 10 years`
- `Show Fed Funds rate vs unemployment over the last 15 years`
- `Chart VIX vs SPY over the last 10 years`
- `Plot high yield spreads vs SPY over the last 10 years`

Reason:

The chart parser currently recognizes WTI/CPI, M1/CPI, WTI/dollar, WTI/SPY, single-asset drawdown, and heatmaps. It does not yet recognize the requested non-WTI relationship pairs.

Required pairs:

- `us10y_spy`
- `fedfunds_unemployment`
- `vix_spy`
- `hy_oas_spy`
- `vix_hy_oas`

Impact:

These are high-value institutional charts. Rates, Risk/Sentiment, and Equities users will naturally ask for them.

### Failure Group 2 — Rolling Correlation Coverage Gaps

Failed:

- `Show 24 month rolling correlation of 10 year yields vs SPY`
- `How has the correlation between VIX and high yield spreads changed over time`
- `Show 6 month rolling correlation of VIX vs high yield spreads`

Reason:

Rolling-correlation logic works, but only after the parser finds a supported pair. These prompts fail because the underlying pair routing is missing.

Fix:

Add pair routing for:

- `us10y_spy`
- `vix_hy_oas`

Once the pair exists, rolling correlation should work with the existing builder.

### Failure Group 3 — Lead-Lag Coverage Gap

Failed:

- `Does the 10 year yield lead the SPY? Show lead-lag bar chart`

Reason:

Lead-lag chart logic works for WTI/CPI and WTI/dollar. The parser does not yet support `us10y_spy`.

Fix:

Add `us10y_spy` as a supported pair. Existing lead-lag builder should then be reusable.

### Failure Group 4 — Drawdown Trigger Weakness

Failed:

- `Show me the SPY drawdown from peak over the last 10 years`
- `Show WTI drawdown from peak — how deep has oil corrected historically`
- `Plot dollar index drawdown from peak over the last 10 years`

But this passed:

- `Show me a drawdown chart of equities`

Reason:

`drawdown` is recognized inside `inferChartPair`, but it is not currently included in `hasChartRequestLanguage`. The Ask Market chart path only activates if the latest message contains chart request language such as `plot`, `chart`, `correlation`, etc. Therefore:

- `drawdown chart` works because it contains `chart`.
- `SPY drawdown from peak` fails because `drawdown` alone does not trigger chart mode.
- `WTI drawdown from peak` fails for the same reason.

Additional note:

- DXY drawdown also needs level-series support for the dollar index. Current data appears wired as `Broad Dollar YoY%`, not dollar index level.

Fix:

Add these to `hasChartRequestLanguage`:

- `drawdown`
- `draw down`
- `from peak`
- `peak-to-trough`
- `correction`

Then ensure drawdown supports:

- SPY/equities.
- WTI/oil.
- VIX if useful.
- HY OAS if useful.
- 10Y if useful.
- DXY only if level data is available.

### Failure Group 5 — Follow-Up Chart-Type Switching

Failed:

- Initial: `Show lead-lag correlation of WTI vs inflation`
- Follow-up: `now show it as rolling correlation instead`

Reason:

The thread-aware parser preserves the prior chart subject, but does not reliably apply a follow-up chart-type override when the user switches from lead-lag to rolling correlation.

Fix:

Follow-up patching needs to apply:

- chart type override (`lead_lag` -> `rolling_correlation`)
- same assets
- same transforms unless user changes them
- same window unless user changes it

### Failure Group 6 — Follow-Up Heatmap Subset

Failed:

- Initial: `Show a cross-asset correlation heatmap`
- Follow-up: `Now show only oil inflation dollar and SPY`

Expected:

- `4x4` heatmap.

Observed:

- `7x7` heatmap.

Reason:

Standalone custom heatmaps work. Follow-up heatmap subset filtering does not. The asset filter in the latest message is not overriding the previous full heatmap intent.

Fix:

If latest follow-up contains `only` plus asset aliases, rebuild heatmap asset list from latest message, not previous/base message.

### Failure Group 7 — Agent Prose Sometimes Claims Unsupported Analysis Without Chart

Examples:

- VIX/HY rolling correlation returned prose with a long-term correlation claim but no chart.
- Gold/platinum unsupported pair correctly produced no chart, but still gave qualitative relationship prose.

This is acceptable for unsupported pairs if the answer clearly says a chart is unavailable. But when a user explicitly asks for a chart, the safest behavior should be:

- no chart payload -> clearly say chart is not currently supported for that pair
- do not imply a chart exists
- do not fabricate exact rolling-series values unless computed

## Latest 24 Thread Audit

The latest visible 24 Ask Market threads include:

Worked:

- `Equities: Show me a drawdown chart of equities` -> SPY drawdown rendered.
- `Commodities: Plot WTI YoY percent vs CPI index level` -> WTI YoY vs CPI index rendered.
- `FX: Show a cross-asset correlation heatmap` -> 7x7 heatmap rendered.
- `Commodities: Show lead-lag correlation of WTI vs inflation` -> lead-lag chart rendered, then rolling correlation follow-up rendered.
- `Commodities: Plot WTI vs CPI` -> initial chart and follow-up absolute two-axis chart rendered.
- `Macro: Inflation regime heatmap` -> 4x4 heatmap rendered.
- `Risk/Sentiment: Show risk regime heatmap` -> 4x4 heatmap rendered.
- `Commodities: WTI vs dollar rolling correlation` -> rolling correlation rendered.
- `Commodities: WTI vs inflation lagged by 6 months` -> lagged chart rendered.

Failed / no chart payload:

- `Risk/Sentiment: Show 6 month rolling correlation of VIX vs high yield spreads`
- `Commodities: Plot gold vs platinum correlation` — acceptable unsupported pair.
- `FX: Plot dollar index drawdown from peak`
- `Commodities: Show WTI drawdown from peak`
- `Rates: Show me the SPY drawdown from peak`
- `Rates: Does the 10 year yield lead the SPY?`
- `Risk/Sentiment: VIX and high yield spreads changed over time`
- `Equities: 24 month rolling correlation of 10 year yields vs SPY`

## Pass/Fail by Group

| Group | Pass | Total | Pass Rate |
|---|---:|---:|---:|
| Wave A — Dual-Axis | 6 | 10 | 60% |
| Wave A — Lag | 2 | 2 | 100% |
| Wave B — Rolling Correlation | 2 | 4 | 50% |
| Wave B — Lead-Lag | 2 | 3 | 67% |
| Wave B — Drawdown | 0 | 3 | 0% |
| Wave A/B — Heatmap | 5 | 5 | 100% |
| Wave C — Thread Follow-Up | 5 | 8 | 63% |
| Edge Cases | 4 | 5 | 80% |
| **Total** | **26** | **40** | **65%** |

## What This Means

The core chart engine works when the requested pair is already supported.

The remaining issue is not that charts render incorrectly. It is that too many natural institutional chart requests do not reach the chart engine at all.

The next chart work should therefore focus on routing/intent coverage, not chart rendering polish.

## Recommended Next Fixes

### P0 — Expand supported pairs

Add pair support for:

- `us10y_spy`
- `fedfunds_unemployment`
- `vix_spy`
- `hy_oas_spy`
- `vix_hy_oas`

These should work for:

- dual-axis line chart
- rolling correlation
- lead-lag bar chart where appropriate

### P1 — Make drawdown a first-class chart trigger

Add `drawdown`, `draw down`, `from peak`, `peak-to-trough`, and `correction` to chart request language.

Ensure these prompts render:

- `Show me the SPY drawdown from peak`
- `Show WTI drawdown from peak`
- `Show me equity market correction chart`

### P1 — Fix follow-up chart-type overrides

If the user says:

- `now show it as rolling correlation`
- `make it lead-lag`
- `turn this into a heatmap`
- `show the same relationship as drawdown`

then preserve assets/window but change chart type.

### P1 — Fix follow-up heatmap subset

If the user says:

- `show only oil inflation dollar and SPY`
- `remove VIX and HY`
- `just show the risk assets`

then rebuild the heatmap asset list from the follow-up message.

### P2 — Unsupported-pair response discipline

If a chart is requested but unsupported:

- Say explicitly: `I cannot render that exact chart yet because [series/pair] is not wired.`
- Offer the closest supported chart.
- Do not imply a chart rendered.
- Do not invent exact rolling values.

## Suggested Next Backtest Target

Before Wave D / Market Room charts:

- Expand backtest from 40 to 60 cases.
- Require at least `54/60` pass rate (`90%`).
- Require `100%` pass on:
  - WTI/CPI transforms.
  - heatmaps.
  - unsupported-pair no-chart discipline.
- Require at least `90%` pass on:
  - rolling correlation.
  - lead-lag.
  - drawdown.
  - thread follow-ups.

## Bottom Line

The chart project is directionally successful.

Strong:

- WTI/CPI.
- WTI/dollar.
- WTI/SPY.
- lagged WTI/CPI.
- rolling WTI relationships.
- lead-lag WTI relationships.
- heatmaps.

Weak:

- non-WTI pair routing.
- drawdown trigger detection.
- follow-up chart-type switching.
- follow-up heatmap subset selection.

The next implementation should not rewrite the renderer. It should expand the chart-intent router and thread follow-up patch logic.
