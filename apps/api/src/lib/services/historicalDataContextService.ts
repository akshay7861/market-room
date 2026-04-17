import eiaWtiMonthly from "../../../../../knowledge/data-lake/normalized/eia_wti_monthly.json";
import fredCpiHeadline from "../../../../../knowledge/data-lake/normalized/fred_cpi_headline.json";
import fredM1Monthly from "../../../../../knowledge/data-lake/normalized/fred_m1_monthly.json";
import fredM2Monthly from "../../../../../knowledge/data-lake/normalized/fred_m2_monthly.json";
import fredBroadDollar from "../../../../../knowledge/data-lake/normalized/fred_broad_dollar.json";
import avSpyMonthly from "../../../../../knowledge/data-lake/normalized/av_spy_monthly.json";
import fredVix from "../../../../../knowledge/data-lake/normalized/fred_vix.json";
import fredHighYieldSpread from "../../../../../knowledge/data-lake/normalized/fred_high_yield_spread.json";

type HistoricalObservation = {
  date: string;
  value: number | null;
};

type HistoricalSeries = {
  id: string;
  label: string;
  frequency: string;
  units: string;
  coverageStart: string;
  coverageEnd: string;
  observations: HistoricalObservation[];
};

type AlignedPoint = {
  date: string;
  left: number;
  right: number;
};

