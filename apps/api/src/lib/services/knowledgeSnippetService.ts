import type { Agent, KnowledgeCategory } from "@market-room/shared";
import type { Env } from "../../index";
import { createRepositories } from "../repositories";
import { queryKnowledgeVectors, type KnowledgeVectorMatch } from "./vectorKnowledgeService";

type LocalKnowledgeDocument = {
  id: string;
  title: string;
  summary: string;
  category: KnowledgeCategory;
  filename: string;
  content: string;
  reviewNotes: string | null;
  createdAt: string;
};

export type KnowledgeGovernanceTier = "active" | "fallback" | "legacy";

export type KnowledgeGovernanceProfile = {
  tier: KnowledgeGovernanceTier;
  source: "manual" | "derived";
  priority: number;
  reason: string;
};

export type LocalKnowledgeSnippet = {
  title: string;
  category: KnowledgeCategory;
  excerpt: string;
};

export async function listApprovedKnowledgeDocuments(
  env: Env,
  agentId: string,
  limit = 24
): Promise<LocalKnowledgeDocument[]> {
  const rows = await createRepositories(env).knowledgeProcessingJobs.listApprovedKnowledgeByAgent(agentId, limit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title || row.processedFilename || row.sourceFilename,
    summary: row.summary || "",
    category: row.category,
    filename: row.processedFilename || row.sourceFilename,
    content: row.distilledMarkdown,
    reviewNotes: row.reviewNotes,
    createdAt: row.persistedAt || row.createdAt
  }));
}

export async function findRelevantKnowledgeSnippets(
  env: Env,
  agent: Agent,
  query: string,
  limit = 8
): Promise<LocalKnowledgeSnippet[]> {
  const documents = await listApprovedKnowledgeDocuments(env, agent.id, 50);

  if (documents.length === 0) {
    console.log(`[knowledge:${agent.name}] 0 approved docs — retrieval skipped`);
    return [];
  }

  const vectorMatches = await queryKnowledgeVectors(env, agent, query, 16);
  const vectorMatchById = new Map(vectorMatches.map((match) => [match.id, match]));

  const scored = documents.map((document) => {
    const excerptChoice = bestExcerpt(document.content, query);
    const scoreDetails = scoreDocument(document, excerptChoice.excerpt, query, agent.sector);
    const vectorMatch = vectorMatchById.get(document.id) || null;
    const vectorBoost = vectorMatch ? vectorScoreBoost(vectorMatch) : 0;
    return {
      title: document.title,
      category: document.category,
      filename: document.filename,
      excerpt: excerptChoice.excerpt,
      excerptLabel: excerptChoice.label,
      excerptScore: excerptChoice.score,
      score: scoreDetails.total + vectorBoost,
      baseScore: scoreDetails.baseScore,
      adjustments: vectorMatch
        ? [...scoreDetails.adjustments, `+vector:${vectorBoost.toFixed(1)}@${vectorMatch.rank}`]
        : scoreDetails.adjustments,
      vectorScore: vectorMatch?.score ?? null,
      vectorRank: vectorMatch?.rank ?? null,
      governanceTier: scoreDetails.governanceTier
    };
  });

  // Log every doc that scored above zero so retrieval failures are diagnosable
  const aboveZero = scored.filter((entry) => entry.score > 0).sort((l, r) => r.score - l.score);

  console.log(
    `[knowledge:${agent.name}] query="${query.slice(0, 120)}" pool=${documents.length} matched=${aboveZero.length}`
  );
  for (const entry of aboveZero) {
    const adjustmentText = entry.adjustments.length > 0 ? ` adj=${entry.adjustments.join(",")}` : "";
    const vectorText = entry.vectorScore !== null
      ? ` vector=${entry.vectorScore.toFixed(3)}#${entry.vectorRank}`
      : "";
    console.log(
      `[knowledge:${agent.name}]   score=${entry.score.toFixed(1)} base=${entry.baseScore.toFixed(1)}${vectorText} tier=${entry.governanceTier} cat=${entry.category} excerpt=${entry.excerptLabel}:${entry.excerptScore.toFixed(1)}${adjustmentText} title="${entry.title}" excerpt="${entry.excerpt.slice(0, 80).replace(/\n/g, " ")}…"`
    );
  }

  const { selected, skippedFallbacks } = dedupeSelectedSnippets(aboveZero, limit);

  if (selected.length === 0) {
    console.log(`[knowledge:${agent.name}] no snippets passed score threshold — nothing injected into prompt`);
  } else {
    console.log(`[knowledge:${agent.name}] injecting ${selected.length} snippet(s): ${selected.map((s) => `"${s.title}"`).join(", ")}`);
  }
  for (const skipped of skippedFallbacks) {
    console.log(
      `[knowledge:${agent.name}] skipped fallback title="${skipped.title}" reason=${skipped.reason} score=${skipped.score.toFixed(1)}`
    );
  }

  return selected.map(({ title, category, excerpt }) => ({ title, category, excerpt }));
}

