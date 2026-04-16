/**
 * Yahoo Finance market data provider.
 *
 * Uses the chart API (v8/finance/chart) which works without cookies or API keys.
 * Fetches actual index/futures symbols — no ETF proxies, no scaling required:
 *
 *   ^GSPC   → S&P 500 index (actual level)
 *   ^NDX    → Nasdaq 100 index (actual level)
 *   DX-Y.NYB → DXY dollar index
 *   ^TNX    → US 10Y yield (in %)
 *   CL=F    → WTI crude oil futures ($/bbl)
 *   BZ=F    → Brent crude futures ($/bbl)
 *   NG=F    → Natural gas futures ($/MMBtu)
 *   GC=F    → Gold futures ($/oz)
 *   HG=F    → Copper futures ($/lb)
 *
 * All 9 instruments are fetched in parallel (9 concurrent requests).
 * Change % is computed from chartPreviousClose vs regularMarketPrice.
 *
 * 20-minute TTL: re-use a recent snapshot to avoid hammering YF on every run.
 */
import type { MarketSnapshotPayload, SnapshotInstrument } from "@market-room/shared";
import { buildFallbackSnapshot } from "../fallbackSnapshot";
import type { FetchSnapshotContext, MarketDataProvider } from "../types";

const YF_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

/** Re-use a snapshot younger than this. */
const SNAPSHOT_TTL_MS = 20 * 60 * 1000; // 20 minutes

type FormatType = "large_index" | "small_index" | "yield_pct" | "usd_per_bbl" | "usd_per_mmbtu" | "usd_per_oz" | "usd_per_lb";

type SymbolConfig = {
  key: string;
  label: string;
  symbol: string;
  format: FormatType;
  source: string;
};

const symbolConfigs: SymbolConfig[] = [
  { key: "sp500",       label: "S&P 500",      symbol: "^GSPC",    format: "large_index",    source: "Yahoo Finance (^GSPC)" },
  { key: "nasdaq",      label: "Nasdaq 100",   symbol: "^NDX",     format: "large_index",    source: "Yahoo Finance (^NDX)" },
  { key: "dxy",         label: "DXY",          symbol: "DX-Y.NYB", format: "small_index",    source: "Yahoo Finance (DX-Y.NYB)" },
  { key: "us10y",       label: "US 10Y yield", symbol: "^TNX",     format: "yield_pct",      source: "Yahoo Finance (^TNX)" },
  { key: "wti",         label: "WTI crude",    symbol: "CL=F",     format: "usd_per_bbl",    source: "Yahoo Finance (CL=F futures)" },
  { key: "brent",       label: "Brent crude",  symbol: "BZ=F",     format: "usd_per_bbl",    source: "Yahoo Finance (BZ=F futures)" },
  { key: "natural_gas", label: "Natural gas",  symbol: "NG=F",     format: "usd_per_mmbtu",  source: "Yahoo Finance (NG=F futures)" },
  { key: "gold",        label: "Gold",         symbol: "GC=F",     format: "usd_per_oz",     source: "Yahoo Finance (GC=F futures)" },
  { key: "copper",      label: "Copper",       symbol: "HG=F",     format: "usd_per_lb",     source: "Yahoo Finance (HG=F futures)" },
];

type YFChartMeta = {
  symbol?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  regularMarketChangePercent?: number;
};

export function createYahooFinanceProvider(): MarketDataProvider {
  return {
    name: "yahoo_finance",

    async fetchSnapshot(
      prompt: string,
      context: FetchSnapshotContext = {}
    ): Promise<MarketSnapshotPayload> {
      const now = context.now || new Date().toISOString();

      if (context.previousSnapshot && isReusableYFSnapshot(context.previousSnapshot, now)) {
        return {
          ...context.previousSnapshot,
          prompt,
          asOf: now
        };
      }

      try {
        const instruments = await fetchAllInstruments();
        const liveCount = instruments.filter((i) => i.status === "live").length;

        if (liveCount === 0) {
          return buildFallbackSnapshot(prompt, now, "yahoo-no-data");
        }

        const hasPartialFallback = liveCount < instruments.length;

        return {
          provider: hasPartialFallback ? "yahoo_finance_partial" : "yahoo_finance",
          usedFallback: false,
          asOf: now,
          prompt,
          headline: buildHeadline(instruments, hasPartialFallback, liveCount),
          summary: buildSummary(instruments, hasPartialFallback, liveCount),
          instruments,
          headlines: context.previousSnapshot?.headlines ?? buildFallbackSnapshot(prompt, now).headlines
        };
      } catch {
        if (context.previousSnapshot) {
          return {
            ...context.previousSnapshot,
            prompt,
            asOf: now,
            provider: "yahoo_finance_carry"
          };
        }
        return buildFallbackSnapshot(prompt, now, "yahoo-exception");
      }
    }
  };
}

