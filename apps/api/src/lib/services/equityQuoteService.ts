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

type EquityCatalystType =
  | "single_company"
  | "sector_or_industry"
  | "index_or_factor"
  | "macro_to_equity"
  | "noise_or_listicle";

type SubjectMatchConfidence = "explicit_symbol" | "exact_name" | "partial_name";

type SubjectCompanyMatch = {
  entry: EquityUniverseEntry;
  score: number;
  confidence: SubjectMatchConfidence;
  matchedText: string;
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

const SINGLE_COMPANY_CATALYST_KEYWORDS =
  /\b(earnings|eps|revenue|beat|miss|guidance|quarter|q[1-4]|results|profit|loss|outlook|forecast|upgrade|downgrade|rating|price target|target raise|target cut|dividend|buyback|repurchase|ceo|cfo|management|margin|margins|cost cut|cost cuts|layoff|layoffs|capex|restructuring|agm|egm|annual meeting|shareholder meeting|regulatory change|settlement|lawsuit|approval|contract|revenue target|growth cut|growth outlook)\b/i;

const SECTOR_OR_INDUSTRY_KEYWORDS =
  /\b(sector|industry|stocks?|equities|majors|banks?|semiconductors?|chips?|oilsands?|oil sands|energy equities|airlines?|retailers?|builders?|homebuilders?|software|hardware|automakers?|insurers?|financials?|cyclicals?|defensives?|small caps?|large caps?)\b/i;

const INDEX_OR_FACTOR_KEYWORDS =
  /\b(s&p|spx|sp 500|s&p 500|nasdaq|ndx|dow|russell|iwm|qqq|spy|index|indices|breadth|growth|value|momentum|quality|low vol|duration-sensitive|multiple compression|multiple expansion|leadership|rotation)\b/i;

const MACRO_TO_EQUITY_KEYWORDS =
  /\b(cpi|pce|payrolls?|nfp|unemployment|jobs?|wages?|fed|fomc|rates?|yields?|treasury|liquidity|dollar|dxy|credit|spreads?|oil|wti|brent|inflation|recession|growth scare|soft landing|hard landing|pmi|ism|tariff)\b/i;

const COMPANY_SUFFIX_WORDS = new Set([
  "inc", "incorporated", "corp", "corporation", "co", "company", "plc", "adr", "ads", "asa",
  "se", "sa", "nv", "ag", "ltd", "limited", "holdings", "holding", "group", "lp", "llc",
  "class", "ordinary", "shares", "common", "stock", "the"
]);

const GENERIC_COMPANY_WORDS = new Set([
  "energy", "technologies", "technology", "industrial", "industrials", "resources", "capital",
  "financial", "financials", "global", "international", "american", "national", "first",
  "trust", "fund", "etf", "select", "sector", "spdr", "ishares", "invesco", "nasdaq"
]);

const KNOWN_COMPANY_ALIASES: Record<string, string[]> = {
  "AMZN": ["amazon"],
  "NFLX": ["netflix"],
  "DAL": ["delta"],
  "EQNR": ["equinor"],
  "EQNR.OL": ["equinor"],
  "AAOI": ["applied optoelectronics"],
  "PARR": ["par pacific"],
  "VSH": ["vishay", "vishay intertechnology"],
  "FRU.TO": ["freehold royalties"],
  "TSM": ["tsm", "tsmc", "taiwan semiconductor"],
  "WMB": ["williams companies", "williams"],
  "ET": ["energy transfer"],
  "EPD": ["enterprise products"],
  "MS": ["morgan stanley"]
};

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
  const primaryHeadline = sectorHeadlines.find((h) => h.title === headlineTitle) ?? sectorHeadlines[0];
  const primaryText = [headlineTitle, primaryHeadline?.description || ""].filter(Boolean).join(" ");
  const combinedText = [
    primaryText,
    ...sectorHeadlines
      .filter((h) => h.title !== headlineTitle)
      .slice(0, 2)
      .map((h) => [h.title, h.description || ""].filter(Boolean).join(" "))
  ].join(" ");

  const subjectMatch = identifySubjectCompany(primaryText, combinedText);
  const catalystType = classifyMarketRoomEquityCatalyst(primaryText, combinedText, subjectMatch);
  const theme = detectTheme(primaryText);

  if (theme && (!subjectMatch || !preferredThemeSymbols[theme]?.includes(subjectMatch.entry.symbol))) {
    const rejectedSymbol = preferredThemeSymbols[theme]?.[0];
    if (rejectedSymbol) {
      console.log(
        `[equity-catalyst] rejected_theme_only symbol=${rejectedSymbol} theme=${theme} reason=subject_not_named`
      );
    }
  }

  if (catalystType === "noise_or_listicle") {
    console.log(`[equity-catalyst] type=noise_or_listicle no_single_stock=true headline="${headlineTitle.slice(0, 100)}"`);
    return "";
  }

  if (catalystType !== "single_company") {
    console.log(`[equity-catalyst] type=${catalystType} no_single_stock=true headline="${headlineTitle.slice(0, 100)}"`);
    return buildEquityCatalystContextBlock(catalystType, headlineTitle);
  }

  if (!subjectMatch) {
    console.log(
      `[equity-fundamentals] skipped reason=unsafe_subject_match headline="${headlineTitle.slice(0, 100)}"`
    );
    return "";
  }

  const { entry, score, confidence, matchedText } = subjectMatch;
  const isEarningsHeadline = EARNINGS_KEYWORDS.test(primaryText);
  console.log(
    `[equity-catalyst] type=single_company subject=${entry.name} symbol=${entry.symbol} confidence=${confidence} matched="${matchedText}" score=${score}`
  );

  const fundamentals = await fetchEquityFundamentals(entry.symbol, entry.name, isEarningsHeadline);
  if (!fundamentals) {
    console.log(`[equity-fundamentals] no data returned for ${entry.symbol}`);
    return "";
  }

  const block = formatFundamentalsBlock(fundamentals);
  if (!block) {
    console.log(`[equity-fundamentals] skipped reason=insufficient_fields symbol=${entry.symbol}`);
    return "";
  }

  console.log(
    `[equity-fundamentals] injected symbol=${entry.symbol} fields=${fundamentalFieldList(fundamentals).join(",")}`
  );
  return block;
}