function vectorScoreBoost(match: KnowledgeVectorMatch): number {
  const similarityBoost = Math.max(0, match.score) * 18;
  const rankBoost = Math.max(0, 5 - match.rank) * 1.5;
  return similarityBoost + rankBoost;
}

// Pulls the Coverage, Triggers, Use When, and Instruments sections that are
// injected during upload for Wave 1 docs (and any future structured uploads).
// Falls back gracefully to an empty string for older or unstructured docs.
function extractMetadataIndex(content: string): string {
  const coverageMatch = content.match(/^## Coverage\n(.+)$/m);
  const triggersMatch = content.match(/^## Triggers\n(.+)$/m);
  const useWhenMatch = content.match(/^## Use When\n(.+)$/m);
  const instrumentsMatch = content.match(/^## Instruments\n(.+)$/m);

  return [
    coverageMatch?.[1] ?? "",
    triggersMatch?.[1] ?? "",
    useWhenMatch?.[1] ?? "",
    instrumentsMatch?.[1] ?? ""
  ]
    .join(" ")
    .toLowerCase();
}

function scoreDocument(
  document: LocalKnowledgeDocument,
  excerpt: string,
  query: string,
  sector: string
): { total: number; baseScore: number; adjustments: string[]; governanceTier: KnowledgeGovernanceTier } {
  const text = [document.title, document.summary, excerpt].join("\n").toLowerCase();
  const metaIndex = extractMetadataIndex(document.content);
  const keywords = tokenize(query);
  const sectorTokens = tokenize(sector);
  const queryProfile = analyzeQuery(query);
  const docProfile = analyzeDocument(document);
  const governanceProfile = getKnowledgeGovernanceProfile(document);
  const governanceTier = governanceProfile.tier;

  const keywordHits = keywords.reduce((score, token) => {
    // Explicit metadata match (topics/triggers) outweighs incidental content match
    const inContent = text.includes(token) ? 2 : 0;
    const inMeta = metaIndex.includes(token) ? 3 : 0;
    return score + Math.max(inContent, inMeta);
  }, 0);

  const sectorHits = sectorTokens.reduce((score, token) => score + (text.includes(token) ? 1 : 0), 0);
  const categoryBonus =
    document.category === "instrument_guides"
      ? 2.5
      : document.category === "event_playbooks"
        ? 2
        : document.category === "frameworks"
          ? 1.5
          : 1;

  const adjustments: string[] = [];
  let total = keywordHits + sectorHits + categoryBonus;

  if (governanceTier === "legacy") {
    const penalty = queryProfile.highSpecificity ? 22 : queryProfile.mediumSpecificity ? 14 : 6;
    total -= penalty;
    adjustments.push(`-governance-legacy:${penalty}`);
  } else if (governanceTier === "fallback") {
    const penalty = queryProfile.highSpecificity ? 12 : queryProfile.mediumSpecificity ? 7 : 2;
    total -= penalty;
    adjustments.push(`-governance-fallback:${penalty}`);
  }
  if (governanceProfile.priority !== 0) {
    total += governanceProfile.priority;
    adjustments.push(`governance-priority:${governanceProfile.priority}`);
  }

  if (queryProfile.prefersEventPlaybook && document.category === "event_playbooks") {
    total += 3;
    adjustments.push("+event-query");
  }
  if (queryProfile.prefersFramework && document.category === "frameworks") {
    total += 2.5;
    adjustments.push("+framework-query");
  }
  if (queryProfile.prefersFoundation && document.category === "foundations") {
    total += 1.5;
    adjustments.push("+foundation-query");
  }
  if (queryProfile.prefersStockIdeas && sector === "Equities" && !queryProfile.prefersSingleStockMovement && document.category === "instrument_guides") {
    total += 8;
    adjustments.push("+stock-idea-instrument-guide");
  }

  if (queryProfile.highSpecificity && docProfile.isGenericLegacy) {
    total -= 10;
    adjustments.push("-generic-legacy");
  } else if (queryProfile.mediumSpecificity && docProfile.isGenericLegacy) {
    total -= 6;
    adjustments.push("-legacy-medium");
  }

  if (queryProfile.highSpecificity && docProfile.isBroadAuxiliary && !queryProfile.prefersFramework) {
    total -= 8;
    adjustments.push("-broad-aux");
  }

  if (queryProfile.prefersFundingStress && docProfile.isFundingStressDoc) {
    total += 6;
    adjustments.push("+funding-stress-match");
  } else if (queryProfile.prefersCarry && docProfile.isFundingStressDoc) {
    total -= 5;
    adjustments.push("-funding-stress-offtopic");
  }

  if (queryProfile.prefersCarry && docProfile.isCarryDoc) {
    total += 5;
    adjustments.push("+carry-match");
  }

  if (queryProfile.prefersDivergence && docProfile.isDivergenceDoc) {
    total += 5;
    adjustments.push("+divergence-match");
  }

  if (queryProfile.prefersG10FxRealYield && docProfile.isG10FxDoc) {
    total += 32;
    adjustments.push("+g10-fx-real-yield-match");
  } else if (queryProfile.prefersG10FxRealYield && document.category === "instrument_guides") {
    total -= 10;
    adjustments.push("-instrument-guide-offtopic-g10-fx");
  }

  if (queryProfile.prefersRegime && docProfile.isRegimeDoc) {
    total += 4;
    adjustments.push("+regime-match");
  }

  if (queryProfile.prefersLeadership && docProfile.isLeadershipDoc) {
    total += 3;
    adjustments.push("+leadership-match");
  }

  if (queryProfile.prefersLaborDeterioration && docProfile.isLaborDeteriorationDoc) {
    total += 7;
    adjustments.push("+labor-deterioration-match");
  } else if (queryProfile.prefersLaborDeterioration && docProfile.isInflationDoc) {
    total -= 4;
    adjustments.push("-inflation-offtopic-labor");
  }

  if (queryProfile.prefersEarningsQuality && docProfile.isEarningsQualityDoc) {
    total += 10;
    adjustments.push("+earnings-quality-match");
  } else if (queryProfile.prefersEarningsQuality && docProfile.isEquityRegimeDoc) {
    total -= 6;
    adjustments.push("-regime-offtopic-earnings");
  }

  if (queryProfile.prefersEquityFactor && docProfile.isEquityFactorDoc) {
    total += 34;
    adjustments.push("+equity-factor-match");
  } else if (queryProfile.prefersEquityFactor && document.category === "instrument_guides") {
    total -= 8;
    adjustments.push("-instrument-guide-offtopic-equity-factor");
  }

  if (queryProfile.prefersSingleStockMovement && docProfile.isSingleStockMovementDoc) {
    total += 36;
    adjustments.push("+single-stock-movement-match");
  } else if (queryProfile.prefersSingleStockMovement && document.category === "instrument_guides") {
    total -= 8;
    adjustments.push("-instrument-guide-offtopic-single-stock");
  }

  if (queryProfile.prefersNaturalGasLng && docProfile.isNaturalGasLngDoc) {
    total += 44;
    adjustments.push("+natural-gas-lng-match");
  } else if (queryProfile.prefersNaturalGasLng && docProfile.isOilInventoryDoc) {
    total -= 8;
    adjustments.push("-oil-offtopic-gas-lng");
  } else if (queryProfile.prefersNaturalGasLng && document.category === "instrument_guides") {
    total -= 12;
    adjustments.push("-instrument-guide-offtopic-gas-lng");
  }

  if (queryProfile.prefersCreditStress && docProfile.isCreditStressDoc) {
    total += 24;
    adjustments.push("+credit-stress-match");
  } else if (queryProfile.prefersCreditStress && document.category === "instrument_guides") {
    total -= 8;
    adjustments.push("-instrument-guide-offtopic-credit-stress");
  }

  if (queryProfile.prefersTreasuryAuction && docProfile.isTreasuryAuctionDoc) {
    total += 24;
    adjustments.push("+treasury-auction-match");
  } else if (queryProfile.prefersTreasuryAuction && document.category === "instrument_guides") {
    total -= 8;
    adjustments.push("-instrument-guide-offtopic-auction");
  }

  if (queryProfile.prefersSofrOisPlumbing && docProfile.isSofrOisDoc) {
    total += 34;
    adjustments.push("+sofr-ois-plumbing-match");
  } else if (queryProfile.prefersSofrOisPlumbing && docProfile.isTreasuryAuctionDoc) {
    total -= 8;
    adjustments.push("-auction-offtopic-sofr-ois");
  }

  if (queryProfile.prefersMacroRegimeChecklist && docProfile.isMacroRegimeChecklistDoc) {
    total += 18;
    adjustments.push("+macro-regime-checklist-match");
  } else if (queryProfile.prefersMacroRegimeChecklist && document.category === "instrument_guides") {
    total -= 6;
    adjustments.push("-instrument-guide-offtopic-regime-checklist");
  }

  if (queryProfile.prefersFiscalLiquidity && docProfile.isFiscalLiquidityDoc) {
    total += 32;
    adjustments.push("+fiscal-liquidity-match");
  }

  return {
    total,
    baseScore: keywordHits + sectorHits + categoryBonus,
    adjustments,
    governanceTier
  };
}

function bestExcerpt(content: string, query: string): { excerpt: string; label: string; score: number } {
  const blocks = content
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return { excerpt: trimExcerpt(content), label: "full", score: 0 };
  }

  const keywords = tokenize(query);
  const passages = buildCandidatePassages(blocks);
  const ranked = passages
    .map((passage) => ({
      ...passage,
      score: scorePassage(passage.label, passage.text, keywords)
    }))
    .sort((left, right) => right.score - left.score);

  const best = ranked[0] || { text: blocks[0], label: "block", score: 0 };
  return { excerpt: trimExcerpt(best.text), label: best.label, score: best.score };
}

function trimExcerpt(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 1200 ? `${normalized.slice(0, 1197).trim()}...` : normalized;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function analyzeQuery(query: string): {
  highSpecificity: boolean;
  mediumSpecificity: boolean;
  prefersEventPlaybook: boolean;
  prefersFramework: boolean;
  prefersFoundation: boolean;
  prefersFundingStress: boolean;
  prefersCarry: boolean;
  prefersDivergence: boolean;
  prefersG10FxRealYield: boolean;
  prefersRegime: boolean;
  prefersLeadership: boolean;
  prefersLaborDeterioration: boolean;
  prefersEarningsQuality: boolean;
  prefersEquityFactor: boolean;
  prefersStockIdeas: boolean;
  prefersSingleStockMovement: boolean;
  prefersNaturalGasLng: boolean;
  prefersCreditStress: boolean;
  prefersTreasuryAuction: boolean;
  prefersSofrOisPlumbing: boolean;
  prefersMacroRegimeChecklist: boolean;
  prefersFiscalLiquidity: boolean;
} {
  const lower = query.toLowerCase();
  const tokens = tokenize(query);
  const hasNumber = /\b\d+(\.\d+)?\b/.test(query);
  const hasComparison = /(vs|versus|crossed|rose|fell|missed|beat|surprise|repric|threshold|bps|basis|spread|yield|cpi|payroll|earnings|inventory|draw|build|opec|fomc)/i.test(query);
  const highSpecificity = tokens.length >= 10 || (hasNumber && hasComparison);
  const mediumSpecificity = highSpecificity || tokens.length >= 6;

  const prefersEventPlaybook = /(today|just|crossed|surprise|beat|missed|meeting|fomc|ecb|payroll|cpi|earnings|inventory|draw|build|cut|shock|repric|basis)/i.test(lower);
  const prefersFramework = /(regime|framework|interpret|mechanism|term premium|breakeven|leadership|carry|divergence|quality|margin|crowding|positioning|transmission)/i.test(lower);
  const prefersFoundation = !prefersEventPlaybook && /(guide|foundation|historical|background|how does|what is)/i.test(lower);
  const prefersFundingStress = /(basis|cross-currency|swap line|swap-line|funding stress|offshore dollar squeeze|intervention)/i.test(lower);
  const prefersCarry = /(carry|rate differential|rate differentials|front-end spread|yield differential|dollar strength)/i.test(lower);
  const prefersDivergence = /(divergence|laggard catch-up|priced-in unwind|ecb|boj|boe|rba|policy divergence)/i.test(lower);
  const prefersG10FxRealYield =
    /(g10|usd\/jpy|usdjpy|eur\/usd|eurusd|gbp\/usd|gbpusd|us-japan|us japan|us-germany|us germany|real yield differential|real-yield differential|yield spread|rate spread)/i.test(lower) &&
    /(fx|currency|dxy|dollar|yen|euro|real yields?|2-year spread|front-end yields?)/i.test(lower);
  const prefersRegime = /(regime|rates-driven|liquidity-relief|late-cycle|real yields?|growth|liquidity|earnings)/i.test(lower);
  const prefersLeadership = /(leadership|equal-weight|breadth|sector rotation|mega-cap|defensive rotation|utilities|staples)/i.test(lower);
  const laborDeteriorationHits = [
    /(openings?|jolts)/i,
    /quits?/i,
    /claims?/i,
    /temp help|temporary help/i,
    /payroll|nfp/i,
    /hiring/i,
    /labor market|labour market/i,
    /deteriorat|weakening|moving the wrong way|wait for payroll/i
  ].reduce((count, pattern) => count + (pattern.test(lower) ? 1 : 0), 0);
  const prefersLaborDeterioration = laborDeteriorationHits >= 3;
  const earningsQualityHits = [
    /margin|gross margin|operating margin/i,
    /guidance/i,
    /organic revenue|revenue growth|organic growth/i,
    /free cash flow|cash flow/i,
    /buybacks?|tax/i,
    /wage costs?|input costs?/i,
    /low-quality|quality|headline beat|beat/i
  ].reduce((count, pattern) => count + (pattern.test(lower) ? 1 : 0), 0);
  const prefersEarningsQuality = earningsQualityHits >= 3;
  const prefersEquityFactor =
    /(valuation|multiple|high-multiple|factor|quality|growth|profitability|leverage|momentum|equity risk premium|erp|real yields?|free cash flow|operating margin|sector beta|valuation compression|multiple compression)/i.test(lower) &&
    /(stock|equities|equity|sector|software|growth|value|quality|factor|margin|cash flow|real yields?)/i.test(lower);
  const prefersStockIdeas = /\b(which|what|best|top|good|names?|tickers?|companies|stocks?|etfs?|watchlist|basket|buy|own|invest)\b/i.test(lower) &&
    /\b(stocks?|tickers?|companies|names?|etfs?|watchlist|basket|sector|theme|green|clean energy|renewable|solar|wind|battery|lithium|nuclear|uranium|energy|ai infrastructure)\b/i.test(lower);
  const prefersSingleStockMovement =
    /(single[-\s]?stock|stock moved|why .* stock|earnings|guidance|rating|upgrade|downgrade|buyback|halt|company[-\s]?specific|sector beta|factor beta|false headline causality|gross margin|revenue beat)/i.test(lower) &&
    /(stock|shares?|nvda|earnings|guidance|company|sector beta|factor beta)/i.test(lower);
  const prefersNaturalGasLng =
    /(henry hub|natural gas|gas storage|lng|feedgas|bcf|weather model|five-year range|european gas|asian lng)/i.test(lower);
  const prefersCreditStress =
    /(high[-\s]?yield|hy spreads?|oas|investment[-\s]?grade|ig spreads?|credit etf|discount to nav|liquidity stress|credit-confirmed|credit confirmed|funding rates?)/i.test(lower);
  const prefersTreasuryAuction =
    /(auction|tailed|tail|when-issued|bid-to-cover|indirect bidder|direct bidder|dealer takedown|refunding|coupon supply|10s30s|30-year treasury auction|treasury supply)/i.test(lower);
  const prefersSofrOisPlumbing =
    /(sofr|ois|effective fed funds|fed funds|rrp|reverse repo|repo rates?|money-market plumbing|bill yields|quarter-end|front-end dislocation)/i.test(lower);
  const prefersMacroRegimeChecklist =
    /(macro regime|regime classification|expansion|slowdown|recession|stagflation|soft landing|disinflationary|mixed-regime|mixed regime|reflation)/i.test(lower) &&
    /(gdp|cpi|inflation|jolts|payroll|labor|labour|credit spreads|growth)/i.test(lower);
  const prefersFiscalLiquidity =
    /(tga|treasury general account|rrp|reverse repo|qt|coupon issuance|debt ceiling|fiscal impulse|liquidity drain|liquidity impulse|treasury cash|deficit|refunding)/i.test(lower) &&
    /(macro|liquidity|fiscal|equities|risk assets|rates|issuance|drain|rebuild)/i.test(lower);

  return {
    highSpecificity,
    mediumSpecificity,
    prefersEventPlaybook,
    prefersFramework,
    prefersFoundation,
    prefersFundingStress,
    prefersCarry,
    prefersDivergence,
    prefersG10FxRealYield,
    prefersRegime,
    prefersLeadership,
    prefersLaborDeterioration,
    prefersEarningsQuality,
    prefersEquityFactor,
    prefersStockIdeas,
    prefersSingleStockMovement,
    prefersNaturalGasLng,
    prefersCreditStress,
    prefersTreasuryAuction,
    prefersSofrOisPlumbing,
    prefersMacroRegimeChecklist,
    prefersFiscalLiquidity
  };
}

function analyzeDocument(document: LocalKnowledgeDocument): {
  isGenericLegacy: boolean;
  isBroadAuxiliary: boolean;
  isFundingStressDoc: boolean;
  isCarryDoc: boolean;
  isDivergenceDoc: boolean;
  isG10FxDoc: boolean;
  isRegimeDoc: boolean;
  isLeadershipDoc: boolean;
  isLaborDeteriorationDoc: boolean;
  isInflationDoc: boolean;
  isEarningsQualityDoc: boolean;
  isEquityFactorDoc: boolean;
  isEquityRegimeDoc: boolean;
  isSingleStockMovementDoc: boolean;
  isNaturalGasLngDoc: boolean;
  isOilInventoryDoc: boolean;
  isCreditStressDoc: boolean;
  isTreasuryAuctionDoc: boolean;
  isSofrOisDoc: boolean;
  isMacroRegimeChecklistDoc: boolean;
  isFiscalLiquidityDoc: boolean;
} {
  const lower = [document.title, document.filename, document.summary].join(" ").toLowerCase();
  const isGenericLegacy =
    lower.includes("starter pack") ||
    lower.includes("historical foundation") ||
    lower.includes("historical starter") ||
    lower.includes("public report") ||
    lower.includes("durable memory") ||
    lower.includes("long-term memory");

  const isBroadAuxiliary =
    lower.includes("census retail") ||
    lower.includes("retail spending") ||
    lower.includes("watchlist pack") ||
    lower.includes("historical regime anchors");
  const isFundingStressDoc = lower.includes("funding stress") || lower.includes("intervention playbook");
  const isCarryDoc = lower.includes("carry and rate differential");
  const isDivergenceDoc = lower.includes("central-bank divergence");
  const isG10FxDoc = lower.includes("g10 fx central bank and real yield");
  const isRegimeDoc =
    lower.includes("equity regime framework") ||
    lower.includes("reaction function framework") ||
    lower.includes("inflation transmission") ||
    lower.includes("term premium and breakeven");
  const isLeadershipDoc = lower.includes("sector rotation and market leadership");
  const isLaborDeteriorationDoc = lower.includes("labor market deterioration");
  const isInflationDoc = lower.includes("inflation transmission");
  const isEarningsQualityDoc = lower.includes("earnings quality and margin pressure");
  const isEquityFactorDoc = lower.includes("valuation growth quality factor") || lower.includes("valuation, growth, quality, and factor");
  const isEquityRegimeDoc = lower.includes("equity regime framework");
  const isSingleStockMovementDoc = lower.includes("single-stock movement interpretation");
  const isNaturalGasLngDoc = lower.includes("natural gas and lng");
  const isOilInventoryDoc = lower.includes("oil supply-demand and inventory");
  const isCreditStressDoc = lower.includes("credit spread and liquidity stress");
  const isTreasuryAuctionDoc = lower.includes("treasury auction and supply");
  const isSofrOisDoc = lower.includes("sofr fed funds ois") || lower.includes("sofr, fed funds, and ois");
  const isMacroRegimeChecklistDoc = lower.includes("macro regime classification checklist");
  const isFiscalLiquidityDoc = lower.includes("fiscal policy and liquidity transmission");

  return {
    isGenericLegacy,
    isBroadAuxiliary,
    isFundingStressDoc,
    isCarryDoc,
    isDivergenceDoc,
    isG10FxDoc,
    isRegimeDoc,
    isLeadershipDoc,
    isLaborDeteriorationDoc,
    isInflationDoc,
    isEarningsQualityDoc,
    isEquityFactorDoc,
    isEquityRegimeDoc,
    isSingleStockMovementDoc,
    isNaturalGasLngDoc,
    isOilInventoryDoc,
    isCreditStressDoc,
    isTreasuryAuctionDoc,
    isSofrOisDoc,
    isMacroRegimeChecklistDoc,
    isFiscalLiquidityDoc
  };
}

function dedupeSelectedSnippets<T extends { filename: string; score: number; title: string; governanceTier: KnowledgeGovernanceTier }>(
  entries: T[],
  limit: number
): { selected: T[]; skippedFallbacks: Array<{ title: string; score: number; reason: string }> } {
  const selected: T[] = [];
  const seenSources = new Set<string>();
  const skippedFallbacks: Array<{ title: string; score: number; reason: string }> = [];

  for (const entry of entries) {
    const sourceKey = normalizeSourceKey(entry.filename);
    if (seenSources.has(sourceKey)) {
      continue;
    }
    const governanceReason = shouldSkipGovernedEntry(entry, selected);
    if (governanceReason) {
      skippedFallbacks.push({
        title: entry.title,
        score: entry.score,
        reason: governanceReason
      });
      continue;
    }
    if (selected.length >= 3 && shouldSkipFallbackEntry(entry, selected)) {
      skippedFallbacks.push({
        title: entry.title,
        score: entry.score,
        reason: "fallback-after-sharp-top-three"
      });
      continue;
    }
    selected.push(entry);
    seenSources.add(sourceKey);
    if (selected.length >= limit) {
      break;
    }
  }

  return { selected, skippedFallbacks };
}

function normalizeSourceKey(filename: string): string {
  return filename.toLowerCase().replace(/\.processed\.md$/i, ".md");
}

function buildCandidatePassages(blocks: string[]): Array<{ text: string; label: string }> {
  const passages: Array<{ text: string; label: string }> = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const next = blocks[index + 1];
    const headingMatch = block.match(/^##\s+(.+)$/);
    const headingWithBodyMatch = block.match(/^##\s+(.+?)\n/);

    if (headingMatch && next) {
      passages.push({
        text: `${block}\n\n${next}`,
        label: headingMatch[1].trim().toLowerCase()
      });
    }

    passages.push({
      text: block,
      label: headingMatch
        ? headingMatch[1].trim().toLowerCase()
        : headingWithBodyMatch
          ? headingWithBodyMatch[1].trim().toLowerCase()
          : "block"
    });
  }

  return passages;
}

function scorePassage(label: string, text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let score = keywords.reduce((sum, token) => sum + (lower.includes(token) ? 1 : 0), 0);

  if (/core mechanism/.test(label)) {
    score += 8;
  } else if (/what to watch|how this should affect agent behavior/.test(label)) {
    score += 4.5;
  } else if (/false positives \/ traps|cross-asset implications|typical market path/.test(label)) {
    score += 3.5;
  }
  if (/sources|coverage|triggers|use when|instruments/.test(label)) {
    score -= 5;
  }
  if (/checklist/.test(label)) {
    score -= 5;
  }
  if (/why this matters/.test(label)) {
    score -= 1;
  }
  if (lower.startsWith("- agent:") || lower.startsWith("- sector:") || lower.startsWith("- category:")) {
    score -= 4;
  }
  const bulletCount = (text.match(/^\s*[-*]\s+/gm) || []).length;
  if (bulletCount >= 4) {
    score -= 6;
  } else if (bulletCount >= 2) {
    score -= 3;
  }
  if (/^\s*[-*]\s+(\[ ?\]|is|are|was|were|did|does|do|has|have|should)\b/im.test(text) && bulletCount >= 2) {
    score -= 4;
  }
  if (/^\s*[-*]\s+.+(official|source|operations|website|report)/im.test(text)) {
    score -= 4;
  }
  if (lower.includes("http://") || lower.includes("https://")) {
    score -= 3;
  }
  if (/\|.+\|.+\|/.test(text)) {
    score -= 4;
  }

  return score;
}

function shouldSkipFallbackEntry<T extends { title: string; score: number }>(entry: T, selected: T[]): boolean {
  if (!isFallbackTitle(entry.title) || selected.length < 3) {
    return false;
  }

  const topThree = selected.slice(0, 3);
  if (topThree.some((snippet) => isFallbackTitle(snippet.title))) {
    return false;
  }

  const thirdScore = selected[2]?.score ?? 0;
  return thirdScore >= 10 && entry.score <= thirdScore + 5;
}

function isFallbackTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes("starter pack") ||
    lower.includes("historical") ||
    lower.includes("public report") ||
    lower.includes("watchlist") ||
    lower.includes("census retail")
  );
}

function shouldSkipGovernedEntry<T extends { title: string; filename: string; score: number; governanceTier: KnowledgeGovernanceTier }>(
  entry: T,
  selected: T[]
): string | null {
  const tier = entry.governanceTier;
  if (tier === "active") {
    return null;
  }

  const activeSelected = selected.filter((snippet) => snippet.governanceTier === "active");
  if (activeSelected.length === 0) {
    return null;
  }

  if (tier === "legacy" && activeSelected.length >= 2) {
    const secondActiveScore = activeSelected[1]?.score ?? activeSelected[0].score;
    return entry.score <= secondActiveScore + 8 ? "governance-legacy-after-active" : null;
  }

  if (tier === "fallback" && activeSelected.length >= 2) {
    const secondActiveScore = activeSelected[1]?.score ?? activeSelected[0].score;
    return entry.score <= secondActiveScore + 3 ? "governance-fallback-after-active" : null;
  }

  return null;
}

export function getKnowledgeGovernanceProfile(input: {
  title: string | null;
  filename: string;
  summary?: string | null;
  reviewNotes?: string | null;
}): KnowledgeGovernanceProfile {
  const manual = parseGovernanceOverride(input.reviewNotes || "");
  if (manual) {
    return {
      tier: manual.tier,
      source: "manual",
      priority: manual.priority,
      reason: "manual review_notes override"
    };
  }

  const tier = getGovernanceTierFromParts(input.title || input.filename, input.filename);
  return {
    tier,
    source: "derived",
    priority: 0,
    reason: tier === "active"
      ? "curated direct markdown doc"
      : tier === "legacy"
        ? "starter/public/historical processed family"
        : "broad auxiliary processed family"
  };
}

function parseGovernanceOverride(notes: string): { tier: KnowledgeGovernanceTier; priority: number } | null {
  const match = notes.match(/governance:tier=(active|fallback|legacy)(?:;priority=(-?\d+))?/i);
  if (!match) {
    return null;
  }

  return {
    tier: match[1].toLowerCase() as KnowledgeGovernanceTier,
    priority: Math.max(-25, Math.min(25, Number(match[2] || 0)))
  };
}

function getGovernanceTierFromParts(title: string, filename: string): KnowledgeGovernanceTier {
  const haystack = `${title} ${filename}`.toLowerCase();
  const isProcessed = filename.toLowerCase().endsWith(".processed.md");

  if (
    haystack.includes("historical-starter-pack") ||
    haystack.includes("historical starter") ||
    haystack.includes("historical foundation") ||
    haystack.includes("public-report-starter-pack") ||
    haystack.includes("public report starter") ||
    haystack.includes("public report pack") ||
    haystack.includes("durable memory") ||
    haystack.includes("long-term memory")
  ) {
    return "legacy";
  }

  if (
    haystack.includes("census-retail") ||
    haystack.includes("census retail") ||
    haystack.includes("retail spending") ||
    haystack.includes("watchlist") ||
    haystack.includes("historical regime anchors") ||
    haystack.includes("breadth and sector rotation framework")
  ) {
    return "fallback";
  }

  return isProcessed ? "fallback" : "active";
}
