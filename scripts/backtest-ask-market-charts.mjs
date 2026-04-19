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
const { buildChartDataFromQuestion, validateChartData } = require(compiledPath);

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

fs.unlinkSync(compiledPath);

console.log(JSON.stringify({
  passed,
  total: cases.length,
  results
}, null, 2));

if (passed !== cases.length) {
  process.exit(1);
}