export function buildHistoricalDataPromptBlock(question: string): string {
  const lower = question.toLowerCase();
  const asksForCorrelation = /\b(correlation|correlat|relationship|similarity|regression|chart|plot)\b/.test(lower);
  const mentionsOil = /\b(wti|crude|oil)\b/.test(lower);
  const mentionsInflation = /\b(cpi|inflation|headline inflation)\b/.test(lower);
  const mentionsMoneySupply = /\b(m1|money supply|liquidity)\b/.test(lower);
  const mentionsCrisis = /\b(2008|crisis|gfc|war|middle east|gulf war|iraq|iran|conflict)\b/.test(lower);
  const mentionsFX = /\b(dollar|dxy|usd|fx|currency|eurusd|usdjpy|yen|euro|sterling|gbp|jpy)\b/.test(lower);
  const mentionsEquities = /\b(spy|s&p|spx|equities|stocks|equity|stock market)\b/.test(lower);
  const mentionsRisk = /\b(vix|volatility|risk|credit spread|high.?yield|spread)\b/.test(lower);

  if (!mentionsOil && !mentionsInflation && !mentionsMoneySupply && !mentionsFX && !mentionsEquities && !mentionsRisk && !asksForCorrelation) {
    return "";
  }

  const blocks: string[] = [
    "## Available Historical Data Context",
    "Use this block as the boundary of what the system can verify from its stored data. Do not invent exact statistics for missing series.",
    availableSeriesLine(wtiMonthlySeries()),
    availableSeriesLine(cpiHeadlineSeries()),
    availableSeriesLine(m1MonthlySeries()),
    availableSeriesLine(m2MonthlySeries()),
    availableSeriesLine(broadDollarSeries()),
    availableSeriesLine(spyMonthlySeries()),
    availableSeriesLine(vixSeries()),
    availableSeriesLine(highYieldSpreadSeries())
  ];

  if (asksForCorrelation && mentionsOil && mentionsInflation) {
    const window = mentionsCrisis ? { start: "2007-01", end: "2009-12", label: "2007-2009 crisis window" } : null;
    const stats = computeWtiCpiStats(window?.start, window?.end);
    if (stats) {
      blocks.push(
        [
          `Computed stored-data check (${window?.label || "full overlapping monthly sample"}):`,
          `- observations: ${stats.count}`,
          `- WTI price vs headline CPI YoY correlation: ${formatCorrelation(stats.priceVsCpiYoYCorrelation)}`,
          `- WTI YoY change vs headline CPI YoY correlation: ${formatCorrelation(stats.wtiYoYVsCpiYoYCorrelation)}`,
          `- WTI range: $${stats.wtiMin.toFixed(2)}/bbl to $${stats.wtiMax.toFixed(2)}/bbl`,
          `- CPI YoY range: ${stats.cpiYoYMin.toFixed(1)}% to ${stats.cpiYoYMax.toFixed(1)}%`
        ].join("\n")
      );
    }
  }

  if (asksForCorrelation && mentionsMoneySupply && mentionsInflation) {
    const window = mentionsCrisis ? { start: "2007-01", end: "2009-12", label: "2007-2009 crisis window" } : null;
    const stats = computeM1CpiStats(window?.start, window?.end);
    if (stats) {
      blocks.push(
        [
          `Computed stored-data check — M1 vs CPI (${window?.label || "full overlapping monthly sample"}):`,
          `- observations: ${stats.count}`,
          `- M1 YoY change vs headline CPI YoY correlation: ${formatCorrelation(stats.m1YoYVsCpiYoYCorrelation)}`,
          `- M1 YoY range: ${stats.m1YoYMin.toFixed(1)}% to ${stats.m1YoYMax.toFixed(1)}%`,
          `- CPI YoY range: ${stats.cpiYoYMin.toFixed(1)}% to ${stats.cpiYoYMax.toFixed(1)}%`
        ].join("\n")
      );
    }
  }

  if (asksForCorrelation && mentionsFX && mentionsOil) {
    const fxWindow = mentionsCrisis ? { start: "2007-01", end: "2009-12", label: "2007-2009 crisis window" } : null;
    const fxStats = computeDollarWtiStats(fxWindow?.start, fxWindow?.end);
    if (fxStats) {
      blocks.push(
        [
          `Computed stored-data check — Broad Dollar YoY% vs WTI YoY% (${fxWindow?.label || "full overlapping monthly sample"}):`,
          `- observations: ${fxStats.count}`,
          `- Broad Dollar YoY% vs WTI YoY% correlation: ${formatCorrelation(fxStats.dollarYoYVsWtiYoYCorrelation)}`,
          `- Dollar YoY range: ${fxStats.dollarYoYMin.toFixed(1)}% to ${fxStats.dollarYoYMax.toFixed(1)}%`,
          `- WTI YoY range: ${fxStats.wtiYoYMin.toFixed(1)}% to ${fxStats.wtiYoYMax.toFixed(1)}%`
        ].join("\n")
      );
    }
  }

  if (asksForCorrelation && mentionsEquities && mentionsOil) {
    const eqWindow = mentionsCrisis ? { start: "2007-01", end: "2009-12", label: "2007-2009 crisis window" } : null;
    const eqStats = computeSpyWtiStats(eqWindow?.start, eqWindow?.end);
    if (eqStats) {
      blocks.push(
        [
          `Computed stored-data check — SPY YoY% vs WTI YoY% (${eqWindow?.label || "full overlapping monthly sample"}):`,
          `- observations: ${eqStats.count}`,
          `- SPY YoY% vs WTI YoY% correlation: ${formatCorrelation(eqStats.spyYoYVsWtiYoYCorrelation)}`,
          `- SPY YoY range: ${eqStats.spyYoYMin.toFixed(1)}% to ${eqStats.spyYoYMax.toFixed(1)}%`,
          `- WTI YoY range: ${eqStats.wtiYoYMin.toFixed(1)}% to ${eqStats.wtiYoYMax.toFixed(1)}%`
        ].join("\n")
      );
    }
  }

  if (asksForCorrelation && mentionsRisk) {
    const riskWindow = mentionsCrisis ? { start: "2007-01", end: "2009-12", label: "2007-2009 crisis window" } : null;
    const riskStats = computeVixHyStats(riskWindow?.start, riskWindow?.end);
    if (riskStats) {
      blocks.push(
        [
          `Computed stored-data check — VIX vs High-Yield Spread (${riskWindow?.label || "full overlapping monthly sample"}):`,
          `- observations: ${riskStats.count}`,
          `- VIX level vs HY Spread level correlation: ${formatCorrelation(riskStats.vixVsHyCorrelation)}`,
          `- VIX range: ${riskStats.vixMin.toFixed(1)} to ${riskStats.vixMax.toFixed(1)}`,
          `- HY Spread range: ${riskStats.hyMin.toFixed(0)}bps to ${riskStats.hyMax.toFixed(0)}bps`
        ].join("\n")
      );
    }
  }

  blocks.push(
    "Answering rule: if exact data is unavailable, say so plainly and offer the closest available stored-data calculation instead of approximating from model memory."
  );

  return blocks.join("\n");
}

