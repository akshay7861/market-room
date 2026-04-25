/**
 * Chart Backtest — Wave A / B / C
 * Hits live production Ask Market API as a real user would.
 * Tests every chart family: dual-axis, rolling correlation, lead-lag,
 * drawdown, heatmap (full + subset + custom assets), and thread-aware follow-ups.
 *
 * Usage:  node backtest-charts-live.mjs
 * Output: console report + backtest-charts-live-results.json
 */

import { writeFileSync } from "fs";

const API = "https://market-room-api.akshay-market-room.workers.dev";
const DELAY_MS = 3200; // be polite to the API

// ─── Colour helpers ───────────────────────────────────────────────────────────
const R = "\x1b[31m";
const G = "\x1b[32m";
const Y = "\x1b[33m";
const B = "\x1b[34m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// ─── Test suite ───────────────────────────────────────────────────────────────
// Each entry describes one Ask Market prompt.
// "expect" describes what the chart payload MUST contain.
// Thread-aware tests carry forwardThreadId from a previous case.

const SUITE = [

  // ── Wave A: Dual-axis relationship charts ─────────────────────────────────

  {
    group: "Wave A — Dual-Axis",
    id: "A1",
    label: "WTI YoY vs CPI YoY — same axis",
    prompt: "Plot WTI vs inflation over the last 10 years",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["WTI", "CPI"],
      seriesLabels: ["WTI YoY%", "CPI YoY%"],
      minPoints: 60,
      dualAxis: false,
    },
  },
  {
    group: "Wave A — Dual-Axis",
    id: "A2",
    label: "WTI price vs CPI YoY — dual axis",
    prompt: "Show WTI absolute price vs CPI YoY on two separate axes",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["WTI", "CPI"],
      seriesLabels: ["WTI $/bbl", "CPI YoY%"],
      minPoints: 60,
      dualAxis: true,
    },
  },
  {
    group: "Wave A — Dual-Axis",
    id: "A3",
    label: "WTI YoY vs DXY YoY — dollar relationship",
    prompt: "Chart WTI vs the dollar index YoY over the last 10 years",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["WTI", "Dollar"],
      seriesLabels: ["WTI YoY%", "Broad Dollar YoY%"],
      minPoints: 60,
    },
  },
  {
    group: "Wave A — Dual-Axis",
    id: "A4",
    label: "WTI vs SPY — equity relationship",
    prompt: "Show me WTI YoY vs SPY YoY for the last 10 years",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["WTI", "SPY"],
      seriesLabels: ["WTI YoY%", "SPY YoY%"],
      minPoints: 60,
    },
  },
  {
    group: "Wave A — Dual-Axis",
    id: "A5",
    label: "M1 vs CPI — money supply",
    prompt: "Plot M1 money supply growth vs CPI inflation",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["M1", "CPI"],
      minPoints: 60,
    },
  },
  {
    group: "Wave A — Dual-Axis",
    id: "A6",
    label: "WTI absolute vs CPI MoM — mixed transforms",
    prompt: "WTI absolute values vs CPI month over month percent on two axes",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["WTI", "CPI"],
      seriesLabels: ["WTI $/bbl", "CPI MoM%"],
      dualAxis: true,
    },
  },
  {
    group: "Wave A — Dual-Axis",
    id: "A7",
    label: "10Y yield vs SPY — rates vs equities",
    prompt: "Plot 10 year treasury yield vs SPY over the last 10 years",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["10Y", "SPY"],
      minPoints: 60,
    },
  },
  {
    group: "Wave A — Dual-Axis",
    id: "A8",
    label: "Fed Funds vs unemployment",
    prompt: "Show Fed Funds rate vs unemployment over the last 15 years",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["Fed", "Unemployment"],
      minPoints: 60,
    },
  },
  {
    group: "Wave A — Dual-Axis",
    id: "A9",
    label: "VIX vs SPY",
    prompt: "Chart VIX vs SPY over the last 10 years",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["VIX", "SPY"],
      minPoints: 60,
    },
  },
  {
    group: "Wave A — Dual-Axis",
    id: "A10",
    label: "HY spreads vs SPY",
    prompt: "Plot high yield spreads vs SPY over the last 10 years",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["HY", "SPY"],
      minPoints: 60,
    },
  },

  // ── Wave A: Lag capability ────────────────────────────────────────────────

  {
    group: "Wave A — Lag",
    id: "A11",
    label: "WTI vs CPI lagged 3 months",
    prompt: "Plot WTI YoY vs CPI YoY lagged 3 months over the last 10 years",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["WTI", "CPI"],
      lagMonths: 3,
    },
  },
  {
    group: "Wave A — Lag",
    id: "A12",
    label: "WTI vs inflation lagged 6 months",
    prompt: "Show WTI vs inflation lagged by 6 months",
    expect: {
      hasChart: true,
      chartType: "line",
      lagMonths: 6,
    },
  },

  // ── Wave B: Rolling correlation ───────────────────────────────────────────

  {
    group: "Wave B — Rolling Correlation",
    id: "B1",
    label: "24m rolling WTI vs CPI",
    prompt: "Show 24 month rolling correlation of WTI vs CPI over the last 10 years",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["rolling correlation", "WTI", "CPI"],
      seriesLabels: ["Rolling correlation"],
      minPoints: 20,
    },
  },
  {
    group: "Wave B — Rolling Correlation",
    id: "B2",
    label: "12m rolling WTI vs DXY",
    prompt: "Plot 12 month rolling correlation of WTI vs dollar",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["rolling correlation"],
      seriesLabels: ["Rolling correlation"],
      minPoints: 12,
    },
  },
  {
    group: "Wave B — Rolling Correlation",
    id: "B3",
    label: "24m rolling 10Y vs SPY",
    prompt: "Show 24 month rolling correlation of 10 year yields vs SPY",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["rolling correlation"],
      seriesLabels: ["Rolling correlation"],
      minPoints: 20,
    },
  },
  {
    group: "Wave B — Rolling Correlation",
    id: "B4",
    label: "Rolling correlation over time — VIX vs HY",
    prompt: "How has the correlation between VIX and high yield spreads changed over time",
    expect: {
      hasChart: true,
      chartType: "line",
      seriesLabels: ["Rolling correlation"],
    },
  },

  // ── Wave B: Lead-lag bar charts ───────────────────────────────────────────

  {
    group: "Wave B — Lead-Lag",
    id: "B5",
    label: "Lead-lag WTI vs CPI",
    prompt: "Show the lead-lag correlation of WTI vs inflation — does oil lead CPI?",
    expect: {
      hasChart: true,
      chartType: "bar",
      titleContains: ["Lead-lag", "WTI", "CPI"],
      seriesLabels: ["Correlation"],
      minPoints: 13,
    },
  },
  {
    group: "Wave B — Lead-Lag",
    id: "B6",
    label: "Lead-lag DXY vs WTI",
    prompt: "Which leads the other — the dollar or oil? Show lead-lag correlation",
    expect: {
      hasChart: true,
      chartType: "bar",
      titleContains: ["Lead-lag"],
      seriesLabels: ["Correlation"],
      minPoints: 13,
    },
  },
  {
    group: "Wave B — Lead-Lag",
    id: "B7",
    label: "Lead-lag 10Y vs SPY",
    prompt: "Does the 10 year yield lead the SPY? Show lead-lag bar chart",
    expect: {
      hasChart: true,
      chartType: "bar",
      titleContains: ["Lead-lag"],
      minPoints: 13,
    },
  },

  // ── Wave B: Drawdown ──────────────────────────────────────────────────────

  {
    group: "Wave B — Drawdown",
    id: "B8",
    label: "SPY drawdown from peak",
    prompt: "Show me the SPY drawdown from peak over the last 10 years",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["SPY", "drawdown"],
      seriesLabels: ["Drawdown"],
      minPoints: 60,
    },
  },
  {
    group: "Wave B — Drawdown",
    id: "B9",
    label: "WTI drawdown from peak",
    prompt: "Show WTI drawdown from peak — how deep has oil corrected historically",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["WTI", "drawdown"],
      seriesLabels: ["Drawdown"],
      minPoints: 60,
    },
  },
  {
    group: "Wave B — Drawdown",
    id: "B10",
    label: "DXY drawdown",
    prompt: "Plot dollar index drawdown from peak over the last 10 years",
    expect: {
      hasChart: true,
      chartType: "line",
      titleContains: ["drawdown"],
      minPoints: 60,
    },
  },

  // ── Wave A/B: Heatmaps ────────────────────────────────────────────────────

  {
    group: "Wave A/B — Heatmap",
    id: "H1",
    label: "Full cross-asset heatmap",
    prompt: "Show me a cross-asset correlation heatmap",
    expect: {
      hasChart: true,
      chartType: "heatmap",
      titleContains: ["heatmap"],
      minHeatmapCells: 25,
    },
  },
  {
    group: "Wave A/B — Heatmap",
    id: "H2",
    label: "4-asset custom heatmap",
    prompt: "Draw a correlation heatmap of oil inflation dollar and SPY",
    expect: {
      hasChart: true,
      chartType: "heatmap",
      titleContains: ["heatmap"],
      heatmapSize: "4x4",
    },
  },
  {
    group: "Wave A/B — Heatmap",
    id: "H3",
    label: "7-asset custom heatmap",
    prompt: "Correlation heatmap of oil inflation dollar SPY VIX high yield and 10 year yields",
    expect: {
      hasChart: true,
      chartType: "heatmap",
      heatmapSize: "7x7",
    },
  },
  {
    group: "Wave A/B — Heatmap",
    id: "H4",
    label: "Risk regime heatmap",
    prompt: "Show risk regime heatmap — VIX HY spreads SPY and dollar",
    expect: {
      hasChart: true,
      chartType: "heatmap",
      minHeatmapCells: 9,
    },
  },
  {
    group: "Wave A/B — Heatmap",
    id: "H5",
    label: "Inflation regime heatmap",
    prompt: "Inflation regime heatmap — CPI PCE WTI dollar unemployment and 10 year yield",
    expect: {
      hasChart: true,
      chartType: "heatmap",
      minHeatmapCells: 16,
    },
  },

  // ── Wave C: Thread-aware follow-ups (series of prompts in one thread) ─────
  // These are marked threadFollowUp: true and reference prevId to chain.

  {
    group: "Wave C — Thread Follow-Up",
    id: "C1a",
    label: "Initial WTI vs CPI — start thread",
    prompt: "Plot WTI vs CPI over the last 10 years",
    expect: {
      hasChart: true,
      chartType: "line",
    },
    startThread: true,
    threadKey: "wti_cpi_thread",
  },
  {
    group: "Wave C — Thread Follow-Up",
    id: "C1b",
    label: "Follow-up: make it two axis",
    prompt: "make it two axis",
    expect: {
      hasChart: true,
      chartType: "line",
      dualAxis: true,
    },
    followUp: "wti_cpi_thread",
  },
  {
    group: "Wave C — Thread Follow-Up",
    id: "C1c",
    label: "Follow-up: WTI absolute vs CPI absolute two axis",
    prompt: "make the chart as WTI absolute values vs CPI absolute values in two axis",
    expect: {
      hasChart: true,
      chartType: "line",
      seriesLabels: ["WTI $/bbl", "CPI index"],
      dualAxis: true,
    },
    followUp: "wti_cpi_thread",
  },
  {
    group: "Wave C — Thread Follow-Up",
    id: "C1d",
    label: "Follow-up: show it again",
    prompt: "show it again",
    expect: {
      hasChart: true,
    },
    followUp: "wti_cpi_thread",
  },

  {
    group: "Wave C — Thread Follow-Up",
    id: "C2a",
    label: "Lead-lag thread start",
    prompt: "Show lead-lag correlation of WTI vs inflation",
    expect: {
      hasChart: true,
      chartType: "bar",
    },
    startThread: true,
    threadKey: "leadlag_thread",
  },
  {
    group: "Wave C — Thread Follow-Up",
    id: "C2b",
    label: "Follow-up: switch to rolling correlation",
    prompt: "now show it as rolling correlation instead",
    expect: {
      hasChart: true,
      chartType: "line",
      seriesLabels: ["Rolling correlation"],
    },
    followUp: "leadlag_thread",
  },

  {
    group: "Wave C — Thread Follow-Up",
    id: "C3a",
    label: "Heatmap then custom subset",
    prompt: "Show a cross-asset correlation heatmap",
    expect: {
      hasChart: true,
      chartType: "heatmap",
    },
    startThread: true,
    threadKey: "heatmap_thread",
  },
  {
    group: "Wave C — Thread Follow-Up",
    id: "C3b",
    label: "Follow-up: subset heatmap",
    prompt: "Now show only oil inflation dollar and SPY",
    expect: {
      hasChart: true,
      chartType: "heatmap",
      heatmapSize: "4x4",
    },
    followUp: "heatmap_thread",
  },

  // ── Edge cases ────────────────────────────────────────────────────────────

  {
    group: "Edge Cases",
    id: "E1",
    label: "No chart — pure prose question",
    prompt: "What is your view on oil right now?",
    expect: {
      hasChart: false,
    },
  },
  {
    group: "Edge Cases",
    id: "E2",
    label: "No chart — unsupported pair",
    prompt: "Plot gold vs platinum correlation",
    expect: {
      hasChart: false,   // gold/platinum not in data lake
    },
  },
  {
    group: "Edge Cases",
    id: "E3",
    label: "WTI YoY vs CPI YoY — CPI index level",
    prompt: "Plot WTI YoY percent vs CPI index level over the last 10 years",
    expect: {
      hasChart: true,
      chartType: "line",
      seriesLabels: ["WTI YoY%", "CPI index"],
    },
  },
  {
    group: "Edge Cases",
    id: "E4",
    label: "Drawdown — ambiguous asset",
    prompt: "Show me a drawdown chart of equities",
    expect: {
      hasChart: true,   // should resolve to SPY
      chartType: "line",
      seriesLabels: ["Drawdown"],
    },
  },
  {
    group: "Edge Cases",
    id: "E5",
    label: "Rolling correlation — explicit 6 month window",
    prompt: "Show 6 month rolling correlation of VIX vs high yield spreads",
    expect: {
      hasChart: true,
      chartType: "line",
      seriesLabels: ["Rolling correlation"],
    },
  },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

