import type { Agent } from "@market-room/shared";
import type { HeadlineAnalysis } from "./headlineAnalysisService";

export type DomainRelevanceVerdict = "strong" | "weak" | "irrelevant";
export type DomainRelevanceMode = "log_only" | "suppress";

export type DomainRelevanceResult = {
  score: number;
  matchedTerms: string[];
  verdict: DomainRelevanceVerdict;
  mode: DomainRelevanceMode;
  shouldSuppress: boolean;
};

type EvaluateDomainRelevanceInput = {
  agent: Agent;
  headlineTitle: string;
  headlineDescription?: string;
  catalyst?: string;
  headlineAnalysis: HeadlineAnalysis | null;
  hasMatchedThesis: boolean;
  suppressEnabled: boolean;
};

const DOMAIN_TERMS: Record<string, RegExp[]> = {
  Macro: [
    /\bfed|fomc|inflation|cpi|pce|gdp|jobs?|payrolls?|nfp|unemployment|pmi|ism\b/i,
    /\bgrowth|recession|soft landing|hard landing|fiscal|deficit|policy|econom(?:y|ic)\b/i,
    /\bliquidity|money supply|m1|m2|credit impulse|global\b/i
  ],
  Rates: [
    /\byields?|treasur(?:y|ies)|bonds?|curve|steepener|flattener|breakeven|auction\b/i,
    /\bfed|fomc|duration|bps|term premium|10y|2y|rates?|front[-\s]?end\b/i
  ],
  FX: [
    /\bdollar|dxy|usd|eur|jpy|gbp|aud|cad|cny|yuan|yen|euro\b/i,
    /\bcurrenc(?:y|ies)|fx|forex|carry|exchange rate|em fx|real yield differential\b/i
  ],
  Equities: [
    /\bstocks?|equities|shares?|earnings|eps|p\/?e|nasdaq|s&p|dow|russell|ipo\b/i,
    /\bbuyback|dividend|margin|valuation|multiple|sector|company|guidance|upgrade|downgrade\b/i
  ],
  Commodities: [
    /\boil|crude|wti|brent|gas|gold|copper|silver|metals?|commodit(?:y|ies)\b/i,
    /\bopec|refiner(?:y|ies)|inventory|inventories|eia|lng|uranium|barrel|backwardation|contango\b/i
  ],
  "Risk/Sentiment": [
    /\bvix|volatility|risk[-\s]?(?:on|off)|sentiment|positioning|crowding|fragility\b/i,
    /\bspread|hy|high[-\s]?yield|credit|oas|flows?|de[-\s]?risk|stress|liquidity\b/i
  ]
};

const PROTECTED_MARKET_EVENTS =
  /\bfed|fomc|treasury|cpi|pce|payrolls?|nfp|unemployment|gdp|pmi|ism|central bank|rate decision|stress test|ccar|capital rule|liquidity facility\b/i;

const LOCAL_OR_LISTICLE_NOISE =
  /\b(best stocks to buy|undervalued stocks|listicle|screeners?|top \d+|charitable trust|trustee|local council|celebrity|lifestyle)\b/i;
const EQUITY_PRODUCT_NOISE =
  /\b(cramer|motley fool|stock picks?|etf comparison|dividend income|retail advice|portfolio picks?)\b/i;

export function evaluateDomainRelevance({
  agent,
  headlineTitle,
  headlineDescription = "",
  catalyst = "",
  headlineAnalysis,
  hasMatchedThesis,
  suppressEnabled
}: EvaluateDomainRelevanceInput): DomainRelevanceResult {
  const text = normalizeText([headlineTitle, headlineDescription, catalyst, headlineAnalysis?.primary_mechanism || ""].join(" "));
  const patterns = DOMAIN_TERMS[agent.sector] || [];
  const matchedTerms = collectMatchedTerms(text, patterns);
  const directScore = headlineAnalysis?.direct_relevance_score ?? 0;
  const indirectScore = headlineAnalysis?.indirect_relevance_score ?? 0;
  const signalBonus = headlineAnalysis?.market_signal_strength === "high"
    ? 2
    : headlineAnalysis?.market_signal_strength === "medium"
      ? 1
      : 0;
  const domainScore = Math.min(10, matchedTerms.length * 2 + Math.max(directScore, Math.floor(indirectScore / 2)) + signalBonus);
  const noisePenalty =
    (LOCAL_OR_LISTICLE_NOISE.test(text) || EQUITY_PRODUCT_NOISE.test(text)) && matchedTerms.length === 0
      ? 2
      : 0;
  const uncappedScore = Math.max(0, domainScore - noisePenalty);
  const score =
    (LOCAL_OR_LISTICLE_NOISE.test(text) || EQUITY_PRODUCT_NOISE.test(text)) && matchedTerms.length === 0
      ? Math.min(1, uncappedScore)
      : uncappedScore;
  const verdict: DomainRelevanceVerdict = score >= 5 ? "strong" : score >= 2 ? "weak" : "irrelevant";
  const isProtectedEvent = PROTECTED_MARKET_EVENTS.test(text) || ["macro_release", "policy", "regulatory"].includes(headlineAnalysis?.headline_type || "");
  const mode: DomainRelevanceMode =
    suppressEnabled &&
    verdict === "irrelevant" &&
    score <= 1 &&
    !hasMatchedThesis &&
    !isProtectedEvent &&
    headlineAnalysis?.market_signal_strength !== "high" &&
    headlineAnalysis?.market_signal_strength !== "medium"
      ? "suppress"
      : "log_only";

  return {
    score,
    matchedTerms,
    verdict,
    mode,
    shouldSuppress: mode === "suppress"
  };
}

function collectMatchedTerms(text: string, patterns: RegExp[]): string[] {
  const terms = new Set<string>();
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches?.[0]) terms.add(matches[0].toLowerCase());
  }
  return [...terms];
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
