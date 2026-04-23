/**
 * Headline Analysis Service
 *
 * Pure-heuristic (zero LLM calls) computation of HeadlineAnalysis for agent routing.
 *
 * Given the top 3 candidate headlines for an agent, this service:
 *   1. Classifies each headline by type, signal strength, and sector relevance
 *   2. Detects whether the headline represents new information for this agent
 *   3. Extracts a best-effort primary transmission mechanism
 *   4. Picks the single best headline from the 3 candidates
 *   5. Recommends an action (new_post / update_existing / comment_on_other / stay_silent)
 *
 * The returned HeadlineAnalysis object is stored as headline_analysis_json in decision_event_log.
 * Its field names are deliberately flat and snake_case so the JSON can be promoted into a
 * structured SQL table without refactoring: each key maps directly to a column.
 */
import type { Agent, AgentMessage, SnapshotHeadline, Thesis } from "@market-room/shared";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type HeadlineType =
  | "macro_release"
  | "regulatory"
  | "company_news"
  | "policy"
  | "commodity_specific"
  | "market_structure"
  | "geopolitical"
  | "other";

export type HeadlineSignalStrength = "high" | "medium" | "low" | "noise";

/**
 * The flat shape is intentional — every field maps 1:1 to a future SQL column.
 * Arrays are serialised to JSON strings when stored in headline_analysis_json.
 */
export type HeadlineAnalysis = {
  headline_id: string;               // deterministic hash(title|source|publishedAt)
  agent_id: string;
  headline_title: string;
  headline_type: HeadlineType;
  direct_relevance_score: number;    // 1–10: how relevant to this agent's sector
  indirect_relevance_score: number;  // 1–10: cross-asset / cross-sector spillover
  market_signal_strength: HeadlineSignalStrength;
  is_new_information: boolean;       // false when agent already covers this topic
  is_cross_asset_relevant: boolean;  // headline touches multiple sector families
  primary_mechanism: string;         // transmission chain (empty string = unclear)
  affected_assets: string[];         // instrument keys: "wti", "us10y", etc.
  what_changed: string;              // what the headline says is different from before
  linked_existing_thesis_id: string | null;
  recommended_action: "new_post" | "update_existing" | "comment_on_other" | "stay_silent";
  comment_purpose: string | null;    // a CommentPurpose value when action is comment_on_other
  historical_analog_candidate: string | null;
};

// ---------------------------------------------------------------------------
// Noise patterns — headlines matching any of these are always "noise"
// ---------------------------------------------------------------------------

const NOISE_PATTERNS: RegExp[] = [
  /markets?\s+(?:remain|are|stay|look)\s+(?:broadly|cautiously|generally|relatively)/i,
  /broadly\s+(?:similar|unchanged|stable|supportive|positive|negative|flat)/i,
  /(?:risk|sentiment)\s+(?:remains?|stays?|tone\s+is)\s+(?:on|off|cautious|mixed|uncertain)/i,
  /investors?\s+(?:await|watch|eye|monitor)\s+/i,
  /equities?\s+(?:open|trade|drift)\s+(?:higher|lower)\s+as\s+investors?/i,
  /what\s+to\s+watch\s+(?:this\s+)?week/i,
  /week\s+ahead[\s:]/i,
  /markets?\s+(?:digest|absorb|weigh)/i,
  /mixed\s+(?:signals?|picture|session)/i,
  /no\s+major\s+(?:moves?|changes?|catalyst)/i
];

// ---------------------------------------------------------------------------
// Deterministic headline ID (no UUID — stable across runs for same headline)
// ---------------------------------------------------------------------------

