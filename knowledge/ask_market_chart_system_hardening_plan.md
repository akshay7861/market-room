# Ask Market Chart System Hardening Plan

## Short diagnosis

The current Ask Market chart path works for simple WTI/CPI cases, but it is still too dependent on broad chart modes such as `absolute_dual_axis` and `yoy_same_axis`.

That creates preventable mistakes:

- A user can ask for `WTI absolute vs inflation YoY%`, but the generic word `absolute` can accidentally affect both series.
- Follow-ups like `make it MoM`, `same chart but two axes`, or `lag SPY by 3 months` require the system to remember the prior chart and modify only the requested part.
- The model sometimes describes a chart even when the deterministic chart payload is missing or different.
- The frontend can only render what the backend encodes, so the backend must produce unambiguous chart metadata.

The right fix is to stop treating chart requests as one global mode and instead parse each requested series independently.

## Goal

Make Ask Market charts deterministic, inspectable, and hard to confuse before adding more chart types.

The system should support:

- Line charts.
- Dual-axis charts.
- Same-axis percentage charts.
- Absolute level vs transformed percentage charts.
- Lagged comparisons.
- Correlation heatmaps.
- Follow-up chart edits in an existing Ask Market thread.
- Clear failure behavior when a requested series is not available.

## Current chart path

1. User asks a question in Ask Market.
2. `marketQuestionsService.ts` calls `buildChartIntentFromThread(messages)`.
3. `historicalDataContextService.ts` parses the thread into a `ChartIntent`.
4. `buildChartDataFromIntent(intent)` creates `ChartData`.
5. The LLM receives a chart prompt block describing exactly what will render.
6. The answer appends `%%CHART_DATA%%{...}`.
7. `RichText.tsx` extracts the JSON marker.
8. `ChartBlock.tsx` renders a Recharts line chart or heatmap.

## Main weakness

`ChartIntent` currently stores:

- `pair`
- `mode`
- `inflationMode`
- `lagMonths`
- date window

This is too coarse. It cannot safely represent user requests where each side has a different transform.

Example:

`Plot WTI absolute vs inflation YoY% on two axes`

Correct interpretation:

- Left series: WTI, level, `$/bbl`, left axis.
- Right series: CPI inflation, YoY%, `%`, right axis.

The current model thinks in chart-wide modes, so `absolute` can leak into the CPI side unless every later branch is patched.

## Proposed architecture

Replace pair/mode-first parsing with series-first parsing.

```ts
type ChartAsset =
  | "wti"
  | "cpi"
  | "dxy"
  | "spy"
  | "m1"
  | "vix"
  | "hy_oas"
  | "us10y";

type ChartTransform =
  | "level"
  | "yoy_pct"
  | "mom_pct"
  | "monthly_change"
  | "bps_change";

type ChartAxis = "left" | "right";

type ChartSeriesIntent = {
  asset: ChartAsset;
  transform: ChartTransform;
  axis: ChartAxis;
  lagMonths: number;
};

type ChartIntentV2 = {
  chartType: "line" | "heatmap";
  series: ChartSeriesIntent[];
  windowStart: string;
  windowEnd?: string;
  windowLabel: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
  sourceText: string;
};
```

## Parsing rules

### 1. Explicit transform beats generic display words

Highest priority:

- `MoM`, `m/m`, `month over month`, `monthly %` -> `mom_pct`.
- `YoY`, `y/y`, `year over year`, `year-on-year`, `annual %`, `12-month` -> `yoy_pct`.
- `absolute`, `level`, `price`, `index`, `index level` -> `level`.

Generic words must only apply to the series they are attached to.

Examples:

- `WTI absolute vs inflation YoY%` -> WTI level vs CPI YoY%.
- `WTI YoY vs CPI absolute` -> WTI YoY% vs CPI index.
- `WTI absolute vs CPI index` -> WTI level vs CPI index.
- `WTI vs CPI` -> default to WTI YoY% vs CPI YoY%.

### 2. Asset aliases

WTI:

- `wti`, `crude`, `oil`, `oil price`, `crude oil`.

CPI / inflation:

- `inflation`, `cpi`, `headline cpi`, `headline inflation`.

Dollar:

- `dxy`, `dollar`, `usd`, `broad dollar`, `trade-weighted dollar`.

Equities:

- `spy`, `s&p`, `spx`, `s&p 500`, `equities`, `stocks`, `stock market`.

Money supply:

- `m1`, `m2`, `money supply`, `liquidity`.

Rates:

- `10y`, `10-year`, `treasury yield`, `us10y`, `ust 10y`.

Risk:

