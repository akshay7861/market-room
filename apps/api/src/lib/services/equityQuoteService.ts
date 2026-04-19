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

type EquityFundamentals = {
  symbol: string;
  name: string;
  price: string;
  change: string;
  marketCap: string | null;
  peTrailing: string | null;
  peForward: string | null;
  epsTrailing: string | null;
  nextEarningsDate: string | null;
  epsEstimate: string | null;
  revenueEstimate: string | null;
  fiftyTwoWeekRange: string | null;
};

const YF_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const YF_QUOTE_BASE = "https://query1.finance.yahoo.com/v7/finance/quote";
const YF_SUMMARY_BASE = "https://query1.finance.yahoo.com/v10/finance/quoteSummary";
const QUOTE_CACHE_TTL_MS = 20 * 60 * 1000;
const FUNDAMENTALS_CACHE_TTL_MS = 20 * 60 * 1000;
const MAX_QUOTES_PER_QUESTION = 30;
const rawUniverse = universe as EquityUniverseEntry[];

const quoteCache = new Map<string, { expiresAt: number; quote: EquityQuote }>();
const fundamentalsCache = new Map<string, { expiresAt: number; data: EquityFundamentals | null }>();

const EARNINGS_KEYWORDS = /\b(earnings|eps|revenue|beat|miss|guidance|quarter|q[1-4]|results|profit|loss|outlook|forecast)\b/i;

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
    "FSLR", "ENPH", "SEDG", "RUN", "NEE", "BEP", "ETN", "PWR", "ALB", "SQM", "TAN", "ICLN", "QCLN"
  ],
  energy_equities: [
    "XOM", "CVX", "SHEL", "TTE", "COP", "EOG", "DVN", "FANG", "SLB", "HAL", "BKR", "ENB", "KMI", "WMB", "ET", "XLE", "XOP", "OIH"
  ],
  ai_infrastructure: [
    "NVDA", "AMD", "AVGO", "MRVL", "ASML", "TSM", "AMAT", "LRCX", "VRT", "ETN", "PWR", "MSFT", "AMZN", "GOOGL"
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

// ─── Company name cross-validation ────────────────────────────────────────────

/**
 * Validates that Yahoo Finance's returned shortName has meaningful word overlap
 * with the universe entry's name. Prevents "TCS" (Tata Consultancy) from
 * resolving to a US-listed company of the same ticker symbol.
 */
function validateCompanyName(universeName: string, yahooShortName: string | undefined): boolean {
  if (!yahooShortName) return true; // can't invalidate without a name — pass through
  const normalize = (s: string): string[] =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
  const uTokens = new Set(normalize(universeName));
  const yTokens = normalize(yahooShortName);
  return yTokens.some((t) => uTokens.has(t));
}

// ─── Ask Market Q&A flow ──────────────────────────────────────────────────────

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

// ─── Autonomous posting: fundamentals for Equities Agent ──────────────────────

/**
 * Entry point for autonomous Equities Agent posts.
 * Identifies the primary company in the top headline, fetches fundamentals,
 * and returns a formatted prompt block. Returns "" if no confident match or
 * if Yahoo Finance is unavailable — the post always goes out regardless.
 */
export async function buildEquityFundamentalsForPost(
  headlineTitle: string,
  sectorHeadlines: Array<{ title: string; description?: string | null }>
): Promise<string> {
  // Combine top 3 headline titles for better signal
  const combinedText = [
    headlineTitle,
    ...sectorHeadlines.slice(0, 2).map((h) => h.title)
  ].join(" ");

  const topCandidate = selectTopCandidate(combinedText);
  if (!topCandidate) {
    console.log(`[equity-fundamentals] no confident company match for headlines="${headlineTitle.slice(0, 80)}"`);
    return "";
  }

  const { entry, score } = topCandidate;
  const isEarningsHeadline = EARNINGS_KEYWORDS.test(headlineTitle);
  console.log(`[equity-fundamentals] matched ${entry.symbol} (${entry.name}) score=${score} earnings=${isEarningsHeadline}`);

  const fundamentals = await fetchEquityFundamentals(entry.symbol, entry.name, isEarningsHeadline);
  if (!fundamentals) {
    console.log(`[equity-fundamentals] no data returned for ${entry.symbol}`);
    return "";
  }

  return formatFundamentalsBlock(fundamentals);
}

// ─── Universe candidate selection ─────────────────────────────────────────────

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

/**
 * Returns the single best-matching universe entry with its score,
 * or null if no confident match (score < 50).
 * Used by buildEquityFundamentalsForPost to identify the primary company.
 */
function selectTopCandidate(text: string): { entry: EquityUniverseEntry; score: number } | null {
  const lower = text.toLowerCase();
  const explicitSymbols = extractExplicitSymbols(text);
  const theme = detectTheme(text);
  const preferredSymbols = theme ? preferredThemeSymbols[theme] || [] : [];
  const queryTokens = tokenize(lower);

  let best: { entry: EquityUniverseEntry; score: number } | null = null;

  for (const entry of equityUniverse) {
    const entryText = `${entry.symbol} ${entry.bbg} ${entry.ric} ${entry.name} ${entry.region}`.toLowerCase();
    let score = 0;

    if (explicitSymbols.has(entry.symbol.toUpperCase())) score += 120;
    if (explicitSymbols.has(entry.bbg.split(" ")[0]?.toUpperCase() || "")) score += 90;

    const preferredIndex = preferredSymbols.indexOf(entry.symbol);
    if (preferredIndex >= 0) score += 90 - preferredIndex;

    for (const token of queryTokens) {
      if (entryText.includes(token)) score += token.length >= 5 ? 4 : 2;
    }

    if (score > (best?.score ?? 0)) {
      best = { entry, score };
    }
  }

  // Require minimum score of 50 to avoid weak/accidental matches
  if (!best || best.score < 50) return null;
  return best;
}

// ─── Quote fetch (price only, for Ask Market) ─────────────────────────────────

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
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            regularMarketChangePercent?: number;
            currency?: string;
            shortName?: string;
          };
        }>;
      };
    };
    const meta = payload.chart?.result?.[0]?.meta;

    if (!meta?.regularMarketPrice) {
      return unavailableQuote(entry);
    }

    // Company name cross-validation — prevents wrong-company ticker resolution
    if (!validateCompanyName(entry.name, meta.shortName)) {
      console.log(
        `[equity-quotes] name mismatch: universe="${entry.name}" yahoo="${meta.shortName}" symbol=${entry.symbol} — marking unavailable`
      );
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

// ─── Fundamentals fetch (for autonomous Equities Agent posts) ─────────────────

async function fetchEquityFundamentals(
  symbol: string,
  universeName: string,
  fetchEarningsTrend: boolean
): Promise<EquityFundamentals | null> {
  const cacheKey = `fundamentals:${symbol.toUpperCase()}`;
  const now = Date.now();
  const cached = fundamentalsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.data;

  try {
    // Tier 1: v7/quote — fast, gives price + basic fundamentals + name for validation
    const quoteRes = await fetch(
      `${YF_QUOTE_BASE}?symbols=${encodeURIComponent(symbol)}&fields=shortName,regularMarketPrice,regularMarketChangePercent,marketCap,trailingPE,forwardPE,epsTrailingTwelveMonths,fiftyTwoWeekHigh,fiftyTwoWeekLow`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: "application/json"
        }
      }
    );

    if (!quoteRes.ok) {
      fundamentalsCache.set(cacheKey, { expiresAt: now + FUNDAMENTALS_CACHE_TTL_MS, data: null });
      return null;
    }

    const quotePayload = (await quoteRes.json()) as {
      quoteResponse?: {
        result?: Array<{
          shortName?: string;
          regularMarketPrice?: number;
          regularMarketChangePercent?: number;
          marketCap?: number;
          trailingPE?: number;
          forwardPE?: number;
          epsTrailingTwelveMonths?: number;
          fiftyTwoWeekHigh?: number;
          fiftyTwoWeekLow?: number;
        }>;
      };
    };

    const q = quotePayload.quoteResponse?.result?.[0];
    if (!q?.regularMarketPrice) {
      fundamentalsCache.set(cacheKey, { expiresAt: now + FUNDAMENTALS_CACHE_TTL_MS, data: null });
      return null;
    }

    // Name validation — discard if wrong company
    if (!validateCompanyName(universeName, q.shortName)) {
      console.log(
        `[equity-fundamentals] name mismatch: universe="${universeName}" yahoo="${q.shortName}" symbol=${symbol}`
      );
      fundamentalsCache.set(cacheKey, { expiresAt: now + FUNDAMENTALS_CACHE_TTL_MS, data: null });
      return null;
    }

    const fundamentals: EquityFundamentals = {
      symbol,
      name: q.shortName || universeName,
      price: formatEquityPrice(q.regularMarketPrice, undefined),
      change: q.regularMarketChangePercent != null
        ? `${q.regularMarketChangePercent >= 0 ? "+" : ""}${q.regularMarketChangePercent.toFixed(2)}%`
        : "flat/unknown",
      marketCap: formatMarketCap(q.marketCap),
      peTrailing: q.trailingPE != null && q.trailingPE > 0 ? `${q.trailingPE.toFixed(1)}x` : null,
      peForward: q.forwardPE != null && q.forwardPE > 0 ? `${q.forwardPE.toFixed(1)}x` : null,
      epsTrailing: q.epsTrailingTwelveMonths != null ? `$${q.epsTrailingTwelveMonths.toFixed(2)}` : null,
      fiftyTwoWeekRange:
        q.fiftyTwoWeekLow != null && q.fiftyTwoWeekHigh != null
          ? `$${q.fiftyTwoWeekLow.toFixed(0)}–$${q.fiftyTwoWeekHigh.toFixed(0)}`
          : null,
      nextEarningsDate: null,
      epsEstimate: null,
      revenueEstimate: null
    };

    // Tier 2: earningsTrend — only on earnings headlines, best-effort
    if (fetchEarningsTrend) {
      try {
        const trendRes = await fetch(
          `${YF_SUMMARY_BASE}/${encodeURIComponent(symbol)}?modules=earningsTrend`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
              Accept: "application/json"
            }
          }
        );
        if (trendRes.ok) {
          const trendPayload = (await trendRes.json()) as {
            quoteSummary?: {
              result?: Array<{
                earningsTrend?: {
                  trend?: Array<{
                    period?: string;
                    earningsEstimate?: { avg?: number | null };
                    revenueEstimate?: { avg?: number | null };
                  }>;
                };
              }>;
            };
          };
          const trend = trendPayload.quoteSummary?.result?.[0]?.earningsTrend?.trend;
          const currentQ = trend?.find((t) => t.period === "0q") ?? trend?.[0];
          if (currentQ) {
            const eps = currentQ.earningsEstimate?.avg;
            const rev = currentQ.revenueEstimate?.avg;
            if (eps != null && eps !== 0) fundamentals.epsEstimate = `$${eps.toFixed(2)}`;
            if (rev != null && rev > 0) fundamentals.revenueEstimate = formatMarketCap(rev);
          }
        }
      } catch {
        // Tier 2 failure is silent — tier 1 data still injected
      }
    }

    fundamentalsCache.set(cacheKey, { expiresAt: now + FUNDAMENTALS_CACHE_TTL_MS, data: fundamentals });
    return fundamentals;
  } catch {
    fundamentalsCache.set(cacheKey, { expiresAt: now + FUNDAMENTALS_CACHE_TTL_MS, data: null });
    return null;
  }
}

