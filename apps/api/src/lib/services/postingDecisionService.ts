import type {
  Agent,
  AgentMessage,
  AgentBehavioralSummary,
  NoveltyAssessment,
  PostingDecision,
  PostingReasonCode,
  RoomCoverageState
} from "@market-room/shared";
import type { HeadlineAnalysis } from "./headlineAnalysisService";

// AgentTopicPlan is a local type in marketRoomService — replicate the relevant shape here
type TopicPlanInputs = {
  primary: { themeKey: string; label: string; catalyst: string; score: number };
  matchedThesis: { id: string; rootMessageId: string | null } | null;
  updateTargetPostId: string | null;
  hasMeaningfulFreshSignal: boolean;
};

// --- Sector-based comment purpose defaults (mirrors pickCommentPurpose logic) ---

function defaultCommentPurposeForSector(
  agentSector: string,
  targetSector: string,
  targetContent: string,
  topicIsOvercovered: boolean
): string {
  if (topicIsOvercovered) return "invalidation_warning";
  if (agentSector === "Risk/Sentiment") return "invalidation_warning";
  if (agentSector === "Macro" && targetSector !== "Macro") return "cross_asset_translation";
  if (agentSector === "Rates" && /yield|treasury|bond|rate/i.test(targetContent)) return "missing_data_point";
  if (agentSector === "FX" && targetSector !== "FX") return "cross_asset_translation";
  if (agentSector === "Commodities" && targetSector !== "Commodities") return "historical_analog";
  if (agentSector === targetSector) return "agreement_with_extension";
  return "disagreement";
}

// --- Context code collection ---

function collectContextCodes(
  themeKey: string,
  hasMeaningfulFreshSignal: boolean,
  matchedThesis: TopicPlanInputs["matchedThesis"],
  agentState: AgentBehavioralSummary | null,
  roomCoverage: RoomCoverageState | null
): PostingReasonCode[] {
  const codes: PostingReasonCode[] = [];

  if (hasMeaningfulFreshSignal) codes.push("fresh_catalyst_signal");
  else codes.push("no_fresh_signal");

  if (matchedThesis) codes.push("matched_thesis_update");

  if (agentState?.topicsToDeprioritize.includes(themeKey)) {
    codes.push("deprioritized_topic");
  }

  if (roomCoverage) {
    if (roomCoverage.undercoveredTopics.includes(themeKey)) codes.push("undercoverage_opportunity");
    if (roomCoverage.overcoveredTopics.includes(themeKey)) codes.push("overcovered_topic_penalty");
    if (roomCoverage.unresolvedMajorThemes.some((t) => t.topicPrimary === themeKey)) {
      codes.push("unresolved_thesis_nudge");
    }
  }

  return codes;
}

// --- Main post decision engine ---