async function createThread(prompt) {
  const r = await fetch(`${API}/api/market-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: prompt }),
  });
  if (!r.ok) throw new Error(`createThread HTTP ${r.status}`);
  return r.json();
}

async function replyToThread(threadId, prompt) {
  const r = await fetch(`${API}/api/market-questions/${threadId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: prompt }),
  });
  if (!r.ok) throw new Error(`replyToThread HTTP ${r.status}`);
  return r.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Chart parser ─────────────────────────────────────────────────────────────

function extractChart(messages) {
  // Find the last assistant message that has %%CHART_DATA%%
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    const marker = msg.content.indexOf("%%CHART_DATA%%");
    if (marker === -1) continue;
    try {
      const jsonStr = msg.content.slice(marker + "%%CHART_DATA%%".length);
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }
  return null;
}

function extractText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    return msg.content.replace(/%%CHART_DATA%%.*/s, "").trim().slice(0, 200);
  }
  return "";
}

// ─── Assertion engine ─────────────────────────────────────────────────────────

function check(chart, expect) {
  const failures = [];

  if (expect.hasChart && !chart) {
    failures.push("NO_CHART — expected a chart payload");
    return failures;
  }
  if (!expect.hasChart && chart) {
    failures.push("UNEXPECTED_CHART — expected no chart");
    return failures;
  }
  if (!expect.hasChart && !chart) return failures;  // pass — no chart expected and none found

  if (expect.chartType && chart.chartType !== expect.chartType) {
    failures.push(`CHART_TYPE: expected ${expect.chartType} got ${chart.chartType}`);
  }

  if (expect.titleContains) {
    for (const t of expect.titleContains) {
      if (!chart.title?.toLowerCase().includes(t.toLowerCase())) {
        failures.push(`TITLE_MISSING: "${t}" not in "${chart.title}"`);
      }
    }
  }

  const seriesLabels = chart.series?.map((s) => s.label) ?? [];
  if (expect.seriesLabels) {
    for (const sl of expect.seriesLabels) {
      if (!seriesLabels.includes(sl)) {
        failures.push(`SERIES_MISSING: "${sl}" not in [${seriesLabels.join(", ")}]`);
      }
    }
  }

  if (expect.minPoints && (chart.data?.length ?? 0) < expect.minPoints) {
    failures.push(`POINTS: expected ≥${expect.minPoints} got ${chart.data?.length ?? 0}`);
  }

  if (expect.dualAxis === true) {
    const axes = chart.yAxes ?? [];
    if (axes.length < 2) failures.push(`DUAL_AXIS: expected 2 yAxes got ${axes.length}`);
  }
  if (expect.dualAxis === false) {
    const axes = chart.yAxes ?? [];
    if (axes.length > 1) failures.push(`SINGLE_AXIS: expected 1 yAxis got ${axes.length}`);
  }

  if (expect.lagMonths) {
    const lagInTitle = chart.title?.includes("lag") || chart.title?.includes("Lag");
    if (!lagInTitle) failures.push(`LAG: title doesn't mention lag — "${chart.title}"`);
  }

  if (chart.chartType === "heatmap") {
    const rows = chart.heatmap?.rows?.length ?? 0;
    const cols = chart.heatmap?.columns?.length ?? 0;
    const cells = chart.heatmap?.cells?.length ?? 0;

    if (expect.heatmapSize) {
      const [er, ec] = expect.heatmapSize.split("x").map(Number);
      if (rows !== er || cols !== ec) {
        failures.push(`HEATMAP_SIZE: expected ${er}x${ec} got ${rows}x${cols}`);
      }
    }
    if (expect.minHeatmapCells && cells < expect.minHeatmapCells) {
      failures.push(`HEATMAP_CELLS: expected ≥${expect.minHeatmapCells} got ${cells}`);
    }
  }

  return failures;
}

