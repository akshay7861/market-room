import {
  equityUniverse,
  resolveEquitySubject,
  type EquitySubjectResolution,
  type EquityUniverseEntry
} from "./equitySubjectResolution";

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

export type EquityDataTier = "none" | "quote_only" | "light" | "rich";

export type EquityFundamentalsField =
  | "price"
  | "change"
  | "marketCap"
  | "peTrailing"
  | "peForward"
  | "epsTrailing"
  | "nextEarningsDate"
  | "epsEstimate"
  | "revenueEstimate"
  | "fiftyTwoWeekRange";

export type EquitySubjectDataContext = {
  resolution: EquitySubjectResolution;
  dataTier: EquityDataTier;
  promptBlock: string;
  quote: EquityQuote | null;
  fundamentals: EquityFundamentals | null;
  fetchedFields: Partial<Record<EquityFundamentalsField, string>>;
};

const YF_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const YF_QUOTE_BASE = "https://query1.finance.yahoo.com/v7/finance/quote";
const YF_SUMMARY_BASE = "https://query1.finance.yahoo.com/v10/finance/quoteSummary";
const YF_TIMESERIES_BASE = "https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries";
const QUOTE_CACHE_TTL_MS = 20 * 60 * 1000;
const FUNDAMENTALS_CACHE_TTL_MS = 20 * 60 * 1000;
const MAX_QUOTES_PER_QUESTION = 30;

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

export async function buildAskEquityCompanyContext(question: string): Promise<EquitySubjectDataContext> {
  const resolution = resolveEquitySubject(question);
  if (resolution.status !== "resolved" || !resolution.entry) {
    return {
      resolution,
      dataTier: "none",
      promptBlock: "",
      quote: null,
      fundamentals: null,
      fetchedFields: {}
    };
  }

  const quote = await fetchEquityQuote(resolution.entry);
  const fundamentals = await fetchEquityFundamentals(resolution.entry.symbol, resolution.entry.name, true);
  const dataTier = classifyEquityDataTier(quote, fundamentals);

  return {
    resolution,
    dataTier,
    promptBlock: formatAskFundamentalsBlock(resolution, quote, fundamentals, dataTier),
    quote,
    fundamentals,
    fetchedFields: collectFetchedFields(quote, fundamentals)
  };
}

export function buildAskStatementsUnavailableFallback(context: EquitySubjectDataContext): string {
  if (context.resolution.status === "ambiguous_subject") {
    return "I can’t safely identify the company from that name alone. Please give me the ticker, exchange, or region and I’ll keep it constrained to the right company.";
  }

  if (context.resolution.status !== "resolved" || !context.resolution.entry) {
    return "I don’t have a safe company match for that request, so I can’t provide current statement-level detail without risking the wrong issuer. Please give me the ticker, exchange, or region.";
  }

  const snapshot = buildConstrainedSnapshot(context);
  return [
    `I do not currently have detailed live income statement, balance sheet, or cash flow statement rows for ${context.resolution.entry.name} (${context.resolution.entry.symbol}) from this system.`,
    snapshot ? `What I can give you reliably right now is a constrained market snapshot: ${snapshot}.` : "What I can give you reliably right now is only a limited quote snapshot, not statement rows.",
    "What is unavailable here: current statement-line items like revenue, operating income, net income, cash, debt, and cash flow statement detail from a live filing source."
  ].join(" ");
}

