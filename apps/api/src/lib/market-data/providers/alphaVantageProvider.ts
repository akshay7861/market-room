import type { MarketSnapshotPayload, SnapshotHeadline, SnapshotInstrument } from "@market-room/shared";
import { buildFallbackSnapshot } from "../fallbackSnapshot";
import type { FetchSnapshotContext, MarketDataProvider } from "../types";

const baseUrl = "https://www.alphavantage.co/query";
const quoteDelayMs = 1200;
const maxQuoteRequestsPerRun = 3;
const carryForwardMaxAgeMs = 12 * 60 * 60 * 1000;
const headlineCarryForwardMaxAgeMs = 6 * 60 * 60 * 1000;

type AlphaVantageProviderOptions = {
  apiKey?: string;
};

type QuoteResult = {
  /** Pre-formatted display value shown directly in prompts (e.g. "$75.23/bbl", "4.35%", "5,120") */
  price: string;
  /** Percentage change or bps change string (e.g. "+1.45%", "+7 bps") */
  changePercent: string;
};

type QuoteFetchResult =
  | { status: "success"; quote: QuoteResult }
  | { status: "rate_limited" | "unavailable" };

// All instruments use GLOBAL_QUOTE (real-time ETF/index prices).
// Scaling converts each ETF price to an approximation of the underlying asset price.
type InstrumentFetchMethod = "global_quote";

type InstrumentConfig = {
  key: string;
  label: string;
  source: string;
  fetchMethod: InstrumentFetchMethod;
  symbol: string;
  /** Multiply raw ETF/index price by this to approximate the underlying asset price (e.g. SPY×10≈S&P500) */
  scaleFactor?: number;
  /** Unit suffix appended after the price (e.g. "/bbl" for crude, "%" for yield, "/oz" for gold) */
  unit?: string;
};

// Scaling strategy:
//   Equities  → SPY×10 ≈ S&P 500 level; QQQ price as-is (Nasdaq 100 ETF)
//   FX/Rates  → UUP×3.5 ≈ DXY index level; TREASURY_YIELD for exact US10Y in %
//   Commodities → real-time ETF prices scaled to approximate actual commodity prices:
//     BNO×2.1  ≈ Brent $/bbl  (BNO $54 × 2.1 ≈ $113/bbl)
//     USO×1.05 ≈ WTI $/bbl    (tracks WTI closely after 2020 reverse split)
//     UNG×0.21 ≈ natural gas $/MMBtu
//     GLD×10.73 ≈ gold $/oz   (GLD holds ~0.093 oz/share)
//     CPER×0.13 ≈ copper $/lb
//
// Why ETF proxies with scaling vs commodity API series:
//   Alpha Vantage's free-tier commodity series (function=BRENT etc.) has months of data lag.
//   GLOBAL_QUOTE returns real-time ETF prices. Scaling converts ETF NAV → approx underlying price.
//   The change% from GLOBAL_QUOTE is always directionally accurate regardless of scale.
const instrumentConfigs: InstrumentConfig[] = [
  {
    key: "sp500",
    label: "S&P 500",
    fetchMethod: "global_quote",
    symbol: "SPY",
    scaleFactor: 10,
    source: "Alpha Vantage via SPY (×10 est.)"
  },
  {
    key: "nasdaq",
    label: "Nasdaq 100",
    fetchMethod: "global_quote",
    symbol: "QQQ",
    source: "Alpha Vantage via QQQ"
  },
  {
    key: "dxy",
    label: "DXY",
    fetchMethod: "global_quote",
    symbol: "UUP",
    scaleFactor: 3.5,
    source: "Alpha Vantage via UUP (×3.5 est.)"
  },
  {
    key: "us10y",
    label: "US 10Y yield",
    fetchMethod: "global_quote",
    symbol: "TNX",
    scaleFactor: 0.1,
    unit: "%",
    source: "Alpha Vantage via TNX (×0.1)"
  },
  {
    key: "wti",
    label: "WTI crude",
    fetchMethod: "global_quote",
    symbol: "USO",
    scaleFactor: 1.05,
    unit: "/bbl",
    source: "Alpha Vantage via USO (×1.05 est.)"
  },
  {
    key: "brent",
    label: "Brent crude",
    fetchMethod: "global_quote",
    symbol: "BNO",
    scaleFactor: 2.1,
    unit: "/bbl",
    source: "Alpha Vantage via BNO (×2.1 est.)"
  },
  {
    key: "natural_gas",
    label: "Natural gas",
    fetchMethod: "global_quote",
    symbol: "UNG",
    scaleFactor: 0.21,
    unit: "/MMBtu",
    source: "Alpha Vantage via UNG (scaled)"
  },
  {
    key: "gold",
    label: "Gold",
    fetchMethod: "global_quote",
    symbol: "GLD",
    scaleFactor: 10.73,
    unit: "/oz",
    source: "Alpha Vantage via GLD (×10.73 est.)"
  },
  {
    key: "copper",
    label: "Copper",
    fetchMethod: "global_quote",
    symbol: "CPER",
    scaleFactor: 0.13,
    unit: "/lb",
    source: "Alpha Vantage via CPER (scaled)"
  }
];

