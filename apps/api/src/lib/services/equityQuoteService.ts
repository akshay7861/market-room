import universe from "../equities/equityUniverse.json";

type EquityUniverseEntry = {
  bbg: string;
  ric: string;
  symbol: string;
  name: string;
  region: string;
};

export type EquityQuote = EquityUniverseEntry & {
  price: string;
  change: string;
  status: "live" | "unavailable";
  source: string;
};

export type EquityQuoteContext = {
  queryType: string;
  candidates: EquityQuote[];
  unavailableCount: number;
};

const YF_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const QUOTE_CACHE_TTL_MS = 20 * 60 * 1000;
const MAX_QUOTES_PER_QUESTION = 30;
const rawUniverse = universe as EquityUniverseEntry[];

const quoteCache = new Map<string, { expiresAt: number; quote: EquityQuote }>();

const curatedEntries: EquityUniverseEntry[] = [
  { symbol: "TAN", bbg: "TAN US", ric: "TAN", name: "Invesco Solar ETF", region: "US" },
  { symbol: "ICLN", bbg: "ICLN US", ric: "ICLN", name: "iShares Global Clean Energy ETF", region: "US" },
  { symbol: "QCLN", bbg: "QCLN US", ric: "QCLN", name: "First Trust Nasdaq Clean Edge Green Energy ETF", region: "US" },
  { symbol: "XLE", bbg: "XLE US", ric: "XLE", name: "Energy Select Sector SPDR Fund", region: "US" },
  { symbol: "XOP", bbg: "XOP US", ric: "XOP", name: "SPDR S&P Oil & Gas Exploration & Production ETF", region: "US" },
  { symbol: "OIH", bbg: "OIH US", ric: "OIH", name: "VanEck Oil Services ETF", region: "US" },
  { symbol: "SHEL", bbg: "SHEL US", ric: "SHEL", name: "Shell PLC ADR", region: "US" },
  { symbol: "TTE", bbg: "TTE US", ric: "TTE", name: "TotalEnergies SE ADR", region: "US" }
];

const equityUniverse = dedupeUniverse([...curatedEntries, ...rawUniverse]);

const preferredThemeSymbols: Record<string, string[]> = {
  green_energy: [
    "FSLR",
    "ENPH",
    "SEDG",
    "RUN",
    "NEE",
    "BEP",
    "ETN",
    "PWR",
    "ALB",
    "SQM",
    "TAN",
    "ICLN",
    "QCLN"
  ],
  energy_equities: [
    "XOM",
    "CVX",
    "SHEL",
    "TTE",
    "COP",
    "EOG",
    "DVN",
    "FANG",
    "SLB",
    "HAL",
    "BKR",
    "ENB",
    "KMI",
    "WMB",
    "ET",
    "XLE",
    "XOP",
    "OIH"
  ],
  ai_infrastructure: [
    "NVDA",
    "AMD",
    "AVGO",
    "MRVL",
    "ASML",
    "TSM",
    "AMAT",
    "LRCX",
    "VRT",
    "ETN",
    "PWR",
    "MSFT",
    "AMZN",
    "GOOGL"
  ],
  banks: ["JPM", "BAC", "WFC", "C", "GS", "MS", "USB", "PNC", "RY", "TD", "HSBA.L", "BARC.L"],
  semiconductors: ["NVDA", "AMD", "AVGO", "MRVL", "ASML", "TSM", "AMAT", "LRCX", "MU", "TXN", "QCOM", "INTC"]
};

const themeKeywordMap: Record<string, RegExp> = {
  green_energy: /\b(green|clean energy|renewable|solar|wind|battery|lithium|ev|electrification|grid)\b/i,
  energy_equities: /\b(oil stocks?|energy stocks?|higher oil|wti|brent|opec|upstream|midstream|oilfield|e&p)\b/i,
  ai_infrastructure: /\b(ai|semiconductor|chips?|data center|datacenter|cloud|compute|gpu|accelerator)\b/i,
  banks: /\b(banks?|financials?|lenders?|net interest income|nii|deposit|credit card|brokerage)\b/i,
  semiconductors: /\b(semiconductor|chips?|foundry|memory|equipment|wafer|gpu|asic)\b/i
};

export async function buildEquityQuoteContext(question: string): Promise<EquityQuoteContext | null> {
  const candidates = selectUniverseCandidates(question, MAX_QUOTES_PER_QUESTION);

  if (candidates.length === 0) {
    console.log(`[equity-quotes] no universe candidates for question="${question.slice(0, 120)}"`);
    return null;
  }

  const quotes = await Promise.all(candidates.map((entry) => fetchEquityQuote(entry)));
  const liveCount = quotes.filter((quote) => quote.status === "live").length;
  const queryType = detectTheme(question) || "stock_lookup";

  console.log(
    `[equity-quotes] queryType=${queryType} candidates=${candidates.length} live=${liveCount} symbols=${quotes
      .slice(0, 12)
      .map((quote) => quote.symbol)
      .join(",")}`
  );

  return {
    queryType,
    candidates: quotes,
    unavailableCount: quotes.length - liveCount
  };
}