// ─── Prompt block formatter ───────────────────────────────────────────────────

function formatFundamentalsBlock(f: EquityFundamentals): string {
  const lines: string[] = [
    `## Company Fundamentals — ${f.symbol} (${f.name})`,
    [
      `Live: ${f.price} (${f.change} today)`,
      f.marketCap ? `Market cap: ${f.marketCap}` : null,
      f.fiftyTwoWeekRange ? `52-week range: ${f.fiftyTwoWeekRange}` : null
    ].filter(Boolean).join(" | "),
  ];

  const valuationParts = [
    f.peTrailing ? `P/E ${f.peTrailing} TTM` : null,
    f.peForward ? `Forward P/E ${f.peForward}` : null,
    f.epsTrailing ? `EPS ${f.epsTrailing} TTM` : null
  ].filter(Boolean);
  if (valuationParts.length > 0) {
    lines.push(`Valuation: ${valuationParts.join(" | ")}`);
  }

  const earningsParts = [
    f.epsEstimate ? `Current quarter EPS estimate: ${f.epsEstimate}` : null,
    f.revenueEstimate ? `Revenue estimate: ${f.revenueEstimate}` : null
  ].filter(Boolean);
  if (earningsParts.length > 0) {
    lines.push(`Earnings estimates: ${earningsParts.join(" | ")}`);
  }

  // Count meaningful fields (anything beyond price/change)
  const meaningfulFields = [f.marketCap, f.peTrailing, f.peForward, f.epsTrailing, f.epsEstimate, f.revenueEstimate].filter(Boolean).length;
  if (meaningfulFields < 2) {
    // Not enough data to be useful — skip the block
    return "";
  }

  lines.push(
    "",
    "INSTRUCTION — when this fundamentals block is present you MUST:",
    "1. Name the specific P/E or EPS figure — not just 'expensive' or 'cheap'",
    "2. If EPS beat/missed, state the magnitude and whether revenue also beat or missed",
    "3. Compare the valuation multiple to a sector average, historical average, or named peer",
    "4. If an EPS estimate is shown, frame your view against that consensus",
    "⚠ Yahoo Finance data — 15-min delayed. If a field is missing above, omit it from your post. Do not estimate missing figures."
  );

  return lines.join("\n");
}

// ─── Shared utilities ─────────────────────────────────────────────────────────

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

function formatMarketCap(value: number | undefined | null): string | null {
  if (value == null || value <= 0) return null;
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toFixed(0)}`;
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
  // Expanded exclusion list — common acronyms and market terms that are also tickers
  const excluded = new Set([
    "WHAT", "WHICH", "WHY", "HOW", "THE", "AND", "FOR", "NOT", "BUT", "ARE",
    "ETF", "ETFS", "WTI", "DXY", "CPI", "PCE", "FED", "US", "UK", "AI",
    "GDP", "PMI", "ISM", "IPO", "CEO", "CFO", "COO", "BOJ", "ECB", "IMF",
    "EST", "BPS", "YOY", "QOQ", "TTM", "EPS", "REV", "NII", "NIM", "NFP",
    "EM", "FX", "HY", "IG", "PE", "VC", "RV", "IV", "ATH", "ATL"
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