export function headlineId(headline: SnapshotHeadline): string {
  const raw = `${headline.title}|${headline.source}|${headline.publishedAt || ""}`;
  // djb2-style hash → 8 hex chars
  let h = 5381;
  for (let i = 0; i < raw.length; i++) {
    h = Math.imul((h << 5) + h, 1) ^ raw.charCodeAt(i);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Headline type classification
// ---------------------------------------------------------------------------

// IMPORTANT: order matters — more-specific patterns must precede general ones.
// "regulatory" comes before "policy" so "Fed exempts banks from SLR" → regulatory, not policy.
// "macro_release" before "commodity_specific" so "CPI beats" → macro, not commodity.
const HEADLINE_TYPE_PATTERNS: Array<{ type: HeadlineType; pattern: RegExp }> = [
  { type: "regulatory",       pattern: /\b(?:sec|cftc|basel|slr|supplementary\s+leverage|exemption|capital\s+requirement|stress\s+test|dodd.frank|regulation|regulatory|compliance)\b/i },
  { type: "macro_release",    pattern: /\b(?:cpi|pce|ppi|gdp|nfp|payrolls?|unemployment|jobs\s+report|retail\s+sales?|ism|pmi|inflation|consumer\s+price|producer\s+price|jobless\s+claims?|trade\s+balance|current\s+account)\b/i },
  { type: "policy",           pattern: /\b(?:fomc|fed|federal\s+reserve|powell|boe|ecb|boj|rba|pboc|central\s+bank|rate\s+decision|rate\s+cut|rate\s+hike|quantitative|qe|qt)\b/i },
  { type: "commodity_specific", pattern: /\b(?:opec|crude|brent|wti|barrel|lng|natural\s+gas|gasoline|oil\s+(?:price|market|supply|demand)|gold|silver|copper|alumin(?:i|)um|iron\s+ore|wheat|corn|soy|bcf|storage\s+draw)\b/i },
  { type: "geopolitical",     pattern: /\b(?:sanction|geopolit|war|conflict|embargo|tariff|trade\s+war|nato|ukraine|russia|iran|china\s+(?:taiwan|military)|escalat)\b/i },
  { type: "market_structure", pattern: /\b(?:etf\s+flow|futures\s+rollover|margin\s+call|circuit\s+breaker|volatility\s+(?:regime|index|spike)|options?\s+expir|gamma|vix|squeeze|short\s+covering)\b/i },
  { type: "company_news",     pattern: /\b(?:earnings|revenue|guidance|beats?\s+estimates?|misses?\s+estimates?|buyback|dividend|merger|acquisition|ipo|layoffs?|restructur|upgrade|downgrade|rating|price\s+target|target\s+(?:raise|cut)|initiates?|reiterates?|overweight|underweight|neutral)\b/i },
];

function classifyHeadlineType(title: string): HeadlineType {
  for (const { type, pattern } of HEADLINE_TYPE_PATTERNS) {
    if (pattern.test(title)) return type;
  }
  return "other";
}

// ---------------------------------------------------------------------------
// Signal strength scoring
// ---------------------------------------------------------------------------

const HIGH_SIGNAL_NUMBER = /\b\d+(?:[.,]\d+)?(?:\s*%|bps|k|bn|b\b|bbl|mmb|\/oz)?\b/;
const SPECIFIC_ENTITY = /\b(?:fed|ecb|boj|opec|treasury|sec|cftc|fomc|pboc|imf|world\s+bank)\b/i;
const MECHANISM_WORDS = /\b(?:exemption|override|cut|hike|ban|sanction|mandate|suspend|restrict|approve|reject|impose|lift|extend|waive|beats?|misses?|surges?|plunges?|spikes?|draw|surplus|deficit)\b/i;
const VAGUE_WORDS = /\b(?:could|may|might|unclear|cautious|broadly|mixed|uncertain|await|watch|monitor|consider|possible)\b/i;

function scoreSignalStrength(title: string): HeadlineSignalStrength {
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(title)) return "noise";
  }
  const hasNumber = HIGH_SIGNAL_NUMBER.test(title);
  const hasEntity = SPECIFIC_ENTITY.test(title);
  const hasMechanism = MECHANISM_WORDS.test(title);
  const isVague = VAGUE_WORDS.test(title);

  if ((hasNumber || hasMechanism) && (hasEntity || !isVague)) return "high";
  if (hasEntity || hasMechanism) return "medium";
  if (isVague) return "low";
  return "low";
}

// ---------------------------------------------------------------------------
// Sector relevance scoring
// ---------------------------------------------------------------------------