function availableSeriesLine(series: HistoricalSeries): string {
  return `Available: ${series.label} (${series.id}), ${series.frequency}, ${series.coverageStart} to ${series.coverageEnd}, ${series.observations.length} observations, units=${series.units}.`;
}

function wtiMonthlySeries(): HistoricalSeries {
  return eiaWtiMonthly as HistoricalSeries;
}

function cpiHeadlineSeries(): HistoricalSeries {
  return fredCpiHeadline as HistoricalSeries;
}

function m1MonthlySeries(): HistoricalSeries {
  return fredM1Monthly as HistoricalSeries;
}

function m2MonthlySeries(): HistoricalSeries {
  return fredM2Monthly as HistoricalSeries;
}

function broadDollarSeries(): HistoricalSeries {
  return fredBroadDollar as HistoricalSeries;
}

function spyMonthlySeries(): HistoricalSeries {
  return avSpyMonthly as unknown as HistoricalSeries;
}

function vixSeries(): HistoricalSeries {
  return fredVix as HistoricalSeries;
}

function highYieldSpreadSeries(): HistoricalSeries {
  return fredHighYieldSpread as HistoricalSeries;
}

function computeWtiCpiStats(start?: string, end?: string) {
  const wti = wtiMonthlySeries();
  const cpi = cpiHeadlineSeries();
  const wtiByMonth = toMonthlyMap(wti.observations);
  const cpiByMonth = toMonthlyMap(cpi.observations);
  const cpiYoYByMonth = yoyMap(cpiByMonth);
  const wtiYoYByMonth = yoyMap(wtiByMonth);

  const priceVsCpiYoY: AlignedPoint[] = [];
  const wtiYoYVsCpiYoY: AlignedPoint[] = [];

  for (const [month, wtiValue] of wtiByMonth) {
    if (start && month < start) continue;
    if (end && month > end) continue;
    const cpiYoY = cpiYoYByMonth.get(month);
    const wtiYoY = wtiYoYByMonth.get(month);
    if (typeof cpiYoY === "number") {
      priceVsCpiYoY.push({ date: month, left: wtiValue, right: cpiYoY });
    }
    if (typeof cpiYoY === "number" && typeof wtiYoY === "number") {
      wtiYoYVsCpiYoY.push({ date: month, left: wtiYoY, right: cpiYoY });
    }
  }

  if (priceVsCpiYoY.length < 6 || wtiYoYVsCpiYoY.length < 6) {
    return null;
  }

  return {
    count: priceVsCpiYoY.length,
    priceVsCpiYoYCorrelation: pearson(priceVsCpiYoY),
    wtiYoYVsCpiYoYCorrelation: pearson(wtiYoYVsCpiYoY),
    wtiMin: Math.min(...priceVsCpiYoY.map((point) => point.left)),
    wtiMax: Math.max(...priceVsCpiYoY.map((point) => point.left)),
    cpiYoYMin: Math.min(...priceVsCpiYoY.map((point) => point.right)),
    cpiYoYMax: Math.max(...priceVsCpiYoY.map((point) => point.right))
  };
}

function computeM1CpiStats(start?: string, end?: string) {
  const m1 = m1MonthlySeries();
  const cpi = cpiHeadlineSeries();
  const m1ByMonth = toMonthlyMap(m1.observations);
  const cpiByMonth = toMonthlyMap(cpi.observations);
  const cpiYoYByMonth = yoyMap(cpiByMonth);
  const m1YoYByMonth = yoyMap(m1ByMonth);

  const points: AlignedPoint[] = [];

  for (const [month, m1YoY] of m1YoYByMonth) {
    if (start && month < start) continue;
    if (end && month > end) continue;
    const cpiYoY = cpiYoYByMonth.get(month);
    if (typeof cpiYoY === "number") {
      points.push({ date: month, left: m1YoY, right: cpiYoY });
    }
  }

  if (points.length < 6) return null;

  return {
    count: points.length,
    m1YoYVsCpiYoYCorrelation: pearson(points),
    m1YoYMin: Math.min(...points.map((p) => p.left)),
    m1YoYMax: Math.max(...points.map((p) => p.left)),
    cpiYoYMin: Math.min(...points.map((p) => p.right)),
    cpiYoYMax: Math.max(...points.map((p) => p.right))
  };
}

