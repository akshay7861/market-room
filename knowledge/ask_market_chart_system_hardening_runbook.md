# Ask Market Chart System Hardening Runbook

## What changed

Ask Market chart intent parsing now uses per-series intent internally instead of relying only on broad chart modes.

Each line series now has:

- `asset`
- `transform`
- `axis`
- `lagMonths`

The frontend chart payload is still the same `ChartData` shape, so the web renderer remains backward compatible.

## Files changed

- `apps/api/src/lib/services/historicalDataContextService.ts`
- `apps/api/src/lib/services/marketQuestionsService.ts`
- `knowledge/ask_market_chart_system_hardening_plan.md`
- `knowledge/ask_market_chart_system_hardening_runbook.md`

## Parser behavior

Explicit transforms are resolved per asset:

- `MoM`, `m/m`, `month-over-month`, `monthly %` -> `mom_pct`
- `YoY`, `y/y`, `year-over-year`, `year-on-year`, `annual %`, `12-month` -> `yoy_pct`
- `absolute`, `level`, `price`, `index level`, `CPI index` -> `level`

Examples:

- `WTI absolute vs inflation YoY%` -> `wti:level:left`, `cpi:yoy_pct:right`
- `WTI absolute vs inflation MoM%` -> `wti:level:left`, `cpi:mom_pct:right`
- `WTI YoY% vs CPI index` -> `wti:yoy_pct:left`, `cpi:level:right`
- `WTI vs SPY lagged 3 months` -> `wti:yoy_pct:left`, `spy:yoy_pct:right:lag3m`

## Supported chart families

Currently supported:

- WTI vs CPI/inflation
- M1 vs CPI/inflation
- WTI vs Broad Dollar
- WTI vs SPY/equities
- Cross-asset correlation heatmap

Unsupported for now:

- EIA inventory overlays
- WTI curve shape overlays
- M2 charts
- Arbitrary 3-line or 4-axis charts
- Market Room autonomous charting

## Logs to inspect

Ask Market now logs the parsed series intent:

```text
[chart-intent] thread=<id> pair=wti_cpi mode=absolute_dual_axis series="wti:level:left,cpi:yoy_pct:right" lag=0 confidence=high chart=generated
[chart-render] generated title="WTI $/bbl vs CPI YoY% — last 10 years" points=119 axes=left,right
```

This should be used as the source of truth. The model prose is secondary.

## Validation prompts

Run these through Ask Market after deploy:

1. `Commodities: Plot WTI vs inflation over the last 10 years`
2. `Commodities: Plot WTI absolute vs inflation over the last 10 years`
3. `Commodities: Plot WTI absolute vs inflation YoY % over the last 10 years in primary and secondary axis`
4. `Commodities: Plot WTI absolute vs inflation MoM % over the last 10 years in primary and secondary axis`
5. `Commodities: Plot WTI YoY % vs CPI index over the last 10 years`
6. `Commodities: Plot WTI vs SPY lagged 3 months over the last 10 years`
7. `Commodities: Plot WTI absolute vs SPY absolute over the last 10 years`
8. `Commodities: Plot WTI vs dollar over the last 10 years`
9. `Commodities: Draw a correlation heatmap of oil, inflation, dollar, SPY, VIX, HY spreads and 10Y`

## Success criteria

- Explicit `YoY` and `MoM` never get overridden by `absolute`.
- Mixed transforms work on separate axes.
- Lag labels appear in the chart title and series label.
- Same-unit YoY charts can use one axis.
- Different-unit charts use two axes.
- If no chart payload exists, the answer must not claim that a chart rendered.

## Known limitations

The system is still a deterministic keyword parser, not a full chart DSL. It is now much safer for common Ask Market chart requests, but truly arbitrary user charting should eventually move to an explicit chart-intent object returned by a deterministic parser or constrained LLM tool call.