- `vix`, `volatility`, `hy oas`, `high yield spreads`, `credit spreads`.

### 3. Axis words

Axis words should decide layout, not transform.

- `two axis`, `dual axis`, `primary and secondary`, `separate axes` -> use left and right axes.
- `same axis`, `one axis`, `overlay percentage` -> same axis only if units match.
- If units differ, default to dual axis even if the user did not explicitly request it.

### 4. Lag words

Supported patterns:

- `lag CPI by 3 months`
- `CPI lagged 3m`
- `SPY lags WTI by 1 month`
- `WTI leads inflation by 2 months`
- `oil leads CPI 3 months`

Rule:

- Store lag on the lagged series, not globally.
- Chart title must say which series is lagged.
- Correlation subtitle must use the lagged alignment.

### 5. Time windows

Supported patterns:

- `last 10 years`
- `last 5 years`
- `since 2020`
- `from 2018 to 2024`
- `during 2008`
- `GFC`, `COVID`, `2022 inflation shock`

Defaults:

- Default line chart window: last 10 years.
- Default heatmap window: last 10 years.
- Crisis aliases can map to fixed windows.

### 6. Follow-up edits

The system should preserve prior chart subject and only modify the requested attribute.

Examples:

- `make it two axes` -> same assets/transforms, dual axis layout.
- `now make inflation MoM` -> same left series, right series transform becomes MoM%.
- `show absolute values instead` -> convert both unspecified percentage series to level if levels exist.
- `lag SPY 3 months` -> same chart, SPY series gets `lagMonths = 3`.
- `show it again` -> regenerate exact previous chart.

Implementation rule:

- Store prior parsed `ChartIntentV2` from the thread by re-parsing the previous `%%CHART_DATA%%` or previous user chart request.
- Apply latest user message as a patch.

## Series defaults

### WTI vs CPI

- Default: WTI YoY% vs CPI YoY%, same axis.
- If user says `WTI absolute` or `oil price`: WTI level.
- If user says `inflation YoY`: CPI YoY%.
- If user says `inflation MoM`: CPI MoM%.
- If user says `CPI index`: CPI level.
- If one side is level and the other is percentage, use dual axis.

### WTI vs Dollar

- Default: WTI YoY% vs Broad Dollar YoY%.
- `DXY level` or `dollar index` -> DXY/Broad Dollar level if available.
- If dollar level is not available, say that only YoY broad dollar is available.

### WTI vs SPY

- Default: WTI YoY% vs SPY YoY%.
- `SPY absolute`, `S&P level`, `index level` -> SPY price/index level.
- `SPY lagged 3 months` -> lag SPY, not WTI.

### M1/M2 vs CPI

- Default: money supply YoY% vs CPI YoY%.
- `M2` should only work after M2 data is present.
- If M2 is requested and unavailable, respond with a clear unsupported-series note.

### Heatmaps

- `heatmap`, `correlation map`, `matrix`, `red green map` -> heatmap.
- Default matrix: WTI YoY%, CPI YoY%, Broad Dollar YoY%, SPY YoY%, VIX level, HY OAS, US 10Y.
- User can ask subsets: `heatmap oil inflation dollar spy`.

## Keyword test matrix

These should be deterministic tests before every chart deploy.

| Prompt | Expected chart |
|---|---|
| Plot WTI vs inflation over the last 10 years | WTI YoY% vs CPI YoY%, same axis |
| Plot WTI absolute vs inflation over the last 10 years | WTI $/bbl vs CPI index, dual axis |
| Plot WTI absolute vs inflation YoY% | WTI $/bbl vs CPI YoY%, dual axis |
| Plot WTI absolute vs inflation MoM% | WTI $/bbl vs CPI MoM%, dual axis |
| Plot WTI YoY% vs CPI index | WTI YoY% vs CPI index, dual axis |
| Plot oil price vs CPI year-over-year | WTI $/bbl vs CPI YoY%, dual axis |
| Plot WTI vs SPY lagged 3 months | WTI YoY% vs SPY YoY% lagged 3m |
| Plot WTI absolute vs SPY absolute | WTI $/bbl vs SPY price, dual axis |
| Plot WTI vs dollar index | WTI YoY% vs Broad Dollar YoY% unless dollar level exists |
| Plot a correlation heatmap of oil inflation dollar SPY | Heatmap with requested subset if supported |
| Make it two axes | Previous chart, dual axis |
| Make inflation MoM instead | Previous chart, CPI transform changed to MoM% |
| Show the same chart again | Previous chart regenerated exactly |
| Can you draw WTI vs inventories? | Unsupported unless inventory series is wired |
| Plot M2 vs CPI | Unsupported until M2 is wired, or use M1 if user accepts |