export function createAlphaVantageProvider({
  apiKey
}: AlphaVantageProviderOptions): MarketDataProvider {
  return {
    name: "alpha_vantage",
    async fetchSnapshot(prompt: string, context: FetchSnapshotContext = {}): Promise<MarketSnapshotPayload> {
      const now = context.now || new Date().toISOString();

      if (!apiKey) {
        return buildFallbackSnapshot(prompt, now, "missing-market-api-key");
      }

      const fallbackSnapshot = buildFallbackSnapshot(prompt, now, "provider-partial-fallback");
      const carryForward = applyCarryForwardSnapshot(fallbackSnapshot, context.previousSnapshot, now);
      const refreshKeys = selectRefreshKeys(carryForward.instruments, now);
      const quoteRefresh = await fetchRotatingQuotes(apiKey, refreshKeys);
      const instruments = mergeInstrumentsWithFallback(carryForward.instruments, quoteRefresh.quotes);
      const freshQuoteCount = quoteRefresh.quotes.size;
      const carriedLiveCount = instruments.filter(
        (instrument) =>
          instrument.status === "live" && !quoteRefresh.quotes.has(instrument.key)
      ).length;
      const liveInstrumentCount = freshQuoteCount + carriedLiveCount;
      const freshHeadlines =
        !quoteRefresh.rateLimited && shouldRefreshHeadlines(carryForward.headlines, context.previousSnapshot, now)
          ? await fetchNewsWithPacing(apiKey, quoteRefresh.requestCount)
          : [];
      const headlines = freshHeadlines.length > 0 ? freshHeadlines : carryForward.headlines;

      if (liveInstrumentCount === 0 && headlines.length === 0) {
        return buildFallbackSnapshot(prompt, now, "provider-no-data");
      }

      const hasPartialFallback = instruments.some((instrument) => instrument.status !== "live");

      return {
        provider: hasPartialFallback ? "alpha_vantage_partial" : "alpha_vantage",
        usedFallback: false,
        asOf: now,
        headline: buildHeadline(instruments, headlines, hasPartialFallback, freshQuoteCount, carriedLiveCount),
        summary: buildSummary(instruments, hasPartialFallback, freshQuoteCount, carriedLiveCount),
        prompt,
        instruments,
        headlines: headlines.length > 0 ? headlines : fallbackSnapshot.headlines
      };
    }
  };
}

// ---------------------------------------------------------------------------
// Quote fetch — all instruments use GLOBAL_QUOTE
// ---------------------------------------------------------------------------

async function fetchRotatingQuotes(
  apiKey: string,
  refreshKeys: string[]
): Promise<{
  quotes: Map<string, QuoteResult>;
  requestCount: number;
  rateLimited: boolean;
}> {
  const results = new Map<string, QuoteResult>();
  let requestCount = 0;

  for (const [index, key] of refreshKeys.slice(0, maxQuoteRequestsPerRun).entries()) {
    const config = instrumentConfigs.find((c) => c.key === key);
    if (!config) continue;

    if (index > 0) {
      await delay(quoteDelayMs);
    }

    requestCount += 1;
    const quote = await fetchGlobalQuote(config.symbol, config.scaleFactor, config.unit, apiKey);

    if (quote.status === "rate_limited") {
      return { quotes: results, requestCount, rateLimited: true };
    }

    if (quote.status === "success") {
      results.set(config.key, quote.quote);
    }
  }

  return { quotes: results, requestCount, rateLimited: false };
}

// ---------------------------------------------------------------------------
// Endpoint: GLOBAL_QUOTE (stocks and ETF proxies)
// ---------------------------------------------------------------------------

async function fetchGlobalQuote(
  symbol: string,
  scaleFactor: number | undefined,
  unit: string | undefined,
  apiKey: string
): Promise<QuoteFetchResult> {
  try {
    const response = await fetch(
      `${baseUrl}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`
    );
    const payload = (await response.json()) as {
      "Global Quote"?: {
        "05. price"?: string;
        "10. change percent"?: string;
      };
      Note?: string;
      Information?: string;
      "Error Message"?: string;
    };

    if (!response.ok || payload.Note || payload["Error Message"]) {
      return { status: "unavailable" };
    }

    if (payload.Information?.toLowerCase().includes("spreading out your free api requests")) {
      return { status: "rate_limited" };
    }

    const quote = payload["Global Quote"];
    if (!quote?.["05. price"]) {
      return { status: "unavailable" };
    }

    const rawPrice = parseFloat(quote["05. price"]);
    if (Number.isNaN(rawPrice)) return { status: "unavailable" };

    const displayPrice = formatGlobalQuotePrice(rawPrice, scaleFactor, unit);
    const changePercent = quote["10. change percent"] || "";

    return {
      status: "success",
      quote: { price: displayPrice, changePercent }
    };
  } catch {
    return { status: "unavailable" };
  }
}