export async function buildEquityFundamentalsForPost(
  headlineTitle: string,
  sectorHeadlines: Array<{ title: string; description?: string | null }>
): Promise<EquitySubjectDataContext> {
  const primaryHeadline = sectorHeadlines.find((headline) => headline.title === headlineTitle) ?? sectorHeadlines[0];
  const primaryText = [headlineTitle, primaryHeadline?.description || ""].filter(Boolean).join(" ");
  const combinedText = [
    primaryText,
    ...sectorHeadlines
      .filter((headline) => headline.title !== headlineTitle)
      .slice(0, 2)
      .map((headline) => [headline.title, headline.description || ""].filter(Boolean).join(" "))
  ].join(" ");

  const primaryResolution = resolveEquitySubject(primaryText);
  const fallbackResolution =
    primaryResolution.status === "resolved" || !SINGLE_COMPANY_CATALYST_KEYWORDS.test(primaryText)
      ? primaryResolution
      : resolveEquitySubject(combinedText);
  const resolution = fallbackResolution;
  const catalystType = classifyMarketRoomEquityCatalyst(primaryText, combinedText, resolution);
  const theme = detectTheme(primaryText);

  if (theme && (resolution.status !== "resolved" || !resolution.entry || !preferredThemeSymbols[theme]?.includes(resolution.entry.symbol))) {
    const rejectedSymbol = preferredThemeSymbols[theme]?.[0];
    if (rejectedSymbol) {
      console.log(`[equity-catalyst] rejected_theme_only symbol=${rejectedSymbol} theme=${theme} reason=subject_not_named`);
    }
  }

  if (catalystType === "noise_or_listicle") {
    console.log(`[equity-catalyst] type=noise_or_listicle no_single_stock=true headline="${headlineTitle.slice(0, 100)}"`);
    return emptyDataContext(resolution);
  }

  if (catalystType !== "single_company") {
    console.log(`[equity-catalyst] type=${catalystType} no_single_stock=true headline="${headlineTitle.slice(0, 100)}"`);
    return {
      ...emptyDataContext(resolution),
      promptBlock: buildEquityCatalystContextBlock(catalystType, headlineTitle)
    };
  }

  if (resolution.status !== "resolved" || !resolution.entry) {
    console.log(`[equity-fundamentals] skipped reason=unsafe_subject_match headline="${headlineTitle.slice(0, 100)}"`);
    return emptyDataContext(resolution);
  }

  const { entry, score, confidence, matchedText } = resolution;
  const isEarningsHeadline = EARNINGS_KEYWORDS.test(primaryText);
  console.log(
    `[equity-catalyst] type=single_company subject=${entry.name} symbol=${entry.symbol} confidence=${confidence} matched="${matchedText}" score=${score}`
  );

  const fundamentals = await fetchEquityFundamentals(entry.symbol, entry.name, isEarningsHeadline);
  if (!fundamentals) {
    console.log(`[equity-fundamentals] no data returned for ${entry.symbol}`);
    return emptyDataContext(resolution);
  }

  const quote: EquityQuote = {
    ...entry,
    price: fundamentals.price,
    change: fundamentals.change,
    status: "live",
    source: "Yahoo Finance quote"
  };
  const dataTier = classifyEquityDataTier(quote, fundamentals);
  const fetchedFields = collectFetchedFields(quote, fundamentals);
  const promptBlock = formatFundamentalsBlock(fundamentals);

  if (!promptBlock) {
    console.log(`[equity-fundamentals] skipped reason=insufficient_fields symbol=${entry.symbol}`);
    return {
      resolution,
      dataTier,
      promptBlock: "",
      quote,
      fundamentals,
      fetchedFields
    };
  }

  console.log(`[equity-fundamentals] injected symbol=${entry.symbol} fields=${fundamentalFieldList(fundamentals).join(",")}`);
  return {
    resolution,
    dataTier,
    promptBlock,
    quote,
    fundamentals,
    fetchedFields
  };
}

export function hasVisibleFetchedFundamentals(
  content: string,
  context: EquitySubjectDataContext
): { visible: boolean; matchedFields: EquityFundamentalsField[] } {
  const matchedFields = Object.entries(context.fetchedFields)
    .filter(([field, value]) => Boolean(value) && fieldMatchesVisibleValue(field as EquityFundamentalsField, value!, content))
    .map(([field]) => field as EquityFundamentalsField);

  return {
    visible: matchedFields.length > 0,
    matchedFields
  };
}

