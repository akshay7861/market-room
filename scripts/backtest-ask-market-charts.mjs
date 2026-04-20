import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const servicePath = path.join(root, "apps/api/src/lib/services/historicalDataContextService.ts");
const compiledPath = path.join(root, "apps/api/src/lib/services/.chart-backtest-historicalDataContextService.cjs");

const source = fs.readFileSync(servicePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
    resolveJsonModule: true,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;

fs.writeFileSync(compiledPath, compiled);
const { buildChartDataFromQuestion, buildChartIntentFromThread, buildChartDataFromIntent, validateChartData } = require(compiledPath);

const cases = [
  {
    prompt: "Commodities: Plot WTI vs inflation over the last 10 years",
    titleIncludes: ["WTI YoY%", "CPI YoY%"],
    chartType: "line",
    seriesIncludes: ["WTI YoY%", "CPI YoY%"]
  },
  {
    prompt: "Commodities: Plot WTI absolute vs inflation YoY % over the last 10 years in primary and secondary axis",
    titleIncludes: ["WTI $/bbl", "CPI YoY%"],
    chartType: "line",
    seriesIncludes: ["WTI $/bbl", "CPI YoY%"],
    axesIncludes: ["right:CPI YoY%"]
  },
  {
    prompt: "Commodities: Plot WTI absolute vs inflation MoM % over the last 10 years in primary and secondary axis",
    titleIncludes: ["WTI $/bbl", "CPI MoM%"],
    chartType: "line",
    seriesIncludes: ["WTI $/bbl", "CPI MoM%"],
    axesIncludes: ["right:CPI MoM%"]
  },
  {
    prompt: "Commodities: Plot WTI YoY % vs CPI index over the last 10 years",
    titleIncludes: ["WTI YoY%", "CPI index"],
    chartType: "line",
    seriesIncludes: ["WTI YoY%", "CPI index"]
  },
  {
    prompt: "Commodities: Plot 24 month rolling correlation of WTI vs inflation over the last 10 years",
    titleIncludes: ["24m rolling correlation", "WTI YoY%", "CPI YoY%"],
    chartType: "line",
    seriesIncludes: ["Rolling correlation"]
  },
  {
    prompt: "Commodities: Show lead-lag correlation of WTI vs inflation over the last 10 years",
    titleIncludes: ["Lead-lag correlation", "WTI YoY%", "CPI YoY%"],
    chartType: "bar",
    seriesIncludes: ["Correlation"],
    minPoints: 13
  },
  {
    prompt: "Risk: Show SPY drawdown from peak over the last 10 years",
    titleIncludes: ["SPY price drawdown"],
    chartType: "line",
    seriesIncludes: ["Drawdown"]
  },
  {
    prompt: "Commodities: Draw a correlation heatmap of oil inflation dollar SPY",
    titleIncludes: ["Cross-asset correlation heatmap"],
    chartType: "heatmap",
    heatmapSize: "4x4"
  },
  {
    prompt: "Commodities: Draw a correlation heatmap of oil inflation dollar SPY VIX HY spreads and 10Y",
    titleIncludes: ["Cross-asset correlation heatmap"],
    chartType: "heatmap",
    heatmapSize: "7x7"
  },
  {
    prompt: "Rates: Plot 10 year treasury yield vs SPY over the last 10 years",
    titleIncludes: ["US 10Y yield", "SPY YoY%"],
    chartType: "line",
    seriesIncludes: ["US 10Y yield", "SPY YoY%"]
  },
  {
    prompt: "Macro: Show Fed Funds rate vs unemployment over the last 15 years",
    titleIncludes: ["Fed Funds rate", "Unemployment rate"],
    chartType: "line",
    seriesIncludes: ["Fed Funds rate", "Unemployment rate"]
  },
  {
    prompt: "Risk/Sentiment: Chart VIX vs SPY over the last 10 years",
    titleIncludes: ["VIX level", "SPY YoY%"],
    chartType: "line",
    seriesIncludes: ["VIX level", "SPY YoY%"]
  },
  {
    prompt: "Risk/Sentiment: Plot high yield spreads vs SPY over the last 10 years",
    titleIncludes: ["HY OAS", "SPY YoY%"],
    chartType: "line",
    seriesIncludes: ["HY OAS", "SPY YoY%"]
  },
  {
    prompt: "Equities: Show 24 month rolling correlation of 10 year yields vs SPY",
    titleIncludes: ["24m rolling correlation", "US 10Y yield", "SPY YoY%"],
    chartType: "line",
    seriesIncludes: ["Rolling correlation"]
  },
  {
    prompt: "Risk/Sentiment: Show 6 month rolling correlation of VIX vs high yield spreads",
    titleIncludes: ["6m rolling correlation", "VIX level", "HY OAS"],
    chartType: "line",
    seriesIncludes: ["Rolling correlation"]
  },
  {
    prompt: "Rates: Does the 10 year yield lead the SPY? Show lead-lag bar chart",
    titleIncludes: ["Lead-lag correlation", "US 10Y yield", "SPY YoY%"],
    chartType: "bar",
    seriesIncludes: ["Correlation"],
    minPoints: 13
  },
  {
    prompt: "Rates: Show me the SPY drawdown from peak over the last 10 years",
    titleIncludes: ["SPY price drawdown"],
    chartType: "line",
    seriesIncludes: ["Drawdown"]
  },
  {
    prompt: "Commodities: Show WTI drawdown from peak — how deep has oil corrected historically",
    titleIncludes: ["WTI $/bbl drawdown"],
    chartType: "line",
    seriesIncludes: ["Drawdown"]
  },
  {
    prompt: "FX: Plot dollar index drawdown from peak over the last 10 years",
    titleIncludes: ["Broad Dollar index drawdown"],
    chartType: "line",
    seriesIncludes: ["Drawdown"]
  }
];

const threadCases = [
  {
    name: "Follow-up absolute dual-axis keeps previous WTI/CPI pair",
    messages: [
      { role: "user", content: "Commodities: Plot WTI vs CPI over the last 10 years" },
      { role: "assistant", content: "Here is the chart." },
      { role: "user", content: "make the chart as WTI absolute values vs CPI absolute values in two axis" }
    ],
    titleIncludes: ["WTI $/bbl", "CPI index"],
    chartType: "line",
    axesIncludes: ["right:CPI index"]
  },
  {
    name: "Follow-up switches lead-lag to rolling correlation",
    messages: [
      { role: "user", content: "Commodities: Show lead-lag correlation of WTI vs inflation" },
      { role: "assistant", content: "Here is the lead-lag chart." },
      { role: "user", content: "now show it as rolling correlation instead" }
    ],
    titleIncludes: ["24m rolling correlation", "WTI YoY%", "CPI YoY%"],
    chartType: "line",
    seriesIncludes: ["Rolling correlation"]
  },
  {
    name: "Follow-up heatmap subset overrides prior full heatmap",
    messages: [
      { role: "user", content: "FX: Show a cross-asset correlation heatmap" },
      { role: "assistant", content: "Here is the full heatmap." },
      { role: "user", content: "Now show only oil inflation dollar and SPY" }
    ],
    titleIncludes: ["Cross-asset correlation heatmap"],
    chartType: "heatmap",
    heatmapSize: "4x4"
  }
];

let passed = 0;
const results = [];

for (const testCase of cases) {
  const chart = buildChartDataFromQuestion(testCase.prompt);
  const valid = validateChartData(chart);
  const seriesLabels = chart?.series?.map((series) => series.label) || [];
  const axes = chart?.yAxes?.map((axis) => `${axis.id}:${axis.label}`) || [];
  const heatmapSize = chart?.heatmap ? `${chart.heatmap.rows.length}x${chart.heatmap.columns.length}` : undefined;
  const failures = [];

  if (!valid) failures.push("invalid_chart");
  if (testCase.chartType && chart?.chartType !== testCase.chartType) failures.push(`chartType expected=${testCase.chartType} observed=${chart?.chartType}`);
  for (const item of testCase.titleIncludes || []) {
    if (!chart?.title.includes(item)) failures.push(`title_missing=${item}`);
  }
  for (const item of testCase.seriesIncludes || []) {
    if (!seriesLabels.includes(item)) failures.push(`series_missing=${item}`);
  }
  for (const item of testCase.axesIncludes || []) {
    if (!axes.some((axis) => axis.includes(item))) failures.push(`axis_missing=${item}`);
  }
  if (testCase.heatmapSize && heatmapSize !== testCase.heatmapSize) failures.push(`heatmap expected=${testCase.heatmapSize} observed=${heatmapSize}`);
  if (testCase.minPoints && (chart?.data?.length || 0) < testCase.minPoints) failures.push(`points_lt_${testCase.minPoints}`);

  const ok = failures.length === 0;
  if (ok) passed += 1;
  results.push({
    ok,
    prompt: testCase.prompt,
    title: chart?.title || null,
    chartType: chart?.chartType || null,
    series: seriesLabels,
    axes,
    heatmapSize,
    points: chart?.data?.length || 0,
    failures
  });
}

for (const testCase of threadCases) {
  const intent = buildChartIntentFromThread(testCase.messages);
  const chart = intent ? buildChartDataFromIntent(intent) : null;
  const valid = validateChartData(chart);
  const seriesLabels = chart?.series?.map((series) => series.label) || [];
  const axes = chart?.yAxes?.map((axis) => `${axis.id}:${axis.label}`) || [];
  const heatmapSize = chart?.heatmap ? `${chart.heatmap.rows.length}x${chart.heatmap.columns.length}` : undefined;
  const failures = [];

  if (!valid) failures.push("invalid_chart");
  if (testCase.chartType && chart?.chartType !== testCase.chartType) failures.push(`chartType expected=${testCase.chartType} observed=${chart?.chartType}`);
  for (const item of testCase.titleIncludes || []) {
    if (!chart?.title.includes(item)) failures.push(`title_missing=${item}`);
  }
  for (const item of testCase.seriesIncludes || []) {
    if (!seriesLabels.includes(item)) failures.push(`series_missing=${item}`);
  }
  for (const item of testCase.axesIncludes || []) {
    if (!axes.some((axis) => axis.includes(item))) failures.push(`axis_missing=${item}`);
  }
  if (testCase.heatmapSize && heatmapSize !== testCase.heatmapSize) failures.push(`heatmap expected=${testCase.heatmapSize} observed=${heatmapSize}`);

  const ok = failures.length === 0;
  if (ok) passed += 1;
  results.push({
    ok,
    prompt: testCase.name,
    title: chart?.title || null,
    chartType: chart?.chartType || null,
    series: seriesLabels,
    axes,
    heatmapSize,
    points: chart?.data?.length || 0,
    failures
  });
}

fs.unlinkSync(compiledPath);

console.log(JSON.stringify({
  passed,
  total: cases.length + threadCases.length,
  results
}, null, 2));

if (passed !== cases.length + threadCases.length) {
  process.exit(1);
}
