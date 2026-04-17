import eiaWtiMonthly from "../../../../../knowledge/data-lake/normalized/eia_wti_monthly.json";
import fredCpiHeadline from "../../../../../knowledge/data-lake/normalized/fred_cpi_headline.json";
import fredM1Monthly from "../../../../../knowledge/data-lake/normalized/fred_m1_monthly.json";
import fredM2Monthly from "../../../../../knowledge/data-lake/normalized/fred_m2_monthly.json";
import fredBroadDollar from "../../../../../knowledge/data-lake/normalized/fred_broad_dollar.json";
import avSpyMonthly from "../../../../../knowledge/data-lake/normalized/av_spy_monthly.json";
import fredVix from "../../../../../knowledge/data-lake/normalized/fred_vix.json";
import fredHighYieldSpread from "../../../../../knowledge/data-lake/normalized/fred_high_yield_spread.json";
import fredUs10y from "../../../../../knowledge/data-lake/normalized/fred_us10y.json";
import fredUs2y from "../../../../../knowledge/data-lake/normalized/fred_us2y.json";
import fredCurve10y2y from "../../../../../knowledge/data-lake/normalized/fred_curve_10y2y.json";
import fredBreakeven10y from "../../../../../knowledge/data-lake/normalized/fred_breakeven_10y.json";
import fredUnemployment from "../../../../../knowledge/data-lake/normalized/fred_unemployment.json";
import fredRetailSales from "../../../../../knowledge/data-lake/normalized/fred_retail_sales.json";
import fredIndustrialProduction from "../../../../../knowledge/data-lake/normalized/fred_industrial_production.json";
import fredFedFunds from "../../../../../knowledge/data-lake/normalized/fred_fedfunds.json";
import fredPceHeadline from "../../../../../knowledge/data-lake/normalized/fred_pce_headline.json";
import fredPceCore from "../../../../../knowledge/data-lake/normalized/fred_pce_core.json";
import fredNonfarmPayrolls from "../../../../../knowledge/data-lake/normalized/fred_nonfarm_payrolls.json";

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
  const mentionsRates = /\b(yield|treasury|treasuries|rates|rate|duration|curve|10y|2y|bps|basis.?point|fed.?fund|policy.?rate|steepen|invert)\b/.test(lower);

  if (!mentionsOil && !mentionsInflation && !mentionsMoneySupply && !mentionsFX && !mentionsEquities && !mentionsRisk && !mentionsRates && !asksForCorrelation) {
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
    availableSeriesLine(highYieldSpreadSeries()),
    availableSeriesLine(us10ySeries()),
    availableSeriesLine(us2ySeries()),
    availableSeriesLine(curve10y2ySeries()),
    availableSeriesLine(breakeven10ySeries()),
    availableSeriesLine(unemploymentSeries()),
    availableSeriesLine(retailSalesSeries()),
    availableSeriesLine(industrialProductionSeries()),
    availableSeriesLine(fedFundsSeries()),
    availableSeriesLine(pceHeadlineSeries()),
    availableSeriesLine(pceCoreSeriesFn()),
    availableSeriesLine(nonfarmPayrollsSeries())
    // Note: ISM Manufacturing PMI is NOT in the data lake — sourcing from FRED ISM endpoint is a future addition
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

  if (asksForCorrelation && mentionsRates) {
    const ratesStats = computeRatesCpiStats();
    if (ratesStats) {
      blocks.push(
        [
          `Computed stored-data check — US 10Y Yield vs CPI YoY (full overlapping monthly sample):`,
          `- observations: ${ratesStats.count}`,
          `- 10Y yield level vs CPI YoY correlation: ${formatCorrelation(ratesStats.yieldVsCpiCorrelation)}`,
          `- 10Y yield historical range: ${ratesStats.yieldMin.toFixed(2)}% to ${ratesStats.yieldMax.toFixed(2)}%`,
          ratesStats.spreadMin !== null && ratesStats.spreadMax !== null
            ? `- 10Y-2Y spread historical range: ${(ratesStats.spreadMin * 100).toFixed(0)}bps to ${(ratesStats.spreadMax * 100).toFixed(0)}bps`
            : null,
          ratesStats.breakevenMin !== null && ratesStats.breakevenMax !== null
            ? `- 10Y breakeven inflation historical range: ${ratesStats.breakevenMin.toFixed(2)}% to ${ratesStats.breakevenMax.toFixed(2)}%`
            : null
        ].filter(Boolean).join("\n")
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

function us10ySeries(): HistoricalSeries {
  return fredUs10y as HistoricalSeries;
}

function us2ySeries(): HistoricalSeries {
  return fredUs2y as HistoricalSeries;
}

function curve10y2ySeries(): HistoricalSeries {
  return fredCurve10y2y as HistoricalSeries;
}

function breakeven10ySeries(): HistoricalSeries {
  return fredBreakeven10y as HistoricalSeries;
}

function unemploymentSeries(): HistoricalSeries {
  return fredUnemployment as HistoricalSeries;
}

function retailSalesSeries(): HistoricalSeries {
  return fredRetailSales as HistoricalSeries;
}

function industrialProductionSeries(): HistoricalSeries {
  return fredIndustrialProduction as HistoricalSeries;
}

function fedFundsSeries(): HistoricalSeries {
  return fredFedFunds as HistoricalSeries;
}

function pceHeadlineSeries(): HistoricalSeries {
  return fredPceHeadline as HistoricalSeries;
}

function pceCoreSeriesFn(): HistoricalSeries {
  return fredPceCore as HistoricalSeries;
}

function nonfarmPayrollsSeries(): HistoricalSeries {
  return fredNonfarmPayrolls as HistoricalSeries;
}

function computeRatesCpiStats(start?: string, end?: string) {
  const us10yByMonth = toMonthlyMap(us10ySeries().observations);
  const cpiByMonth = toMonthlyMap(cpiHeadlineSeries().observations);
  const cpiYoYByMonth = yoyMap(cpiByMonth);
  const curveByMonth = toMonthlyMap(curve10y2ySeries().observations);
  const breakevenByMonth = toMonthlyMap(breakeven10ySeries().observations);

  // 10Y yield level vs CPI YoY (both expressed as %)
  const yieldVsCpiPoints: AlignedPoint[] = [];
  for (const [month, yieldValue] of us10yByMonth) {
    if (start && month < start) continue;
    if (end && month > end) continue;
    const cpiYoY = cpiYoYByMonth.get(month);
    if (typeof cpiYoY === "number") {
      yieldVsCpiPoints.push({ date: month, left: yieldValue, right: cpiYoY });
    }
  }

  if (yieldVsCpiPoints.length < 6) return null;

  // 10Y-2Y spread range (spread is stored in % — multiply by 100 for bps at display time)
  const curveValues = [...curveByMonth.entries()]
    .filter(([m]) => (!start || m >= start) && (!end || m <= end))
    .map(([, v]) => v);

  // Breakeven range
  const breakevenValues = [...breakevenByMonth.entries()]
    .filter(([m]) => (!start || m >= start) && (!end || m <= end))
    .map(([, v]) => v);

  return {
    count: yieldVsCpiPoints.length,
    yieldVsCpiCorrelation: pearson(yieldVsCpiPoints),
    yieldMin: Math.min(...yieldVsCpiPoints.map((p) => p.left)),
    yieldMax: Math.max(...yieldVsCpiPoints.map((p) => p.left)),
    cpiYoYMin: Math.min(...yieldVsCpiPoints.map((p) => p.right)),
    cpiYoYMax: Math.max(...yieldVsCpiPoints.map((p) => p.right)),
    spreadMin: curveValues.length > 0 ? Math.min(...curveValues) : null,
    spreadMax: curveValues.length > 0 ? Math.max(...curveValues) : null,
    breakevenMin: breakevenValues.length > 0 ? Math.min(...breakevenValues) : null,
    breakevenMax: breakevenValues.length > 0 ? Math.max(...breakevenValues) : null
  };
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

// ── Analog Engine ─────────────────────────────────────────────────────────────
// Given a current indicator value (e.g. CPI at 3.8%), find historical periods
// where it was at a similar level, then compute how other assets responded in the
// 1, 3, and 6 months that followed — and whether the response was lagged.

export type SnapshotSignal = {
  wtiPrice?: number;    // Commodities / Macro fallback
  us10yYield?: number;  // Rates / Equities fallback
  dxyLevel?: number;    // FX fallback (DXY index level)
};

// ─── 0. Series preprocessors ──────────────────────────────────────────────

// Converts a monthly level series to month-over-month absolute changes.
// Required for NFP which is stored as total-employment level (~158,000K)
// but headline values are monthly additions (e.g. +178K).
function monthOverMonthDiff(monthly: Map<string, number>): Map<string, number> {
  const sorted = [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b));
  const result = new Map<string, number>();
  for (let i = 1; i < sorted.length; i++) {
    const [month, cur] = sorted[i];
    const [, prev] = sorted[i - 1];
    result.set(month, cur - prev);
  }
  return result;
}

// ─── 1. Analog period finder ───────────────────────────────────────────────

function findAnalogPeriods(
  monthlyData: Map<string, number>,
  targetValue: number,
  toleranceAbs: number,
  minCount: number = 4
): string[] {
  // Exclude last 6 months — no reliable forward data yet
  const cutoffMonth = shiftMonth(
    new Date().toISOString().slice(0, 7),
    -6
  );

  const match = (tol: number) =>
    [...monthlyData.entries()]
      .filter(([month, value]) => month <= cutoffMonth && Math.abs(value - targetValue) <= tol)
      .map(([month]) => month)
      .sort();

  const first = match(toleranceAbs);
  if (first.length >= minCount) return first;

  // Widen by 50% and retry once
  const second = match(toleranceAbs * 1.5);
  return second.length >= minCount ? second : [];
}

// ─── 2. Forward return calculator ─────────────────────────────────────────

type ForwardReturnResult = {
  horizon: number;
  median: number;
  min: number;
  max: number;
  positiveCount: number;
  totalCount: number;
};

function medianOf(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function computeForwardReturns(
  analogMonths: string[],
  targetMonthlyData: Map<string, number>,
  horizons: number[],
  mode: "pct_change" | "level_change"
): ForwardReturnResult[] {
  return horizons.map((h) => {
    const outcomes: number[] = [];
    for (const t of analogMonths) {
      const valueAtT = targetMonthlyData.get(t);
      const valueAtTH = targetMonthlyData.get(shiftMonth(t, h));
      if (typeof valueAtT !== "number" || typeof valueAtTH !== "number") continue;
      if (valueAtT === 0 && mode === "pct_change") continue;
      const outcome =
        mode === "pct_change"
          ? ((valueAtTH - valueAtT) / Math.abs(valueAtT)) * 100
          : valueAtTH - valueAtT;
      outcomes.push(outcome);
    }
    if (outcomes.length < 3) return null;
    return {
      horizon: h,
      median: medianOf(outcomes),
      min: Math.min(...outcomes),
      max: Math.max(...outcomes),
      positiveCount: outcomes.filter((v) => v > 0).length,
      totalCount: outcomes.length
    };
  }).filter((r): r is ForwardReturnResult => r !== null);
}

// ─── 3. Peak-lag detector ──────────────────────────────────────────────────

type LagResult = {
  lag: number;
  correlation: number;
};

function computePeakLag(
  seriesA: Map<string, number>, // leading series (YoY)
  seriesB: Map<string, number>, // lagging series (YoY)
  maxLag: number = 6
): LagResult | null {
  let best: LagResult | null = null;
  for (let lag = 0; lag <= maxLag; lag++) {
    const points: AlignedPoint[] = [];
    for (const [month, aVal] of seriesA) {
      const bVal = seriesB.get(shiftMonth(month, lag));
      if (typeof bVal === "number") points.push({ date: month, left: aVal, right: bVal });
    }
    if (points.length < 12) continue;
    const corr = pearson(points);
    if (best === null || Math.abs(corr) > Math.abs(best.correlation)) {
      best = { lag, correlation: corr };
    }
  }
  return best;
}

// ─── 4. Headline indicator extraction ─────────────────────────────────────

type IndicatorKind = "cpi" | "pce" | "pce_core" | "unemployment" | "fedfunds" | "oil" | "us10y" | "nfp";

type IndicatorSignal = {
  kind: IndicatorKind;
  value: number;
  label: string;
  toleranceAbs: number;
  seriesGetter: () => HistoricalSeries;
  mode: "yoy" | "level";
  forwardReturnMode: "pct_change" | "level_change";
  // Optional: transform raw monthly level before YoY/level matching (e.g. MoM diff for NFP)
  preprocessor?: (monthly: Map<string, number>) => Map<string, number>;
};

const INDICATOR_CONFIG: Record<IndicatorKind, Omit<IndicatorSignal, "kind" | "value" | "label">> = {
  cpi:          { toleranceAbs: 0.3,  mode: "yoy",   forwardReturnMode: "pct_change", seriesGetter: cpiHeadlineSeries },
  pce:          { toleranceAbs: 0.3,  mode: "yoy",   forwardReturnMode: "pct_change", seriesGetter: pceHeadlineSeries },
  pce_core:     { toleranceAbs: 0.25, mode: "yoy",   forwardReturnMode: "pct_change", seriesGetter: pceCoreSeriesFn },
  unemployment: { toleranceAbs: 0.2,  mode: "level", forwardReturnMode: "level_change", seriesGetter: unemploymentSeries },
  fedfunds:     { toleranceAbs: 0.25, mode: "level", forwardReturnMode: "level_change", seriesGetter: fedFundsSeries },
  oil:          { toleranceAbs: 5.0,  mode: "level", forwardReturnMode: "pct_change",  seriesGetter: wtiMonthlySeries },
  us10y:        { toleranceAbs: 0.25, mode: "level", forwardReturnMode: "level_change", seriesGetter: us10ySeries },
  // NFP series stores total nonfarm employment LEVEL (~158,000K). Headlines report monthly additions (+178K).
  // Apply monthOverMonthDiff so analog matching compares apples-to-apples.
  nfp:          { toleranceAbs: 30,   mode: "level", forwardReturnMode: "level_change", seriesGetter: nonfarmPayrollsSeries, preprocessor: monthOverMonthDiff },
};

function extractHeadlineIndicator(headlineTitle: string): IndicatorSignal | null {
  // Patterns tested in priority order — first match wins
  const patterns: Array<{ kind: IndicatorKind; label: (v: number) => string; regexes: RegExp[]; transform?: (v: number) => number }> = [
    {
      kind: "cpi",
      label: (v) => `CPI YoY ${v.toFixed(1)}%`,
      regexes: [
        /\bCPI\b.*?([+-]?\d+\.?\d*)\s*%/i,
        /([+-]?\d+\.?\d*)\s*%[^%]*?\bCPI\b/i,
        /\bconsumer price.*?([+-]?\d+\.?\d*)\s*%/i
      ]
    },
    {
      kind: "pce_core",
      label: (v) => `Core PCE YoY ${v.toFixed(1)}%`,
      regexes: [/\bcore\s*PCE\b.*?([+-]?\d+\.?\d*)\s*%/i, /([+-]?\d+\.?\d*)\s*%[^%]*?\bcore\s*PCE\b/i]
    },
    {
      kind: "pce",
      label: (v) => `PCE YoY ${v.toFixed(1)}%`,
      regexes: [/\bPCE\b.*?([+-]?\d+\.?\d*)\s*%/i, /([+-]?\d+\.?\d*)\s*%[^%]*?\bPCE\b/i]
    },
    // NFP before unemployment: payroll releases always mention unemployment rate too — NFP must win
    {
      kind: "nfp",
      label: (v) => `NFP +${v.toFixed(0)}K`,
      regexes: [/\b(?:NFP|nonfarm payroll).*?[+\-]?\s*(\d+)\s*[Kk]\b/i],
      transform: (v) => v  // already in thousands from the regex
    },
    {
      kind: "unemployment",
      label: (v) => `Unemployment ${v.toFixed(1)}%`,
      regexes: [
        /\bunemployment\b.*?(\d+\.?\d*)\s*%/i,
        /\bjobless\s*rate\b.*?(\d+\.?\d*)\s*%/i,
        /(\d+\.?\d*)\s*%[^%]*?\bunemployment\b/i
      ]
    },
    {
      kind: "fedfunds",
      label: (v) => `Fed Funds ${v.toFixed(2)}%`,
      regexes: [
        /\bfed\s*funds?\b.*?(\d+\.?\d*)\s*%/i,
        /\bFFR\b.*?(\d+\.?\d*)\s*%/i,
        /\bpolicy\s*rate\b.*?(\d+\.?\d*)\s*%/i
      ]
    },
    {
      kind: "oil",
      label: (v) => `WTI $${v.toFixed(2)}/bbl`,
      regexes: [
        /\b(?:WTI|crude oil)\b.*?\$(\d+\.?\d*)/i,
        /\$(\d+\.?\d*)[^%]*?\b(?:WTI|crude|oil)\b/i,
        /\boil\b.*?at\s*\$(\d+\.?\d*)/i
      ]
    },
    {
      kind: "us10y",
      label: (v) => `10Y yield ${v.toFixed(2)}%`,
      regexes: [
        /\b10[-\s]?[Yy](?:ear)?\b.*?(\d+\.?\d*)\s*%/i,
        /(\d+\.?\d*)\s*%[^%]*?\b10[-\s]?[Yy]/i,
        /\bTreasury.*?(\d+\.?\d*)\s*%/i
      ]
    }
  ];

  for (const { kind, label, regexes, transform } of patterns) {
    for (const regex of regexes) {
      const m = headlineTitle.match(regex);
      if (m?.[1]) {
        const raw = parseFloat(m[1]);
        if (!isNaN(raw) && raw > 0) {
          const value = transform ? transform(raw) : raw;
          const config = INDICATOR_CONFIG[kind];
          return { kind, value, label: label(value), ...config };
        }
      }
    }
  }
  return null;
}

// ─── 5. Sector forward-return series map ──────────────────────────────────

type ForwardSeries = {
  label: string;
  monthlyGetter: () => Map<string, number>;
  returnMode: "pct_change" | "level_change";
  unit: string;  // display unit suffix, e.g. "%" or "bps" or "pp"
  isAlreadyYoY?: boolean; // true when monthlyGetter already returns YoY-transformed data — prevents double-apply in lag computation
};

function getSectorForwardSeries(sector: string): ForwardSeries[] {
  const spy: ForwardSeries  = { label: "SPY",               monthlyGetter: () => toMonthlyMap(spyMonthlySeries().observations),              returnMode: "pct_change",   unit: "%" };
  const wti: ForwardSeries  = { label: "WTI crude",         monthlyGetter: () => toMonthlyMap(wtiMonthlySeries().observations),              returnMode: "pct_change",   unit: "%" };
  const us10y: ForwardSeries = { label: "10Y yield",        monthlyGetter: () => toMonthlyMap(us10ySeries().observations),                   returnMode: "level_change", unit: "bps", };
  const us2y: ForwardSeries  = { label: "2Y yield",         monthlyGetter: () => toMonthlyMap(us2ySeries().observations),                    returnMode: "level_change", unit: "bps" };
  const dollar: ForwardSeries = { label: "Broad Dollar",    monthlyGetter: () => toMonthlyMap(broadDollarSeries().observations),             returnMode: "pct_change",   unit: "%" };
  const vix: ForwardSeries   = { label: "VIX",              monthlyGetter: () => toMonthlyMap(vixSeries().observations),                     returnMode: "level_change", unit: "pts" };
  const hy: ForwardSeries    = { label: "HY spread",        monthlyGetter: () => toMonthlyMap(highYieldSpreadSeries().observations),         returnMode: "level_change", unit: "bps" };
  const unemp: ForwardSeries = { label: "Unemployment",     monthlyGetter: () => toMonthlyMap(unemploymentSeries().observations),            returnMode: "level_change", unit: "pp" };
  const retail: ForwardSeries = { label: "Retail Sales YoY",   monthlyGetter: () => yoyMap(toMonthlyMap(retailSalesSeries().observations)),               returnMode: "level_change", unit: "pp", isAlreadyYoY: true };
  const ip: ForwardSeries    = { label: "Industrial Prod YoY", monthlyGetter: () => yoyMap(toMonthlyMap(industrialProductionSeries().observations)),           returnMode: "level_change", unit: "pp", isAlreadyYoY: true };
  const be: ForwardSeries    = { label: "10Y Breakeven",    monthlyGetter: () => toMonthlyMap(breakeven10ySeries().observations),            returnMode: "level_change", unit: "bps" };

  // us10y returnMode note: level_change is in % points — multiply by 100 for bps at display time
  switch (sector) {
    case "Macro":          return [spy, wti, us10y, unemp, retail, ip];
    case "Rates":          return [us10y, us2y, be, spy, hy];
    case "FX":             return [dollar, wti, spy, vix];
    case "Commodities":    return [wti, dollar, ip, spy];
    case "Equities":       return [spy, us10y, vix, hy, retail];
    case "Risk/Sentiment": return [vix, hy, spy, us10y];
    default:               return [spy, wti, us10y];
  }
}

// ─── 6. Block formatter ────────────────────────────────────────────────────

function formatForwardReturn(r: ForwardReturnResult, unit: string, isYield: boolean): string {
  // Yields stored as % — convert level_change to bps for display
  const scale = isYield && unit === "bps" ? 100 : 1;
  const sign = (v: number) => (v >= 0 ? "+" : "");
  const fmt = (v: number) => {
    const scaled = v * scale;
    return `${sign(scaled)}${scaled.toFixed(unit === "bps" || unit === "pp" ? 0 : 1)}${unit}`;
  };
  const dir = r.positiveCount > r.totalCount / 2 ? "pos" : "neg";
  return `+${r.horizon}m: ${fmt(r.median)} (${r.positiveCount}/${r.totalCount} ${dir})`;
}

// ─── 7. Main exported orchestrator ────────────────────────────────────────

export function buildAnalogContextBlock(
  headlineTitle: string,
  sector: string,
  snapshotSignal?: SnapshotSignal
): string {
  // Step 1: try to extract a parseable indicator from the headline
  let signal = extractHeadlineIndicator(headlineTitle);

  // Step 2: fall back to snapshot primary indicator for the sector
  if (!signal && snapshotSignal) {
    if ((sector === "Commodities" || sector === "Macro") && snapshotSignal.wtiPrice) {
      signal = { kind: "oil", value: snapshotSignal.wtiPrice, label: `WTI $${snapshotSignal.wtiPrice.toFixed(2)}/bbl`, ...INDICATOR_CONFIG.oil };
    } else if ((sector === "Rates" || sector === "Equities" || sector === "FX") && snapshotSignal.us10yYield) {
      // FX: dollar and 10Y yield are tightly linked (real yield = primary USD driver)
      signal = { kind: "us10y", value: snapshotSignal.us10yYield, label: `10Y yield ${snapshotSignal.us10yYield.toFixed(2)}%`, ...INDICATOR_CONFIG.us10y };
    }
  }

  if (!signal) return "";

  // Step 3: get the indicator's monthly data
  // Apply optional preprocessor first (e.g. MoM diff for NFP), then YoY if mode requires it
  const rawMonthly = toMonthlyMap(signal.seriesGetter().observations);
  const preprocessed = signal.preprocessor ? signal.preprocessor(rawMonthly) : rawMonthly;
  const matchData = signal.mode === "yoy" ? yoyMap(preprocessed) : preprocessed;

  // Step 4: find analog periods
  const analogMonths = findAnalogPeriods(matchData, signal.value, signal.toleranceAbs);
  if (analogMonths.length < 4) return "";

  // Step 5: compute forward returns per series
  const forwardSeries = getSectorForwardSeries(sector);
  const lines: string[] = [];
  const indicatorYoY = signal.mode === "yoy" ? matchData : yoyMap(preprocessed);

  for (const fs of forwardSeries) {
    const seriesData = fs.monthlyGetter();
    const results = computeForwardReturns(analogMonths, seriesData, [1, 3, 6], fs.returnMode);
    if (results.length === 0) continue;

    const isYield = fs.label.includes("yield") || fs.label.includes("Breakeven");
    const parts = results.map((r) => formatForwardReturn(r, fs.unit, isYield));

    // Compute peak lag vs indicator (only report if lag > 0 and |corr| > 0.35)
    // Use pre-YoY data directly if series is already YoY-transformed; otherwise apply yoyMap
    const seriesForLag = fs.isAlreadyYoY ? seriesData : yoyMap(seriesData);
    const lagResult = computePeakLag(indicatorYoY, seriesForLag);
    const lagNote =
      lagResult && lagResult.lag > 0 && Math.abs(lagResult.correlation) > 0.35
        ? `  [peak lag ${lagResult.lag}m, r=${formatCorrelation(lagResult.correlation)}]`
        : "";

    lines.push(`  ${fs.label.padEnd(20)} ${parts.join("  ")}${lagNote}`);
  }

  if (lines.length === 0) return "";

  const sampleNote = analogMonths.length < 8 ? "  (small sample — treat as directional signal)" : "";
  const analogList = analogMonths.slice(0, 6).join(", ") + (analogMonths.length > 6 ? `, +${analogMonths.length - 6} more` : "");

  return [
    `HISTORICAL ANALOG ANALYSIS — ${signal.label}:`,
    `Matched ${analogMonths.length} historical periods (1990–present): ${analogList}${sampleNote}`,
    "Median forward returns across analog periods:",
    ...lines,
    "Use these figures as your data anchor — cite the median return and lag where relevant to your directional call."
  ].join("\n");
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