export function buildEquityFundamentalsRepairSentence(context: EquitySubjectDataContext): string | null {
  if (context.dataTier !== "light" && context.dataTier !== "rich") {
    return null;
  }

  const fields = context.fetchedFields;
  if (fields.marketCap) {
    return `At roughly ${fields.marketCap} of market cap, the market is already discounting a fairly clean execution path.`;
  }
  if (fields.peForward) {
    return `The stock still trades around ${fields.peForward} forward earnings, which matters more than broad index tape if guidance is wobbling.`;
  }
  if (fields.peTrailing) {
    return `At roughly ${fields.peTrailing} trailing earnings, valuation already sets a high bar for any near-term disappointment.`;
  }
  if (fields.epsTrailing) {
    return `Trailing EPS is ${fields.epsTrailing}, so the debate is whether the next catalyst can actually improve that earnings base rather than just sentiment.`;
  }
  if (fields.fiftyTwoWeekRange) {
    return `The stock is still trading inside a ${fields.fiftyTwoWeekRange} 52-week range, so positioning is not as washed out as the headline alone suggests.`;
  }
  if (fields.price) {
    return `With shares around ${fields.price}, the market is reacting to company-specific execution more than a generic IWM/SPY framing.`;
  }
  return null;
}

function emptyDataContext(resolution: EquitySubjectResolution): EquitySubjectDataContext {
  return {
    resolution,
    dataTier: "none",
    promptBlock: "",
    quote: null,
    fundamentals: null,
    fetchedFields: {}
  };
}

