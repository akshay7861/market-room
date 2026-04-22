import universe from "../equities/equityUniverse.json";

export type EquityUniverseEntry = {
  bbg: string;
  ric: string;
  symbol: string;
  name: string;
  region: string;
};

export type EquitySubjectClassification =
  | "single_company"
  | "etf_or_index"
  | "sector_or_basket"
  | "ambiguous_subject"
  | "unresolved";

export type EquityResolutionStatus = "resolved" | "ambiguous_subject" | "unresolved";

export type EquityResolutionConfidence = "high" | "medium" | "low";

export type EquitySubjectResolution = {
  status: EquityResolutionStatus;
  classification: EquitySubjectClassification;
  confidence: EquityResolutionConfidence;
  entry: EquityUniverseEntry | null;
  matchedText: string | null;
  score: number;
  candidateSymbols: string[];
};

type AliasKind = "exact" | "partial";
type SubjectMatchConfidence = "explicit_symbol" | "exact_name" | "partial_name";

type SubjectCandidate = {
  entry: EquityUniverseEntry;
  score: number;
  confidence: SubjectMatchConfidence;
  matchedText: string;
};

type RegionHint = {
  label: string;
  test: RegExp;
  matchesEntry: (entry: EquityUniverseEntry) => boolean;
};

const rawUniverse = universe as EquityUniverseEntry[];

const curatedEntries: EquityUniverseEntry[] = [
  { symbol: "TAN", bbg: "TAN US", ric: "TAN", name: "Invesco Solar ETF", region: "US" },
  { symbol: "ICLN", bbg: "ICLN US", ric: "ICLN", name: "iShares Global Clean Energy ETF", region: "US" },
  { symbol: "QCLN", bbg: "QCLN US", ric: "QCLN", name: "First Trust Nasdaq Clean Edge Green Energy ETF", region: "US" },
  { symbol: "XLE", bbg: "XLE US", ric: "XLE", name: "Energy Select Sector SPDR Fund", region: "US" },
  { symbol: "XOP", bbg: "XOP US", ric: "XOP", name: "SPDR S&P Oil & Gas Exploration & Production ETF", region: "US" },
  { symbol: "OIH", bbg: "OIH US", ric: "OIH", name: "VanEck Oil Services ETF", region: "US" },
  { symbol: "SHEL", bbg: "SHEL US", ric: "SHEL", name: "Shell PLC ADR", region: "US" },
  { symbol: "TTE", bbg: "TTE US", ric: "TTE", name: "TotalEnergies SE ADR", region: "US" },
  { symbol: "BSVN", bbg: "BSVN US", ric: "BSVN.O", name: "Bank7 Corp", region: "US" }
];

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

const AMBIGUOUS_SUBJECT_ALIASES = new Set([
  "dow",
  "nasdaq",
  "nyse",
  "tsx",
  "occ",
  "td",
  "bnp",
  "jd",
  "a",
  "reliance"
]);

const SUBJECT_SYMBOL_EXCLUSIONS = new Set([
  "AGM",
  "EGM",
  "JD",
  "TD",
  "BNP",
  "OCC",
  "NYSE",
  "NASDAQ",
  "TSX",
  "DOW",
  "WTI",
  "DXY",
  "CPI",
  "PCE",
  "GDP",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "FX",
  "AI"
]);