export function makePostingDecision(params: {
  topicPlan: TopicPlanInputs;
  noveltyAssessment: NoveltyAssessment;
  agentState: AgentBehavioralSummary | null;
  roomCoverage: RoomCoverageState | null;
  agentSector?: string;  // for comment purpose suggestion
  headlineAnalysis?: HeadlineAnalysis | null;
}): PostingDecision {
  const { topicPlan, noveltyAssessment, agentState, roomCoverage, agentSector, headlineAnalysis } = params;
  const { compositeScore } = noveltyAssessment;
  const { primary, matchedThesis, updateTargetPostId, hasMeaningfulFreshSignal } = topicPlan;
  const themeKey = primary.themeKey;

  const reasonCodes: PostingReasonCode[] = [];

  // --- Context codes (always collected regardless of action) ---
  const contextCodes = collectContextCodes(
    themeKey,
    hasMeaningfulFreshSignal,
    matchedThesis,
    agentState,
    roomCoverage
  );

  // --- Priority 0: Headline signal gate (requires headlineAnalysis) ---
  if (headlineAnalysis) {
    if (headlineAnalysis.market_signal_strength === "noise") {
      reasonCodes.push("headline_noise_gate", ...contextCodes);
      return {
        actionType: "stay_silent",
        targetThesisId: null,
        targetPostId: null,
        reasonCodes: dedupe(reasonCodes),
        suggestedTopic: { themeKey, label: primary.label, catalyst: primary.catalyst },
        suggestedCommentPurpose: null,
        noveltyScore: compositeScore,
        decidedAt: new Date().toISOString()
      };
    }

    if (headlineAnalysis.direct_relevance_score < 3 && !matchedThesis) {
      reasonCodes.push("low_headline_relevance", ...contextCodes);
      return {
        actionType: "stay_silent",
        targetThesisId: null,
        targetPostId: null,
        reasonCodes: dedupe(reasonCodes),
        suggestedTopic: { themeKey, label: primary.label, catalyst: primary.catalyst },
        suggestedCommentPurpose: null,
        noveltyScore: compositeScore,
        decidedAt: new Date().toISOString()
      };
    }

    // Hard gate: once the headline analysis marks a catalyst as not new, it must not
    // create another post or "update" comment just because topic novelty is high.
    //
    // This is especially important for durable official data prints (FRED payrolls,
    // fed funds, unemployment, 10Y, etc.) that remain the latest observation for
    // days/weeks. They are useful as background, but repeated unchanged prints should
    // not keep resurfacing as fresh agent activity.
    //
    // EXCEPTION: if a matched thesis exists, the same mechanism/asset match that
    // marks the headline "stale" is also the signal the thesis needs updating.
    // Route to update_existing so the agent can advance its open position — do NOT
    // silence it. Only silence when there is no thesis anchor at all.
    if (!headlineAnalysis.is_new_information) {
      if (isDurableOfficialPrint(headlineAnalysis)) {
        reasonCodes.push("stale_official_print_no_update", ...contextCodes);
        return {
          actionType: "stay_silent",
          targetThesisId: null,
          targetPostId: null,
          reasonCodes: dedupe(reasonCodes),
          suggestedTopic: { themeKey, label: primary.label, catalyst: primary.catalyst },
          suggestedCommentPurpose: null,
          noveltyScore: compositeScore,
          decidedAt: new Date().toISOString()
        };
      }

      if (matchedThesis) {
        reasonCodes.push("stale_headline_thesis_update", ...contextCodes);
        return {
          actionType: "update_existing",
          targetThesisId: matchedThesis.id,
          targetPostId: matchedThesis.rootMessageId || updateTargetPostId,
          reasonCodes: dedupe(reasonCodes),
          suggestedTopic: { themeKey, label: primary.label, catalyst: primary.catalyst },
          suggestedCommentPurpose: null,
          noveltyScore: compositeScore,
          decidedAt: new Date().toISOString()
        };
      }
      reasonCodes.push("stale_headline_no_thesis", ...contextCodes);
      return {
        actionType: "stay_silent",
        targetThesisId: null,
        targetPostId: null,
        reasonCodes: dedupe(reasonCodes),
        suggestedTopic: { themeKey, label: primary.label, catalyst: primary.catalyst },
        suggestedCommentPurpose: null,
        noveltyScore: compositeScore,
        decidedAt: new Date().toISOString()
      };
    }

    if (headlineAnalysis.recommended_action === "comment_on_other" && compositeScore < 55) {
      reasonCodes.push("headline_routed_to_comment", ...contextCodes);
      return {
        actionType: "comment_only",
        targetThesisId: null,
        targetPostId: null,
        reasonCodes: dedupe(reasonCodes),
        suggestedTopic: { themeKey, label: primary.label, catalyst: primary.catalyst },
        suggestedCommentPurpose: headlineAnalysis.comment_purpose,
        noveltyScore: compositeScore,
        decidedAt: new Date().toISOString()
      };
    }
  }

  // --- Priority 1: Hard silence — very low novelty, no thesis ---
  if (compositeScore < 20 && !matchedThesis) {
    reasonCodes.push("novelty_below_threshold", ...contextCodes);
    return {
      actionType: "stay_silent",
      targetThesisId: null,
      targetPostId: null,
      reasonCodes: dedupe(reasonCodes),
      suggestedTopic: { themeKey, label: primary.label, catalyst: primary.catalyst },
      suggestedCommentPurpose: null,
      noveltyScore: compositeScore,
      decidedAt: new Date().toISOString()
    };
  }

  // --- Priority 2: Stale agent thesis in unresolved major themes (age > 5 days) ---
  const agentStaleness = roomCoverage?.unresolvedMajorThemes.find(
    (t) => t.topicPrimary === themeKey && t.ageDays > 5
  );
  if (agentStaleness && matchedThesis) {
    reasonCodes.push("stale_agent_thesis", "unresolved_thesis_nudge", ...contextCodes);
    return {
      actionType: "update_existing",
      targetThesisId: matchedThesis.id,
      targetPostId: matchedThesis.rootMessageId || updateTargetPostId,
      reasonCodes: dedupe(reasonCodes),
      suggestedTopic: { themeKey, label: primary.label, catalyst: primary.catalyst },
      suggestedCommentPurpose: null,
      noveltyScore: compositeScore,
      decidedAt: new Date().toISOString()
    };
  }

  // --- Priority 3: High thesis load — prefer updates over new posts ---
  // BYPASS: if the headline is genuinely new information and routed to new_post,
  // let it through regardless of thesis load — new market events take priority over
  // thesis housekeeping.
  const headlineDemandsNewPost =
    headlineAnalysis?.is_new_information === true &&
    headlineAnalysis?.recommended_action === "new_post";
  const activeCount = agentState?.activeThesisCount ?? 0;
  if (activeCount >= 4 && matchedThesis && !headlineDemandsNewPost) {
    reasonCodes.push("high_thesis_load", "matched_thesis_update", ...contextCodes);
    return {
      actionType: "update_existing",
      targetThesisId: matchedThesis.id,
      targetPostId: matchedThesis.rootMessageId || updateTargetPostId,
      reasonCodes: dedupe(reasonCodes),
      suggestedTopic: { themeKey, label: primary.label, catalyst: primary.catalyst },
      suggestedCommentPurpose: null,
      noveltyScore: compositeScore,
      decidedAt: new Date().toISOString()
    };
  }

  // --- Priority 4: High novelty — new post (unless topic is explicitly deprioritized) ---
  const isDeprioritized = agentState?.topicsToDeprioritize.includes(themeKey) ?? false;
  if (compositeScore >= 55 && !isDeprioritized) {
    reasonCodes.push("novelty_above_threshold", ...contextCodes);
    return {
      actionType: "new_post",
      targetThesisId: null,
      targetPostId: null,
      reasonCodes: dedupe(reasonCodes),
      suggestedTopic: { themeKey, label: primary.label, catalyst: primary.catalyst },
      suggestedCommentPurpose: null,
      noveltyScore: compositeScore,
      decidedAt: new Date().toISOString()
    };
  }

  // --- Priority 5: Medium novelty + matched thesis → update ---
  if (compositeScore >= 35 && matchedThesis) {
    reasonCodes.push("matched_thesis_update", ...contextCodes);
    return {
      actionType: "update_existing",
      targetThesisId: matchedThesis.id,
      targetPostId: matchedThesis.rootMessageId || updateTargetPostId,
      reasonCodes: dedupe(reasonCodes),
      suggestedTopic: { themeKey, label: primary.label, catalyst: primary.catalyst },
      suggestedCommentPurpose: null,
      noveltyScore: compositeScore,
      decidedAt: new Date().toISOString()
    };
  }

  // --- Priority 6: Medium novelty + fresh signal → new post ---
  if (compositeScore >= 35 && hasMeaningfulFreshSignal) {
    reasonCodes.push("fresh_catalyst_signal", ...contextCodes);
    return {
      actionType: "new_post",
      targetThesisId: null,
      targetPostId: null,
      reasonCodes: dedupe(reasonCodes),
      suggestedTopic: { themeKey, label: primary.label, catalyst: primary.catalyst },
      suggestedCommentPurpose: null,
      noveltyScore: compositeScore,
      decidedAt: new Date().toISOString()
    };
  }

  // --- Priority 7: Low-medium novelty → comment-only ---
  if (compositeScore >= 20) {
    reasonCodes.push("low_novelty_range", ...contextCodes);
    const isTopicOvercovered = roomCoverage?.overcoveredTopics.includes(themeKey) ?? false;
    const suggestedCommentPurpose = agentSector
      ? defaultCommentPurposeForSector(agentSector, "", "", isTopicOvercovered)
      : null;
    return {
      actionType: "comment_only",
      targetThesisId: null,
      targetPostId: null,
      reasonCodes: dedupe(reasonCodes),
      suggestedTopic: { themeKey, label: primary.label, catalyst: primary.catalyst },
      suggestedCommentPurpose,
      noveltyScore: compositeScore,
      decidedAt: new Date().toISOString()
    };
  }

  // --- Default: stay silent ---
  reasonCodes.push("novelty_below_threshold", ...contextCodes);
  return {
    actionType: "stay_silent",
    targetThesisId: null,
    targetPostId: null,
    reasonCodes: dedupe(reasonCodes),
    suggestedTopic: { themeKey, label: primary.label, catalyst: primary.catalyst },
    suggestedCommentPurpose: null,
    noveltyScore: compositeScore,
    decidedAt: new Date().toISOString()
  };
}