function computeDollarWtiStats(start?: string, end?: string) {
  const dollarByMonth = toMonthlyMap(broadDollarSeries().observations);
  const wtiByMonth = toMonthlyMap(wtiMonthlySeries().observations);
  const dollarYoY = yoyMap(dollarByMonth);
  const wtiYoY = yoyMap(wtiByMonth);

  const points: AlignedPoint[] = [];
  for (const [month, d] of dollarYoY) {
    if (start && month < start) continue;
    if (end && month > end) continue;
    const w = wtiYoY.get(month);
    if (typeof w === "number") points.push({ date: month, left: d, right: w });
  }

  if (points.length < 6) return null;
  return {
    count: points.length,
    dollarYoYVsWtiYoYCorrelation: pearson(points),
    dollarYoYMin: Math.min(...points.map((p) => p.left)),
    dollarYoYMax: Math.max(...points.map((p) => p.left)),
    wtiYoYMin: Math.min(...points.map((p) => p.right)),
    wtiYoYMax: Math.max(...points.map((p) => p.right))
  };
}

function computeSpyWtiStats(start?: string, end?: string) {
  const spyByMonth = toMonthlyMap(spyMonthlySeries().observations);
  const wtiByMonth = toMonthlyMap(wtiMonthlySeries().observations);
  const spyYoY = yoyMap(spyByMonth);
  const wtiYoY = yoyMap(wtiByMonth);

  const points: AlignedPoint[] = [];
  for (const [month, s] of spyYoY) {
    if (start && month < start) continue;
    if (end && month > end) continue;
    const w = wtiYoY.get(month);
    if (typeof w === "number") points.push({ date: month, left: s, right: w });
  }

  if (points.length < 6) return null;
  return {
    count: points.length,
    spyYoYVsWtiYoYCorrelation: pearson(points),
    spyYoYMin: Math.min(...points.map((p) => p.left)),
    spyYoYMax: Math.max(...points.map((p) => p.left)),
    wtiYoYMin: Math.min(...points.map((p) => p.right)),
    wtiYoYMax: Math.max(...points.map((p) => p.right))
  };
}

function computeVixHyStats(start?: string, end?: string) {
  const vixByMonth = toMonthlyMap(vixSeries().observations);
  const hyByMonth = toMonthlyMap(highYieldSpreadSeries().observations);

  const points: AlignedPoint[] = [];
  for (const [month, v] of vixByMonth) {
    if (start && month < start) continue;
    if (end && month > end) continue;
    const h = hyByMonth.get(month);
    if (typeof h === "number") points.push({ date: month, left: v, right: h });
  }

  if (points.length < 6) return null;
  return {
    count: points.length,
    vixVsHyCorrelation: pearson(points),
    vixMin: Math.min(...points.map((p) => p.left)),
    vixMax: Math.max(...points.map((p) => p.left)),
    hyMin: Math.min(...points.map((p) => p.right)),
    hyMax: Math.max(...points.map((p) => p.right))
  };
}

function toMonthlyMap(observations: HistoricalObservation[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const observation of observations) {
    if (typeof observation.value !== "number" || Number.isNaN(observation.value)) continue;
    map.set(observation.date.slice(0, 7), observation.value);
  }
  return map;
}

function yoyMap(monthly: Map<string, number>): Map<string, number> {
  const map = new Map<string, number>();
  for (const [month, value] of monthly) {
    const prior = monthly.get(shiftMonth(month, -12));
    if (typeof prior === "number" && prior !== 0) {
      map.set(month, ((value - prior) / prior) * 100);
    }
  }
  return map;
}

function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function pearson(points: AlignedPoint[]): number {
  const n = points.length;
  const meanLeft = points.reduce((sum, point) => sum + point.left, 0) / n;
  const meanRight = points.reduce((sum, point) => sum + point.right, 0) / n;
  const numerator = points.reduce((sum, point) => sum + (point.left - meanLeft) * (point.right - meanRight), 0);
  const leftDenominator = Math.sqrt(points.reduce((sum, point) => sum + (point.left - meanLeft) ** 2, 0));
  const rightDenominator = Math.sqrt(points.reduce((sum, point) => sum + (point.right - meanRight) ** 2, 0));
  return leftDenominator && rightDenominator ? numerator / (leftDenominator * rightDenominator) : 0;
}