function classifyMarketRoomEquityCatalyst(
  primaryText: string,
  combinedText: string,
  subjectMatch: SubjectCompanyMatch | null
): EquityCatalystType {
  if (isMarketRoomListicle(primaryText)) {
    return "noise_or_listicle";
  }

  if (subjectMatch) {
    return "single_company";
  }

  if (SECTOR_OR_INDUSTRY_KEYWORDS.test(primaryText)) {
    return "sector_or_industry";
  }

  if (INDEX_OR_FACTOR_KEYWORDS.test(primaryText)) {
    return "index_or_factor";
  }

  if (MACRO_TO_EQUITY_KEYWORDS.test(primaryText) || MACRO_TO_EQUITY_KEYWORDS.test(combinedText)) {
    return "macro_to_equity";
  }

  return "sector_or_industry";
}

function identifySubjectCompany(primaryText: string, combinedText: string): SubjectCompanyMatch | null {
  const primaryMatch = identifySubjectCompanyInText(primaryText);
  if (primaryMatch) return primaryMatch;

  // Fallback to the combined top-headline slate only when the primary headline
  // has single-company language but lacks the full name/ticker in the title.
  if (!SINGLE_COMPANY_CATALYST_KEYWORDS.test(primaryText)) {
    return null;
  }
  return identifySubjectCompanyInText(combinedText);
}