function classifyMarketRoomEquityCatalyst(
  primaryText: string,
  combinedText: string,
  resolution: EquitySubjectResolution
): EquityCatalystType {
  if (isMarketRoomListicle(primaryText)) {
    return "noise_or_listicle";
  }
  if (resolution.status === "resolved" && resolution.classification === "single_company") {
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

function buildEquityCatalystContextBlock(
  type: Exclude<EquityCatalystType, "single_company" | "noise_or_listicle">,
  headlineTitle: string
): string {
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

function classifyEquityDataTier(quote: EquityQuote | null, fundamentals: EquityFundamentals | null): EquityDataTier {
  if (!quote && !fundamentals) return "none";
  if (!fundamentals) return quote ? "quote_only" : "none";

  const lightCount = [
    fundamentals.marketCap,
    fundamentals.peTrailing,
    fundamentals.peForward,
    fundamentals.epsTrailing,
    fundamentals.fiftyTwoWeekRange
  ].filter(Boolean).length;
  const richCount = [
    fundamentals.nextEarningsDate,
    fundamentals.epsEstimate,
    fundamentals.revenueEstimate
  ].filter(Boolean).length;

  if (richCount > 0) return "rich";
  if (lightCount > 0) return "light";
  return quote ? "quote_only" : "none";
}

function collectFetchedFields(
  quote: EquityQuote | null,
  fundamentals: EquityFundamentals | null
): Partial<Record<EquityFundamentalsField, string>> {
  return {
    price: fundamentals?.price || quote?.price || undefined,
    change: fundamentals?.change || quote?.change || undefined,
    marketCap: fundamentals?.marketCap || undefined,
    peTrailing: fundamentals?.peTrailing || undefined,
    peForward: fundamentals?.peForward || undefined,
    epsTrailing: fundamentals?.epsTrailing || undefined,
    nextEarningsDate: fundamentals?.nextEarningsDate || undefined,
    epsEstimate: fundamentals?.epsEstimate || undefined,
    revenueEstimate: fundamentals?.revenueEstimate || undefined,
    fiftyTwoWeekRange: fundamentals?.fiftyTwoWeekRange || undefined
  };
}

function buildConstrainedSnapshot(context: EquitySubjectDataContext): string {
  return [
    context.fetchedFields.price ? `price ${context.fetchedFields.price}` : null,
    context.fetchedFields.change ? `change ${context.fetchedFields.change}` : null,
    context.fetchedFields.marketCap ? `market cap ${context.fetchedFields.marketCap}` : null,
    context.fetchedFields.peTrailing ? `trailing P/E ${context.fetchedFields.peTrailing}` : null,
    context.fetchedFields.peForward ? `forward P/E ${context.fetchedFields.peForward}` : null,
    context.fetchedFields.epsTrailing ? `trailing EPS ${context.fetchedFields.epsTrailing}` : null,
    context.fetchedFields.fiftyTwoWeekRange ? `52-week range ${context.fetchedFields.fiftyTwoWeekRange}` : null,
    context.fetchedFields.epsEstimate ? `EPS estimate ${context.fetchedFields.epsEstimate}` : null,
    context.fetchedFields.revenueEstimate ? `latest quarterly revenue ${context.fetchedFields.revenueEstimate}` : null
  ]
    .filter(Boolean)
    .join(" | ");
}

function formatAskFundamentalsBlock(
  resolution: EquitySubjectResolution,
  quote: EquityQuote | null,
  fundamentals: EquityFundamentals | null,
  dataTier: EquityDataTier
): string {
  if (resolution.status !== "resolved" || !resolution.entry) {
    return "";
  }

  const context: EquitySubjectDataContext = {
    resolution,
    dataTier,
    promptBlock: "",
    quote,
    fundamentals,
    fetchedFields: collectFetchedFields(quote, fundamentals)
  };
  const snapshot = buildConstrainedSnapshot(context);
  if (!snapshot) {
    return "";
  }

  return [
    `## Company Snapshot — ${resolution.entry.symbol} (${resolution.entry.name})`,
    snapshot,
    dataTier === "quote_only"
      ? "Only quote-level data is available here. Do not describe this as full fundamentals."
      : "Use these fetched company fields directly if the user asked for fundamentals."
  ].join("\n");
}

function formatFundamentalsBlock(f: EquityFundamentals): string {
  const lines: string[] = [
    `## Company Fundamentals — ${f.symbol} (${f.name})`,
    [
      `Live: ${f.price} (${f.change} today)`,
      f.marketCap ? `Market cap: ${f.marketCap}` : null,
      f.fiftyTwoWeekRange ? `52-week range: ${f.fiftyTwoWeekRange}` : null
    ].filter(Boolean).join(" | ")
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
    f.revenueEstimate ? `Latest quarterly revenue: ${f.revenueEstimate}` : null
  ].filter(Boolean);
  if (earningsParts.length > 0) {
    lines.push(`Earnings estimates: ${earningsParts.join(" | ")}`);
  }

  const meaningfulFields = [f.marketCap, f.peTrailing, f.peForward, f.epsTrailing, f.epsEstimate, f.revenueEstimate].filter(Boolean).length;
  if (meaningfulFields < 2) {
    return "";
  }

  lines.push(
    "",
    "INSTRUCTION — when this fundamentals block is present you MUST:",
    "1. Name the specific P/E or EPS figure — not just 'expensive' or 'cheap'",
    "2. If EPS beat/missed, state the magnitude and whether revenue also beat or missed",
    "3. Compare the valuation multiple to a sector average, historical average, or named peer",
    "4. If an EPS estimate is shown, frame your view against that consensus",
    "5. If you use this block in final copy, at least one fetched value must appear explicitly in the post.",
    "Yahoo Finance data can be delayed. If a field is missing above, omit it from the post."
  );

  return lines.join("\n");
}

function fieldMatchesVisibleValue(field: EquityFundamentalsField, value: string, content: string): boolean {
  const normalized = content.toLowerCase().replace(/[–—]/g, "-");
  switch (field) {
    case "marketCap":
      return matchesMarketCapValue(value, normalized);
    case "peForward":
      return matchesPeValue(value, normalized);
    case "peTrailing":
      return matchesPeValue(value, normalized);
    case "epsTrailing":
    case "epsEstimate":
      return matchesDollarValueWithContext(value, normalized, /\b(eps|earnings per share)\b/);
    case "revenueEstimate":
      return matchesMarketCapValue(value, normalized);
    case "fiftyTwoWeekRange":
      return matchesRangeValue(value, normalized);
    case "price":
      return matchesDollarValue(value, normalized);
    default:
      return false;
  }
}

function matchesMarketCapValue(value: string, content: string): boolean {
  const match = value.match(/\$?(\d+(?:\.\d+)?)([TBM])/i);
  if (!match) return false;
  const amount = Number(match[1]);
  const suffix = match[2].toUpperCase();
  const rounded = Number.isInteger(amount) ? `${amount}` : amount.toFixed(1).replace(/\.0$/, "");
  const suffixPattern =
    suffix === "T" ? "(?:t|tn|trillion)" :
    suffix === "B" ? "(?:b|bn|billion)" :
    "(?:m|mn|million)";
  return new RegExp(`\\$?${escapeRegex(rounded)}\\s*${suffixPattern}\\b`, "i").test(content);
}

function matchesPeValue(value: string, content: string): boolean {
  const match = value.match(/(\d+(?:\.\d+)?)x/i);
  if (!match) return false;
  const amount = match[1];
  return new RegExp(`\\b${escapeRegex(amount)}\\s*(?:x|times?)\\b(?:[^.!?]{0,40}(?:forward|trailing|earnings|p/e|pe|ttm))?`, "i").test(content);
}

function matchesDollarValueWithContext(value: string, content: string, contextPattern: RegExp): boolean {
  return matchesDollarValue(value, content) && contextPattern.test(content);
}

function matchesDollarValue(value: string, content: string): boolean {
  const match = value.match(/\$?(\d+(?:\.\d+)?)/);
  if (!match) return false;
  return new RegExp(`\\$?${escapeRegex(match[1])}\\b`, "i").test(content);
}

function matchesRangeValue(value: string, content: string): boolean {
  const match = value.match(/\$?(\d+(?:\.\d+)?)\s*[–-]\s*\$?(\d+(?:\.\d+)?)/);
  if (!match) return false;
  return new RegExp(`\\$?${escapeRegex(match[1])}\\b`, "i").test(content) &&
    new RegExp(`\\$?${escapeRegex(match[2])}\\b`, "i").test(content);
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

      if (theme === "green_energy" && /solar|renewable|energy|lithium|battery|electric|power|grid|wind/i.test(entry.name)) score += 16;
      if (theme === "energy_equities" && /oil|gas|energy|pipeline|resources|petroleum|midstream|drilling/i.test(entry.name)) score += 16;
      if (theme === "ai_infrastructure" && /semiconductor|technology|micro|nvidia|advanced micro|broadcom|cloud|electric|power/i.test(entry.name)) score += 16;

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
    if (!validateCompanyName(entry.name, meta.shortName)) {
      console.log(`[equity-quotes] name mismatch: universe="${entry.name}" yahoo="${meta.shortName}" symbol=${entry.symbol} — marking unavailable`);
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
    const chartMeta = await fetchChartMeta(symbol);
    if (!chartMeta?.regularMarketPrice) {
      fundamentalsCache.set(cacheKey, { expiresAt: now + FUNDAMENTALS_CACHE_TTL_MS, data: null });
      return null;
    }

    if (!validateCompanyName(universeName, chartMeta.shortName || chartMeta.longName)) {
      console.log(`[equity-fundamentals] name mismatch: universe="${universeName}" yahoo="${chartMeta.shortName || chartMeta.longName}" symbol=${symbol}`);
      fundamentalsCache.set(cacheKey, { expiresAt: now + FUNDAMENTALS_CACHE_TTL_MS, data: null });
      return null;
    }

    const timeseries = await fetchFundamentalsTimeseries(symbol, [
      "quarterlyMarketCap",
      "trailingPeRatio",
      "quarterlyDilutedEPS",
      "annualDilutedEPS",
      "quarterlyTotalRevenue"
    ]);

    const fundamentals: EquityFundamentals = {
      symbol,
      name: chartMeta.shortName || chartMeta.longName || universeName,
      price: formatEquityPrice(chartMeta.regularMarketPrice, chartMeta.currency),
      change: formatEquityChange(chartMeta),
      marketCap: latestTimeseriesFmt(timeseries.quarterlyMarketCap) || null,
      peTrailing: latestTimeseriesFmt(timeseries.trailingPeRatio, true) || null,
      peForward: null,
      epsTrailing:
        latestTimeseriesCurrency(timeseries.annualDilutedEPS) ||
        latestTimeseriesCurrency(timeseries.quarterlyDilutedEPS) ||
        null,
      fiftyTwoWeekRange:
        chartMeta.fiftyTwoWeekLow != null && chartMeta.fiftyTwoWeekHigh != null
          ? `$${chartMeta.fiftyTwoWeekLow.toFixed(0)}–$${chartMeta.fiftyTwoWeekHigh.toFixed(0)}`
          : null,
      nextEarningsDate: null,
      epsEstimate: null,
      revenueEstimate: latestTimeseriesFmt(timeseries.quarterlyTotalRevenue) || null
    };

    if (fetchEarningsTrend) {
      try {
        const trendRes = await fetch(`${YF_SUMMARY_BASE}/${encodeURIComponent(symbol)}?modules=earningsTrend`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            Accept: "application/json"
          }
        });
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
          const currentQ = trend?.find((item) => item.period === "0q") ?? trend?.[0];
          if (currentQ) {
            const eps = currentQ.earningsEstimate?.avg;
            const revenue = currentQ.revenueEstimate?.avg;
            if (eps != null && eps !== 0) fundamentals.epsEstimate = `$${eps.toFixed(2)}`;
            if (revenue != null && revenue > 0) fundamentals.revenueEstimate = formatMarketCap(revenue);
          }
        }
      } catch {
        // Best effort only.
      }
    }

    fundamentalsCache.set(cacheKey, { expiresAt: now + FUNDAMENTALS_CACHE_TTL_MS, data: fundamentals });
    return fundamentals;
  } catch {
    fundamentalsCache.set(cacheKey, { expiresAt: now + FUNDAMENTALS_CACHE_TTL_MS, data: null });
    return null;
  }
}