## Backend implementation plan

### Phase 1 — Chart intent V2 parser

Files:

- `apps/api/src/lib/services/historicalDataContextService.ts`

Tasks:

- Add `ChartIntentV2` and `ChartSeriesIntent`.
- Add `parseChartSeriesIntents(text, previousIntent?)`.
- Add asset alias map.
- Add transform alias map.
- Add per-series transform parser.
- Add axis/layout resolver.
- Add per-series lag parser.
- Preserve current `ChartData` output shape so frontend remains backward compatible.

### Phase 2 — Chart data builder

Files:

- `apps/api/src/lib/services/historicalDataContextService.ts`

Tasks:

- Replace `leftSeriesForIntent()` and `rightSeriesForIntent()` with `seriesDefinitionForIntent(seriesIntent)`.
- Build arbitrary two-series line charts.
- Keep heatmap path separate.
- Validate units and axes.
- Add warning strings for unsupported requested series.

### Phase 3 — Thread-aware follow-up patching

Files:

- `apps/api/src/lib/services/historicalDataContextService.ts`
- `apps/api/src/lib/services/marketQuestionsService.ts`

Tasks:

- Reconstruct previous chart intent from prior chart payload where possible.
- Apply latest user message as a patch.
- Log old intent and patched intent.

Expected logs:

```text
[chart-intent] source=thread_patch chart=line series="wti:level:left,cpi:yoy_pct:right" window=last_10y
[chart-intent] modifier="make inflation MoM" patched="cpi:yoy_pct->mom_pct"
[chart-render] generated title="WTI $/bbl vs CPI MoM% — last 10 years" points=119 axes=left,right
```

### Phase 4 — Prompt guardrails

Files:

- `apps/api/src/lib/services/marketQuestionsService.ts`

Tasks:

- Tell the LLM exactly which chart will render.
- Tell it not to claim a chart exists if `chartData = null`.
- Tell it not to describe unsupported overlays.
- If chart was unsupported, make it say which series is missing.

### Phase 5 — Frontend resilience

Files:

- `apps/web/src/components/RichText.tsx`
- `apps/web/src/components/ChartBlock.tsx`

Tasks:

- Keep robust `%%CHART_DATA%%` extraction.
- Add visible warning badges if chart has unsupported-series warnings.
- Improve axis labels on mobile.
- Show lag badge in chart header.
- If chart JSON is malformed, show a small `Chart could not render` fallback instead of silently disappearing.

## Observability

Add logs that answer these questions:

- What did the parser think the user asked for?
- Which series were chosen?
- Which transform was chosen for each series?
- Which axis was chosen?
- Did a follow-up patch a previous chart?
- Did any requested series fail?
- Did chart JSON get appended?

Recommended logs:

```text
[chart-intent] thread=<id> chart=line series=wti:level:left,cpi:yoy_pct:right lag=0 window=last_10y confidence=high
[chart-intent] unsupported requested=eia_inventory reason=series_not_wired
[chart-render] generated title="WTI $/bbl vs CPI YoY% — last 10 years" points=119 axes=left,right
[chart-render] skipped reason=unsupported_series requested=eia_inventory
```

## Validation plan

Run a 25-prompt chart checkpoint after implementation:

- 8 WTI/CPI prompts.
- 4 WTI/SPY prompts.
- 4 WTI/Dollar prompts.
- 3 M1/CPI prompts.
- 3 heatmap prompts.
- 3 follow-up edit prompts.

Record:

- Intended assets.
- Intended transforms.
- Intended axes.
- Intended lag.
- Observed chart title.
- Observed series labels.
- Observed axes.
- Pass/fail.

Success criteria:

- 24/25 correct chart intent.
- 0 false claims that a chart rendered when no chart payload exists.
- 0 cases where explicit YoY/MoM is overridden by generic absolute/level wording.
- 0 malformed chart markers in frontend rendering.

## What this still will not solve

- It will not create unavailable series such as EIA inventories unless those are wired into the data lake.
- It will not make Market Room autonomous posts draw charts yet.
- It will not guarantee the LLM prose is perfect, but it will make the rendered chart deterministic and give the LLM exact chart metadata.
- It will not support arbitrary 4-axis charts immediately. The first safe target should be one or two axes with up to two line series, plus heatmaps.

## Recommendation

Implement this before adding many more chart types.

The immediate bug is fixed, but the deeper issue is architectural: chart requests need a deterministic series-level parser. Once every chart line has explicit `asset`, `transform`, `axis`, `lag`, and `unit`, the system becomes much harder to confuse and much easier to expand.