function identifySubjectCompanyInText(text: string): SubjectCompanyMatch | null {
  const normalizedText = normalizeForCompanyMatch(text);
  const explicitSymbols = extractExplicitSymbols(text);
  const candidates: SubjectCompanyMatch[] = [];

  for (const entry of equityUniverse) {
    const symbol = entry.symbol.toUpperCase();
    const bbgSymbol = entry.bbg.split(" ")[0]?.toUpperCase() || "";
    const aliases = companyAliases(entry);

    if (explicitSymbols.has(symbol) || (bbgSymbol && explicitSymbols.has(bbgSymbol))) {
      candidates.push({
        entry,
        score: 220,
        confidence: "explicit_symbol",
        matchedText: explicitSymbols.has(symbol) ? symbol : bbgSymbol
      });
      continue;
    }

    const exactAlias = aliases.find((alias) => alias.kind === "exact" && normalizedText.includes(` ${alias.value} `));
    if (exactAlias) {
      candidates.push({
        entry,
        score: 180 + exactAlias.value.split(" ").length * 12,
        confidence: "exact_name",
        matchedText: exactAlias.value
      });
      continue;
    }

    const partialAlias = aliases.find((alias) => alias.kind === "partial" && normalizedText.includes(` ${alias.value} `));
    if (partialAlias) {
      candidates.push({
        entry,
        score: 120 + partialAlias.value.split(" ").length * 8,
        confidence: "partial_name",
        matchedText: partialAlias.value
      });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort(compareSubjectMatches);
  const best = candidates[0];
  if (!best || best.score < 100) return null;
  return best;
}

function compareSubjectMatches(left: SubjectCompanyMatch, right: SubjectCompanyMatch): number {
  if (right.score !== left.score) return right.score - left.score;
  const confidenceRank: Record<SubjectMatchConfidence, number> = {
    explicit_symbol: 3,
    exact_name: 2,
    partial_name: 1
  };
  const confidenceDelta = confidenceRank[right.confidence] - confidenceRank[left.confidence];
  if (confidenceDelta !== 0) return confidenceDelta;

  const leftIsUs = left.entry.region.toUpperCase() === "US" ? 1 : 0;
  const rightIsUs = right.entry.region.toUpperCase() === "US" ? 1 : 0;
  if (rightIsUs !== leftIsUs) return rightIsUs - leftIsUs;

  const leftHasDot = left.entry.symbol.includes(".") ? 1 : 0;
  const rightHasDot = right.entry.symbol.includes(".") ? 1 : 0;
  if (leftHasDot !== rightHasDot) return leftHasDot - rightHasDot;

  return left.entry.symbol.length - right.entry.symbol.length;
}

function companyAliases(entry: EquityUniverseEntry): Array<{ value: string; kind: "exact" | "partial" }> {
  const aliases = new Map<string, "exact" | "partial">();
  const add = (value: string, kind: "exact" | "partial") => {
    const normalized = normalizeCompanyAlias(value);
    if (!normalized || normalized.length < 3) return;
    const existing = aliases.get(normalized);
    if (existing === "exact") return;
    aliases.set(normalized, kind);
  };

  add(entry.name, "exact");
  add(entry.name.replace(/\([^)]*\)/g, " "), "exact");
  for (const alias of KNOWN_COMPANY_ALIASES[entry.symbol.toUpperCase()] || []) {
    add(alias, "exact");
  }

  const tokens = normalizeCompanyAlias(entry.name)
    .split(" ")
    .filter((token) => token && !COMPANY_SUFFIX_WORDS.has(token));
  const meaningfulTokens = tokens.filter((token) => !GENERIC_COMPANY_WORDS.has(token));

  if (meaningfulTokens.length >= 2) {
    add(meaningfulTokens.slice(0, 2).join(" "), "partial");
  }
  if (meaningfulTokens.length === 1 && meaningfulTokens[0].length >= 5) {
    add(meaningfulTokens[0], "partial");
  }

  return [...aliases.entries()].map(([value, kind]) => ({ value, kind }));
}

function normalizeCompanyAlias(value: string): string {
  const tokens = value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s.]/g, " ")
    .replace(/\bcom\b/g, " ")
    .split(/\s+/)
    .map((token) => token.trim().replace(/\.$/, ""))
    .filter((token) => token && !COMPANY_SUFFIX_WORDS.has(token));
  return tokens.join(" ").trim();
}

function normalizeForCompanyMatch(value: string): string {
  return ` ${value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s.]/g, " ")
    .replace(/\bcom\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function isMarketRoomListicle(text: string): boolean {
  return (
    /\b\d+\s+(?:best|top|most|worst|cheapest|undervalued|overvalued|high[- ]?dividend|growth|value|small[- ]?cap)\b.*\bstock/i.test(text) ||
    /\bstocks?\s+to\s+(buy|sell|watch|avoid|own)\b/i.test(text) ||
    /\b(best|top)\s+stocks?\s+(under|for|in|to)\b/i.test(text) ||
    /\b\d+\s+\w+\s+(etfs?|funds?|reits?)\s+to\s+(buy|own|watch)\b/i.test(text)
  );
}

function buildEquityCatalystContextBlock(type: Exclude<EquityCatalystType, "single_company" | "noise_or_listicle">, headlineTitle: string): string {
  const instructions: Record<typeof type, string[]> = {
    sector_or_industry: [
      "This is a sector/industry catalyst, not a single-company catalyst.",
      "Do not pretend one ticker is the article subject. Discuss representative names only as examples.",
      "Frame the view through sector earnings sensitivity, margins, valuation, leadership, and confirmation data."
    ],
    index_or_factor: [
      "This is an index/factor catalyst, not a single-company catalyst.",
      "Frame the view through breadth, multiple expansion/compression, growth vs value, duration exposure, and liquidity.",
      "Do not inject or invent company-specific fundamentals."
    ],
    macro_to_equity: [
      "This is a macro-to-equity catalyst, not a single-company catalyst.",
      "Frame the view through rates, growth, liquidity, earnings expectations, and sector winners/losers.",
      "Do not force a stock-specific view unless a named company is the actual subject."
    ]
  };

  return [
    `## Equity Catalyst Context — ${type.replace(/_/g, " ")}`,
    `Primary headline: ${headlineTitle}`,
    ...instructions[type]
  ].join("\n");
}

function fundamentalFieldList(f: EquityFundamentals): string[] {
  return [
    f.marketCap ? "marketCap" : null,
    f.peTrailing ? "peTrailing" : null,
    f.peForward ? "peForward" : null,
    f.epsTrailing ? "epsTrailing" : null,
    f.epsEstimate ? "epsEstimate" : null,
    f.revenueEstimate ? "revenueEstimate" : null,
    f.fiftyTwoWeekRange ? "fiftyTwoWeekRange" : null
  ].filter((field): field is string => Boolean(field));
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
    "EM", "FX", "HY", "IG", "PE", "VC", "RV", "IV", "ATH", "ATL", "AGM", "EGM"
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
