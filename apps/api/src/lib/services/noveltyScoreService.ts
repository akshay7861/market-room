import type {
  AgentMessage,
  AgentBehavioralSummary,
  NoveltyAssessment,
  RoomCoverageState,
  Thesis
} from "@market-room/shared";

// --- Text utility helpers ---

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been",
  "has", "have", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "can", "shall", "for",
  "and", "but", "or", "nor", "not", "no", "so", "yet", "if",
  "in", "on", "at", "to", "of", "by", "with", "from", "up",
  "out", "as", "into", "about", "than", "its", "it", "this",
  "that", "all", "more", "some", "any", "each", "very"
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function jaccardDistance(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return 1 - intersection / union;
}

// --- Topic family mapping (mirrors marketRoomService.ts) ---

function topicFamilyFor(themeKey: string): string {
  const families: Record<string, string> = {
    inflation_regime: "macro_policy",
    policy_path: "macro_policy",
    real_yields: "macro_policy",
    duration_pressure: "macro_policy",
    curve_shape: "macro_policy",
    treasury_auctions: "macro_policy",
    labor_growth: "growth_conditions",
    consumer_demand: "growth_conditions",
    dollar_path: "fx_liquidity",
    policy_divergence: "fx_liquidity",
    carry_em_fx: "fx_liquidity",
    oil_structure: "energy_complex",
    gas_power: "energy_complex",
    metals_growth: "commodity_growth",
    gold_real_rates: "rates_real_assets",
    breadth_rotation: "equity_breadth",
    consumer_equities: "equity_breadth",
    banks_small_caps: "equity_breadth",
    sector_defensives: "equity_breadth",
    ai_concentration: "equity_leadership",
    market_fragility: "risk_conditions",
    credit_stress: "risk_conditions",
    crowding_positioning: "risk_conditions",
    crypto_speculation: "risk_conditions"
  };

  return families[themeKey] || themeKey;
}

// --- Signal computation ---

function extractThemeKey(post: AgentMessage): string {
  return post.thesisTopicPrimary || "unknown";
}

function computeThemeNovelty(
  candidateThemeKey: string,
  agentRecentPosts: AgentMessage[],
  roomRecentPosts: AgentMessage[]
): number {
  const agentThemes = agentRecentPosts.map(extractThemeKey);
  const roomThemes = roomRecentPosts.map(extractThemeKey);

  const inAgentTop2 = agentThemes.slice(0, 2).includes(candidateThemeKey);
  const inAgentRecent = agentThemes.includes(candidateThemeKey);
  const inRoom = roomThemes.includes(candidateThemeKey);

  if (inAgentTop2) return 0.0;

  if (inAgentRecent) {
    // Same family but different exact key gives partial credit
    const candidateFamily = topicFamilyFor(candidateThemeKey);
    const hasFamilyOnly = agentThemes.some(
      (t) => t !== candidateThemeKey && topicFamilyFor(t) === candidateFamily
    );
    return hasFamilyOnly ? 0.2 : 0.0;
  }

  if (inRoom) return 0.5;

  return 1.0;
}

function computeCatalystNovelty(
  candidateCatalyst: string,
  agentRecentPosts: AgentMessage[],
  roomRecentPosts: AgentMessage[]
): number {
  const candidateTokens = tokenize(candidateCatalyst);
  if (candidateTokens.size === 0) return 0.5;

  const allRecentCatalysts = [...agentRecentPosts, ...roomRecentPosts]
    .map((p) => p.catalyst)
    .filter((c): c is string => c !== null && c.length > 0);

  if (allRecentCatalysts.length === 0) return 1.0;

  const distances = allRecentCatalysts.map((catalyst) =>
    jaccardDistance(candidateTokens, tokenize(catalyst))
  );

  // Minimum distance = closest match = least novel
  return Math.min(...distances);
}

function computeStanceNovelty(
  candidateThemeKey: string,
  candidateStance: string | null,
  agentRecentPosts: AgentMessage[],
  roomRecentPosts: AgentMessage[]
): number {
  if (!candidateStance) return 0.5;

  const allRecent = [...agentRecentPosts, ...roomRecentPosts];
  const agentTop2 = agentRecentPosts.slice(0, 2);

  // Check if exact theme+stance combo exists in agent's last 2
  const exactMatchInTop2 = agentTop2.some(
    (p) => extractThemeKey(p) === candidateThemeKey && p.stance === candidateStance
  );
  if (exactMatchInTop2) return 0.0;

  // Check if same theme exists with different stance (contrarian)
  const sameThemeDifferentStance = allRecent.some(
    (p) =>
      extractThemeKey(p) === candidateThemeKey &&
      p.stance !== null &&
      p.stance !== candidateStance
  );
  if (sameThemeDifferentStance) return 0.3;

  // Check if same theme+stance exists anywhere in recent
  const sameComboAnywhere = allRecent.some(
    (p) => extractThemeKey(p) === candidateThemeKey && p.stance === candidateStance
  );
  if (sameComboAnywhere) return 0.2;

  return 1.0;
}

function computeFramingNovelty(
  agentState: AgentBehavioralSummary | null,
  candidateAction: "new_post" | "thread_update"
): number {
  if (!agentState) return 0.5;

  const modes = agentState.recentPostModes;
  const total = Object.values(modes).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0.5;

  // Map candidateAction to mode key
  const modeKey = candidateAction === "thread_update" ? "update" : "new";
  const modeCount = modes[modeKey] || 0;
  const modeRatio = modeCount / total;

  if (modeRatio > 0.6) return 0.2;  // Overused mode
  if (modeRatio < 0.2) return 1.0;  // Underused mode
  return 0.5;                         // Balanced
}