function formatGlobalQuotePrice(
  rawPrice: number,
  scaleFactor: number | undefined,
  unit: string | undefined
): string {
  const effective = scaleFactor ?? 1;
  const price = rawPrice * effective;

  if (unit) {
    // Commodity with a unit label: always show as "$X.XX/unit"
    return `$${price.toFixed(2)}${unit}`;
  }

  if (effective > 2) {
    // Large-scale index (SPY×10 → S&P 500, UUP×3.5 → DXY): comma-formatted, no $ for indices
    const rounded = Math.round(price);
    return rounded >= 1000
      ? rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      : price.toFixed(1);
  }

  return `$${price.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

async function fetchNewsWithPacing(apiKey: string, requestCount: number): Promise<SnapshotHeadline[]> {
  if (requestCount > 0) {
    await delay(quoteDelayMs);
  }
  return fetchNews(apiKey);
}

async function fetchNews(apiKey: string): Promise<SnapshotHeadline[]> {
  try {
    const response = await fetch(
      `${baseUrl}?function=NEWS_SENTIMENT&topics=financial_markets&limit=5&apikey=${apiKey}`
    );
    const payload = (await response.json()) as {
      feed?: Array<{
        title?: string;
        source?: string;
        url?: string;
        time_published?: string;
      }>;
      Note?: string;
      Information?: string;
      "Error Message"?: string;
    };

    if (!response.ok || payload.Note || payload.Information || payload["Error Message"] || !payload.feed) {
      return [];
    }

    return payload.feed.slice(0, 5).map((item) => ({
      title: item.title || "Untitled headline",
      source: item.source || "Alpha Vantage",
      url: item.url,
      publishedAt: item.time_published
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Instrument merging
// ---------------------------------------------------------------------------

function mergeInstrumentsWithFallback(
  fallbackInstruments: SnapshotInstrument[],
  liveQuotes: Map<string, QuoteResult>
): SnapshotInstrument[] {
  return fallbackInstruments.map((instrument) => {
    const config = instrumentConfigs.find((c) => c.key === instrument.key);
    const liveQuote = liveQuotes.get(instrument.key);

    if (!config || !liveQuote) {
      return instrument;
    }

    return {
      key: instrument.key,
      label: instrument.label,
      value: liveQuote.price,
      change: liveQuote.changePercent,
      source: config.source,
      status: "live"
    };
  });
}

// ---------------------------------------------------------------------------
// Headline and summary builders
// ---------------------------------------------------------------------------

function buildHeadline(
  instruments: SnapshotInstrument[],
  headlines: SnapshotHeadline[],
  hasPartialFallback: boolean,
  freshQuoteCount: number,
  carriedLiveCount: number
): string {
  const sp500 = instruments.find((i) => i.key === "sp500");
  const wti = instruments.find((i) => i.key === "wti");
  const us10y = instruments.find((i) => i.key === "us10y");

  if (sp500?.status === "live" || wti?.status === "live" || us10y?.status === "live") {
    const parts = [
      sp500 ? `S&P 500 ${sp500.change || sp500.value}` : null,
      wti ? `WTI ${wti.value}` : null,
      us10y ? `US 10Y ${us10y.value}` : null
    ].filter(Boolean);

    const suffix = hasPartialFallback
      ? carriedLiveCount > 0
        ? ` ${carriedLiveCount} recent live values were carried forward while the rest used safe fallback coverage.`
        : " Some secondary instruments are using safe fallback values."
      : "";

    return `${parts.join(", ")} are setting the tone for the room.${suffix}`;
  }

  if (headlines.length > 0) {
    return "Live financial headlines are available, but only part of the market instrument set could be refreshed.";
  }

  return freshQuoteCount > 0 || carriedLiveCount > 0
    ? "Market Room is combining paced Alpha Vantage quotes with recent carried-forward live values."
    : "Live market data is partially available, so Market Room is combining fresh quotes with safe fallback coverage.";
}

function buildSummary(
  instruments: SnapshotInstrument[],
  hasPartialFallback: boolean,
  freshQuoteCount: number,
  carriedLiveCount: number
): string {
  const nasdaq = instruments.find((i) => i.key === "nasdaq");
  const dxy = instruments.find((i) => i.key === "dxy");
  const gold = instruments.find((i) => i.key === "gold");
  const liveCount = instruments.filter((i) => i.status === "live").length;

  return `Nasdaq 100 is ${nasdaq?.change || nasdaq?.value || "unavailable"}, DXY is ${dxy?.value || "unavailable"}, and gold is ${gold?.value || "unavailable"}. ${liveCount} instruments are currently live, including ${freshQuoteCount} refreshed this run${carriedLiveCount > 0 ? ` and ${carriedLiveCount} carried forward from recent snapshots` : ""}${hasPartialFallback ? ", with fallback values filling the rest." : "."}`;
}

// ---------------------------------------------------------------------------
// Carry-forward logic
// ---------------------------------------------------------------------------

function applyCarryForwardSnapshot(
  fallbackSnapshot: MarketSnapshotPayload,
  previousSnapshot: MarketSnapshotPayload | null | undefined,
  now: string
): Pick<MarketSnapshotPayload, "instruments" | "headlines"> {
  if (!previousSnapshot || !isReusableSnapshot(previousSnapshot, now, carryForwardMaxAgeMs)) {
    return {
      instruments: fallbackSnapshot.instruments,
      headlines: fallbackSnapshot.headlines
    };
  }

  const previousLiveMap = new Map(
    previousSnapshot.instruments
      .filter((i) => i.status === "live")
      .map((i) => [i.key, i])
  );

  const instruments = fallbackSnapshot.instruments.map((instrument) => {
    const previousLive = previousLiveMap.get(instrument.key);
    if (!previousLive) return instrument;
    return {
      ...previousLive,
      source: normalizeCarryForwardSource(previousLive.source)
    };
  });

  const headlines =
    previousSnapshot.headlines.length > 0 &&
    isReusableSnapshot(previousSnapshot, now, headlineCarryForwardMaxAgeMs)
      ? previousSnapshot.headlines.filter((h) => h.source !== "Market Room")
      : [];

  return {
    instruments,
    headlines: headlines.length > 0 ? headlines : fallbackSnapshot.headlines
  };
}

// ---------------------------------------------------------------------------
// Key rotation — determines which 3 instruments to refresh this run
// ---------------------------------------------------------------------------

function selectRefreshKeys(instruments: SnapshotInstrument[], now: string): string[] {
  const minuteBucket = Math.floor(new Date(now).getTime() / 60000);
  const equityKey = ["sp500", "nasdaq"][minuteBucket % 2];
  const macroKey = ["dxy", "us10y"][Math.floor(minuteBucket / 2) % 2];
  const commodityRotation = ["wti", "brent", "natural_gas", "gold", "copper"];
  const commodityKey = commodityRotation[Math.floor(minuteBucket / 3) % commodityRotation.length];
  const missingLiveKeys = instruments
    .filter((i) => i.status !== "live")
    .map((i) => i.key);
  const stablePriority = ["sp500", "nasdaq", "dxy", "us10y", "wti", "brent", "natural_gas", "gold", "copper"];

  return uniqueKeys([
    ...missingLiveKeys,
    equityKey,
    macroKey,
    commodityKey,
    ...stablePriority
  ]).filter((key) => instrumentConfigs.some((c) => c.key === key));
}

function uniqueKeys(keys: string[]): string[] {
  return Array.from(new Set(keys));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shouldRefreshHeadlines(
  cachedHeadlines: SnapshotHeadline[],
  previousSnapshot: MarketSnapshotPayload | null | undefined,
  now: string
): boolean {
  if (cachedHeadlines.length === 0) return true;
  if (!previousSnapshot) return true;
  return !isReusableSnapshot(previousSnapshot, now, headlineCarryForwardMaxAgeMs);
}

function isReusableSnapshot(
  snapshot: MarketSnapshotPayload,
  now: string,
  maxAgeMs: number
): boolean {
  if (!snapshot.provider.startsWith("alpha_vantage")) return false;

  // Reject snapshots built with the old ETF-proxy format.
  // Old format: commodity values are bare ETF prices (e.g. "137.92" for WTI via USO).
  // New format: commodity values include units (e.g. "$68.50/bbl" for actual WTI).
  // A live WTI instrument without "/" in its value is old-format — force a fresh fetch.
  const wti = snapshot.instruments.find((i) => i.key === "wti");
  if (wti?.status === "live" && wti.value && !wti.value.includes("/")) {
    return false;
  }

  const snapshotTime = new Date(snapshot.asOf).valueOf();
  const currentTime = new Date(now).valueOf();
  if (Number.isNaN(snapshotTime) || Number.isNaN(currentTime)) return false;
  return currentTime - snapshotTime <= maxAgeMs;
}

function normalizeCarryForwardSource(source: string): string {
  return source.includes("cached") ? source : `${source} (cached)`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