async function fetchChartMeta(symbol: string): Promise<{
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  shortName?: string;
  longName?: string;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
} | null> {
  try {
    const response = await fetch(`${YF_CHART_BASE}/${encodeURIComponent(symbol)}?range=1d&interval=1d&includePrePost=false`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json"
      }
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            regularMarketChangePercent?: number;
            currency?: string;
            shortName?: string;
            longName?: string;
            fiftyTwoWeekHigh?: number;
            fiftyTwoWeekLow?: number;
          };
        }>;
      };
    };
    return payload.chart?.result?.[0]?.meta || null;
  } catch {
    return null;
  }
}

async function fetchFundamentalsTimeseries(symbol: string, types: string[]): Promise<Record<string, Array<{ reportedValue?: { raw?: number; fmt?: string } }>>> {
  const period1 = 1609459200;
  const period2 = Math.floor(Date.now() / 1000);
  const url = `${YF_TIMESERIES_BASE}/${encodeURIComponent(symbol)}?type=${types.join(",")}&period1=${period1}&period2=${period2}`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json"
      }
    });
    if (!response.ok) return {};
    const payload = (await response.json()) as {
      timeseries?: {
        result?: Array<Record<string, unknown>>;
      };
    };
    const out: Record<string, Array<{ reportedValue?: { raw?: number; fmt?: string } }>> = {};
    for (const item of payload.timeseries?.result || []) {
      for (const type of types) {
        if (Array.isArray(item[type])) {
          out[type] = item[type] as Array<{ reportedValue?: { raw?: number; fmt?: string } }>;
        }
      }
    }
    return out;
  } catch {
    return {};
  }
}