const SECTOR_KEYWORDS: Record<string, string[]> = {
  Macro:            ["fed", "inflation", "cpi", "pce", "gdp", "jobs", "payroll", "growth", "retail", "consumer", "policy", "yield", "spending"],
  Rates:            ["yield", "treasury", "bond", "curve", "breakeven", "auction", "fed", "duration", "slr", "leverage", "bps"],
  FX:               ["dollar", "fx", "currency", "euro", "yen", "sterling", "carry", "em", "funding", "dxy", "exchange"],
  Equities:         ["stock", "equity", "earnings", "ai", "semiconductor", "bank", "sector", "breadth", "s&p", "nasdaq", "valuation", "upgrade", "downgrade", "rating", "price target", "analyst", "target cut", "target raise", "overweight", "underweight", "neutral"],
  Commodities:      ["oil", "wti", "brent", "crude", "barrel", "gas", "gold", "copper", "opec", "metal", "inventory", "supply", "demand", "bcf", "storage", "draw", "futures", "lng", "wheat", "corn"],
  "Risk/Sentiment": ["risk", "volatility", "credit", "spread", "fragile", "positioning", "selloff", "bitcoin", "vix", "default"]
};

const ALL_SECTOR_FAMILIES = Object.values(SECTOR_KEYWORDS);

function headlineText(headline: SnapshotHeadline): string {
  return `${headline.title} ${headline.description || ""}`.toLowerCase();
}

function scoreDirectRelevance(headline: SnapshotHeadline, sectorKeywords: string[]): number {
  const text = headlineText(headline);
  const matches = sectorKeywords.filter((kw) => text.includes(kw)).length;
  const baseScore = matches * 2 + (matches > 0 ? 1 : 0);
  const isEquitiesFamily = sectorKeywords.includes("equity") && sectorKeywords.includes("stock");
  if (!isEquitiesFamily) {
    return Math.min(10, baseScore);
  }

  const analystAction = /\b(?:upgrade|downgrade|rating|price\s+target|target\s+(?:raise|cut)|initiates?|reiterates?|overweight|underweight|neutral|buy|sell)\b/i.test(text);
  const hasCompanySpecificity =
    (headline.entities?.length || 0) > 0 ||
    /\b(?:inc|corp|ltd|plc|group|holdings|class\s+[ab]|adr|common\s+stock|shares?)\b/i.test(text) ||
    /\b[A-Z]{1,5}\b(?=\s*(?:shares?|stock|rating|price target|target))/i.test(headline.title);
  const adjustedScore = baseScore + (analystAction && hasCompanySpecificity ? 3 : 0);
  return Math.min(10, adjustedScore);
}

function scoreIndirectRelevance(headline: SnapshotHeadline, sectorKeywords: string[]): number {
  const text = headlineText(headline);
  let otherFamilyMatches = 0;
  for (const family of ALL_SECTOR_FAMILIES) {
    if (family === sectorKeywords) continue;
    if (family.some((kw) => text.includes(kw))) otherFamilyMatches++;
  }
  return Math.min(10, otherFamilyMatches * 2);
}