function formatCorrelation(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

// ── Chart data ────────────────────────────────────────────────────────────────

type ChartSeries = { key: string; label: string; color: string };
type ChartPoint = { date: string; [key: string]: number | string };

export type ChartData = {
  title: string;
  series: ChartSeries[];
  data: ChartPoint[];
};

export function buildChartDataFromQuestion(question: string): ChartData | null {
  const lower = question.toLowerCase();
  const asksForCorrelation = /\b(correlation|correlat|relationship|similarity|regression|chart|plot)\b/.test(lower);
  const mentionsOil = /\b(wti|crude|oil)\b/.test(lower);
  const mentionsInflation = /\b(cpi|inflation|headline inflation)\b/.test(lower);
  const mentionsMoneySupply = /\b(m1|money supply|liquidity)\b/.test(lower);
  const mentionsCrisis = /\b(2008|crisis|gfc|war|middle east|gulf war|iraq|iran|conflict)\b/.test(lower);
  const mentionsFX = /\b(dollar|dxy|usd|fx|currency|eurusd|usdjpy|yen|euro|sterling|gbp|jpy)\b/.test(lower);
  const mentionsEquities = /\b(spy|s&p|spx|equities|stocks|equity|stock market)\b/.test(lower);

  const windowStart = mentionsCrisis ? "2007-01" : tenYearsAgo();
  const windowEnd = mentionsCrisis ? "2009-12" : undefined;
  const windowLabel = mentionsCrisis ? "2007–2009 crisis window" : "last 10 years";

  if (asksForCorrelation && mentionsOil && mentionsInflation) {
    const points = alignedWtiCpiYoYPoints(windowStart, windowEnd);
    if (points.length < 6) return null;
    return {
      title: `WTI YoY% vs CPI YoY% — ${windowLabel}`,
      series: [
        { key: "wtiYoY", label: "WTI YoY%", color: "#d97706" },
        { key: "cpiYoY", label: "CPI YoY%", color: "#2563eb" }
      ],
      data: points.map((p) => ({ date: p.date.slice(0, 7), wtiYoY: +p.left.toFixed(1), cpiYoY: +p.right.toFixed(1) }))
    };
  }

  if (asksForCorrelation && mentionsMoneySupply && mentionsInflation) {
    const points = alignedM1CpiYoYPoints(windowStart, windowEnd);
    if (points.length < 6) return null;
    return {
      title: `M1 YoY% vs CPI YoY% — ${windowLabel}`,
      series: [
        { key: "m1YoY", label: "M1 YoY%", color: "#059669" },
        { key: "cpiYoY", label: "CPI YoY%", color: "#2563eb" }
      ],
      data: points.map((p) => ({ date: p.date.slice(0, 7), m1YoY: +p.left.toFixed(1), cpiYoY: +p.right.toFixed(1) }))
    };
  }

  return null;
}

function alignedWtiCpiYoYPoints(start: string, end?: string): AlignedPoint[] {
  const wtiByMonth = toMonthlyMap(wtiMonthlySeries().observations);
  const cpiByMonth = toMonthlyMap(cpiHeadlineSeries().observations);
  const wtiYoY = yoyMap(wtiByMonth);
  const cpiYoY = yoyMap(cpiByMonth);
  const points: AlignedPoint[] = [];
  for (const [month, w] of wtiYoY) {
    if (month < start) continue;
    if (end && month > end) continue;
    const c = cpiYoY.get(month);
    if (typeof c === "number") points.push({ date: month, left: w, right: c });
  }
  return points;
}

function alignedM1CpiYoYPoints(start: string, end?: string): AlignedPoint[] {
  const m1ByMonth = toMonthlyMap(m1MonthlySeries().observations);
  const cpiByMonth = toMonthlyMap(cpiHeadlineSeries().observations);
  const m1YoY = yoyMap(m1ByMonth);
  const cpiYoY = yoyMap(cpiByMonth);
  const points: AlignedPoint[] = [];
  for (const [month, m] of m1YoY) {
    if (month < start) continue;
    if (end && month > end) continue;
    const c = cpiYoY.get(month);
    if (typeof c === "number") points.push({ date: month, left: m, right: c });
  }
  return points;
}

function tenYearsAgo(): string {
  const d = new Date();
  return `${d.getUTCFullYear() - 10}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