const KNOWN_COMPANY_ALIASES: Record<string, string[]> = {
  "AMZN": ["amazon"],
  "NFLX": ["netflix"],
  "DAL": ["delta"],
  "META": ["meta", "meta platforms", "facebook"],
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

const REGION_HINTS: RegionHint[] = [
  {
    label: "india",
    test: /\b(india|indian|nse|bse)\b/i,
    matchesEntry: (entry) => /\.ns$|\.bo$/i.test(entry.symbol) || /\bIN\b/i.test(entry.bbg) || /\bIndia\b/i.test(entry.region)
  },
  {
    label: "uk",
    test: /\b(uk|united kingdom|london|lse)\b/i,
    matchesEntry: (entry) => entry.region === "UK" || /\.L$/i.test(entry.symbol) || /\.L$/i.test(entry.ric)
  },
  {
    label: "us",
    test: /\b(us|usa|united states|nyse|nasdaq|amex)\b/i,
    matchesEntry: (entry) => entry.region === "US"
  },
  {
    label: "canada",
    test: /\b(canada|canadian|tsx|toronto)\b/i,
    matchesEntry: (entry) => entry.region === "Canada" || /\.TO$/i.test(entry.symbol) || /\.TO$/i.test(entry.ric)
  },
  {
    label: "europe",
    test: /\b(europe|european|euronext|frankfurt|paris|milan|madrid)\b/i,
    matchesEntry: (entry) => entry.region === "Europe"
  }
];

const ETF_OR_INDEX_PATTERN =
  /\b(etf|fund|index|indices|spdr|ishares|invesco|trust|qqq|spy|iwm|xlf|xle|vxx|hyg|jkn|tlt|ief|shy)\b/i;
const SECTOR_OR_BASKET_PATTERN =
  /\b(sector|industry|basket|watchlist|theme|themes|stocks?|companies|names|tickers|compare|comparison|versus|vs)\b/i;

export const equityUniverse = dedupeUniverse([...curatedEntries, ...rawUniverse]);

export function resolveEquitySubject(text: string): EquitySubjectResolution {
  const explicitSymbols = extractSubjectSymbols(text);
  const normalizedText = normalizeForCompanyMatch(text);
  const regionHints = REGION_HINTS.filter((hint) => hint.test.test(text));

  if (explicitSymbols.size > 1 || /\b(vs|versus|compare|comparison)\b/i.test(text)) {
    return {
      status: "unresolved",
      classification: "sector_or_basket",
      confidence: "low",
      entry: null,
      matchedText: null,
      score: 0,
      candidateSymbols: [...explicitSymbols]
    };
  }

  const candidates: SubjectCandidate[] = [];

  for (const entry of equityUniverse) {
    const symbol = entry.symbol.toUpperCase();
    const bbgSymbol = entry.bbg.split(" ")[0]?.toUpperCase() || "";
    const aliases = companyAliases(entry);
    let regionBias = 0;
    if (regionHints.length > 0) {
      regionBias = regionHints.some((hint) => hint.matchesEntry(entry)) ? 35 : -12;
    }

    if (explicitSymbols.has(symbol) || (bbgSymbol && explicitSymbols.has(bbgSymbol))) {
      candidates.push({
        entry,
        score: 240 + regionBias,
        confidence: "explicit_symbol",
        matchedText: explicitSymbols.has(symbol) ? symbol : bbgSymbol
      });
      continue;
    }

    const exactAlias = aliases.find((alias) =>
      alias.kind === "exact" &&
      !isAmbiguousSubjectAlias(alias.value, normalizedText) &&
      normalizedText.includes(` ${alias.value} `)
    );
    if (exactAlias) {
      candidates.push({
        entry,
        score: 180 + exactAlias.value.split(" ").length * 12 + regionBias,
        confidence: "exact_name",
        matchedText: exactAlias.value
      });
      continue;
    }

    const partialAlias = aliases.find((alias) =>
      alias.kind === "partial" &&
      !isAmbiguousSubjectAlias(alias.value, normalizedText) &&
      normalizedText.includes(` ${alias.value} `)
    );
    if (partialAlias) {
      candidates.push({
        entry,
        score: 118 + partialAlias.value.split(" ").length * 8 + regionBias,
        confidence: "partial_name",
        matchedText: partialAlias.value
      });
    }
  }

  if (candidates.length === 0) {
    return {
      status: "unresolved",
      classification: inferUnresolvedClassification(text),
      confidence: "low",
      entry: null,
      matchedText: null,
      score: 0,
      candidateSymbols: []
    };
  }

  candidates.sort(compareSubjectMatches);
  const best = candidates[0];
  const second = candidates[1];

  if (!best || best.score < 100) {
    return {
      status: "unresolved",
      classification: inferUnresolvedClassification(text),
      confidence: "low",
      entry: null,
      matchedText: null,
      score: best?.score || 0,
      candidateSymbols: candidates.slice(0, 3).map((candidate) => candidate.entry.symbol)
    };
  }

  const confidence = confidenceLabel(best.confidence, best.score);
  const tooCloseToSecond = Boolean(
    second &&
      second.score >= 100 &&
      Math.abs(best.score - second.score) <= 15 &&
      normalizeCompanyAlias(best.entry.name) !== normalizeCompanyAlias(second.entry.name)
  );

  if (tooCloseToSecond || (confidence === "low" && best.confidence === "partial_name")) {
    return {
      status: "ambiguous_subject",
      classification: "ambiguous_subject",
      confidence: "low",
      entry: null,
      matchedText: best.matchedText,
      score: best.score,
      candidateSymbols: candidates.slice(0, 3).map((candidate) => candidate.entry.symbol)
    };
  }

  const classification = classifyResolvedSubject(text, best.entry);
  if (classification === "sector_or_basket") {
    return {
      status: "unresolved",
      classification,
      confidence: "low",
      entry: null,
      matchedText: null,
      score: 0,
      candidateSymbols: []
    };
  }

  return {
    status: "resolved",
    classification,
    confidence,
    entry: best.entry,
    matchedText: best.matchedText,
    score: best.score,
    candidateSymbols: [best.entry.symbol]
  };
}

function classifyResolvedSubject(text: string, entry: EquityUniverseEntry): EquitySubjectClassification {
  if (isEtfOrIndexEntry(entry) || ETF_OR_INDEX_PATTERN.test(text)) {
    return "etf_or_index";
  }
  return "single_company";
}

function inferUnresolvedClassification(text: string): EquitySubjectClassification {
  if (ETF_OR_INDEX_PATTERN.test(text)) return "etf_or_index";
  if (SECTOR_OR_BASKET_PATTERN.test(text)) return "sector_or_basket";
  return "unresolved";
}

function confidenceLabel(confidence: SubjectMatchConfidence, score: number): EquityResolutionConfidence {
  if (confidence === "explicit_symbol" || score >= 210) return "high";
  if (confidence === "exact_name" || score >= 150) return "medium";
  return "low";
}

function compareSubjectMatches(left: SubjectCandidate, right: SubjectCandidate): number {
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

function companyAliases(entry: EquityUniverseEntry): Array<{ value: string; kind: AliasKind }> {
  const aliases = new Map<string, AliasKind>();
  const add = (value: string, kind: AliasKind) => {
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

function isAmbiguousSubjectAlias(alias: string, normalizedText: string): boolean {
  if (!AMBIGUOUS_SUBJECT_ALIASES.has(alias)) {
    return false;
  }

  return !normalizedText.includes(` ${alias} inc `) && !normalizedText.includes(` ${alias} corp `);
}

function extractSubjectSymbols(text: string): Set<string> {
  const explicitSymbols = extractExplicitSymbols(text);
  const allowed = new Set<string>();

  for (const symbol of explicitSymbols) {
    if (SUBJECT_SYMBOL_EXCLUSIONS.has(symbol)) continue;
    if (symbol.length === 1 && !hasStrongTickerContext(text, symbol)) continue;
    if (isLikelyBrokerOrPersonContext(text, symbol)) continue;
    allowed.add(symbol);
  }

  return allowed;
}

function extractExplicitSymbols(question: string): Set<string> {
  const matches = question.match(/\b[A-Z]{1,5}(?:\.[A-Z]{1,3})?\b/g) || [];
  return new Set(matches.map((match) => match.toUpperCase()));
}

function hasStrongTickerContext(text: string, symbol: string): boolean {
  const escaped = escapeRegex(symbol);
  return (
    new RegExp(`\\(${escaped}\\)`).test(text) ||
    new RegExp(`\\b(?:NYSE|NASDAQ|Nasdaq|NasdaqGS|NasdaqCM|AMEX|LSE|TSX|ASX|HKEX|TSE|NSE|BSE)\\s*:\\s*${escaped}\\b`).test(text) ||
    new RegExp(`\\$${escaped}\\b`).test(text)
  );
}

function isLikelyBrokerOrPersonContext(text: string, symbol: string): boolean {
  const escaped = escapeRegex(symbol);
  const brokerOrSourcePattern = new RegExp(
    `\\b${escaped}\\b\\s+(?:cowen|securities|capital|markets|analyst|analysts|research|upgrade|downgrade|raises?|cuts?|initiates?|reaffirms?)`,
    "i"
  );

  return brokerOrSourcePattern.test(text);
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

function isEtfOrIndexEntry(entry: EquityUniverseEntry): boolean {
  return /\b(etf|fund|trust|index|spdr|ishares|invesco)\b/i.test(entry.name);
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