export function buildEquityQuotePromptBlock(context: EquityQuoteContext | null): string {
  if (!context || context.candidates.length === 0) {
    return "";
  }

  const live = context.candidates.filter((quote) => quote.status === "live");
  const unavailable = context.candidates.filter((quote) => quote.status !== "live");

  return [
    "## Relevant Equity Universe Prices",
    `Universe match: ${context.queryType}. Use these live/near-live quote rows when explaining stock movement. If a row is unavailable, mention it only if relevant.`,
    live.length > 0 ? "Live quote candidates:" : "No live quote candidates were available.",
    ...live.map(
      (quote) =>
        `- ${quote.symbol} | ${quote.name} | ${quote.region} | ${quote.price} | ${quote.change} | source=${quote.source}`
    ),
    unavailable.length > 0 ? `Unavailable from quote lookup: ${unavailable.map((quote) => quote.symbol).join(", ")}` : "",
    "Answer requirement: if the user asked for stocks or movement, include the most relevant names and their live moves, then explain the mechanism and false signal."
  ]
    .filter(Boolean)
    .join("\n");
}

function selectUniverseCandidates(question: string, limit: number): EquityUniverseEntry[] {
  const text = question.toLowerCase();
  const explicitSymbols = extractExplicitSymbols(question);
  const theme = detectTheme(question);
  const preferredSymbols = theme ? preferredThemeSymbols[theme] || [] : [];
  const queryTokens = tokenize(text);

  const scored = equityUniverse
    .map((entry) => {
      const entryText = `${entry.symbol} ${entry.bbg} ${entry.ric} ${entry.name} ${entry.region}`.toLowerCase();
      let score = 0;

      if (explicitSymbols.has(entry.symbol.toUpperCase())) score += 120;
      if (explicitSymbols.has(entry.bbg.split(" ")[0]?.toUpperCase() || "")) score += 90;

      const preferredIndex = preferredSymbols.indexOf(entry.symbol);
      if (preferredIndex >= 0) score += 90 - preferredIndex;

      for (const token of queryTokens) {
        if (entryText.includes(token)) score += token.length >= 5 ? 4 : 2;
      }

      if (theme === "green_energy" && /solar|renewable|energy|lithium|battery|electric|power|grid|wind/i.test(entry.name)) {
        score += 16;
      }
      if (theme === "energy_equities" && /oil|gas|energy|pipeline|resources|petroleum|midstream|drilling/i.test(entry.name)) {
        score += 16;
      }
      if (theme === "ai_infrastructure" && /semiconductor|technology|micro|nvidia|advanced micro|broadcom|cloud|electric|power/i.test(entry.name)) {
        score += 16;
      }

      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  return dedupeUniverse(scored.map((item) => item.entry)).slice(0, limit);
}

async function fetchEquityQuote(entry: EquityUniverseEntry): Promise<EquityQuote> {
  const cacheKey = entry.symbol.toUpperCase();
  const now = Date.now();
  const cached = quoteCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.quote;
  }

  try {
    const response = await fetch(`${YF_CHART_BASE}/${encodeURIComponent(entry.symbol)}?range=1d&interval=1d`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return unavailableQuote(entry);
    }

    const payload = (await response.json()) as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; chartPreviousClose?: number; regularMarketChangePercent?: number; currency?: string } }> };
    };
    const meta = payload.chart?.result?.[0]?.meta;

    if (!meta?.regularMarketPrice) {
      return unavailableQuote(entry);
    }

    const quote: EquityQuote = {
      ...entry,
      price: formatEquityPrice(meta.regularMarketPrice, meta.currency),
      change: formatEquityChange(meta),
      status: "live",
      source: "Yahoo Finance chart"
    };
    quoteCache.set(cacheKey, { expiresAt: now + QUOTE_CACHE_TTL_MS, quote });
    return quote;
  } catch {
    return unavailableQuote(entry);
  }
}

function unavailableQuote(entry: EquityUniverseEntry): EquityQuote {
  return {
    ...entry,
    price: "unavailable",
    change: "unavailable",
    status: "unavailable",
    source: "Yahoo Finance chart"
  };
}

function formatEquityPrice(price: number, currency?: string): string {
  const prefix = currency === "USD" || !currency ? "$" : `${currency} `;
  return `${prefix}${price.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: price < 10 ? 2 : 0 })}`;
}

function formatEquityChange(meta: { regularMarketPrice?: number; chartPreviousClose?: number; regularMarketChangePercent?: number }): string {
  const changePct =
    meta.regularMarketChangePercent ??
    (meta.chartPreviousClose && meta.regularMarketPrice && meta.chartPreviousClose !== 0
      ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
      : null);

  if (changePct == null || !Number.isFinite(changePct)) {
    return "flat/unknown";
  }

  return `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;
}

function detectTheme(question: string): string | null {
  for (const [theme, pattern] of Object.entries(themeKeywordMap)) {
    if (pattern.test(question)) {
      return theme;
    }
  }
  return null;
}

function extractExplicitSymbols(question: string): Set<string> {
  const excluded = new Set([
    "WHAT",
    "WHICH",
    "WHY",
    "HOW",
    "THE",
    "AND",
    "FOR",
    "ETF",
    "ETFS",
    "WTI",
    "DXY",
    "CPI",
    "PCE",
    "FED",
    "US",
    "UK",
    "AI"
  ]);
  const matches = question.match(/\b[A-Z]{1,5}(?:\.[A-Z]{1,3})?\b/g) || [];
  return new Set(matches.filter((match) => !excluded.has(match)).map((match) => match.toUpperCase()));
}

function tokenize(value: string): string[] {
  return value
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function dedupeUniverse(entries: EquityUniverseEntry[]): EquityUniverseEntry[] {
  const seen = new Set<string>();
  const deduped: EquityUniverseEntry[] = [];

  for (const entry of entries) {
    const key = entry.symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }

  return deduped;
}