// --- Comment pre-generation gate ---

export function evaluateCommentTarget(params: {
  responder: Agent;
  targetPost: AgentMessage;
  agentState: AgentBehavioralSummary | null;
  roomCoverage: RoomCoverageState | null;
  agentRecentPosts: AgentMessage[];
  commentPurpose: string;
}): { shouldComment: boolean; reasonCodes: PostingReasonCode[] } {
  const { responder, targetPost, agentState, roomCoverage, agentRecentPosts, commentPurpose } = params;
  const targetTheme = targetPost.thesisTopicPrimary;
  const reasonCodes: PostingReasonCode[] = [];

  // Rule 1: Agent has already posted 2+ times on the same theme recently
  if (targetTheme) {
    const sameThemeCount = agentRecentPosts.filter(
      (p) => p.thesisTopicPrimary === targetTheme
    ).length;
    if (sameThemeCount >= 2) {
      reasonCodes.push("overcovered_topic_penalty");
      return { shouldComment: false, reasonCodes };
    }
  }

  // Rule 2: Topic is overcovered AND purpose is agreement_with_extension (would pile on)
  if (
    targetTheme &&
    roomCoverage?.overcoveredTopics.includes(targetTheme) &&
    commentPurpose === "agreement_with_extension"
  ) {
    reasonCodes.push("overcovered_topic_penalty");
    return { shouldComment: false, reasonCodes };
  }

  // Rule 3: Underperforming agent commenting cross-sector (poor signal quality)
  const hitRate = agentState?.last20HitRate ?? null;
  if (hitRate !== null && hitRate < 0.4 && responder.sector !== targetPost.sector) {
    reasonCodes.push("low_novelty_range");
    return { shouldComment: false, reasonCodes };
  }

  return { shouldComment: true, reasonCodes };
}

// --- Utility ---

function dedupe<T>(arr: T[]): T[] {
  return arr.filter((item, index) => arr.indexOf(item) === index);
}

function isDurableOfficialPrint(headlineAnalysis: HeadlineAnalysis): boolean {
  const title = headlineAnalysis.headline_title.toLowerCase();
  if (!/\blatest official print\b/.test(title)) {
    return false;
  }

  return /\b(nonfarm payrolls|nfp|payrolls|fed funds|federal funds|cpi|pce|unemployment rate|us 10y treasury)\b/.test(title);
}