function computeSectorRepetitionPenalty(
  agentSector: string,
  roomCoverage: RoomCoverageState | null
): number {
  if (!roomCoverage) return 0.0;

  const density = roomCoverage.postDensityBySector[agentSector] || 0;
  if (density <= 0.3) return 0.0;
  return Math.min(density - 0.3, 0.5);
}

function computeFreshCatalystBonus(
  candidateCatalyst: string,
  roomRecentPosts: AgentMessage[]
): boolean {
  const candidateTokens = tokenize(candidateCatalyst);
  if (candidateTokens.size === 0) return false;

  const allRoomCatalystTokens = new Set<string>();
  for (const post of roomRecentPosts) {
    if (post.catalyst) {
      for (const token of tokenize(post.catalyst)) {
        allRoomCatalystTokens.add(token);
      }
    }
  }

  const freshTokens = [...candidateTokens].filter((t) => !allRoomCatalystTokens.has(t));
  return freshTokens.length >= 2;
}

// --- Policy bucket derivation ---

function derivePolicyBucket(
  compositeScore: number,
  matchedThesis: Thesis | null,
  hasMeaningfulFreshSignal: boolean
): "new_post" | "update_existing" | "comment_only" | "stay_silent" {
  if (compositeScore >= 55) return "new_post";
  if (compositeScore >= 35 && matchedThesis) return "update_existing";
  if (compositeScore >= 35 && hasMeaningfulFreshSignal) return "new_post";
  if (compositeScore >= 20) return "comment_only";
  return "stay_silent";
}

// --- Main entry point ---

export function computeNoveltyAssessment(params: {
  candidateThemeKey: string;
  candidateCatalyst: string;
  candidateStance: string | null;
  agentSector: string;
  agentRecentPosts: AgentMessage[];
  roomRecentPosts: AgentMessage[];
  agentState: AgentBehavioralSummary | null;
  roomCoverage: RoomCoverageState | null;
  hasMeaningfulFreshSignal: boolean;
  matchedThesis: Thesis | null;
}): NoveltyAssessment {
  const {
    candidateThemeKey,
    candidateCatalyst,
    candidateStance,
    agentSector,
    agentRecentPosts,
    roomRecentPosts,
    agentState,
    roomCoverage,
    hasMeaningfulFreshSignal,
    matchedThesis
  } = params;

  // Individual signals
  const themeNovelty = computeThemeNovelty(candidateThemeKey, agentRecentPosts, roomRecentPosts);
  const catalystNovelty = computeCatalystNovelty(candidateCatalyst, agentRecentPosts, roomRecentPosts);
  const stanceNovelty = computeStanceNovelty(candidateThemeKey, candidateStance, agentRecentPosts, roomRecentPosts);

  // Determine tentative action for framing novelty
  const tentativeAction = matchedThesis ? "thread_update" as const : "new_post" as const;
  const framingNovelty = computeFramingNovelty(agentState, tentativeAction);

  const sectorRepetitionPenalty = computeSectorRepetitionPenalty(agentSector, roomCoverage);

  // Contextual bonuses
  const undercoverageBonus = roomCoverage?.undercoveredTopics.includes(candidateThemeKey) ?? false;
  const unresolvedThesisBonus =
    roomCoverage?.unresolvedMajorThemes.some((t) => t.topicPrimary === candidateThemeKey) ?? false;
  const freshCatalystBonus = computeFreshCatalystBonus(candidateCatalyst, roomRecentPosts);

  // Composite score (0–100)
  const raw =
    themeNovelty * 30 +
    catalystNovelty * 25 +
    stanceNovelty * 15 +
    framingNovelty * 10 +
    (1 - sectorRepetitionPenalty) * 10 +
    (undercoverageBonus ? 5 : 0) +
    (unresolvedThesisBonus ? 3 : 0) +
    (freshCatalystBonus ? 2 : 0);

  const compositeScore = Math.round(Math.min(100, Math.max(0, raw)));

  const policyBucket = derivePolicyBucket(compositeScore, matchedThesis, hasMeaningfulFreshSignal);

  // Build debug inputs
  const recentThemeKeys = [...agentRecentPosts, ...roomRecentPosts]
    .map(extractThemeKey)
    .filter((t, i, arr) => arr.indexOf(t) === i);

  const recentCatalysts = [...agentRecentPosts, ...roomRecentPosts]
    .map((p) => p.catalyst)
    .filter((c): c is string => c !== null)
    .filter((c, i, arr) => arr.indexOf(c) === i)
    .slice(0, 10);

  const recentStances = [...agentRecentPosts, ...roomRecentPosts]
    .filter((p) => p.stance !== null)
    .map((p) => ({ themeKey: extractThemeKey(p), stance: p.stance as string }))
    .filter(
      (s, i, arr) =>
        arr.findIndex((x) => x.themeKey === s.themeKey && x.stance === s.stance) === i
    )
    .slice(0, 10);

  return {
    themeNovelty,
    catalystNovelty,
    stanceNovelty,
    framingNovelty,
    sectorRepetitionPenalty,
    undercoverageBonus,
    unresolvedThesisBonus,
    freshCatalystBonus,
    compositeScore,
    policyBucket,
    scoringInputs: {
      candidateThemeKey,
      candidateCatalyst,
      recentThemeKeys,
      recentCatalysts,
      recentStances,
      roomOvercoveredTopics: roomCoverage?.overcoveredTopics || [],
      roomUndercoveredTopics: roomCoverage?.undercoveredTopics || [],
      agentRecentThemeCounts: agentState?.recentThemeCounts || {}
    }
  };
}