function isCrossAssetRelevant(headline: SnapshotHeadline): boolean {
  const text = headlineText(headline);
  let familiesMatched = 0;
  for (const family of ALL_SECTOR_FAMILIES) {
    if (family.some((kw) => text.includes(kw))) familiesMatched++;
    if (familiesMatched >= 2) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Mechanism extraction (best-effort, empty string = unclear)
// ---------------------------------------------------------------------------

type MechanismPattern = { pattern: RegExp; mechanism: string };

const MECHANISM_PATTERNS: MechanismPattern[] = [
  {
    pattern: /slr|supplementary\s+leverage/i,
    mechanism: "SLR exemption expands bank balance-sheet capacity → Treasury demand → yield curve flattening"
  },
  {
    pattern: /opec.*cut|cut.*opec|supply\s+cut/i,
    mechanism: "OPEC supply cut → WTI/Brent spread compression → energy sector margin expansion"
  },
  {
    pattern: /opec.*increas|output\s+increas|production\s+increas/i,
    mechanism: "OPEC supply increase → WTI/Brent spread widening → energy sector margin compression"
  },
  {
    pattern: /cpi|consumer\s+price\s+index/i,
    mechanism: "CPI print → real yield repricing → Fed path recalibration → duration positioning"
  },
  {
    pattern: /pce/i,
    mechanism: "PCE print → Fed's preferred inflation gauge repricing → rate expectations shift → risk-asset discount rate"
  },
  {
    pattern: /payroll|nfp|jobs\s+report|employment/i,
    mechanism: "Labor market print → Fed dual-mandate assessment → rate path forward guidance → curve shape"
  },
  {
    pattern: /fed.*(?:cut|hike|hold|pause|pivot)|(?:cut|hike|hold|pause|pivot).*(?:rate|fed)/i,
    mechanism: "Policy rate signal → front-end Treasury repricing → FX carry shifts → equity discount rate"
  },
  {
    pattern: /tariff|trade\s+war|trade\s+barrier/i,
    mechanism: "Tariff shock → import cost pass-through → consumer price inflation → real income compression → demand destruction"
  },
  {
    pattern: /sanction/i,
    mechanism: "Sanctions → energy/commodity supply disruption → price spike → inflationary second-round effects"
  },
  {
    pattern: /gold/i,
    mechanism: "Gold move → real rate signal (inverse of TIPS yield) → dollar direction → safe-haven demand"
  },
  {
    pattern: /copper/i,
    mechanism: "Copper move → global growth proxy → industrial demand signal → EM capex cycle indicator"
  },
  {
    pattern: /storage\s+draw|gas\s+draw|\bbcf\b/i,
    mechanism: "Natural gas storage draw vs expectations → supply deficit signal → spot premium → utility hedge demand → energy sector earnings"
  },
  {
    pattern: /natural\s+gas|lng/i,
    mechanism: "Natural gas print → storage/supply dynamics → utility margin → energy sector earnings"
  },
  {
    pattern: /yield\s+curve|curve\s+(?:inver|steep|flat)/i,
    mechanism: "Curve shape change → credit conditions signal → recession/expansion probability pricing → bank NIM impact"
  },
  {
    pattern: /treasury\s+auction|bond\s+auction/i,
    mechanism: "Auction demand → foreign buyer appetite → supply-demand balance in long end → yield term premium"
  },
  {
    pattern: /dollar|dxy/i,
    mechanism: "Dollar move → EM debt burden → commodity price translation → US export competitiveness → FX carry unwind risk"
  },
  {
    pattern: /vix|volatility\s+(?:spike|surge|jump)/i,
    mechanism: "Vol spike → risk-parity deleveraging → cross-asset correlation breakdown → liquidity hoarding"
  },
  {
    pattern: /credit\s+spread|high\s+yield|hy\s+spread/i,
    mechanism: "Credit spread move → financing cost for leveraged companies → capex cycle signal → default probability repricing"
  }
];

function extractPrimaryMechanism(headline: SnapshotHeadline, headlineType: HeadlineType): string {
  const text = `${headline.title} ${headline.description || ""}`;
  for (const { pattern, mechanism } of MECHANISM_PATTERNS) {
    if (pattern.test(text)) return mechanism;
  }
  // If type is other → no forced mechanism
  if (headlineType === "other") return "";
  // Generic fallback by type (better than empty for known types)
  const fallbacks: Partial<Record<HeadlineType, string>> = {
    macro_release: "Data release → market expectations update → rate path repricing",
    policy:        "Policy signal → forward guidance repricing → asset allocation shift",
    regulatory:    "Regulatory change → compliance cost / capacity impact → sector positioning",
    commodity_specific: "Commodity supply/demand shift → price transmission → sector margins",
    geopolitical:  "Geopolitical shock → risk premium expansion → commodity/currency safe-haven flows",
    market_structure: "Market structure change → positioning / liquidity impact → short-term vol"
  };
  return fallbacks[headlineType] || "";
}

// ---------------------------------------------------------------------------
// Asset detection
// ---------------------------------------------------------------------------

const ASSET_DETECTION: Array<{ pattern: RegExp; keys: string[] }> = [
  { pattern: /\b(?:oil|wti|crude|brent|barrel|opec)\b/i, keys: ["wti", "brent"] },
  { pattern: /\b(?:natural\s+gas|lng|nat\s*gas|bcf|storage\s+draw)\b/i, keys: ["natural_gas"] },
  { pattern: /\b(?:gold|bullion|xau)\b/i,                 keys: ["gold"] },
  { pattern: /\b(?:copper|hg)\b/i,                        keys: ["copper"] },
  { pattern: /\b(?:yield|treasury|bond|note|t-bill)\b/i,  keys: ["us10y"] },
  { pattern: /\b(?:dollar|dxy|usd)\b/i,                   keys: ["dxy"] },
  { pattern: /\b(?:stock|equity|s&p|spx|nasdaq|ndx)\b/i,  keys: ["sp500", "nasdaq"] },
];

function detectAffectedAssets(title: string): string[] {
  const result: string[] = [];
  for (const { pattern, keys } of ASSET_DETECTION) {
    if (pattern.test(title)) {
      for (const key of keys) {
        if (!result.includes(key)) result.push(key);
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// "What changed" extraction
// ---------------------------------------------------------------------------

function extractWhatChanged(title: string): string {
  // Remove source prefixes and clean up
  const cleaned = title
    .replace(/^[A-Z\s]+:\s+/, "")     // strip "REUTERS: " etc.
    .replace(/\s*\([^)]+\)\s*$/, ""); // strip trailing "(source)"
  return cleaned;
}

// ---------------------------------------------------------------------------
// isNewInformation — multi-signal combination
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  const STOP_WORDS = new Set(["a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might",
    "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at",
    "by", "from", "as", "up", "about", "into", "through", "after", "over", "under", "again",
    "further", "then", "once", "and", "but", "or", "so", "yet", "nor", "not", "its", "it", "this",
    "that", "these", "those", "we", "they", "he", "she", "our", "their", "his", "her", "your"]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s%]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Mechanism families for overlap detection
const MECHANISM_FAMILIES: Record<string, string[]> = {
  yield_pressure:   ["yield", "treasury", "bond", "rate", "bps", "duration"],
  inflation_channel: ["cpi", "pce", "inflation", "price", "consumer"],
  supply_cut:       ["cut", "reduction", "restrict", "curtail", "suspend"],
  supply_increase:  ["increase", "expand", "add", "restore", "resume"],
  safe_haven:       ["gold", "yen", "franc", "safety", "refuge"],
  dollar_move:      ["dollar", "dxy", "usd", "fx", "currency"],
  equity_driver:    ["earnings", "valuation", "multiple", "stock", "equity"],
  credit_stress:    ["spread", "credit", "default", "stress", "leverage"]
};

function detectMechanismFamily(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [family, keywords] of Object.entries(MECHANISM_FAMILIES)) {
    if (keywords.some((kw) => lower.includes(kw))) return family;
  }
  return null;
}

function checkIsNewInformation(
  headline: SnapshotHeadline,
  recentPosts: AgentMessage[],
  openTheses: Thesis[]
): boolean {
  // Use title + description for a richer token set when description is available
  const combinedText = `${headline.title} ${headline.description || ""}`;
  const headlineTokens = tokenize(combinedText);
  const headlineAssets = detectAffectedAssets(headline.title);
  const headlineMechFamily = detectMechanismFamily(combinedText);

  // --- Signal 0: Direct catalyst prefix match (catches repeated FRED/official data headlines) ---
  // FRED headlines like "Nonfarm payrolls latest official print: +178 jobs..." have generic tokens
  // that Jaccard misses. A substring match on the first 35 chars catches exact repeated data points.
  const titlePrefix = headline.title.slice(0, 35).toLowerCase().trim();
  if (titlePrefix.length >= 25) {
    for (const post of recentPosts) {
      const postCatalyst = (post.catalyst || "").toLowerCase();
      const postTitle = (post.title || "").toLowerCase();
      if (postCatalyst.includes(titlePrefix) || postTitle.includes(titlePrefix)) {
        return false;
      }
    }
  }

  // --- Signal 1: Title/token Jaccard similarity against recent post titles and catalysts ---
  for (const post of recentPosts.slice(0, 8)) {
    const postText = `${post.title || ""} ${post.catalyst || ""}`;
    if (jaccardSimilarity(headlineTokens, tokenize(postText)) >= 0.5) return false;
  }

  // --- Signal 2: Thesis/topic overlap ---
  // If the headline type + mechanism already maps to agent's recent topicPrimary → not new
  const recentTopics = new Set(recentPosts.slice(0, 2).map((p) => p.thesisTopicPrimary).filter(Boolean));
  const headlineType = classifyHeadlineType(headline.title);
  const topicFamilyMap: Partial<Record<HeadlineType, string[]>> = {
    macro_release:    ["inflation_regime", "labor_growth", "policy_path"],
    policy:           ["policy_path", "real_yields", "curve_shape"],
    regulatory:       ["treasury_auctions", "market_fragility"],
    commodity_specific: ["oil_structure", "gas_power", "metals_growth", "gold_real_rates"],
    geopolitical:     ["oil_structure", "market_fragility", "crowding_positioning"],
    market_structure: ["market_fragility", "credit_stress", "crowding_positioning"]
  };
  const associatedTopics = topicFamilyMap[headlineType] || [];
  if (associatedTopics.some((t) => recentTopics.has(t))) return false;

  // --- Signal 3: Same asset set + same mechanism family as an open thesis ---
  if (headlineAssets.length > 0 && headlineMechFamily) {
    for (const thesis of openTheses) {
      if (!["open", "developing", "waiting_for_data", "reopened"].includes(thesis.status)) continue;
      const thesisTokens = tokenize(`${thesis.canonicalClaim} ${thesis.title}`);
      const thesisMechFamily = detectMechanismFamily(`${thesis.canonicalClaim} ${thesis.topicPrimary}`);
      const thesisAssets = detectAffectedAssets(thesis.canonicalClaim);
      const sameAssetOverlap = headlineAssets.filter((a) => thesisAssets.includes(a)).length;
      if (sameAssetOverlap >= Math.min(2, headlineAssets.length) && headlineMechFamily === thesisMechFamily) {
        return false; // Not new — already covered by open thesis on same mechanism + asset
      }
      // Also check direct token similarity to thesis claim
      if (jaccardSimilarity(headlineTokens, thesisTokens) >= 0.45) return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Historical analog hints (best-effort string, null if unclear)
// ---------------------------------------------------------------------------

const ANALOG_PATTERNS: Array<{ pattern: RegExp; analog: string }> = [
  { pattern: /slr\s+exemption/i,       analog: "2021 Fed SLR exemption expiry → Treasury market selloff → bank positioning unwind" },
  { pattern: /opec.*cut|supply\s+cut/i, analog: "2022 OPEC+ surprise cut → $10/bbl WTI spike over 3 sessions" },
  { pattern: /tariff/i,                analog: "2018–2019 US-China tariff escalation → EM currency stress → commodity demand destruction" },
  { pattern: /yield\s+curve.*inver/i,   analog: "2019 US 2s10s inversion → 18-month lead before recession onset" },
  { pattern: /cpi.*above|hot.*cpi/i,    analog: "2022 June CPI print at 9.1% → 75bps FOMC hike, risk-off repricing" },
  { pattern: /vix\s*(?:above|spike|surge)/i, analog: "2018 Volmageddon → short-vol ETF collapse → correlation breakdown across asset classes" },
  { pattern: /treasury\s+auction.*weak/i, analog: "2023 30Y auction tail → 20bps yield spike in session, long-end vol compression" },
];

function findHistoricalAnalog(title: string): string | null {
  for (const { pattern, analog } of ANALOG_PATTERNS) {
    if (pattern.test(title)) return analog;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Action recommendation
// ---------------------------------------------------------------------------

function recommendAction(
  analysis: Pick<HeadlineAnalysis,
    "market_signal_strength" | "direct_relevance_score" | "primary_mechanism" |
    "is_new_information" | "is_cross_asset_relevant" | "headline_type">,
  matchedThesisId: string | null,
  options?: {
    singleCompanyOwned?: boolean;
    broadCompanyRoundup?: boolean;
  }
): { recommended_action: HeadlineAnalysis["recommended_action"]; comment_purpose: string | null } {
  // Always silence noise
  if (analysis.market_signal_strength === "noise") {
    return { recommended_action: "stay_silent", comment_purpose: null };
  }

  const companyOwnedHeadline =
    analysis.headline_type === "company_news" &&
    analysis.direct_relevance_score >= 5 &&
    analysis.is_new_information;
  const singleCompanyOwned = Boolean(options?.singleCompanyOwned);
  const broadCompanyRoundup = Boolean(options?.broadCompanyRoundup);

  // Low sector relevance + no thesis to update → silence
  if (analysis.direct_relevance_score < 3 && !matchedThesisId) {
    return { recommended_action: "stay_silent", comment_purpose: null };
  }

  // Matched thesis should remain the primary path for company catalysts so we
  // refresh existing views instead of duplicating top-level posts.
  if (matchedThesisId) {
    return { recommended_action: "update_existing", comment_purpose: null };
  }

  // Company-owned headlines should default to a visible top-level post when they
  // are clearly new and relevant enough to matter.
  if (companyOwnedHeadline && singleCompanyOwned) {
    return { recommended_action: "new_post", comment_purpose: null };
  }
  if (companyOwnedHeadline && broadCompanyRoundup) {
    return analysis.is_cross_asset_relevant
      ? { recommended_action: "comment_on_other", comment_purpose: "add_cross_asset_spillover" }
      : { recommended_action: "stay_silent", comment_purpose: null };
  }

  // Unclear mechanism + not high relevance → do not force a new post
  if (analysis.primary_mechanism === "" && analysis.direct_relevance_score < 7) {
    // Cross-asset relevant → comment; otherwise silence
    if (analysis.is_cross_asset_relevant) {
      return { recommended_action: "comment_on_other", comment_purpose: "add_cross_asset_spillover" };
    }
    return { recommended_action: "stay_silent", comment_purpose: null };
  }

  // Not new information + no thesis to update → silence (or comment on existing thread)
  if (!analysis.is_new_information && !matchedThesisId) {
    if (analysis.direct_relevance_score >= 4) {
      return { recommended_action: "comment_on_other", comment_purpose: "confirm_existing_thesis" };
    }
    return { recommended_action: "stay_silent", comment_purpose: null };
  }

  // High or medium signal + any sector match + known mechanism → new post.
  // Threshold is score ≥ 3 (= 1 keyword match) because sector keywords are specific enough:
  // a single match of "slr", "bcf", "gold", "brent" in the headline IS sufficient evidence
  // that this is the agent's domain. Requiring ≥ 6 would silence 80%+ of valid headlines.
  if (
    (analysis.market_signal_strength === "high" || analysis.market_signal_strength === "medium") &&
    analysis.direct_relevance_score >= 3 &&
    analysis.primary_mechanism !== ""
  ) {
    return { recommended_action: "new_post", comment_purpose: null };
  }

  // Cross-asset relevant at low signal → comment with spillover angle (agent is not the primary owner)
  if (analysis.is_cross_asset_relevant) {
    return { recommended_action: "comment_on_other", comment_purpose: "add_cross_asset_spillover" };
  }

  return { recommended_action: "stay_silent", comment_purpose: null };
}

// ---------------------------------------------------------------------------
// Core per-headline analysis
// ---------------------------------------------------------------------------

function analyzeHeadlineForAgent(
  headline: SnapshotHeadline,
  agent: Agent,
  context: {
    recentPosts: AgentMessage[];
    openTheses: Thesis[];
    sectorKeywords: string[];
  }
): HeadlineAnalysis {
  const type = classifyHeadlineType(headline.title);
  const signalStrength = scoreSignalStrength(headline.title);
  let directScore = scoreDirectRelevance(headline, context.sectorKeywords);
  const indirectScore = scoreIndirectRelevance(headline, context.sectorKeywords);
  const crossAsset = isCrossAssetRelevant(headline);
  const mechanism = extractPrimaryMechanism(headline, type);
  const assets = detectAffectedAssets(headline.title);
  const whatChanged = extractWhatChanged(headline.title);
  const isNew = checkIsNewInformation(headline, context.recentPosts, context.openTheses);
  const analog = findHistoricalAnalog(headline.title);
  const analystAction = /\b(?:upgrade|downgrade|rating|price\s+target|target\s+(?:raise|cut)|initiates?|reiterates?|overweight|underweight|neutral|buy|sell)\b/i.test(
    headlineText(headline)
  );
  const hasCompanySpecificity =
    (headline.entities?.length || 0) > 0 ||
    /\b(?:inc|corp|ltd|plc|group|holdings|class\s+[ab]|adr|common\s+stock|shares?)\b/i.test(headlineText(headline));
  const headlineLower = headlineText(headline);
  const multiEntityRoundup = (headline.entities?.length || 0) > 1;
  const broadCompanyRoundup =
    multiEntityRoundup ||
    (/\b(?:stocks?|shares?)\b/i.test(headlineLower) &&
      /\b(?:in focus|to watch|watchlist|roundup|across|among|sector|basket|multiple|several|mixed)\b/i.test(headlineLower)) ||
    /\b(?:earnings season|beat rate|companies beating|of companies beating|broad earnings)\b/i.test(headlineLower);
  const singleCompanyOwned =
    type === "company_news" &&
    hasCompanySpecificity &&
    !broadCompanyRoundup &&
    (/\b(?:q[1-4]|quarterly|annual)\s+(?:earnings|results)\b/i.test(headlineLower) ||
      /\bearnings\s+transcript\b/i.test(headlineLower) ||
      /\b(?:raises?|cuts?|maintains?)\s+(?:guidance|outlook)\b/i.test(headlineLower) ||
      /\b(?:announces?|reports?)\b/i.test(headlineLower) && /\b(?:eps|revenue|guidance|margin|bookings|arr)\b/i.test(headlineLower) ||
      /\b(?:acquires?|acquisition|merger|buyout|takeover|all-cash|cash-and-stock)\b/i.test(headlineLower) ||
      analystAction);
  if (agent.sector === "Equities" && analystAction && hasCompanySpecificity) {
    directScore = Math.min(10, Math.max(directScore, 7));
  }

  const matchedThesis = context.openTheses.find((t) =>
    assets.some((a) => detectAffectedAssets(t.canonicalClaim).includes(a)) ||
    jaccardSimilarity(tokenize(headline.title), tokenize(t.canonicalClaim)) >= 0.4
  ) || null;

  const { recommended_action, comment_purpose } = recommendAction(
    { market_signal_strength: signalStrength, direct_relevance_score: directScore,
      primary_mechanism: mechanism, is_new_information: isNew, is_cross_asset_relevant: crossAsset, headline_type: type },
    matchedThesis?.id ?? null,
    {
      singleCompanyOwned,
      broadCompanyRoundup
    }
  );

  return {
    headline_id: headlineId(headline),
    agent_id: agent.id,
    headline_title: headline.title,
    headline_type: type,
    direct_relevance_score: directScore,
    indirect_relevance_score: indirectScore,
    market_signal_strength: signalStrength,
    is_new_information: isNew,
    is_cross_asset_relevant: crossAsset,
    primary_mechanism: mechanism,
    affected_assets: assets,
    what_changed: whatChanged,
    linked_existing_thesis_id: matchedThesis?.id ?? null,
    recommended_action,
    comment_purpose,
    historical_analog_candidate: analog
  };
}

// ---------------------------------------------------------------------------
// Public entry point — analyze top 3, pick the best candidate
// ---------------------------------------------------------------------------

export function analyzeTopHeadlinesForAgent(
  headlines: SnapshotHeadline[],
  agent: Agent,
  context: {
    recentPosts: AgentMessage[];
    openTheses: Thesis[];
    sectorKeywords: string[];
  }
): HeadlineAnalysis {
  const candidates = headlines.slice(0, 3).map((h) => analyzeHeadlineForAgent(h, agent, context));

  // Prefer non-noise candidates with highest direct relevance
  const nonNoise = candidates.filter((a) => a.market_signal_strength !== "noise");
  if (nonNoise.length === 0) {
    // All are noise — return first with stay_silent
    return { ...candidates[0], recommended_action: "stay_silent", comment_purpose: null };
  }

  // Prefer candidates that lead to new_post or update_existing, then by direct_relevance_score
  const actionRank: Record<HeadlineAnalysis["recommended_action"], number> = {
    new_post: 4, update_existing: 3, comment_on_other: 2, stay_silent: 1
  };
  nonNoise.sort((a, b) => {
    const actionDiff = actionRank[b.recommended_action] - actionRank[a.recommended_action];
    if (actionDiff !== 0) return actionDiff;
    return b.direct_relevance_score - a.direct_relevance_score;
  });

  return nonNoise[0];
}