// ─── Main runner ──────────────────────────────────────────────────────────────

async function run() {
  console.log(`${BOLD}${"═".repeat(80)}${RESET}`);
  console.log(`${BOLD}  CHART BACKTEST — WAVE A / B / C   (live production)${RESET}`);
  console.log(`${BOLD}  API: ${API}${RESET}`);
  console.log(`${BOLD}${"═".repeat(80)}${RESET}\n`);

  const threadRegistry = {};  // threadKey → threadId
  const allResults = [];
  const byGroup = {};

  let totalPass = 0;
  let totalFail = 0;

  for (const tc of SUITE) {
    // ── Determine thread context ──
    let threadView;
    try {
      if (tc.followUp) {
        const threadId = threadRegistry[tc.followUp];
        if (!threadId) throw new Error(`Thread "${tc.followUp}" not started yet`);
        threadView = await replyToThread(threadId, tc.prompt);
      } else {
        threadView = await createThread(tc.prompt);
        if (tc.startThread && tc.threadKey) {
          threadRegistry[tc.threadKey] = threadView.thread.id;
        }
      }
    } catch (err) {
      const result = {
        id: tc.id,
        group: tc.group,
        label: tc.label,
        prompt: tc.prompt,
        pass: false,
        failures: [`API_ERROR: ${err.message}`],
        chartTitle: null,
        chartType: null,
        series: [],
        points: 0,
        axes: 0,
        heatmapSize: null,
        agentText: "",
        threadId: null,
      };
      allResults.push(result);
      totalFail++;
      (byGroup[tc.group] = byGroup[tc.group] || []).push(result);
      console.log(`${R}✗ [${tc.id}] ${tc.label}${RESET}`);
      console.log(`  ${R}${result.failures[0]}${RESET}\n`);
      await sleep(DELAY_MS);
      continue;
    }

    const chart = extractChart(threadView.messages);
    const agentText = extractText(threadView.messages);
    const failures = check(chart, tc.expect);
    const pass = failures.length === 0;

    if (pass) totalPass++; else totalFail++;

    const seriesLabels = chart?.series?.map((s) => s.label) ?? [];
    const axes = chart?.yAxes?.length ?? 0;
    const heatmapRows = chart?.heatmap?.rows?.length;
    const heatmapCols = chart?.heatmap?.columns?.length;
    const heatmapSize = heatmapRows != null ? `${heatmapRows}x${heatmapCols}` : null;
    const points = chart?.data?.length ?? 0;

    const result = {
      id: tc.id,
      group: tc.group,
      label: tc.label,
      prompt: tc.prompt,
      pass,
      failures,
      chartTitle: chart?.title ?? null,
      chartType: chart?.chartType ?? null,
      series: seriesLabels,
      points,
      axes,
      heatmapSize,
      agentText: agentText.slice(0, 180),
      threadId: threadView.thread.id,
      correlation: chart?.subtitle ?? null,
    };
    allResults.push(result);
    (byGroup[tc.group] = byGroup[tc.group] || []).push(result);

    // ── Console output ──
    const icon = pass ? `${G}✓${RESET}` : `${R}✗${RESET}`;
    console.log(`${icon} ${BOLD}[${tc.id}]${RESET} ${tc.label}`);
    console.log(`  Prompt: "${tc.prompt.slice(0, 90)}"`);
    if (chart) {
      console.log(`  ${B}Chart: ${chart.chartType} | "${chart.title}"${RESET}`);
      if (seriesLabels.length) console.log(`  Series: [${seriesLabels.join(", ")}]`);
      if (axes > 0) console.log(`  Axes: ${axes} | Points: ${points}`);
      if (heatmapSize) console.log(`  Heatmap: ${heatmapSize} | Cells: ${chart?.heatmap?.cells?.length}`);
      if (chart.subtitle) console.log(`  ${Y}Correlation: ${chart.subtitle}${RESET}`);
    } else {
      console.log(`  ${Y}No chart generated${RESET}`);
    }
    if (!pass) {
      for (const f of failures) console.log(`  ${R}  FAIL: ${f}${RESET}`);
    }
    console.log(`  Agent: "${agentText.slice(0, 120)}..."`);
    console.log();

    await sleep(DELAY_MS);
  }

  // ─── Group summary ────────────────────────────────────────────────────────
  console.log(`${BOLD}${"═".repeat(80)}${RESET}`);
  console.log(`${BOLD}  RESULTS BY GROUP${RESET}`);
  console.log(`${BOLD}${"═".repeat(80)}${RESET}`);
  for (const [group, results] of Object.entries(byGroup)) {
    const gPass = results.filter((r) => r.pass).length;
    const gTotal = results.length;
    const gIcon = gPass === gTotal ? G : gPass > 0 ? Y : R;
    console.log(`${gIcon}${BOLD}  ${group}: ${gPass}/${gTotal}${RESET}`);
    for (const r of results) {
      const icon = r.pass ? `${G}✓${RESET}` : `${R}✗${RESET}`;
      const chartInfo = r.chartTitle ? ` → ${r.chartType} "${r.chartTitle.slice(0, 50)}"` : " → no chart";
      console.log(`    ${icon} [${r.id}] ${r.label}${chartInfo}`);
      if (!r.pass) {
        for (const f of r.failures) console.log(`        ${R}${f}${RESET}`);
      }
    }
  }

  // ─── Overall summary ──────────────────────────────────────────────────────
  console.log(`\n${BOLD}${"═".repeat(80)}${RESET}`);
  console.log(`${BOLD}  OVERALL: ${totalPass}/${totalPass + totalFail} passed${RESET}`);
  console.log(`${BOLD}${"═".repeat(80)}${RESET}`);

  const pct = Math.round((totalPass / (totalPass + totalFail)) * 100);
  const pctColor = pct === 100 ? G : pct >= 80 ? Y : R;
  console.log(`  Pass rate: ${pctColor}${BOLD}${pct}%${RESET}`);

  const failed = allResults.filter((r) => !r.pass);
  if (failed.length > 0) {
    console.log(`\n  ${R}${BOLD}FAILURES TO FIX:${RESET}`);
    for (const r of failed) {
      console.log(`  ${R}✗ [${r.id}] ${r.label}${RESET}`);
      for (const f of r.failures) console.log(`      ${f}`);
    }
  }

  // ─── Save JSON report ────────────────────────────────────────────────────
  const report = {
    ranAt: new Date().toISOString(),
    api: API,
    totalPass,
    totalFail,
    passRate: pct,
    groups: Object.entries(byGroup).map(([group, results]) => ({
      group,
      pass: results.filter((r) => r.pass).length,
      total: results.length,
      results,
    })),
  };
  writeFileSync("backtest-charts-live-results.json", JSON.stringify(report, null, 2));
  console.log(`\n  Full results saved → backtest-charts-live-results.json`);
  console.log(`  View charts live at: https://market-room-web.pages.dev\n`);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