async function fetchChartMeta(symbol: string): Promise<YFChartMeta | null> {
  try {
    const url = `${YF_CHART_BASE}/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json"
      }
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      chart?: { result?: Array<{ meta?: YFChartMeta }>; error?: unknown };
    };

    return data.chart?.result?.[0]?.meta ?? null;
  } catch {
    return null;
  }
}

async function fetchAllInstruments(): Promise<SnapshotInstrument[]> {
  const results = await Promise.all(
    symbolConfigs.map(async (config) => {
      const meta = await fetchChartMeta(config.symbol);
      return buildInstrument(config, meta);
    })
  );
  return results;
}

function buildInstrument(config: SymbolConfig, meta: YFChartMeta | null): SnapshotInstrument {
  if (!meta?.regularMarketPrice) {
    return buildFallbackInstrument(config);
  }

  const price = meta.regularMarketPrice;
  const changePct = computeChangePct(meta);
  const changeStr = `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;

  return {
    key: config.key,
    label: config.label,
    value: formatPrice(price, config.format),
    change: changeStr,
    source: config.source,
    status: "live"
  };
}

function computeChangePct(meta: YFChartMeta): number {
  if (meta.regularMarketChangePercent != null) {
    return meta.regularMarketChangePercent;
  }
  if (meta.chartPreviousClose && meta.regularMarketPrice) {
    const prev = meta.chartPreviousClose;
    if (prev !== 0) {
      return ((meta.regularMarketPrice - prev) / prev) * 100;
    }
  }
  return 0;
}

function formatPrice(price: number, format: FormatType): string {
  switch (format) {
    case "large_index":
      return Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    case "small_index":
      return price.toFixed(2);
    case "yield_pct":
      return `${price.toFixed(2)}%`;
    case "usd_per_bbl":
      return `$${price.toFixed(2)}/bbl`;
    case "usd_per_mmbtu":
      return `$${price.toFixed(2)}/MMBtu`;
    case "usd_per_oz":
      return `$${Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}/oz`;
    case "usd_per_lb":
      return `$${price.toFixed(2)}/lb`;
  }
}

function buildFallbackInstrument(config: SymbolConfig): SnapshotInstrument {
  const fallbacks = buildAllFallbackInstruments();
  return fallbacks.find((i) => i.key === config.key) ?? {
    key: config.key,
    label: config.label,
    value: "N/A",
    change: "",
    source: "fallback",
    status: "fallback"
  };
}

function buildAllFallbackInstruments(): SnapshotInstrument[] {
  return [
    { key: "sp500",       label: "S&P 500",      value: "5,200",        change: "+0.4%",  source: "fallback", status: "fallback" },
    { key: "nasdaq",      label: "Nasdaq 100",   value: "18,200",       change: "+0.1%",  source: "fallback", status: "fallback" },
    { key: "dxy",         label: "DXY",          value: "103.0",        change: "+0.2%",  source: "fallback", status: "fallback" },
    { key: "us10y",       label: "US 10Y yield", value: "4.30%",        change: "+3 bps", source: "fallback", status: "fallback" },
    { key: "wti",         label: "WTI crude",    value: "$68.50/bbl",   change: "+0.8%",  source: "fallback", status: "fallback" },
    { key: "brent",       label: "Brent crude",  value: "$72.10/bbl",   change: "+0.6%",  source: "fallback", status: "fallback" },
    { key: "natural_gas", label: "Natural gas",  value: "$2.80/MMBtu", change: "+3.1%",  source: "fallback", status: "fallback" },
    { key: "gold",        label: "Gold",         value: "$3,050/oz",    change: "+0.6%",  source: "fallback", status: "fallback" },
    { key: "copper",      label: "Copper",       value: "$4.55/lb",     change: "-0.3%",  source: "fallback", status: "fallback" },
  ];
}

function buildHeadline(
  instruments: SnapshotInstrument[],
  hasPartialFallback: boolean,
  liveCount: number
): string {
  const sp500 = instruments.find((i) => i.key === "sp500");
  const wti   = instruments.find((i) => i.key === "wti");
  const us10y = instruments.find((i) => i.key === "us10y");

  const parts = [
    sp500?.status === "live" ? `S&P 500 ${sp500.change}` : null,
    wti?.status   === "live" ? `WTI ${wti.value}` : null,
    us10y?.status === "live" ? `US 10Y ${us10y.value}` : null,
  ].filter(Boolean);

  if (parts.length > 0) {
    const suffix = hasPartialFallback ? " Some instruments are using fallback values." : "";
    return `${parts.join(", ")} are setting the tone for the room.${suffix}`;
  }

  return `Live market data is partially available (${liveCount}/9 instruments live).`;
}

function buildSummary(
  instruments: SnapshotInstrument[],
  hasPartialFallback: boolean,
  liveCount: number
): string {
  const nasdaq = instruments.find((i) => i.key === "nasdaq");
  const dxy    = instruments.find((i) => i.key === "dxy");
  const gold   = instruments.find((i) => i.key === "gold");

  return `Nasdaq 100 is ${nasdaq?.change || nasdaq?.value || "unavailable"}, DXY is ${dxy?.value || "unavailable"}, gold is ${gold?.value || "unavailable"}. ${liveCount}/9 instruments live${hasPartialFallback ? " — remainder using calibrated fallback values" : ""}.`;
}

function isReusableYFSnapshot(snapshot: MarketSnapshotPayload, now: string): boolean {
  if (!snapshot.provider.startsWith("yahoo_finance")) return false;
  const snapshotTime = new Date(snapshot.asOf).valueOf();
  const currentTime  = new Date(now).valueOf();
  if (Number.isNaN(snapshotTime) || Number.isNaN(currentTime)) return false;
  return currentTime - snapshotTime <= SNAPSHOT_TTL_MS;
}