function latestTimeseriesFmt(
  entries: Array<{ reportedValue?: { raw?: number; fmt?: string } }> | undefined,
  appendX: boolean = false
): string | null {
  const latest = entries?.find((entry) => entry.reportedValue?.fmt);
  if (!latest?.reportedValue?.fmt) return null;
  return appendX ? `${latest.reportedValue.fmt}x` : latest.reportedValue.fmt;
}

function latestTimeseriesCurrency(
  entries: Array<{ reportedValue?: { raw?: number; fmt?: string } }> | undefined
): string | null {
  const latest = entries?.find((entry) => entry.reportedValue?.raw != null);
  if (latest?.reportedValue?.raw == null) return null;
  return `$${Number(latest.reportedValue.raw).toFixed(2)}`;
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

function validateCompanyName(universeName: string, yahooShortName: string | undefined): boolean {
  if (!yahooShortName) return true;
  const normalize = (value: string): string[] =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2);
  const universeTokens = new Set(normalize(universeName));
  return normalize(yahooShortName).some((token) => universeTokens.has(token));
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

function isMarketRoomListicle(text: string): boolean {
  return (
    /\b\d+\s+(?:best|top|most|worst|cheapest|undervalued|overvalued|high[- ]?dividend|growth|value|small[- ]?cap)\b.*\bstock/i.test(text) ||
    /\bstocks?\s+to\s+(buy|sell|watch|avoid|own)\b/i.test(text) ||
    /\b(best|top)\s+stocks?\s+(under|for|in|to)\b/i.test(text) ||
    /\b\d+\s+\w+\s+(etfs?|funds?|reits?)\s+to\s+(buy|own|watch)\b/i.test(text)
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
