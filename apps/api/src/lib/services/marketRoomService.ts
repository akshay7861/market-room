import type {
  Agent,
  AgentDiscussionThread,
  AgentMessage,
  AgentBehavioralSummary,
  DiscussionRun,
  DynamicMemoryContext,
  LiveMarketView,
  MarketEvent,
  MarketSnapshotPayload,
  MarketRoomView,
  MarketSnapshot,
  NoveltyAssessment,
  PostQualityFlag,
  PostingDecision,
  RoomCoverageState,
  SnapshotHeadline,
  SnapshotInstrument,
  Thesis,
  ThesisStatus,
  ThesisUpdate
} from "@market-room/shared";
import type { Env } from "../../index";
import { generateGeminiContent, getLlmModel, isLlmConfigured } from "../gemini";
import { fetchLatestMarketSnapshot } from "../market-data";
import { parseStructuredResponseJson, extractResponseOutputText } from "../openAiResponses";
import { createRepositories } from "../repositories";
import { loadRoom } from "../room";
import { refreshAgentBehavioralSummary, buildStatePromptBlock } from "./agentBehavioralStateService";
import { refreshRoomCoverageState, buildRoomCoveragePromptBlock } from "./roomCoverageService";
import { computeNoveltyAssessment } from "./noveltyScoreService";
import { makePostingDecision, evaluateCommentTarget } from "./postingDecisionService";
import { listRelevantMarketCasesForAgent } from "./marketCaseService";
import { findRelevantKnowledgeSnippets, type LocalKnowledgeSnippet } from "./knowledgeSnippetService";
import { recordDiscussionLearning } from "./learningService";
import { fetchOfficialCatalystLayer, isDataLakeOnlyHeadline, fetchRecentTreasuryAuctionData, formatAuctionDataBlock } from "./officialCatalystService";
import { buildHistoricalDataPromptBlock, buildAnalogContextBlock, getFxCorrelationMetadata, buildMacroEventCalendarBlock, setFredSeriesMap as setHistoricalFredMap, type SnapshotSignal, type FxCorrelationMetadata } from "./historicalDataContextService";
import { setFredSeriesMap as setMetricsFredMap } from "./verifiedMarketMetricsService";
import { loadFredSeriesMap } from "./fredCacheService";
import { fetchYahooFinanceBriefing } from "./yahooFinanceNewsService";
import { fetchMarketauxBriefing } from "./marketauxNewsService";
import { fetchFinnhubBriefing } from "./finnhubNewsService";
import { fetchPolygonBriefing } from "./polygonNewsService";
import { analyzeTopHeadlinesForAgent, type HeadlineAnalysis } from "./headlineAnalysisService";
import {
  buildDynamicMemoryContext,
  buildDynamicMemoryPromptBlock,
  buildFrozenPeerThesisSnapshot,
  buildPeerAgentThesesView,
  refreshDynamicHouseViews,
  type FrozenPeerThesisSnapshotRow
} from "./dynamicMemoryService";
import {
  buildEquityFundamentalsForPost,
  buildEquityFundamentalsRepairSentence,
  hasVisibleFetchedFundamentals,
  type EquitySubjectDataContext
} from "./equityQuoteService";
import { evaluateDomainRelevance, type DomainRelevanceResult } from "./domainRelevanceService";
import {
  buildVerifiedMarketMetricsContext,
  hasMissingMetricClaim,
  hasUnverifiedMetricClaim,
  hasVerifiedMetricCitation,
  type VerifiedMarketMetricsContext
} from "./verifiedMarketMetricsService";

const defaultDiscussionPrompt =
  "Discuss the biggest market drivers right now, the main risk, and one thing investors should watch next.";

type DiscussionTriggerMode = "manual" | "scheduled" | "synthesis";
type DiscussionProfile =
  | "commodity_heavy"
  | "rates_heavy"
  | "equity_risk_on_off"
  | "cross_asset";

type RunMarketDiscussionOptions = {
  triggerMode?: DiscussionTriggerMode;
  snapshotPayload?: MarketSnapshotPayload;
  eventTitle?: string;
  eventSummary?: string;
  triggerReason?: string;
  materialityReasons?: string[];
};

type FrozenRunContext = {
  runContextId: string;
  snapshotTimestamp: string;
  peerSnapshotVersion: string;
  peerSnapshot: FrozenPeerThesisSnapshotRow[];
  roomSynthesisHeadlines: SnapshotHeadline[];
  synthesisHeadlinesByAgentId: Map<string, SnapshotHeadline[]>;
  roomSynthesisThemeBoard: SynthesisThemeCluster[];
  synthesisThemeBoardByAgentId: Map<string, SynthesisThemeCluster[]>;
  synthesisThemeBoard: SynthesisThemeCluster[];
  dominantSynthesisTheme: SynthesisThemeCluster | null;
  synthesisThemeDigest: string[];
  synthesisTopicLabel: string;
  synthesisCatalystKey: string;
  synthesisPrimaryHeadline: string;
};

type SynthesisThemeDefinition = {
  key: string;
  label: string;
  matcher: RegExp;
  mechanismTerms: string[];
  sectorBias: Partial<Record<string, number>>;
  generic?: boolean;
};

type SynthesisThemeCluster = {
  key: string;
  label: string;
  headlines: SnapshotHeadline[];
  mechanismTerms: string[];
  sectorRelevance: Record<string, number>;
  isGeneric: boolean;
  freshnessScore: number;
  hasCompanyHeadline: boolean;
};

type AgentSynthesisAnchorSelection = {
  themeKey: string;
  themeLabel: string;
  anchorHeadline: SnapshotHeadline | null;
  anchorConfidence: "high" | "medium" | "low";
  mechanismTerms: string[];
  isGenericFallback: boolean;
  relevanceScore: number;
  repetitionChallenge: string | null;
  hasCompanyHeadline: boolean;
  participationAdjustment: number;
  selectionMode: "strict";
  selectionSource: "agent_board" | "room_board";
  selectionReason:
    | "selected_company_theme"
    | "selected_macro_theme"
    | "room_fallback";
};

type DiscussionPlan = {
  profile: DiscussionProfile;
  profileLabel: string;
  routingReason: string;
  selectedAgents: Agent[];
  opener: Agent;
  roundTwoAgents: Agent[];
  roundThreeAgent: Agent | null;
  orchestration: string[];
};

type ThemeOpportunity = {
  themeKey: string;
  label: string;
  catalyst: string;
  score: number;
  evidence: string[];
};

type AgentTopicPlan = {
  primary: ThemeOpportunity;
  alternates: ThemeOpportunity[];
  recentAgentThemes: string[];
  recentRoomThemes: string[];
  coveredThemesToAvoid: string[];
  action: "new_post" | "thread_update" | "stay_silent";
  updateTargetPostId: string | null;
  matchedThesis: Thesis | null;
  thesisStatus: ThesisStatus | null;
  topicPrimaryKey: string;
  topicSecondaryKey: string | null;
  hasMeaningfulFreshSignal: boolean;
};

type CommentPurpose =
  // Legacy values (kept for backwards compat with stored messages)
  | "disagreement"
  | "cross_asset_translation"
  | "missing_data_point"
  | "historical_analog"
  | "invalidation_warning"
  | "agreement_with_extension"
  // Expanded taxonomy (added with headline-analysis layer)
  | "agree_and_extend"
  | "disagree_on_mechanism"
  | "disagree_on_market_impact"
  | "add_cross_asset_spillover"
  | "add_historical_analog"
  | "narrow_the_signal"
  | "call_out_noise"
  | "ask_for_confirmation_signal"
  | "confirm_existing_thesis";

type ThesisWritePlan =
  | {
      kind: "create";
      thesis: Thesis;
      update: ThesisUpdate;
    }
  | {
      kind: "update";
      thesisId: string;
      status: ThesisStatus;
      confidenceCurrent: number | null;
      latestMessageId: string | null;
      latestSnapshotId: string | null;
      latestEventId: string | null;
      canonicalClaim?: string | null;
      title?: string | null;
      topicPrimary?: string | null;
      topicSecondary?: string | null;
      lastUpdatedAt: string;
      update: ThesisUpdate;
    };

type PlannedForumEntry = {
  message: AgentMessage;
  thesisWrite: ThesisWritePlan | null;
};

type ForumGenerationDiagnostics = {
  agentsConsidered: number;
  topLevelCandidates: number;
  suppressedAfterGeneration: number;
  commentsOnly: number;
  publishedPosts: number;
  bestCandidateScore: number;
  floorRescueUsed: boolean;
  hardFailSuppressions: number;
  softFailSuppressions: number;
};

type ForumGenerationResult = {
  entries: PlannedForumEntry[];
  diagnostics: ForumGenerationDiagnostics;
};

type CatalystFilterScope = "general" | "sector";

type StanceLockChallenge = {
  active: boolean;
  stance: string;
  streak: number;
  block: string;
};

type MechanismFamily =
  | "labor_inflation_persistence"
  | "fed_easing_timing"
  | "term_premium_repricing"
  | "credit_stress"
  | "commodity_pass_through"
  | "earnings_fundamentals_deterioration"
  | "revisions_breadth_sector_weakness"
  | "cross_asset_setup";

type MechanismSelection = {
  family: MechanismFamily;
  score: number;
  evidence: string[];
  anchor: string;
};

const EMPTY_VERIFIED_MARKET_METRICS_CONTEXT: VerifiedMarketMetricsContext = {
  block: "",
  metrics: [],
  missingKeys: []
};

export async function listAgents(env: Env): Promise<Agent[]> {
  return createRepositories(env).agents.list();
}

const DEFAULT_VISIBLE_THREAD_LIMIT = 18;
const MAX_VISIBLE_THREAD_LIMIT = 36;

function normalizeVisibleThreadLimit(threadLimit?: number): number {
  if (!Number.isFinite(threadLimit)) {
    return DEFAULT_VISIBLE_THREAD_LIMIT;
  }

  return Math.min(Math.max(Math.floor(threadLimit || DEFAULT_VISIBLE_THREAD_LIMIT), DEFAULT_VISIBLE_THREAD_LIMIT), MAX_VISIBLE_THREAD_LIMIT);
}

function normalizeThreadOffset(threadOffset?: number): number {
  if (!Number.isFinite(threadOffset) || !threadOffset || threadOffset < 0) {
    return 0;
  }

  return Math.floor(threadOffset);
}

export async function getMarketRoomView(
  env: Env,
  clientId: string | null = null,
  options: { threadLimit?: number; threadOffset?: number } = {}
): Promise<MarketRoomView> {
  const repositories = createRepositories(env);
  const room = loadRoom();
  const latestEvent = await repositories.events.getLatestDiscussionEvent();
  const latestSnapshot = await repositories.marketSnapshots.getLatest();
  const visibleThreadLimit = normalizeVisibleThreadLimit(options.threadLimit);
  const visibleThreadOffset = normalizeThreadOffset(options.threadOffset);
  const rawThreadLimit = visibleThreadLimit * 2;
  const rawThreadOffset = visibleThreadOffset * 2;
  const threadBundle = await repositories.messages.listThreadsByRoom(room.id, rawThreadLimit, 6, clientId, rawThreadOffset);
  const threads = dedupeDisplayThreads(buildDiscussionThreads(threadBundle.posts, threadBundle.comments)).slice(0, visibleThreadLimit);
  const messages = threads.flatMap((thread) => [thread.post, ...thread.comments]).sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
  const activeAgents = await repositories.agents.listActive();

  return {
    room,
    latestSnapshot,
    latestEvent,
    messages,
    threads,
    activeAgents
  };
}

export async function getLiveMarketView(env: Env, clientId: string | null = null): Promise<LiveMarketView> {
  const repositories = createRepositories(env);
  const room = loadRoom();
  const latestEvent = await repositories.events.getLatestDiscussionEvent();
  const latestSnapshot = await repositories.marketSnapshots.getLatest();
  const threadBundle = await repositories.messages.listThreadsByRoom(room.id, 36, 4, clientId);
  const threads = dedupeDisplayThreads(buildDiscussionThreads(threadBundle.posts, threadBundle.comments));
  const activeAgents = await repositories.agents.listActive();
  const snapshotPayload = parseSnapshotPayload(latestSnapshot);

  return {
    room,
    latestSnapshot,
    latestEvent,
    headlines: snapshotPayload?.headlines || [],
    topThreads: [...threads].sort((left, right) => threadScore(right) - threadScore(left)).slice(0, 6),
    activeAgents
  };
}

export async function reactToMarketRoomMessage(
  env: Env,
  messageId: string,
  clientId: string,
  reaction: "like" | "dislike" | null
): Promise<AgentMessage | null> {
  const repositories = createRepositories(env);
  await repositories.messageReactions.setReaction(messageId, clientId, reaction, new Date().toISOString());
  return repositories.messages.getById(messageId, clientId);
}

export function getDefaultDiscussionPrompt(): string {
  return defaultDiscussionPrompt;
}

export async function runMarketDiscussion(
  env: Env,
  prompt?: string,
  options: RunMarketDiscussionOptions = {}
): Promise<DiscussionRun> {
  const repositories = createRepositories(env);
  const room = loadRoom();
  const activeAgents = await repositories.agents.listActive();
  const previousSnapshotRecord = options.snapshotPayload ? null : await repositories.marketSnapshots.getLatest();
  const previousSnapshotPayload = parseSnapshotPayload(previousSnapshotRecord);
  const now = new Date().toISOString();
  const finalPrompt =
    prompt?.trim() ||
    options.snapshotPayload?.prompt ||
    defaultDiscussionPrompt;
  const triggerMode = options.triggerMode || "manual";
  const synthesisAgentLimit = parseSynthesisAgentLimit(env.SYNTHESIS_AGENT_LIMIT, activeAgents.length);
  const synthesisAgents = synthesisAgentLimit ? activeAgents.slice(0, synthesisAgentLimit) : activeAgents;
  await repositories.theses.markStaleBefore(
    room.id,
    new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    now
  );
  const recentTheses = await repositories.theses.listRecentByRoom(room.id, 24);
  const marketSnapshotPayload =
    options.snapshotPayload ||
    (await fetchLatestMarketSnapshot(env, finalPrompt, {
      now,
      previousSnapshot: previousSnapshotPayload
    }));
  const discussionPlan =
    triggerMode === "synthesis"
      ? buildSynthesisDiscussionPlan(synthesisAgents)
      : buildDiscussionPlan(activeAgents, marketSnapshotPayload);
  const priorRoomThreadBundle = await repositories.messages.listThreadsByRoom(room.id, 24, 4); // 24 threads = ~6 full runs of history for novelty check
  const priorRoomThreads = buildDiscussionThreads(priorRoomThreadBundle.posts, priorRoomThreadBundle.comments);
  const [officialBriefing, yahooBriefing, marketauxBriefing, finnhubBriefing, polygonBriefing, frozenPeerSnapshot] = await Promise.all([
    fetchOfficialCatalystLayer(env, activeAgents),
    fetchYahooFinanceBriefing(activeAgents),
    fetchMarketauxBriefing(env, activeAgents),
    fetchFinnhubBriefing(env, activeAgents),
    fetchPolygonBriefing(env, activeAgents),
    buildFrozenPeerThesisSnapshot(env, activeAgents)
  ]);

  const recentCatalystMessages = flattenThreadPosts(priorRoomThreads, 80);
  const generalCatalystHeadlines = filterEligibleHeadlinesForAgent({
    headlines: dedupeHeadlines([
      ...marketauxBriefing.generalHeadlines,
      ...yahooBriefing.generalHeadlines,
      ...finnhubBriefing.generalHeadlines,
      ...polygonBriefing.generalHeadlines,
      ...officialBriefing.generalHeadlines
    ].filter((headline) => !isDataLakeOnlyHeadline(headline))),
    recentMessages: recentCatalystMessages,
    scope: "general"
  });
  const sectorHeadlinesByAgentId = new Map<string, SnapshotHeadline[]>();

  for (const agent of activeAgents) {
    // Priority order: Marketaux first, Yahoo second, Finnhub third,
    // Polygon.io/Massive fourth, and high-tier official news last.
    // Fed RSS low/medium items are already suppressed/context-only in officialCatalystService.
    sectorHeadlinesByAgentId.set(
      agent.id,
      filterEligibleHeadlinesForAgent({
        agent,
        headlines: dedupeHeadlines([
          ...(marketauxBriefing.headlinesByAgentId.get(agent.id) || []),
          ...(yahooBriefing.headlinesByAgentId.get(agent.id) || []),
          ...(finnhubBriefing.headlinesByAgentId.get(agent.id) || []),
          ...(polygonBriefing.headlinesByAgentId.get(agent.id) || []),
          ...(officialBriefing.headlinesByAgentId.get(agent.id) || [])
        ].filter((headline) => !isDataLakeOnlyHeadline(headline))),
        recentMessages: recentCatalystMessages,
        scope: "sector"
      })
    );
  }

  const rawGeneralCatalystCount = dedupeHeadlines([
    ...marketauxBriefing.generalHeadlines,
    ...yahooBriefing.generalHeadlines,
    ...finnhubBriefing.generalHeadlines,
    ...polygonBriefing.generalHeadlines,
    ...officialBriefing.generalHeadlines
  ].filter((headline) => !isDataLakeOnlyHeadline(headline)));

  console.log(
    `[catalyst-source] market_room eligible=${generalCatalystHeadlines.length}/${rawGeneralCatalystCount.length} ` +
    `marketaux=${marketauxBriefing.generalHeadlines.length} yahoo=${yahooBriefing.generalHeadlines.length} ` +
    `finnhub=${finnhubBriefing.generalHeadlines.length} polygon=${polygonBriefing.generalHeadlines.length} ` +
    `official_news_high=${officialBriefing.generalHeadlines.length} data_lake_sources=excluded`
  );

  const enrichedSnapshotPayload = mergeForumHeadlinesIntoSnapshot(
    marketSnapshotPayload,
    generalCatalystHeadlines
  );
  const frozenRunContext = buildFrozenRunContext({
    triggerMode,
    triggerReason: options.triggerReason,
    now,
    snapshot: enrichedSnapshotPayload,
    peerSnapshot: frozenPeerSnapshot,
    roomHeadlines: generalCatalystHeadlines,
    activeAgents,
    sectorHeadlinesByAgentId
  });
  console.log(
    `[run-context] mode=${triggerMode} snapshot_ts=${frozenRunContext.snapshotTimestamp} peer_snapshot_version=${frozenRunContext.peerSnapshotVersion} context=${frozenRunContext.runContextId}`
  );
  if (triggerMode === "synthesis") {
    const agentThemeCounts = activeAgents
      .map((agent) => `${agent.id}:${(frozenRunContext.synthesisThemeBoardByAgentId.get(agent.id) || []).length}`)
      .join(",");
    console.log(
      `[synthesis-selection] run_context=${frozenRunContext.runContextId} room_synthesis_headlines=${frozenRunContext.roomSynthesisHeadlines.length} room_theme_count=${frozenRunContext.roomSynthesisThemeBoard.length} agent_theme_counts=${agentThemeCounts}`
    );
    console.log(
      `[synthesis-mode] tick=${options.triggerReason || "synthesis"} topic=${frozenRunContext.synthesisTopicLabel} catalyst="${truncateText(frozenRunContext.synthesisPrimaryHeadline, 80)}" agents=${discussionPlan.selectedAgents.map((agent) => agent.id).join(",")}`
    );
  }

  const snapshot: MarketSnapshot = {
    id: crypto.randomUUID(),
    snapshotType: enrichedSnapshotPayload.usedFallback ? "fallback_market_snapshot" : "live_market_snapshot",
    payloadJson: JSON.stringify(enrichedSnapshotPayload, null, 2),
    createdAt: now
  };

  await repositories.marketSnapshots.create(snapshot);

  const event: MarketEvent = {
    id: crypto.randomUUID(),
    eventType: "market_discussion_run",
    title: options.eventTitle || eventTitleFor(triggerMode),
    summary:
      options.eventSummary ||
      eventSummaryFor(
        triggerMode,
        discussionPlan.selectedAgents.length,
        activeAgents.length,
        discussionPlan.profileLabel,
        discussionPlan.routingReason,
        options.materialityReasons
      ),
    payloadJson: JSON.stringify(
      {
        roomId: room.id,
        prompt: finalPrompt,
        agentCount: discussionPlan.selectedAgents.length,
        activeAgentCount: activeAgents.length,
        selectedAgentIds: discussionPlan.selectedAgents.map((agent) => agent.id),
        selectedSectors: discussionPlan.selectedAgents.map((agent) => agent.sector),
        postingAgentIds: activeAgents.map((agent) => agent.id),
        triggerMode,
        triggerReason: options.triggerReason || triggerMode,
        synthesisTopicLabel: frozenRunContext.synthesisTopicLabel,
        synthesisPrimaryHeadline: frozenRunContext.synthesisPrimaryHeadline,
        runContextId: frozenRunContext.runContextId,
        materialityReasons: options.materialityReasons || [],
        snapshotHeadline: enrichedSnapshotPayload.headline,
        snapshotProvider: enrichedSnapshotPayload.provider,
        usedFallback: enrichedSnapshotPayload.usedFallback,
        discussionProfile: discussionPlan.profile,
        routingReason: discussionPlan.routingReason,
        orchestration:
          triggerMode === "synthesis"
            ? ["synthesis_posts_only", ...discussionPlan.orchestration]
            : ["forum_posts", "agent_comments", ...discussionPlan.orchestration]
      },
      null,
      2
    ),
    snapshotId: snapshot.id,
    createdAt: now
  };

  await repositories.events.create(event);

  // Persist Marketaux fetch log after event.id is known
  if (marketauxBriefing.logItems.length > 0) {
    const itemsWithEventId = marketauxBriefing.logItems.map((item) => ({
      ...item,
      eventId: event.id
    }));
    repositories.fetchedNews.logBatch(itemsWithEventId).catch((err) =>
      console.error("[marketaux] Failed to log fetch items:", err)
    );
  }

  // Persist Finnhub fetch log after event.id is known
  if (finnhubBriefing.logItems.length > 0) {
    const itemsWithEventId = finnhubBriefing.logItems.map((item) => ({
      ...item,
      eventId: event.id
    }));
    repositories.fetchedNews.logBatch(itemsWithEventId).catch((err) =>
      console.error("[finnhub] Failed to log fetch items:", err)
    );
  }

  // Persist Polygon.io/Massive fetch log after event.id is known
  if (polygonBriefing.logItems.length > 0) {
    const itemsWithEventId = polygonBriefing.logItems.map((item) => ({
      ...item,
      eventId: event.id
    }));
    repositories.fetchedNews.logBatch(itemsWithEventId).catch((err) =>
      console.error("[polygon] Failed to log fetch items:", err)
    );
  }

  const forumGenerationResult =
    discussionPlan.selectedAgents.length === 0
      ? {
          entries: [],
          diagnostics: {
            agentsConsidered: 0,
            topLevelCandidates: 0,
            suppressedAfterGeneration: 0,
            commentsOnly: 0,
            publishedPosts: 0,
            bestCandidateScore: 0,
            floorRescueUsed: false,
            hardFailSuppressions: 0,
            softFailSuppressions: 0
          }
        }
      : isLlmConfigured(env)
        ? await generateAgentForumPosts({
            env,
            agents: activeAgents,
            marketSnapshot: enrichedSnapshotPayload,
            previousSnapshot: previousSnapshotPayload,
            roomId: room.id,
            eventId: event.id,
            discussionPlan,
            generalHeadlines: generalCatalystHeadlines,
            sectorHeadlinesByAgentId,
            priorRoomThreads,
            recentTheses,
            snapshotId: snapshot.id,
            triggerMode,
            frozenRunContext
        })
        : {
            entries: generateMockForumPosts(activeAgents, marketSnapshotPayload, room.id, event.id, snapshot.id),
            diagnostics: {
              agentsConsidered: discussionPlan.selectedAgents.length,
              topLevelCandidates: discussionPlan.selectedAgents.length,
              suppressedAfterGeneration: 0,
              commentsOnly: 0,
              publishedPosts: discussionPlan.selectedAgents.length,
              bestCandidateScore: 0,
              floorRescueUsed: false,
              hardFailSuppressions: 0,
              softFailSuppressions: 0
            }
          };
  const generatedForumEntries = forumGenerationResult.entries;
  const forumDiagnostics = forumGenerationResult.diagnostics;

  const generatedPostEntries = generatedForumEntries.filter((entry) => entry.message.messageType === "post");
  const generatedSelfUpdateEntries = generatedForumEntries.filter((entry) => entry.message.messageType === "comment");
  const generatedPosts = generatedPostEntries.map((entry) => entry.message);
  const generatedSelfUpdates = generatedSelfUpdateEntries.map((entry) => entry.message);

  const generatedComments =
    triggerMode === "synthesis"
      ? []
      :
    generatedPosts.length === 0 && priorRoomThreads.length === 0
      ? []
      : isLlmConfigured(env)
        ? await generateAgentForumComments({
            env,
            agents: activeAgents,
            posts: generatedPosts,
            marketSnapshot: enrichedSnapshotPayload,
            previousSnapshot: previousSnapshotPayload,
            roomId: room.id,
            eventId: event.id,
            discussionPlan,
            generalHeadlines: generalCatalystHeadlines,
            sectorHeadlinesByAgentId,
            priorRoomThreads,
            snapshotId: snapshot.id,
            frozenRunContext
          })
        : generateMockForumComments(activeAgents, generatedPosts, room.id, event.id);

  const publishedTopLevelPosts = generatedPostEntries.length;
  const commentsOnlyCount = forumDiagnostics.commentsOnly;
  const suppressedAfterGenerationCount = forumDiagnostics.suppressedAfterGeneration;
  const hardFailSuppressions = forumDiagnostics.hardFailSuppressions;
  const softFailSuppressions = forumDiagnostics.softFailSuppressions;
  const emptyRun = triggerMode === "synthesis" ? (publishedTopLevelPosts === 0 ? "yes" : "no") : "n/a";
  console.log(
    `[run-volume] mode=${triggerMode} context=${frozenRunContext.runContextId} agents_considered=${forumDiagnostics.agentsConsidered} top_level_candidates=${forumDiagnostics.topLevelCandidates} suppressed_after_generation=${suppressedAfterGenerationCount} comments_only=${commentsOnlyCount} published_posts=${publishedTopLevelPosts}`
  );
  if (triggerMode === "synthesis") {
    console.log(
      `[synthesis-volume] context=${frozenRunContext.runContextId} empty_run=${emptyRun} best_candidate_score=${forumDiagnostics.bestCandidateScore} floor_rescue_used=${forumDiagnostics.floorRescueUsed ? "yes" : "no"} hard_fail=${hardFailSuppressions} soft_fail_accumulated=${softFailSuppressions}`
    );
  }

  const plannedEntries = [...generatedForumEntries, ...generatedComments].sort((left, right) =>
    left.message.createdAt.localeCompare(right.message.createdAt)
  );

  for (const entry of plannedEntries) {
    await repositories.messages.create(entry.message);
  }

  for (const entry of plannedEntries) {
    if (!entry.thesisWrite) {
      continue;
    }

    if (entry.thesisWrite.kind === "create") {
      await repositories.theses.create(entry.thesisWrite.thesis);
      await repositories.theses.createUpdate(entry.thesisWrite.update);
      continue;
    }

    await repositories.theses.applyUpdate(entry.thesisWrite.thesisId, {
      status: entry.thesisWrite.status,
      confidenceCurrent: entry.thesisWrite.confidenceCurrent,
      latestMessageId: entry.thesisWrite.latestMessageId,
      latestSnapshotId: entry.thesisWrite.latestSnapshotId,
      latestEventId: entry.thesisWrite.latestEventId,
      canonicalClaim: entry.thesisWrite.canonicalClaim,
      title: entry.thesisWrite.title,
      topicPrimary: entry.thesisWrite.topicPrimary,
      topicSecondary: entry.thesisWrite.topicSecondary,
      lastUpdatedAt: entry.thesisWrite.lastUpdatedAt
    });
    await repositories.theses.createUpdate(entry.thesisWrite.update);
  }

  await refreshDynamicHouseViews(env, activeAgents, event.id);

  await recordDiscussionLearning({
    env,
    event,
    snapshot,
    marketSnapshot: enrichedSnapshotPayload,
    messages: generatedPosts
  });

  for (const agent of activeAgents) {
    await refreshAgentBehavioralSummary(env, agent.id, room.id);
  }

  await refreshRoomCoverageState(env, room.id);

  const generatedCommentMessages = generatedComments.map((entry) => entry.message);
  const generatedThreads = buildDiscussionThreads(generatedPosts, [...generatedSelfUpdates, ...generatedCommentMessages]);
  const generatedMessages = [...generatedPosts, ...generatedSelfUpdates, ...generatedCommentMessages].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );

  return {
    id: event.id,
    roomId: room.id,
    prompt: finalPrompt,
    snapshotId: snapshot.id,
    eventId: event.id,
    createdAt: now,
    status: "completed",
    messages: generatedMessages,
    threads: generatedThreads
  };
}

function eventTitleFor(triggerMode: DiscussionTriggerMode): string {
  if (triggerMode === "synthesis") {
    return "Market Room synthesis forum update";
  }
  return triggerMode === "scheduled"
    ? "Market Room scheduled forum update"
    : "Market Room forum update";
}

function eventSummaryFor(
  triggerMode: DiscussionTriggerMode,
  selectedAgentCount: number,
  activeAgentCount: number,
  profileLabel: string,
  routingReason: string,
  materialityReasons?: string[]
): string {
  if (triggerMode === "synthesis") {
    return `A synthesis forum update asked ${selectedAgentCount} of ${activeAgentCount} active agents to form forward theses from shared market state and peer desk context.`;
  }
  if (triggerMode === "scheduled") {
    const reasons = materialityReasons?.slice(0, 2).join("; ");
    const isHourlyRefresh = reasons?.toLowerCase().includes("hourly scheduled refresh");
    return reasons
      ? isHourlyRefresh
        ? `A scheduled ${profileLabel} forum update woke ${selectedAgentCount} of ${activeAgentCount} active agents for the hourly room refresh.`
        : `A scheduled ${profileLabel} forum update woke ${selectedAgentCount} of ${activeAgentCount} active agents after material changes were detected: ${reasons}.`
      : `A scheduled ${profileLabel} forum update woke ${selectedAgentCount} of ${activeAgentCount} active agents because ${routingReason.toLowerCase()}.`;
  }

  return `A ${profileLabel} forum update woke ${selectedAgentCount} of ${activeAgentCount} active agents because ${routingReason.toLowerCase()}.`;
}

function buildSynthesisDiscussionPlan(agents: Agent[]): DiscussionPlan {
  const selectedAgents = sortAgentsForForum(agents);
  const opener = selectedAgents[0] || createSyntheticFallbackAgent();
  return {
    profile: "cross_asset",
    profileLabel: "synthesis",
    routingReason: "cadence-driven synthesis tick",
    selectedAgents,
    opener,
    roundTwoAgents: selectedAgents.slice(1, 3),
    roundThreeAgent: selectedAgents[3] || null,
    orchestration: ["mode:synthesis", "all_agents_parallel", "thesis_only_output"]
  };
}

function buildDiscussionPlan(agents: Agent[], marketSnapshot: MarketSnapshotPayload): DiscussionPlan {
  if (agents.length === 0) {
    return {
      profile: "cross_asset",
      profileLabel: "cross-asset",
      routingReason: "no active specialists were available",
      selectedAgents: [],
      opener: createSyntheticFallbackAgent(),
      roundTwoAgents: [],
      roundThreeAgent: null,
      orchestration: ["route:cross_asset", "no_active_agents"]
    };
  }

  const profileDecision = classifyDiscussionProfile(marketSnapshot);
  const primaryRoute = sectorRouteForProfile(profileDecision.profile)
    .map((sector) => agents.find((agent) => agent.sector === sector))
    .filter((agent): agent is Agent => Boolean(agent));
  const supplementalAgents = agents.filter(
    (agent) => !primaryRoute.some((selected) => selected.id === agent.id)
  );
  const selectedAgents = [...primaryRoute, ...supplementalAgents].slice(0, 4);
  const opener = selectedAgents.find((agent) => agent.sector === "Macro") || selectedAgents[0];
  const specialists = selectedAgents.filter((agent) => agent.id !== opener.id);

  return {
    profile: profileDecision.profile,
    profileLabel: profileLabelFor(profileDecision.profile),
    routingReason: profileDecision.reason,
    selectedAgents,
    opener,
    roundTwoAgents: specialists.slice(0, 2),
    roundThreeAgent: specialists[2] || null,
    orchestration: [
      `route:${profileDecision.profile}`,
      "round_1_macro_open",
      "round_2_specialist_replies",
      "round_3_final_specialist"
    ]
  };
}

function createSyntheticFallbackAgent(): Agent {
  return {
    id: "macro-agent",
    name: "Macro Agent",
    slug: "macro-agent",
    sector: "Macro",
    bio: "",
    avatarUrl: "",
    systemPrompt: "",
    memorySummary: "",
    vectorStoreId: null,
    active: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString()
  };
}

function classifyDiscussionProfile(marketSnapshot: MarketSnapshotPayload): {
  profile: DiscussionProfile;
  reason: string;
} {
  const commodityMoves = [
    absolutePercentChangeFor(marketSnapshot, "wti"),
    absolutePercentChangeFor(marketSnapshot, "brent"),
    absolutePercentChangeFor(marketSnapshot, "natural_gas"),
    absolutePercentChangeFor(marketSnapshot, "copper"),
    absolutePercentChangeFor(marketSnapshot, "gold")
  ];
  const commodityScore =
    commodityMoves.filter((move) => move >= 2).length * 2 +
    commodityMoves.filter((move) => move >= 1 && move < 2).length +
    headlineKeywordScore(marketSnapshot, [
      "oil",
      "opec",
      "crude",
      "gas",
      "lng",
      "gold",
      "copper",
      "metals",
      "commodity"
    ]);

  const ratesScore =
    (absoluteBpsChangeFor(marketSnapshot, "us10y") >= 8 ? 3 : 0) +
    (absolutePercentChangeFor(marketSnapshot, "dxy") >= 0.5 ? 1 : 0) +
    headlineKeywordScore(marketSnapshot, [
      "fed",
      "treasury",
      "yield",
      "rates",
      "inflation",
      "cpi",
      "payroll",
      "central bank",
      "bond"
    ]);

  const equityScore =
    (Math.max(
      absolutePercentChangeFor(marketSnapshot, "sp500"),
      absolutePercentChangeFor(marketSnapshot, "nasdaq")
    ) >= 1
      ? 2
      : 0) +
    headlineKeywordScore(marketSnapshot, [
      "stocks",
      "equity",
      "nasdaq",
      "s&p",
      "earnings",
      "tech",
      "selloff",
      "rally",
      "volatility",
      "risk"
    ]);

  if (commodityScore >= 2 && commodityScore >= ratesScore && commodityScore >= equityScore) {
    return {
      profile: "commodity_heavy",
      reason: `commodity signals led the snapshot, with natural gas ${metricChangeOrValue(marketSnapshot, "natural_gas")} and WTI ${metricChangeOrValue(marketSnapshot, "wti")}`
    };
  }

  if (ratesScore >= 2 && ratesScore >= equityScore) {
    return {
      profile: "rates_heavy",
      reason: `rates signals led the snapshot, with the US 10Y at ${metricValue(snapshotMetricsMap(marketSnapshot), "us10y")} and DXY ${metricChangeOrValue(marketSnapshot, "dxy")}`
    };
  }

  if (equityScore >= 2) {
    return {
      profile: "equity_risk_on_off",
      reason: `equity-risk signals led the snapshot, with the S&P 500 ${metricChangeOrValue(marketSnapshot, "sp500")} and Nasdaq ${metricChangeOrValue(marketSnapshot, "nasdaq")}`
    };
  }

  return {
    profile: "cross_asset",
    reason: "no single sector dominated, so the room is using a balanced cross-asset route"
  };
}

function sectorRouteForProfile(profile: DiscussionProfile): string[] {
  switch (profile) {
    case "commodity_heavy":
      return ["Macro", "Commodities", "FX", "Risk/Sentiment"];
    case "rates_heavy":
      return ["Macro", "Rates", "FX", "Equities"];
    case "equity_risk_on_off":
      return ["Macro", "Equities", "Risk/Sentiment", "FX"];
    case "cross_asset":
    default:
      return ["Macro", "Equities", "Commodities", "Risk/Sentiment"];
  }
}

function profileLabelFor(profile: DiscussionProfile): string {
  switch (profile) {
    case "commodity_heavy":
      return "commodity-heavy";
    case "rates_heavy":
      return "rates-heavy";
    case "equity_risk_on_off":
      return "equity-risk";
    case "cross_asset":
    default:
      return "cross-asset";
  }
}

function fallbackContributionText(
  agent: Agent,
  marketSnapshot: MarketSnapshotPayload,
  discussionPlan: DiscussionPlan,
  priorMessages: AgentMessage[]
): string {
  const metrics = snapshotMetricsMap(marketSnapshot);
  const leadName = priorMessages[0]?.agentName || "Macro Agent";
  const confidence = Math.round(confidenceFor(agent) * 100);

  switch (agent.sector) {
    case "Macro":
      return trimToWordLimit(
        `Macro Agent opens the ${discussionPlan.profileLabel} route through growth, rates, and policy. US 10Y is ${metricValue(metrics, "us10y")}, DXY is ${metricValue(metrics, "dxy")}, and the key framing is that ${discussionPlan.routingReason}. My stance is cautious with ${confidence}% confidence.`,
        120
      );
    case "Equities":
      return trimToWordLimit(
        `Equities Agent builds on ${leadName}'s macro framing, but the tape still hinges on breadth and leadership. The S&P 500 is ${metricValue(metrics, "sp500")} and Nasdaq is ${metricValue(metrics, "nasdaq")}. My stance is selective with ${confidence}% confidence because equity risk appetite still looks uneven.`,
        120
      );
    case "Commodities":
      return trimToWordLimit(
        `Commodities Agent adds the raw-material angle after ${leadName}. WTI is ${metricValue(metrics, "wti")}, Brent is ${metricValue(metrics, "brent")}, natural gas is ${metricValue(metrics, "natural_gas")}, and gold is ${metricValue(metrics, "gold")}. My stance is watchful with ${confidence}% confidence because supply pressure can keep inflation sticky.`,
        120
      );
    case "FX":
      return trimToWordLimit(
        `FX Agent takes ${leadName}'s point into currencies. DXY is ${metricValue(metrics, "dxy")} while US 10Y is ${metricValue(metrics, "us10y")}, so dollar direction still matters for global liquidity and imported inflation. My stance is alert with ${confidence}% confidence.`,
        120
      );
    case "Rates":
      return trimToWordLimit(
        `Rates Agent sharpens the duration angle after ${leadName}. The US 10Y is ${metricValue(metrics, "us10y")} and the market still has to absorb policy repricing rather than assume a smooth easing path. My stance is disciplined with ${confidence}% confidence.`,
        120
      );
    case "Risk/Sentiment":
      return trimToWordLimit(
        `Risk/Sentiment Agent reads the tape after ${leadName} through positioning and appetite for risk. The S&P 500 is ${metricValue(metrics, "sp500")}, Nasdaq is ${metricValue(metrics, "nasdaq")}, and gold is ${metricValue(metrics, "gold")}. My stance is defensive with ${confidence}% confidence because resilience still looks fragile.`,
        120
      );
    default:
      return trimToWordLimit(
        `${agent.name} adds a sector-specific perspective to the ${discussionPlan.profileLabel} discussion and keeps the focus on what matters next. My stance is ${stanceFor(agent)} with ${confidence}% confidence.`,
        120
      );
  }
}

function stanceFor(agent: Agent): string {
  switch (agent.sector) {
    case "Macro":
      return "cautious";
    case "Equities":
      return "selective";
    case "Commodities":
      return "watchful";
    case "FX":
      return "alert";
    case "Rates":
      return "disciplined";
    case "Risk/Sentiment":
      return "defensive";
    default:
      return "measured";
  }
}

function confidenceFor(agent: Agent): number {
  switch (agent.sector) {
    case "Macro":
      return 0.74;
    case "Equities":
      return 0.78;
    case "Commodities":
      return 0.72;
    case "FX":
      return 0.73;
    case "Rates":
      return 0.76;
    case "Risk/Sentiment":
      return 0.75;
    default:
      return 0.7;
  }
}

function buildDiscussionThreads(posts: AgentMessage[], comments: AgentMessage[]): AgentDiscussionThread[] {
  const commentsByParent = new Map<string, AgentMessage[]>();

  for (const comment of comments) {
    const parentId = comment.parentMessageId;

    if (!parentId) {
      continue;
    }

    commentsByParent.set(parentId, [...(commentsByParent.get(parentId) || []), comment]);
  }

  return [...posts]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((post) => ({
      post,
      comments: [...(commentsByParent.get(post.id) || [])].sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt)
      )
    }));
}

function latestThreadActivityAt(post: AgentMessage, commentsByParent: Map<string, AgentMessage[]>): string {
  const latestCommentAt = (commentsByParent.get(post.id) || []).reduce(
    (latest, comment) => (comment.createdAt > latest ? comment.createdAt : latest),
    post.createdAt
  );
  return latestCommentAt;
}

function dedupeDisplayThreads(threads: AgentDiscussionThread[]): AgentDiscussionThread[] {
  const seen = new Set<string>();
  const deduped: AgentDiscussionThread[] = [];

  for (const thread of threads) {
    const key = displayThreadDedupeKey(thread.post);
    if (seen.has(key)) {
      console.log(
        `[room-feed] suppressed duplicate display thread key=${key} title="${thread.post.title || thread.post.catalyst || thread.post.id}"`
      );
      continue;
    }

    seen.add(key);
    deduped.push(thread);
  }

  return deduped;
}

function displayThreadDedupeKey(post: AgentMessage): string {
  const raw = `${post.catalyst || ""} ${post.title || ""}`.toLowerCase();
  if (/nonfarm payroll|payroll|nfp/.test(raw) && /\b178k?\b|jobs change context/.test(raw)) {
    return "official:nfp:178";
  }

  if (/fed funds|federal funds/.test(raw) && /3\.64/.test(raw)) {
    return "official:fed-funds:3.64";
  }

  if (/unemployment rate/.test(raw)) {
    const date = post.createdAt.slice(0, 10);
    return `official:unemployment:${date}`;
  }

  return `${post.agentId}:${normalizeDisplayText(post.catalyst || post.title || post.id).slice(0, 90)}`;
}

function normalizeDisplayText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(latest|official|print|context|keeps|holds|sustains|reinforces|amid|set|to|persist)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function threadScore(thread: AgentDiscussionThread): number {
  return thread.post.likeCount - thread.post.dislikeCount;
}

function mergeForumHeadlinesIntoSnapshot(
  snapshot: MarketSnapshotPayload,
  generalHeadlines: SnapshotHeadline[]
): MarketSnapshotPayload {
  const mergedHeadlines = dedupeHeadlines([
    ...generalHeadlines,
    ...snapshot.headlines
  ]).slice(0, 8);

  if (mergedHeadlines.length === 0) {
    return snapshot;
  }

  const topHeadline = mergedHeadlines[0];
  const onlyFallbackHeadlines = snapshot.headlines.every((headline) =>
    headline.source === "Market Room"
  );

  return {
    ...snapshot,
    headlines: mergedHeadlines,
    headline:
      onlyFallbackHeadlines && topHeadline?.title
        ? topHeadline.title
        : snapshot.headline,
    summary:
      onlyFallbackHeadlines && topHeadline?.title
        ? `Latest market catalyst: ${topHeadline.title}. ${snapshot.summary}`
        : snapshot.summary
  };
}

async function generateAgentForumPosts({
  env,
  agents,
  marketSnapshot,
  previousSnapshot,
  roomId,
  eventId,
  discussionPlan,
  generalHeadlines,
  sectorHeadlinesByAgentId,
  priorRoomThreads,
  recentTheses,
  snapshotId,
  triggerMode,
  frozenRunContext
}: {
  env: Env;
  agents: Agent[];
  marketSnapshot: MarketSnapshotPayload;
  previousSnapshot: MarketSnapshotPayload | null;
  roomId: string;
  eventId: string;
  discussionPlan: DiscussionPlan;
  generalHeadlines: SnapshotHeadline[];
  sectorHeadlinesByAgentId: Map<string, SnapshotHeadline[]>;
  priorRoomThreads: AgentDiscussionThread[];
  recentTheses: Thesis[];
  snapshotId: string;
  triggerMode: DiscussionTriggerMode;
  frozenRunContext: FrozenRunContext;
}): Promise<ForumGenerationResult> {
  const repositories = createRepositories(env);
  const sortedAgents = sortAgentsForForum(agents);
  const recentRoomCoverage = buildRoomThemeCoverage(priorRoomThreads);
  const runThemeCoverage = new Map<string, number>();
  const recentThesesByOwner = new Map<string, Thesis[]>();
  const entries: PlannedForumEntry[] = [];
  const diagnostics: ForumGenerationDiagnostics = {
    agentsConsidered: 0,
    topLevelCandidates: 0,
    suppressedAfterGeneration: 0,
    commentsOnly: 0,
    publishedPosts: 0,
    bestCandidateScore: 0,
    floorRescueUsed: false,
    hardFailSuppressions: 0,
    softFailSuppressions: 0
  };
  const roomCoverage = await repositories.roomCoverage.getByRoomId(roomId);
  const recentDiscussionEvents = await repositories.events.listRecentDiscussionEvents(16);
  const recentSynthesisEventIds = new Set(
    recentDiscussionEvents
      .filter((event) => {
        try {
          const payload = JSON.parse(event.payloadJson || "{}") as { triggerMode?: string };
          return payload.triggerMode === "synthesis";
        } catch {
          return false;
        }
      })
      .slice(0, 2)
      .map((event) => event.id)
  );
  const recentSynthesisSectorCounts = buildSynthesisSectorParticipation(
    priorRoomThreads,
    recentSynthesisEventIds
  );

  // ── Live FRED data ────────────────────────────────────────────────────────
  // Fetch fresh macroeconomic series from FRED API (cached in D1, refreshed
  // every 18h).  Sets module-level overrides in historicalDataContextService
  // and verifiedMarketMetricsService so all prompt builders use current values.
  if (env.FRED_API_KEY && env.DB) {
    try {
      const fredMap = await loadFredSeriesMap(env.DB, env.FRED_API_KEY);
      setHistoricalFredMap(fredMap);
      setMetricsFredMap(fredMap);
      console.log(`[fredCache] FRED series map activated (${fredMap.size} series)`);
    } catch (err) {
      console.error("[fredCache] Failed to load FRED series map — using embedded static JSON:", err);
      setHistoricalFredMap(null);
      setMetricsFredMap(null);
    }
  }

  const verifiedMetrics = buildVerifiedMarketMetricsContext(marketSnapshot);
  // Tracks posts published earlier in this same run so subsequent agents can avoid echoing them.
  const thisRunPosts: AgentMessage[] = [];
  let floorRescueClaimed = false;

  for (const thesis of recentTheses) {
    recentThesesByOwner.set(thesis.ownerAgentId, [...(recentThesesByOwner.get(thesis.ownerAgentId) || []), thesis]);
  }

  const agentLoop = triggerMode === "synthesis" ? discussionPlan.selectedAgents : sortedAgents;

  for (const [index, agent] of agentLoop.entries()) {
    diagnostics.agentsConsidered += 1;
    const sectorHeadlines = sectorHeadlinesByAgentId.get(agent.id) || [];
    const [recentPosts, relevantCases, knowledgeSnippets, dynamicMemory, agentState] = await Promise.all([
      repositories.messages.listRecentByAgent(agent.id, 8),  // 8 not 4 — wider cross-run novelty window
      listRelevantMarketCasesForAgent(env, agent, marketSnapshot, discussionPlan.profile),
      findRelevantKnowledgeSnippets(
        env,
        agent,
        [
          discussionPlan.profileLabel,
          marketSnapshot.headline,
          marketSnapshot.summary,
          ...generalHeadlines.map((headline) => headline.title),
          ...sectorHeadlines.map((headline) => headline.title)
        ].join("\n"),
        8
      ),
      buildDynamicMemoryContext(env, agent),
      repositories.agentState.getByAgentId(agent.id)
    ]);
    const topicPlanBase = buildAgentTopicPlan(
      agent,
      marketSnapshot,
      previousSnapshot,
      recentPosts,
      priorRoomThreads,
      recentRoomCoverage,
      runThemeCoverage,
      generalHeadlines,
      sectorHeadlinesByAgentId.get(agent.id) || [],
      recentThesesByOwner.get(agent.id) || [],
      roomCoverage
    );
    const synthesisSelection =
      triggerMode === "synthesis"
        ? selectSynthesisAnchorForAgent({
            agent,
            topicPlan: topicPlanBase,
            context: frozenRunContext,
            recentPosts,
            recentSynthesisSectorCounts
          })
        : null;
    const agentHeadlinePool = (frozenRunContext.synthesisHeadlinesByAgentId.get(agent.id) || []).length;
    const agentThemeCount = (frozenRunContext.synthesisThemeBoardByAgentId.get(agent.id) || []).length;

    if (triggerMode === "synthesis" && !synthesisSelection) {
      console.log(
        `[synthesis-selection] agent=${agent.id} selection_source=none agent_headline_pool=${agentHeadlinePool} agent_theme_count=${agentThemeCount} selection_reason=no_valid_news_anchor context=${frozenRunContext.runContextId}`
      );
      console.log(
        `[synthesis-mode] agent=${agent.id} action=silent topic=${frozenRunContext.synthesisTopicLabel} reason=no_valid_news_anchor context=${frozenRunContext.runContextId}`
      );
      continue;
    }
    if (triggerMode === "synthesis" && synthesisSelection) {
      diagnostics.bestCandidateScore = Math.max(diagnostics.bestCandidateScore, synthesisSelection.relevanceScore);
      console.log(
        `[synthesis-selection] agent=${agent.id} selection_source=${synthesisSelection.selectionSource} agent_headline_pool=${agentHeadlinePool} agent_theme_count=${agentThemeCount} selection_reason=${synthesisSelection.selectionReason} score=${synthesisSelection.relevanceScore} theme=${synthesisSelection.themeKey} context=${frozenRunContext.runContextId}`
      );
    }

    const topicPlan =
      triggerMode === "synthesis" && synthesisSelection
        ? adaptTopicPlanForSynthesis(topicPlanBase, frozenRunContext, synthesisSelection)
        : topicPlanBase;

    const noveltyAssessment = computeNoveltyAssessment({
      candidateThemeKey: topicPlan.primary.themeKey,
      candidateCatalyst: topicPlan.primary.catalyst,
      candidateStance: stanceFor(agent),
      agentSector: agent.sector,
      agentRecentPosts: recentPosts,
      roomRecentPosts: flattenThreadPosts(priorRoomThreads, 24),
      agentState,
      roomCoverage,
      hasMeaningfulFreshSignal: topicPlan.hasMeaningfulFreshSignal,
      matchedThesis: topicPlan.matchedThesis
    });

    // Analyze top 3 sector headlines for this agent (heuristic, zero LLM calls).
    // Pass room-wide recent posts (not just this agent's) so isNewInformation is cross-agent aware:
    // if another agent already posted on NFP, this agent won't treat NFP as new information.
    const roomWidePosts = flattenThreadPosts(priorRoomThreads, 24); // 24 not 8 — deeper history
    const topSectorHeadlines = (sectorHeadlinesByAgentId.get(agent.id) || []).slice(0, 3);
    const headlineAnalysis: HeadlineAnalysis | null = topSectorHeadlines.length > 0
      ? analyzeTopHeadlinesForAgent(topSectorHeadlines, agent, {
          recentPosts: [...recentPosts, ...roomWidePosts],
          openTheses: recentThesesByOwner.get(agent.id) || [],
          sectorKeywords: sectorKeywordsFor(agent)
        })
      : null;
    const topHeadlineForDiagnostics = topSectorHeadlines.find((headline) => headline.title === headlineAnalysis?.headline_title) || topSectorHeadlines[0];
    const selectedSynthesisAnchorHeadline =
      triggerMode === "synthesis" ? (synthesisSelection?.anchorHeadline || undefined) : undefined;
    const synthesisCompanyOwnedEquityAnchor = isSingleCompanyEquityAnchor(selectedSynthesisAnchorHeadline);
    const ownershipHeadlineForGates = selectedSynthesisAnchorHeadline || topHeadlineForDiagnostics;
    const mechanismSelection = rankMechanismFamilyForAgent({
      agent,
      topicPlan,
      headlineAnalysis,
      synthesisSelection,
      marketSnapshot,
      relevantCases,
      knowledgeSnippets,
      peerSnapshot: frozenRunContext.peerSnapshot
    });
    const promptKnowledgeSnippets = selectPromptKnowledgeSnippets({
      agent,
      snippets: knowledgeSnippets,
      mechanism: mechanismSelection
    });
    const promptRelevantCases = selectPromptRelevantCases(relevantCases, mechanismSelection);
    const domainRelevance = evaluateDomainRelevance({
      agent,
      headlineTitle: topHeadlineForDiagnostics?.title || headlineAnalysis?.headline_title || topicPlan.primary.catalyst,
      headlineDescription: topHeadlineForDiagnostics?.description || "",
      catalyst: topicPlan.primary.catalyst,
      headlineAnalysis,
      hasMatchedThesis: Boolean(topicPlan.matchedThesis),
      suppressEnabled: env.MARKET_ROOM_DOMAIN_GATE_SUPPRESS === "true"
    });
    console.log(
      `[domain-gate] agent=${agent.sector} verdict=${domainRelevance.verdict} score=${domainRelevance.score} title="${truncateText(topHeadlineForDiagnostics?.title || topicPlan.primary.catalyst, 80)}" matched=${domainRelevance.matchedTerms.join("|") || "none"} action=${domainRelevance.mode}`
    );
    console.log(
      `[mechanism-ranking] agent=${agent.sector} family=${mechanismSelection.family} score=${mechanismSelection.score} anchor="${truncateText(mechanismSelection.anchor, 90)}" evidence=${truncateText(mechanismSelection.evidence.join("; "), 140)}`
    );

    const rawPostingDecision = makePostingDecision({
      topicPlan,
      noveltyAssessment,
      agentState,
      roomCoverage,
      agentSector: agent.sector,
      headlineAnalysis
    });
    const domainAdjustedDecision = applyDomainRelevanceDecisionGate(rawPostingDecision, domainRelevance);
    const equityAdjustedDecision = applyEquitiesStandaloneDecisionGate({
      agent,
      postingDecision: domainAdjustedDecision,
      headlineAnalysis,
      topHeadline: ownershipHeadlineForGates
    });

    // ── Run-level catalyst guard ──────────────────────────────────────────────
    // Prevents two agents from opening separate top-level posts on the same article.
    //
    // Two-tier logic:
    //  • MACRO events (macro_release / policy / regulatory): multiple sectors genuinely
    //    bring different angles (Rates takes the yield view, FX takes the dollar view on NFP).
    //    Only block if the SAME sector already posted on this catalyst.
    //  • COMPANY / COMMODITY / GEOPOLITICAL / OTHER: these are specific articles that only
    //    one sector should "own". If ANY agent already posted on this article, downgrade
    //    the second one to comment_only.
    const postingDecision = (() => {
      if (equityAdjustedDecision.actionType !== "new_post" || !headlineAnalysis?.headline_title) {
        return equityAdjustedDecision;
      }
      const hTokens = headlineAnalysis.headline_title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 4);

      const isMacroPolicy = (["macro_release", "policy", "regulatory"] as string[]).includes(
        headlineAnalysis.headline_type
      );

      const companyOwnedEquityCatalyst =
        synthesisCompanyOwnedEquityAnchor || isCompanyOwnedEquityCatalyst(headlineAnalysis, ownershipHeadlineForGates);
      const catalystAlreadyClaimed = thisRunPosts.some((p) => {
        if (companyOwnedEquityCatalyst && agent.sector === "Equities") {
          return false;
        }
        // Macro/policy: only block within same sector
        if (isMacroPolicy && p.sector !== agent.sector) return false;
        // Company/commodity/geo/other: ANY prior post on this article blocks a second top-level
        const runCat = (p.catalyst || "").toLowerCase();
        const runTitle = (p.title || "").toLowerCase();
        return hTokens.some((token) => runCat.includes(token) || runTitle.includes(token));
      });

      if (!catalystAlreadyClaimed) return equityAdjustedDecision;
      return {
        ...equityAdjustedDecision,
        actionType: "comment_only" as const,
        reasonCodes: [...equityAdjustedDecision.reasonCodes, "run_catalyst_claimed" as const]
      };
    })();

    // ── Macro Agent materiality gate ──────────────────────────────────────────
    // Macro is the most prolific agent but volume ≠ quality. If the last Macro post
    // was made less than 90 minutes ago AND novelty is low, silence this run.
    const finalPostingDecision = (() => {
      if (triggerMode === "synthesis") {
        if (synthesisCompanyOwnedEquityAnchor && agent.sector !== "Equities") {
          return {
            ...postingDecision,
            actionType: "stay_silent" as const,
            reasonCodes: uniqueReasonCodes([...postingDecision.reasonCodes, "weak_catalyst_materiality_gate" as const])
          };
        }
        if (
          synthesisCompanyOwnedEquityAnchor &&
          agent.sector === "Equities" &&
          (postingDecision.actionType === "comment_only" || postingDecision.actionType === "stay_silent")
        ) {
          return {
            ...postingDecision,
            actionType: topicPlan.matchedThesis ? "update_existing" as const : "new_post" as const,
            reasonCodes: uniqueReasonCodes(
              postingDecision.reasonCodes.filter((code) => code !== "run_catalyst_claimed")
            )
          };
        }
        if (
          synthesisSelection &&
          synthesisSelection.isGenericFallback &&
          !topicPlan.matchedThesis
        ) {
          return {
            ...postingDecision,
            actionType: "stay_silent" as const,
            reasonCodes: uniqueReasonCodes([...postingDecision.reasonCodes, "stale_agent_thesis"])
          };
        }
        return postingDecision;
      }
      if (
        agent.sector === "Macro" &&
        postingDecision.actionType !== "stay_silent" &&
        recentPosts.length > 0
      ) {
        const minutesSinceLast =
          (Date.now() - new Date(recentPosts[0].createdAt).getTime()) / 60000;
        if (minutesSinceLast < 90 && noveltyAssessment.compositeScore < 35) {
          console.log(
            `[macro-gate] ${agent.name} silenced — last post ${minutesSinceLast.toFixed(0)}min ago, novelty=${noveltyAssessment.compositeScore.toFixed(2)}`
          );
          return {
            ...postingDecision,
            actionType: "stay_silent" as const,
            reasonCodes: [...postingDecision.reasonCodes, "macro_low_novelty_cooldown" as const]
          };
        }
      }
      return postingDecision;
    })();

    const materialityAdjustedDecision = applyCatalystMaterialityGate({
      agent,
      postingDecision: finalPostingDecision,
      noveltyAssessment,
      topicPlan,
      headlineAnalysis
    });

    const lowSignalAdjustedDecision = applyLowSignalThesisOnlyDecisionGate({
      agent,
      postingDecision: materialityAdjustedDecision,
      headlineAnalysis,
      topHeadline: topHeadlineForDiagnostics,
      noveltyScore: noveltyAssessment.compositeScore
    });

    const financingOwnershipAdjustedDecision = applyCompanyFinancingOwnershipGate({
      agent,
      postingDecision: lowSignalAdjustedDecision,
      headlineAnalysis
    });

    const equityOwnedCompanyHeadlineAdjustedDecision = applyEquityOwnedCompanyHeadlineGate({
      agent,
      postingDecision: financingOwnershipAdjustedDecision,
      headlineAnalysis,
      topHeadline: ownershipHeadlineForGates,
      forceEquityOwnership: synthesisCompanyOwnedEquityAnchor
    });

    const macroSingleNameAdjustedDecision = applyMacroSingleNameOwnershipGate({
      agent,
      postingDecision: equityOwnedCompanyHeadlineAdjustedDecision,
      headlineAnalysis,
      topHeadline: ownershipHeadlineForGates,
      forceSingleCompany: synthesisCompanyOwnedEquityAnchor
    });

    const weakDomainAdjustedDecision = applyNoFreshWeakDomainDecisionGate(macroSingleNameAdjustedDecision);

    // FX/Macro/Rates only: suppress posts where the catalyst has zero sector-keyword
    // overlap. Eliminates the "Macro forced to write about Smith Micro earnings"
    // pattern from the v1.1 Opus qualitative review. Pass-through for other 3 sectors.
    const sectorRelevanceAdjustedDecision = applyCatalystRelevanceGate({
      agent,
      postingDecision: weakDomainAdjustedDecision,
      headlineAnalysis
    });

    const ratesTemplateAdjustedDecision = applyRatesTemplateDecisionGate({
      agent,
      postingDecision: sectorRelevanceAdjustedDecision,
      headlineAnalysis,
      topicPlan,
      recentPosts
    });

    const conceptualRepetitionAdjustedDecision = applyConceptualRepetitionGate({
      agent,
      postingDecision: ratesTemplateAdjustedDecision,
      agentState,
      topicPlan,
      recentPosts,
      headlineAnalysis
    });

    const repetitionAdjustedDecision = applyRepeatedCatalystDecisionGate({
      agent,
      postingDecision: conceptualRepetitionAdjustedDecision,
      headlineAnalysis,
      topHeadline: ownershipHeadlineForGates,
      topicPlan,
      recentMessages: [...flattenThreadPosts(priorRoomThreads, 80), ...thisRunPosts],
      recentAgentMessages: recentPosts,
      currentRunPosts: thisRunPosts
    });
    const routingRecoveredDecision = applyScheduledReactiveTopLevelRecoveryGate({
      triggerMode,
      agent,
      postingDecision: repetitionAdjustedDecision,
      headlineAnalysis,
      topHeadline: ownershipHeadlineForGates,
      domainRelevance,
      noveltyAssessment,
      topicPlan
    });
    const stanceChallenge = buildStanceLockChallenge(agent, recentPosts);
    let generationDecision =
      stanceChallenge?.active &&
      (routingRecoveredDecision.actionType === "new_post" || routingRecoveredDecision.actionType === "update_existing")
        ? {
            ...routingRecoveredDecision,
            reasonCodes: uniqueReasonCodes([...routingRecoveredDecision.reasonCodes, "stance_lock_challenge" as const])
          }
        : routingRecoveredDecision;
    if (agent.sector === "Equities") {
      console.log(
        `[equities-standalone] eligible=${topSectorHeadlines.length} top="${truncateText(topSectorHeadlines[0]?.title || "none", 80)}" decision=${generationDecision.actionType} headline_signal=${headlineAnalysis?.market_signal_strength || "none"}`
      );
    }
    if (generationDecision.actionType === "new_post" || generationDecision.actionType === "update_existing") {
      diagnostics.topLevelCandidates += 1;
    }
    const shouldUseSynthesisFloorRescue =
      triggerMode === "synthesis" &&
      !floorRescueClaimed &&
      entries.filter((entry) => entry.message.messageType === "post").length === 0 &&
      synthesisSelection !== null &&
      isEligibleForSynthesisFloorRescue({
        selection: synthesisSelection,
        mechanism: mechanismSelection,
        postingDecision: generationDecision
      });
    let floorRescuePlanned = false;
    if (
      shouldUseSynthesisFloorRescue &&
      (generationDecision.actionType === "stay_silent" || generationDecision.actionType === "comment_only")
    ) {
      floorRescuePlanned = true;
      floorRescueClaimed = true;
      generationDecision = {
        ...generationDecision,
        actionType: topicPlan.matchedThesis ? "update_existing" : "new_post"
      };
      diagnostics.topLevelCandidates += 1;
      console.log(
        `[synthesis-mode] agent=${agent.id} floor_rescue=attempted theme=${synthesisSelection.themeKey} score=${synthesisSelection.relevanceScore} context=${frozenRunContext.runContextId}`
      );
    }

    // Pre-generate message ID so it can be linked in the decision log
    const willPost =
      generationDecision.actionType === "new_post" ||
      generationDecision.actionType === "update_existing";
    const preGeneratedMessageId = willPost ? crypto.randomUUID() : null;

    // Log all decisions including silent ones (fire-and-forget)
    void repositories.decisionLog.log({
      id: crypto.randomUUID(),
      agentId: agent.id,
      roomId,
      actionType: generationDecision.actionType,
      reasonCodes: generationDecision.reasonCodes,
      noveltyScore: generationDecision.noveltyScore,
      candidateThemeKey: generationDecision.suggestedTopic?.themeKey ?? null,
      targetThesisId: generationDecision.targetThesisId,
      messageId: preGeneratedMessageId,
      decidedAt: generationDecision.decidedAt,
      headlineAnalysisJson: headlineAnalysis ? JSON.stringify(headlineAnalysis) : null
    });

    if (!willPost) {
      if (generationDecision.actionType === "comment_only") {
        diagnostics.commentsOnly += 1;
      }
      if (triggerMode === "synthesis") {
        console.log(
          `[synthesis-mode] agent=${agent.id} action=silent topic=${frozenRunContext.synthesisTopicLabel} reason=${generationDecision.reasonCodes.join("|") || "decision_gate"} context=${frozenRunContext.runContextId}`
        );
      }
      continue;
    }

    const topHeadlineTitle = sectorHeadlines[0]?.title ?? generalHeadlines[0]?.title ?? "";
    const equityFundamentalsContext =
      agent.sector === "Equities"
        ? await Promise.race([
            buildEquityFundamentalsForPost(topHeadlineTitle, sectorHeadlines),
            new Promise<EquitySubjectDataContext>((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    resolution: {
                      status: "unresolved",
                      classification: "unresolved",
                      confidence: "low",
                      entry: null,
                      matchedText: null,
                      score: 0,
                      candidateSymbols: []
                    },
                    dataTier: "none",
                    promptBlock: "",
                    quote: null,
                    fundamentals: null,
                    fetchedFields: {}
                  }),
                5000
              )
            )
          ])
        : null;
    const historicalContext = buildMarketRoomHistoricalContext(agent, generalHeadlines, sectorHeadlines);
    // Typed FX correlation metadata — derived directly from the computed data rather than
    // re-parsing the historicalContext string (avoids fragile regex on generated text).
    const fxCorrelationMetadata = getFxCorrelationMetadata();
    if (agent.sector === "Equities") {
      console.log(
        `[equities-standalone] fundamentals_result injected=${Boolean(equityFundamentalsContext?.promptBlock)} tier=${equityFundamentalsContext?.dataTier || "none"} classification=${equityFundamentalsContext?.resolution.classification || "none"}`
      );
    }

    const result = await requestStructuredForumPost({
      env,
      agent,
      marketSnapshot,
      previousSnapshot,
      discussionPlan,
      topicPlan,
      recentPosts,
      relevantCases: promptRelevantCases,
      knowledgeSnippets: promptKnowledgeSnippets,
      generalHeadlines,
      sectorHeadlines,
      priorRoomThreads,
      dynamicMemory,
      agentState,
      roomCoverage,
      thisRunPosts: [...thisRunPosts],
      headlineAnalysis,
      verifiedMetrics,
      stanceChallenge,
      equityFundamentalsContext,
      triggerMode,
      frozenRunContext,
      synthesisSelection,
      mechanismSelection
    });

    const createdAt = offsetTimestamp(index * 3);
    const isUpdate = generationDecision.actionType === "update_existing";
    const thesisId =
      generationDecision.targetThesisId ||
      topicPlan.matchedThesis?.id ||
      (isUpdate ? null : crypto.randomUUID());
    const parentPostId =
      generationDecision.targetPostId ||
      (isUpdate ? topicPlan.updateTargetPostId : null);
    const finalCatalyst =
      triggerMode === "synthesis"
        ? synthesisSelection?.anchorHeadline?.title || synthesisSelection?.themeLabel || frozenRunContext.synthesisPrimaryHeadline
        : result?.catalyst ||
          (headlineAnalysis && headlineAnalysis.market_signal_strength !== "noise" ? headlineAnalysis.headline_title : "") ||
          topicPlan.primary.catalyst ||
          fallbackCatalyst(agent, marketSnapshot);
    if (triggerMode === "synthesis" && isSingleCompanyEquityCatalystText(finalCatalyst) && agent.sector !== "Equities") {
      diagnostics.suppressedAfterGeneration += 1;
      if (floorRescuePlanned) {
        floorRescueClaimed = false;
      }
      console.log(
        `[ownership-gate] agent=${agent.sector} synthesis_company_catalyst=yes ownership_action=silent catalyst="${truncateText(finalCatalyst, 90)}" context=${frozenRunContext.runContextId}`
      );
      continue;
    }
    let resolvedContent = ensureRequiredConvictionCondition({
      agent,
      content: trimToWordLimit(
        result?.content || fallbackForumPost(agent, marketSnapshot, previousSnapshot),
        isUpdate ? 170 : 320
      ),
      catalyst: finalCatalyst,
      mechanismFamily: mechanismSelection.family
    });
    resolvedContent = ensureStanceLockReviewIfRequired({
      content: resolvedContent,
      stanceChallenge,
      catalyst: finalCatalyst,
      stance: result?.stance || stanceFor(agent),
      sector: agent.sector,
      mechanismFamily: mechanismSelection.family
    });
    const evidenceGate = applyEvidenceFirstMechanismGate({
      agent,
      content: resolvedContent,
      mechanism: mechanismSelection,
      catalyst: finalCatalyst,
      recentPosts
    });
    resolvedContent = evidenceGate.content;
    console.log(
      `[evidence-first] agent=${agent.id} mechanism_family=${evidenceGate.metrics.mechanismFamily} house_view_visible=${evidenceGate.metrics.houseViewVisible ? "yes" : "no"} mechanism_fit=${evidenceGate.metrics.mechanismFit ? "yes" : "no"} macro_threshold_pair_used=${evidenceGate.metrics.macroThresholdPairUsed ? "yes" : "no"} macro_threshold_pair_relevant=${evidenceGate.metrics.macroThresholdPairRelevant ? "yes" : "no"} repeat_delta_visible=${evidenceGate.metrics.repeatDeltaVisible ? "yes" : "no"} repair_applied=${evidenceGate.metrics.repaired ? "yes" : "no"}`
    );
    if (evidenceGate.suppressed) {
      diagnostics.suppressedAfterGeneration += 1;
      if (floorRescuePlanned) {
        floorRescueClaimed = false;
      }
      console.log(
        `[evidence-first] agent=${agent.id} action=silent reason=mechanism_relevance_gate context=${frozenRunContext.runContextId}`
      );
      continue;
    }
    const resolvedStance = result?.stance || stanceFor(agent);
    const titleResolution = resolveForumPostTitle({
      agent,
      resultTitle: result?.title,
      resultCatalyst: result?.catalyst,
      marketSnapshot,
      topicPlan,
      stance: resolvedStance,
      isUpdate
    });
    const { decision: catalystCorrectedDecision, corrected: catalystCorrected } = correctPostingDecisionCatalyst({
      agent,
      postingDecision: generationDecision,
      finalCatalyst
    });
    const resolvedTopicPrimaryKey = resolveFinalTopicPrimaryKey(agent, headlineAnalysis, finalCatalyst, topicPlan.topicPrimaryKey);
    const resolvedTopicSecondaryKey =
      resolvedTopicPrimaryKey === topicPlan.topicPrimaryKey ? topicPlan.topicSecondaryKey : topicPlan.topicPrimaryKey;
    let postQualityFlags = collectPostQualityFlags({
      agent,
      titleFlags: catalystCorrected ? [...titleResolution.flags, "resolved_catalyst_corrected"] : titleResolution.flags,
      content: resolvedContent,
      hasStoredContext: promptKnowledgeSnippets.length > 0,
      postingDecision: catalystCorrectedDecision,
      verifiedMetrics,
      stanceChallengeActive: Boolean(stanceChallenge?.active),
      headlineAnalysis
    });
    const fxCorrelationEnforcement = enforceFxCorrelationQuality({
      agent,
      content: resolvedContent,
      headlineAnalysis,
      fxCorrelationMetadata
    });
    resolvedContent = fxCorrelationEnforcement.content;
    postQualityFlags = uniqueQualityFlags([
      ...postQualityFlags,
      ...evaluateFxCorrelationGrounding({
        agent,
        content: resolvedContent,
        headlineAnalysis,
        recentPosts,
        fxCorrelationMetadata
      })
    ]);

    const equityVisibility = evaluateEquityFundamentalsVisibility({
      agent,
      content: resolvedContent,
      context: equityFundamentalsContext,
      messageType: isUpdate ? "comment" : "post"
    });
    resolvedContent = equityVisibility.content;
    postQualityFlags = uniqueQualityFlags([...postQualityFlags, ...equityVisibility.flags]);

    if (triggerMode === "synthesis" && synthesisSelection) {
      postQualityFlags = uniqueQualityFlags([...postQualityFlags, "synthesis_anchor_selected"]);
      if (synthesisSelection.isGenericFallback) {
        postQualityFlags = uniqueQualityFlags([...postQualityFlags, "synthesis_theme_generic_fallback"]);
      }
      if (!synthesisSelection.anchorHeadline) {
        postQualityFlags = uniqueQualityFlags([...postQualityFlags, "synthesis_no_valid_news_anchor"]);
      }
      const mismatch = hasSynthesisAnchorMismatch({
        content: resolvedContent,
        selection: synthesisSelection
      });
      if (mismatch) {
        postQualityFlags = uniqueQualityFlags([...postQualityFlags, "synthesis_anchor_mismatch"]);
        resolvedContent = repairSynthesisAnchorContent(resolvedContent, synthesisSelection);
        const repairedMismatch = hasSynthesisAnchorMismatch({
          content: resolvedContent,
          selection: synthesisSelection
        });
        if (!repairedMismatch) {
          postQualityFlags = uniqueQualityFlags([...postQualityFlags, "synthesis_anchor_repaired"]);
        } else {
          diagnostics.suppressedAfterGeneration += 1;
          diagnostics.hardFailSuppressions += 1;
          if (floorRescuePlanned) {
            floorRescueClaimed = false;
          }
          console.log(
            `[synthesis-mode] agent=${agent.id} action=silent topic=${synthesisSelection.themeKey} reason=anchor_mismatch_unrepaired context=${frozenRunContext.runContextId}`
          );
          continue;
        }
      }

      const synthesisGate = applySynthesisPublicationQualityGate({
        agent,
        content: resolvedContent,
        selection: synthesisSelection,
        postingDecision: generationDecision,
        equityFundamentalsContext
      });
      resolvedContent = synthesisGate.content;
      postQualityFlags = uniqueQualityFlags([...postQualityFlags, ...synthesisGate.flags]);
      const paragraphGate = applySynthesisParagraphReadabilityGate(resolvedContent);
      resolvedContent = paragraphGate.content;
      console.log(
        `[synthesis-quality] agent=${agent.id} anchor_visible=${synthesisGate.metrics.anchorVisible ? "yes" : "no"} delta_visible=${synthesisGate.metrics.deltaVisible ? "yes" : "no"} directional_call=${synthesisGate.metrics.directionalCall ? "yes" : "no"} data_anchor=${synthesisGate.metrics.dataAnchor ? "yes" : "no"} conviction_count=${synthesisGate.metrics.convictionCount} repair_applied=${synthesisGate.repaired ? "yes" : "no"} publication_gate=${synthesisGate.metrics.publicationGate} paragraphs=${paragraphGate.paragraphs} paragraph_repair=${paragraphGate.repaired ? "yes" : "no"} paragraph_gate=${paragraphGate.gate}`
      );
      if (synthesisGate.suppressed) {
        if (floorRescuePlanned && synthesisGate.metrics.publicationGate !== "suppressed_hard_fail") {
          diagnostics.softFailSuppressions += 1;
          console.log(
            `[synthesis-mode] agent=${agent.id} floor_rescue=override topic=${synthesisSelection.themeKey} reason=${synthesisGate.metrics.publicationGate} context=${frozenRunContext.runContextId}`
          );
        } else {
          diagnostics.suppressedAfterGeneration += 1;
          if (synthesisGate.metrics.publicationGate === "suppressed_hard_fail") {
            diagnostics.hardFailSuppressions += 1;
          } else {
            diagnostics.softFailSuppressions += 1;
          }
          if (floorRescuePlanned) {
            floorRescueClaimed = false;
          }
          console.log(
            `[synthesis-mode] agent=${agent.id} action=silent topic=${synthesisSelection.themeKey} reason=${synthesisGate.metrics.publicationGate} context=${frozenRunContext.runContextId}`
          );
          continue;
        }
      }
    }

    if (postQualityFlags.length > 0) {
      console.log(
        `[post-quality:${agent.name}] flags=${postQualityFlags.join(",")} title="${titleResolution.title ?? "null"}"`
      );
    }

    if (shouldSuppressWeakEquityCompanyPost(agent, headlineAnalysis, topHeadlineForDiagnostics, resolvedContent, finalCatalyst)) {
      diagnostics.suppressedAfterGeneration += 1;
      if (floorRescuePlanned) {
        floorRescueClaimed = false;
      }
      console.log(
        `[equities-quality] suppressed stock-specific post reason=missing_company_numbers title="${truncateText(titleResolution.title ?? finalCatalyst, 100)}"`
      );
      continue;
    }

    if (fxCorrelationEnforcement.shouldSuppress) {
      diagnostics.suppressedAfterGeneration += 1;
      if (floorRescuePlanned) {
        floorRescueClaimed = false;
      }
      console.log(
        `[fx-correlation] suppressed reason=${fxCorrelationEnforcement.reason || "quality"} title="${truncateText(titleResolution.title ?? finalCatalyst, 100)}"`
      );
      continue;
    }

    if (equityVisibility.shouldSuppress) {
      diagnostics.suppressedAfterGeneration += 1;
      if (floorRescuePlanned) {
        floorRescueClaimed = false;
      }
      console.log(
        `[equity-fundamentals] suppressed_after_repair=true title="${truncateText(titleResolution.title ?? finalCatalyst, 100)}"`
      );
      continue;
    }

    if (shouldSuppressUnsafeMetricPost(agent, postQualityFlags)) {
      diagnostics.suppressedAfterGeneration += 1;
      if (floorRescuePlanned) {
        floorRescueClaimed = false;
      }
      console.log(
        `[post-quality:${agent.name}] suppressed reason=unverified_metric_claim title="${truncateText(titleResolution.title ?? finalCatalyst, 100)}"`
      );
      continue;
    }

    const postingDecisionWithQualityFlags: PostingDecision = {
      ...catalystCorrectedDecision,
      qualityFlags: postQualityFlags
    };

    if (shouldSuppressRatesTemplatePost(agent, headlineAnalysis, resolvedContent, recentPosts)) {
      diagnostics.suppressedAfterGeneration += 1;
      if (floorRescuePlanned) {
        floorRescueClaimed = false;
      }
      console.log(
        `[rates-quality] suppressed template repeat title="${truncateText(titleResolution.title ?? finalCatalyst, 100)}"`
      );
      continue;
    }

    if (shouldSuppressEquityBreadthRepeatPost(agent, postQualityFlags, recentPosts)) {
      diagnostics.suppressedAfterGeneration += 1;
      if (floorRescuePlanned) {
        floorRescueClaimed = false;
      }
      console.log(
        `[equities-quality] suppressed breadth_repeat title="${truncateText(titleResolution.title ?? finalCatalyst, 100)}"`
      );
      continue;
    }

    const messageType = isUpdate ? "comment" : "post";
    const synthesisAction = mapSynthesisAction({
      triggerMode,
      messageType,
      postingDecision: generationDecision
    });
    if (triggerMode === "synthesis" && synthesisAction === "silent") {
      diagnostics.commentsOnly += 1;
      console.log(
        `[synthesis-mode] agent=${agent.id} action=silent topic=${frozenRunContext.synthesisTopicLabel} reason=low_signal`
      );
      continue;
    }

    const message: AgentMessage = {
      id: preGeneratedMessageId!,
      roomId,
      eventId,
      agentId: agent.id,
      agentName: agent.name,
      sector: agent.sector,
      role: "assistant",
      messageType: triggerMode === "synthesis" ? "post" : messageType,
      parentMessageId: triggerMode === "synthesis" ? null : parentPostId,
      title: titleResolution.title,
      catalyst: finalCatalyst,
      thesisId,
      thesisUpdateId: thesisId ? crypto.randomUUID() : null,
      thesisStatus: topicPlan.thesisStatus,
      thesisTopicPrimary: resolvedTopicPrimaryKey,
      thesisTopicSecondary: resolvedTopicSecondaryKey,
      content: resolvedContent,
      stance: resolvedStance,
      confidence: result?.confidence ?? confidenceFor(agent),
      likeCount: 0,
      dislikeCount: 0,
      viewerReaction: null,
      noveltyAssessment: noveltyAssessment,
      postingDecision: postingDecisionWithQualityFlags,
      createdAt
    };

    if (triggerMode === "synthesis") {
      const synthesisPeer = extractEngagedPeerAgent(message.content, frozenRunContext.peerSnapshot);
      console.log(
        `[synthesis-mode] agent=${agent.id} action=${synthesisAction} topic=${frozenRunContext.synthesisTopicLabel} catalyst="${truncateText(finalCatalyst, 80)}" peer=${synthesisPeer || "none"} chain=${hasTransmissionChainShape(message.content) ? "yes" : "no"} stored_stat=${hasStoredDataCitation(message.content) ? "yes" : "no"} participation_adjust=${synthesisSelection?.participationAdjustment ?? 0} context=${frozenRunContext.runContextId}`
      );
    }

    entries.push({
      message,
      thesisWrite: buildPostThesisWritePlan({
        message,
        agent,
        marketSnapshot,
        eventId,
        snapshotId,
        topicPlan
      })
    });
    runThemeCoverage.set(topicPlan.primary.themeKey, (runThemeCoverage.get(topicPlan.primary.themeKey) || 0) + 1);
    thisRunPosts.push(message);
    if (message.messageType === "post") {
      diagnostics.publishedPosts += 1;
    }
    if (floorRescuePlanned) {
      diagnostics.floorRescueUsed = true;
      console.log(
        `[synthesis-mode] agent=${agent.id} floor_rescue=published topic=${frozenRunContext.synthesisTopicLabel} context=${frozenRunContext.runContextId}`
      );
    }
  }

  return {
    entries,
    diagnostics
  };
}

async function generateAgentForumComments({
  env,
  agents,
  posts,
  marketSnapshot,
  previousSnapshot,
  roomId,
  eventId,
  discussionPlan,
  generalHeadlines,
  sectorHeadlinesByAgentId,
  priorRoomThreads,
  snapshotId,
  frozenRunContext
}: {
  env: Env;
  agents: Agent[];
  posts: AgentMessage[];
  marketSnapshot: MarketSnapshotPayload;
  previousSnapshot: MarketSnapshotPayload | null;
  roomId: string;
  eventId: string;
  discussionPlan: DiscussionPlan;
  generalHeadlines: SnapshotHeadline[];
  sectorHeadlinesByAgentId: Map<string, SnapshotHeadline[]>;
  priorRoomThreads: AgentDiscussionThread[];
  snapshotId: string;
  frozenRunContext: FrozenRunContext;
}): Promise<PlannedForumEntry[]> {
  const orderedAgents = sortAgentsForForum(agents);
  const commentRoomCoverage = await createRepositories(env).roomCoverage.getByRoomId(roomId);

  // Ensure live FRED data is active for comment path too.
  if (env.FRED_API_KEY && env.DB) {
    try {
      const fredMap = await loadFredSeriesMap(env.DB, env.FRED_API_KEY);
      setHistoricalFredMap(fredMap);
      setMetricsFredMap(fredMap);
    } catch (err) {
      console.error("[fredCache] comment path: Failed to load FRED series map:", err);
      setHistoricalFredMap(null);
      setMetricsFredMap(null);
    }
  }

  const verifiedMetrics = buildVerifiedMarketMetricsContext(marketSnapshot);
  const targetPosts = selectPostsForComments(
    dedupePostsForComments([...posts, ...priorRoomThreads.map((thread) => thread.post)]),
    discussionPlan.selectedAgents,
    3
  );

  // Each agent may only comment ONCE in this phase — track used responders sequentially.
  // Using a for-loop (not Promise.all) so each iteration sees the updated exclusion set
  // before the next responder is picked.
  const usedResponderIds = new Set<string>(posts.map((p) => p.agentId));
  const comments: PlannedForumEntry[] = [];

  for (const [index, post] of targetPosts.entries()) {
    const responder = pickCommentResponder(post, orderedAgents, discussionPlan.selectedAgents, usedResponderIds);

    if (!responder) {
      continue;
    }

    // Immediately reserve this agent so no subsequent post in this loop picks them again.
    usedResponderIds.add(responder.id);

    const commentPurpose = pickCommentPurpose(responder, post);
    const [knowledgeSnippets, commentDynamicMemory, commentAgentState] = await Promise.all([
      findRelevantKnowledgeSnippets(
        env,
        responder,
        [
          post.title || "",
          post.catalyst || "",
          post.content,
          marketSnapshot.headline,
          ...generalHeadlines.map((headline) => headline.title),
          ...(sectorHeadlinesByAgentId.get(responder.id) || []).map((headline) => headline.title)
        ].join("\n"),
        6
      ),
      buildDynamicMemoryContext(env, responder),
      createRepositories(env).agentState.getByAgentId(responder.id)
    ]);
    const commentEval = evaluateCommentTarget({
      responder,
      targetPost: post,
      agentState: commentAgentState,
      roomCoverage: commentRoomCoverage,
      agentRecentPosts: await createRepositories(env).messages.listRecentByAgent(responder.id, 4),
      commentPurpose
    });

    if (!commentEval.shouldComment) {
      continue;
    }

    if (shouldSkipRepeatedComment({
      responder,
      post,
      commentPurpose,
      priorRoomThreads,
      currentComments: comments.map((entry) => entry.message)
    })) {
      continue;
    }

    const result = await requestStructuredForumComment({
      env,
      agent: responder,
      post,
      marketSnapshot,
      previousSnapshot,
      commentPurpose,
      generalHeadlines,
      sectorHeadlines: sectorHeadlinesByAgentId.get(responder.id) || [],
      knowledgeSnippets,
      dynamicMemory: commentDynamicMemory,
      agentState: commentAgentState,
      roomCoverage: commentRoomCoverage,
      verifiedMetrics,
      frozenRunContext
    });
    const commentContent = trimToWordLimit(result?.content || fallbackForumComment(responder, post, marketSnapshot), 140);
    if (shouldSuppressWeakGeneratedComment({
      responder,
      post,
      content: commentContent,
      commentPurpose,
      verifiedMetrics
    })) {
      continue;
    }

    const message: AgentMessage = {
      id: crypto.randomUUID(),
      roomId,
      eventId,
      agentId: responder.id,
      agentName: responder.name,
      sector: responder.sector,
      role: "assistant",
      messageType: "comment",
      parentMessageId: post.id,
      title: null,
      catalyst: result?.catalyst || commentPurposeLabel(commentPurpose),
      thesisId: post.thesisId,
      thesisUpdateId: post.thesisId ? crypto.randomUUID() : null,
      thesisStatus: post.thesisStatus,
      thesisTopicPrimary: post.thesisTopicPrimary,
      thesisTopicSecondary: post.thesisTopicSecondary,
      content: commentContent,
      stance: result?.stance || stanceFor(responder),
      confidence: result?.confidence ?? confidenceFor(responder),
      likeCount: 0,
      dislikeCount: 0,
      viewerReaction: null,
      createdAt: offsetTimestamp(posts.length * 3 + index * 2)
    };

    comments.push({
      message,
      thesisWrite: buildCommentThesisWritePlan({
        message,
        post,
        eventId,
        snapshotId
      })
    });
  }

  return comments;
}

function selectPostsForComments(posts: AgentMessage[], preferredAgents: Agent[], maxPosts: number): AgentMessage[] {
  const preferredIds = new Set(preferredAgents.map((agent) => agent.id));
  const prioritized = [
    ...posts.filter((post) => preferredIds.has(post.agentId)),
    ...posts.filter((post) => !preferredIds.has(post.agentId))
  ];
  const seen = new Set<string>();
  const seenThemes = new Set<string>();

  return prioritized.filter((post) => {
    if (seen.has(post.id)) {
      return false;
    }

    const themeKey =
      post.thesisTopicPrimary ||
      inferPrimaryThemeKey(post.title || post.catalyst || post.content, post.sector);

    if (seenThemes.has(themeKey)) {
      return false;
    }

    seen.add(post.id);
    seenThemes.add(themeKey);
    return true;
  }).slice(0, maxPosts);
}

function shouldSuppressWeakGeneratedComment({
  responder,
  post,
  content,
  commentPurpose,
  verifiedMetrics
}: {
  responder: Agent;
  post: AgentMessage;
  content: string;
  commentPurpose: CommentPurpose;
  verifiedMetrics: VerifiedMarketMetricsContext;
}): boolean {
  if (hasUnverifiedMetricClaim(content, verifiedMetrics)) {
    console.log(
      `[comment-quality] suppressed reason=unverified_metric responder=${responder.sector} parent="${truncateText(post.title || post.catalyst || "", 80)}"`
    );
    return true;
  }

  if (responder.sector !== post.sector && !commentContainsSectorMechanism(responder, content)) {
    console.log(
      `[comment-quality] suppressed reason=domain_stretch responder=${responder.sector} parent=${post.sector} purpose=${commentPurpose}`
    );
    return true;
  }

  if (
    commentPurpose === "confirm_existing_thesis" &&
    !/\b(?:\d+(?:\.\d+)?\s?(?:%|bps|bp|x|bn|billion|m|million)|because|therefore|transmi|mechanism|confirms?|contradicts?|invalidates?)\b/i.test(content)
  ) {
    console.log(
      `[comment-quality] suppressed reason=confirm_without_delta responder=${responder.sector} parent="${truncateText(post.title || post.catalyst || "", 80)}"`
    );
    return true;
  }

  // 4. Rates template comment — pure bear-steepener framing with no new numeric anchor
  if (responder.sector === "Rates" && /\bbear.?steepener\b/i.test(content)) {
    const hasNewNumber = /\b\d+(?:\.\d+)?\s*(?:bps|bp|%|basis points)\b/i.test(content);
    if (!hasNewNumber) {
      console.log(
        `[comment-quality] suppressed reason=rates_template_comment responder=Rates parent="${truncateText(post.title || post.catalyst || "", 80)}"`
      );
      return true;
    }
  }

  // 5. Equity breadth as primary mechanism when the parent thread is stock-specific
  if (responder.sector === "Equities") {
    const breadthCount = countBreadthFrameworkMentions(content);
    if (breadthCount >= 2) {
      const parentText = `${post.title || ""} ${post.catalyst || ""} ${post.content?.substring(0, 120) || ""}`;
      // Stock-specific parent: contains a ticker-like token but is NOT an index/breadth thread itself
      const parentIsStockSpecific =
        /\b[A-Z]{1,5}\b/.test(parentText) &&
        !/\bSPY\b|\bIWM\b|\bQQQ\b|\bXLF\b|\bbreadth\b|\bsmall.?cap\b/i.test(parentText.substring(0, 80));
      if (parentIsStockSpecific) {
        console.log(
          `[comment-quality] suppressed reason=equity_breadth_comment_mismatch responder=Equities parent="${truncateText(post.title || post.catalyst || "", 80)}"`
        );
        return true;
      }
    }
  }

  return false;
}

function commentContainsSectorMechanism(agent: Agent, content: string): boolean {
  const patterns: Record<string, RegExp> = {
    Macro: /\b(?:growth|inflation|policy|liquidity|consumer|labor|pce|cpi|gdp|recession)\b/i,
    Rates: /\b(?:yield|treasury|curve|duration|breakeven|auction|term premium|2y|10y|bps)\b/i,
    FX: /\b(?:dollar|dxy|fx|currency|carry|usd|jpy|eur|em fx|funding)\b/i,
    Equities: /\b(?:earnings|revenue|eps|margin|valuation|multiple|stock|shares|guidance|breadth)\b/i,
    Commodities: /\b(?:wti|brent|crude|oil|gas|gold|copper|inventory|opec|supply|demand)\b/i,
    "Risk/Sentiment": /\b(?:risk|vix|volatility|credit|spread|hy oas|positioning|crowding|fragility)\b/i
  };
  return (patterns[agent.sector] || /\b(?:mechanism|transmission|data)\b/i).test(content);
}

function dedupePostsForComments(posts: AgentMessage[]): AgentMessage[] {
  const seen = new Set<string>();

  return posts.filter((post) => {
    if (seen.has(post.id)) {
      return false;
    }

    seen.add(post.id);
    return true;
  });
}

function buildRoomThemeCoverage(threads: AgentDiscussionThread[]): Map<string, number> {
  const coverage = new Map<string, number>();

  for (const thread of threads) {
    const keys = thread.post.thesisTopicPrimary
      ? [thread.post.thesisTopicPrimary, ...(thread.post.thesisTopicSecondary ? [thread.post.thesisTopicSecondary] : [])]
      : inferThemeKeysFromText(
          [thread.post.title, thread.post.catalyst, thread.post.content].filter(Boolean).join(" "),
          thread.post.sector
        );

    for (const key of keys) {
      coverage.set(key, (coverage.get(key) || 0) + 1);
    }
  }

  return coverage;
}

function parseSynthesisAgentLimit(value: string | undefined, activeCount: number): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.min(activeCount, Math.floor(parsed));
}

const SYNTHESIS_THEME_DEFINITIONS: SynthesisThemeDefinition[] = [
  {
    key: "oil_geopolitics_and_inflation_pass_through",
    label: "Oil and geopolitical risk",
    matcher: /\b(oil|wti|brent|opec|hormuz|iran|energy|inflation)\b/i,
    mechanismTerms: ["wti", "brent", "inflation", "energy", "risk premium"],
    sectorBias: { Commodities: 4, Macro: 2, FX: 2, Equities: 1, "Risk/Sentiment": 1, Rates: 1 }
  },
  {
    key: "rates_repricing_and_duration_pressure",
    label: "Rates repricing and duration pressure",
    matcher: /\b(fed|rates?|yield|treasury|duration|curve|bond|auction|refunding)\b/i,
    mechanismTerms: ["10y", "2y", "yield", "term premium", "duration", "refunding"],
    sectorBias: { Rates: 4, Macro: 2, Equities: 1, FX: 1, "Risk/Sentiment": 1 }
  },
  {
    key: "growth_softness_vs_multiple_risk",
    label: "Growth softness versus multiple risk",
    matcher: /\b(growth|earnings|guidance|jobs|recession|valuation|multiple|equity|stocks?)\b/i,
    mechanismTerms: ["earnings", "guidance", "valuation", "multiple", "growth"],
    sectorBias: { Equities: 4, Macro: 2, "Risk/Sentiment": 1, Rates: 1, FX: 1 }
  },
  {
    key: "credit_and_risk_sensitivity",
    label: "Credit and risk sensitivity",
    matcher: /\b(credit|spread|hy|oas|risk|volatility|vix|downgrade|default)\b/i,
    mechanismTerms: ["hy oas", "spread", "vix", "credit", "risk"],
    sectorBias: { "Risk/Sentiment": 4, Macro: 2, Equities: 1, Rates: 1 }
  },
  {
    key: "fx_policy_divergence",
    label: "FX policy divergence",
    matcher: /\b(dollar|dxy|fx|currency|yen|euro|carry|boe|ecb|boj)\b/i,
    mechanismTerms: ["dxy", "dollar", "currency", "carry", "policy divergence"],
    sectorBias: { FX: 4, Macro: 2, Rates: 1 }
  },
  {
    key: "company_specific_developments",
    label: "Company earnings and guidance",
    matcher: /\b(earnings|eps|revenue|guidance|dividend|buyback|merger|acquisition|results)\b/i,
    mechanismTerms: ["earnings", "eps", "revenue", "guidance", "margin"],
    sectorBias: { Equities: 4, Macro: 1, "Risk/Sentiment": 1 }
  },
  {
    key: "cross_asset_tape",
    label: "Cross-asset tape",
    matcher: /.+/i,
    mechanismTerms: ["cross asset", "broad market"],
    sectorBias: {},
    generic: true
  }
];

function buildFrozenRunContext({
  triggerMode,
  triggerReason,
  now,
  snapshot,
  peerSnapshot,
  roomHeadlines,
  activeAgents,
  sectorHeadlinesByAgentId
}: {
  triggerMode: DiscussionTriggerMode;
  triggerReason?: string;
  now: string;
  snapshot: MarketSnapshotPayload;
  peerSnapshot: FrozenPeerThesisSnapshotRow[];
  roomHeadlines: SnapshotHeadline[];
  activeAgents: Agent[];
  sectorHeadlinesByAgentId: Map<string, SnapshotHeadline[]>;
}): FrozenRunContext {
  const runContextId = crypto.randomUUID();
  const synthesisHeadlinesByAgentId = new Map<string, SnapshotHeadline[]>();
  for (const agent of activeAgents) {
    const perAgentHeadlines = dedupeHeadlines([
      ...roomHeadlines,
      ...(sectorHeadlinesByAgentId.get(agent.id) || [])
    ]).slice(0, 28);
    synthesisHeadlinesByAgentId.set(agent.id, perAgentHeadlines);
  }
  const roomSynthesisHeadlines = dedupeHeadlines([
    ...roomHeadlines,
    ...activeAgents.flatMap((agent) => synthesisHeadlinesByAgentId.get(agent.id) || [])
  ]).slice(0, 32);
  const roomSynthesisThemeBoard = triggerMode === "synthesis"
    ? buildSynthesisThemeBoard(roomSynthesisHeadlines)
    : [];
  const synthesisThemeBoardByAgentId = new Map<string, SynthesisThemeCluster[]>();
  if (triggerMode === "synthesis") {
    for (const agent of activeAgents) {
      synthesisThemeBoardByAgentId.set(
        agent.id,
        buildSynthesisThemeBoard(synthesisHeadlinesByAgentId.get(agent.id) || [])
      );
    }
  }
  const synthesisThemeDigest = triggerMode === "synthesis" ? buildClusteredThemeDigest(roomSynthesisThemeBoard) : [];
  const dominantSynthesisTheme = roomSynthesisThemeBoard[0] || null;
  const newsAnchors = roomSynthesisHeadlines.filter((headline) => !/synthesis_tick_|cross asset tape|market room/i.test(headline.title));
  const synthesisTopicLabel = triggerMode === "synthesis"
    ? deriveSynthesisTopicLabel(dominantSynthesisTheme, snapshot.headline)
    : "reactive_mode";
  const synthesisCatalystKey = triggerMode === "synthesis"
    ? normalizeSynthesisCatalystKey(triggerReason)
    : "reactive_catalyst";
  const synthesisPrimaryHeadline =
      triggerMode === "synthesis"
      ? dominantSynthesisTheme?.headlines[0]?.title || newsAnchors[0]?.title || snapshot.headline
      : snapshot.headline;
  return {
    runContextId,
    snapshotTimestamp: now,
    peerSnapshotVersion: `${now}:${peerSnapshot.length}`,
    peerSnapshot,
    roomSynthesisHeadlines,
    synthesisHeadlinesByAgentId,
    roomSynthesisThemeBoard,
    synthesisThemeBoardByAgentId,
    synthesisThemeBoard: roomSynthesisThemeBoard,
    dominantSynthesisTheme,
    synthesisThemeDigest,
    synthesisTopicLabel,
    synthesisCatalystKey,
    synthesisPrimaryHeadline
  };
}

function adaptTopicPlanForSynthesis(
  topicPlan: AgentTopicPlan,
  context: FrozenRunContext,
  selection: AgentSynthesisAnchorSelection
): AgentTopicPlan {
  const hasMatchedThesis = Boolean(topicPlan.matchedThesis);
  const catalyst = selection.anchorHeadline?.title || selection.themeLabel;
  return {
    ...topicPlan,
    action: hasMatchedThesis ? "thread_update" : "new_post",
    primary: {
      ...topicPlan.primary,
      themeKey: selection.themeKey,
      label: selection.themeLabel,
      catalyst
    },
    hasMeaningfulFreshSignal: (context.synthesisThemeBoard.length > 0 && !selection.isGenericFallback) || topicPlan.hasMeaningfulFreshSignal
  };
}

function normalizeSynthesisCatalystKey(triggerReason?: string): string {
  if (!triggerReason) {
    return "synthesis_tick_0";
  }
  const match = triggerReason.match(/synthesis_tick_(\d+)/i);
  if (match) {
    return `synthesis_tick_${match[1]}`;
  }
  return "synthesis_tick_0";
}

function buildSynthesisThemeBoard(headlines: SnapshotHeadline[]): SynthesisThemeCluster[] {
  const clusters = new Map<string, SynthesisThemeCluster>();
  for (const headline of headlines.slice(0, 28)) {
    const text = `${headline.title} ${headline.description || ""}`;
    const matched = SYNTHESIS_THEME_DEFINITIONS.find((theme) => theme.matcher.test(text)) || SYNTHESIS_THEME_DEFINITIONS[SYNTHESIS_THEME_DEFINITIONS.length - 1];
    const sectorRelevance: Record<string, number> = {};
    for (const sector of ["Macro", "Rates", "FX", "Equities", "Commodities", "Risk/Sentiment"]) {
      const bias = matched.sectorBias[sector] || 0;
      const hasEntity =
        sector === "Equities" && (headline.entities?.length || 0) > 0
          ? 2
          : 0;
      sectorRelevance[sector] = bias + hasEntity;
    }
    const existing = clusters.get(matched.key);
    const next: SynthesisThemeCluster = existing
      ? {
          ...existing,
          headlines: [...existing.headlines, headline],
          freshnessScore: existing.freshnessScore + freshnessWeight(headline),
          hasCompanyHeadline: existing.hasCompanyHeadline || (headline.entities?.length || 0) > 0
        }
      : {
          key: matched.key,
          label: matched.label,
          headlines: [headline],
          mechanismTerms: matched.mechanismTerms,
          sectorRelevance,
          isGeneric: Boolean(matched.generic),
          freshnessScore: freshnessWeight(headline),
          hasCompanyHeadline: (headline.entities?.length || 0) > 0
        };
    clusters.set(matched.key, next);
  }
  return [...clusters.values()]
    .sort((a, b) => {
      if (a.isGeneric !== b.isGeneric) {
        return a.isGeneric ? 1 : -1;
      }
      const left = a.headlines.length * 2 + a.freshnessScore;
      const right = b.headlines.length * 2 + b.freshnessScore;
      return right - left;
    })
    .slice(0, 5);
}

function freshnessWeight(headline: SnapshotHeadline): number {
  if (!headline.publishedAt) {
    return 1;
  }
  const ms = Date.now() - new Date(headline.publishedAt).getTime();
  if (!Number.isFinite(ms)) {
    return 1;
  }
  if (ms < 2 * 60 * 60 * 1000) {
    return 3;
  }
  if (ms < 8 * 60 * 60 * 1000) {
    return 2;
  }
  return 1;
}

function buildClusteredThemeDigest(themeBoard: SynthesisThemeCluster[]): string[] {
  const output: string[] = [];
  themeBoard.forEach((theme, index) => {
    output.push(`${index + 1}. ${theme.label}`);
    theme.headlines.slice(0, 2).forEach((headline) => {
      output.push(`   - ${headline.title} (${headline.source})`);
    });
  });
  return output;
}

function deriveSynthesisTopicLabel(dominantTheme: SynthesisThemeCluster | null, fallbackHeadline: string): string {
  if (!dominantTheme) {
    return slugifySynthesisLabel(fallbackHeadline || "cross_asset_synthesis");
  }
  return slugifySynthesisLabel(dominantTheme.key);
}

function slugifySynthesisLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "cross_asset_synthesis";
}

function selectSynthesisAnchorForAgent({
  agent,
  topicPlan,
  context,
  recentPosts,
  recentSynthesisSectorCounts
}: {
  agent: Agent;
  topicPlan: AgentTopicPlan;
  context: FrozenRunContext;
  recentPosts: AgentMessage[];
  recentSynthesisSectorCounts: Map<string, number>;
}): AgentSynthesisAnchorSelection | null {
  const agentThemeBoard = context.synthesisThemeBoardByAgentId.get(agent.id) || [];
  const roomThemeBoard = context.roomSynthesisThemeBoard;
  if (agentThemeBoard.length === 0 && roomThemeBoard.length === 0) {
    return null;
  }

  const thesisTopic = topicPlan.matchedThesis?.topicPrimary || "";
  const hasCompanyThemeOption = agentThemeBoard.some((theme) => theme.hasCompanyHeadline);
  const scoreTheme = (
    theme: SynthesisThemeCluster,
    source: "agent_board" | "room_board"
  ): { theme: SynthesisThemeCluster; score: number; participationAdjustment: number; source: "agent_board" | "room_board" } => {
    const sectorScore = theme.sectorRelevance[agent.sector] || 0;
    const thesisScore = thesisTopic && thesisTopic === theme.key ? 2 : 0;
    const equitiesCompanyBias =
      agent.sector === "Equities" && theme.hasCompanyHeadline ? 3 : 0;
    const equitiesOwnershipPenalty =
      agent.sector === "Equities" && hasCompanyThemeOption && !theme.hasCompanyHeadline ? -4 : 0;
    const dominanceCount = recentSynthesisSectorCounts.get(agent.sector) || 0;
    const participationAdjustment = dominanceCount >= 2 ? -2 : dominanceCount === 0 ? 1 : 0;
    const genericPenalty = theme.isGeneric ? -5 : 0;
    const freshness = Math.min(3, theme.freshnessScore);
    const sourceBias = source === "agent_board" ? 2 : 0;
    const score =
      sectorScore +
      thesisScore +
      equitiesCompanyBias +
      equitiesOwnershipPenalty +
      freshness +
      genericPenalty +
      participationAdjustment +
      sourceBias;
    return { theme, score, participationAdjustment, source };
  };
  const scored = [
    ...agentThemeBoard.map((theme) => scoreTheme(theme, "agent_board")),
    ...roomThemeBoard.map((theme) => scoreTheme(theme, "room_board"))
  ];

  scored.sort((a, b) => b.score - a.score);
  const best = scored.find((candidate) => !candidate.theme.isGeneric && candidate.theme.headlines.length > 0) || scored[0];
  if (!best) {
    return null;
  }

  const repetitionChallenge = buildSynthesisRepetitionChallenge({
    agent,
    recentPosts,
    theme: best.theme
  });
  const confidence: "high" | "medium" | "low" =
    best.score >= 7 ? "high" : best.score >= 4 ? "medium" : "low";

  const anchorHeadline = best.theme.headlines[0] || null;
  if (!anchorHeadline && !topicPlan.matchedThesis) {
    return null;
  }

  return {
    themeKey: best.theme.key,
    themeLabel: best.theme.label,
    anchorHeadline,
    anchorConfidence: confidence,
    mechanismTerms: best.theme.mechanismTerms,
    isGenericFallback: best.theme.isGeneric,
    relevanceScore: best.score,
    repetitionChallenge,
    hasCompanyHeadline: best.theme.hasCompanyHeadline,
    participationAdjustment: best.participationAdjustment,
    selectionMode: "strict",
    selectionSource: best.source,
    selectionReason:
      best.source === "room_board"
        ? "room_fallback"
        : agent.sector === "Equities" && best.theme.hasCompanyHeadline
          ? "selected_company_theme"
          : "selected_macro_theme"
  };
}

function buildSynthesisSectorParticipation(
  priorRoomThreads: AgentDiscussionThread[],
  synthesisEventIds: Set<string>
): Map<string, number> {
  const counts = new Map<string, number>();
  if (synthesisEventIds.size === 0) {
    return counts;
  }
  for (const thread of priorRoomThreads) {
    const post = thread.post;
    if (!post.eventId || !synthesisEventIds.has(post.eventId) || post.messageType !== "post") {
      continue;
    }
    counts.set(post.sector, (counts.get(post.sector) || 0) + 1);
  }
  return counts;
}

function buildSynthesisRepetitionChallenge({
  agent,
  recentPosts,
  theme
}: {
  agent: Agent;
  recentPosts: AgentMessage[];
  theme: SynthesisThemeCluster;
}): string | null {
  const relevant = recentPosts.slice(0, 6);
  const repeated = relevant.filter((post) => {
    const text = `${post.title || ""} ${post.catalyst || ""} ${post.content || ""}`.toLowerCase();
    const themeHit = text.includes(theme.key.replace(/_/g, " ")) || text.includes(theme.label.toLowerCase());
    const mechanismHit = theme.mechanismTerms.some((term) => text.includes(term.toLowerCase()));
    return themeHit || mechanismHit;
  });
  if (repeated.length < 2) {
    return null;
  }
  return [
    "SYNTHESIS NOVELTY CHECK:",
    `Your recent ${agent.sector} synthesis posts repeatedly used the same mechanism (${theme.label}).`,
    "State exactly what is new versus your prior synthesis output. If nothing new exists, stay silent."
  ].join("\n");
}

const MECHANISM_FAMILY_KEYWORDS: Record<MechanismFamily, RegExp> = {
  labor_inflation_persistence: /\b(?:nfp|payroll|employment|unemployment|wage|labor market|core pce|cpi|inflation)\b/i,
  fed_easing_timing: /\b(?:fed|fomc|rate cut|rate hike|policy path|higher for longer|dot plot|easing)\b/i,
  term_premium_repricing: /\b(?:10y|2y|yield curve|term premium|auction|refunding|duration|long end|bear steepener|bull steepener)\b/i,
  credit_stress: /\b(?:hy oas|credit spread|default|downgrade cycle|funding stress|liquidity stress|vix|risk premium)\b/i,
  commodity_pass_through: /\b(?:wti|brent|crude|oil|gas|inventory|eia|opec|energy|pass-through)\b/i,
  earnings_fundamentals_deterioration: /\b(?:earnings|eps|revenue|guidance|margin|bookings|arr|cash flow|valuation|target cut|downgrade)\b/i,
  revisions_breadth_sector_weakness: /\b(?:breadth|other 490|small cap|mega-cap|revisions|sector weakness|factor|dispersion)\b/i,
  cross_asset_setup: /\b(?:cross-asset|broad market|risk-on|risk-off|macro backdrop)\b/i
};

function rankMechanismFamilyForAgent({
  agent,
  topicPlan,
  headlineAnalysis,
  synthesisSelection,
  marketSnapshot,
  relevantCases,
  knowledgeSnippets,
  peerSnapshot
}: {
  agent: Agent;
  topicPlan: AgentTopicPlan;
  headlineAnalysis: HeadlineAnalysis | null;
  synthesisSelection: AgentSynthesisAnchorSelection | null;
  marketSnapshot: MarketSnapshotPayload;
  relevantCases: import("@market-room/shared").MarketCase[];
  knowledgeSnippets: LocalKnowledgeSnippet[];
  peerSnapshot: FrozenPeerThesisSnapshotRow[];
}): MechanismSelection {
  const anchor = synthesisSelection?.anchorHeadline?.title
    || headlineAnalysis?.headline_title
    || topicPlan.primary.catalyst
    || marketSnapshot.headline
    || "";
  const sourceText = [
    anchor,
    topicPlan.primary.label,
    headlineAnalysis?.primary_mechanism || "",
    synthesisSelection?.themeLabel || "",
    synthesisSelection?.mechanismTerms.join(" ") || "",
    relevantCases.slice(0, 3).map((marketCase) => `${marketCase.patternSummary} ${marketCase.implicationNote}`).join(" "),
    knowledgeSnippets.slice(0, 6).map((snippet) => `${snippet.title} ${snippet.excerpt}`).join(" "),
    peerSnapshot.slice(0, 5).map((peer) => `${peer.agentId} ${peer.claim}`).join(" "),
    marketSnapshot.summary
  ].join(" ");

  let bestFamily: MechanismFamily = "cross_asset_setup";
  let bestScore = -1;
  const evidence: string[] = [];

  (Object.keys(MECHANISM_FAMILY_KEYWORDS) as MechanismFamily[]).forEach((family) => {
    const regex = MECHANISM_FAMILY_KEYWORDS[family];
    let score = 0;
    if (regex.test(sourceText)) score += 3;
    if (regex.test(anchor)) score += 4;
    if (headlineAnalysis?.primary_mechanism && regex.test(headlineAnalysis.primary_mechanism)) score += 3;
    if (topicPlan.primary.label && regex.test(topicPlan.primary.label)) score += 2;
    if (synthesisSelection?.mechanismTerms.some((term) => regex.test(term))) score += 3;
    if (agent.sector === "Macro" && family === "fed_easing_timing") score += 1;
    if (agent.sector === "Equities" && family === "earnings_fundamentals_deterioration") score += 2;
    if (score > bestScore) {
      bestScore = score;
      bestFamily = family;
    }
  });

  if (headlineAnalysis?.primary_mechanism) {
    evidence.push(`headline_mechanism=${headlineAnalysis.primary_mechanism}`);
  }
  if (synthesisSelection?.themeLabel) {
    evidence.push(`theme=${synthesisSelection.themeLabel}`);
  }
  evidence.push(`anchor=${truncateText(anchor, 100)}`);

  return {
    family: bestFamily,
    score: bestScore,
    evidence,
    anchor
  };
}

function snippetLogicFamily(snippet: LocalKnowledgeSnippet): string {
  const text = `${snippet.title} ${snippet.excerpt}`.toLowerCase();
  if (/\b(?:150k|core pce|nfp|payroll)\b/.test(text)) return "labor_threshold";
  if (/\b(?:term premium|auction|refunding|duration|10y|2y)\b/.test(text)) return "rates_term";
  if (/\b(?:hy oas|spread|default|credit)\b/.test(text)) return "credit";
  if (/\b(?:wti|brent|opec|inventory|crude|gas)\b/.test(text)) return "commodity";
  if (/\b(?:earnings|eps|revenue|guidance|valuation|margin)\b/.test(text)) return "equity_fundamentals";
  return "generic";
}

function selectPromptKnowledgeSnippets({
  agent,
  snippets,
  mechanism
}: {
  agent: Agent;
  snippets: LocalKnowledgeSnippet[];
  mechanism: MechanismSelection;
}): LocalKnowledgeSnippet[] {
  const filtered = snippets.filter((snippet) => {
    if (agent.sector !== "Macro") {
      return true;
    }
    const text = `${snippet.title} ${snippet.excerpt}`.toLowerCase();
    const hasLaborThreshold = /\b(?:150k|core pce|nfp|payroll)\b/.test(text);
    const laborMechanism = mechanism.family === "labor_inflation_persistence" || mechanism.family === "fed_easing_timing";
    return !hasLaborThreshold || laborMechanism;
  });

  const seenFamilies = new Set<string>();
  const deduped: LocalKnowledgeSnippet[] = [];
  for (const snippet of filtered) {
    const family = snippetLogicFamily(snippet);
    if (seenFamilies.has(family) && family !== "generic") {
      continue;
    }
    deduped.push(snippet);
    seenFamilies.add(family);
    if (deduped.length >= 5) {
      break;
    }
  }
  return deduped;
}

function selectPromptRelevantCases(
  relevantCases: import("@market-room/shared").MarketCase[],
  mechanism: MechanismSelection
): import("@market-room/shared").MarketCase[] {
  const regex = MECHANISM_FAMILY_KEYWORDS[mechanism.family];
  const matched = relevantCases.filter((marketCase) =>
    regex.test(`${marketCase.title} ${marketCase.patternSummary} ${marketCase.implicationNote}`.toLowerCase())
  );
  const selected = matched.length > 0 ? matched : relevantCases;
  return selected.slice(0, 4);
}

function hasHouseViewVisibleLanguage(content: string): boolean {
  return /\b(?:house view|house thesis|playbook|starter pack|approved long-term memory|memory snippets?|framework says|as per framework)\b/i.test(
    content
  );
}

function scrubHouseViewVisibleLanguage(content: string): string {
  return content
    .replace(/\bhouse view\b/gi, "current evidence view")
    .replace(/\bhouse thesis\b/gi, "current thesis")
    .replace(/\bplaybook\b/gi, "current setup")
    .replace(/\bstarter pack\b/gi, "context")
    .replace(/\bapproved long-term memory snippets?\b/gi, "supporting context")
    .replace(/\bframework says\b/gi, "evidence suggests")
    .replace(/\sas per framework\b/gi, "based on current evidence");
}

function inferMechanismFamilyFromText(text: string): MechanismFamily {
  const lower = text.toLowerCase();
  const entries = (Object.keys(MECHANISM_FAMILY_KEYWORDS) as MechanismFamily[])
    .map((family) => ({
      family,
      hit: MECHANISM_FAMILY_KEYWORDS[family].test(lower) ? 1 : 0
    }))
    .sort((left, right) => right.hit - left.hit);
  if (!entries[0] || entries[0].hit === 0) {
    return "cross_asset_setup";
  }
  return entries[0].family;
}

function applyEvidenceFirstMechanismGate({
  agent,
  content,
  mechanism,
  catalyst,
  recentPosts
}: {
  agent: Agent;
  content: string;
  mechanism: MechanismSelection;
  catalyst: string;
  recentPosts: AgentMessage[];
}): {
  content: string;
  suppressed: boolean;
  metrics: {
    mechanismFamily: MechanismFamily;
    houseViewVisible: boolean;
    mechanismFit: boolean;
    macroThresholdPairUsed: boolean;
    macroThresholdPairRelevant: boolean;
    repeatDeltaVisible: boolean;
    repaired: boolean;
  };
} {
  let nextContent = content;
  let repaired = false;
  const initialHouseViewVisible = hasHouseViewVisibleLanguage(nextContent);
  if (initialHouseViewVisible) {
    nextContent = scrubHouseViewVisibleLanguage(nextContent);
    repaired = true;
  }

  let thresholdPairUsed = /\b(?:150\s?k|150k)\b/i.test(nextContent) && /\bcore pce\b/i.test(nextContent);
  const thresholdPairRelevant =
    mechanism.family === "labor_inflation_persistence" || mechanism.family === "fed_easing_timing";
  if (agent.sector === "Macro" && thresholdPairUsed && !thresholdPairRelevant) {
    nextContent = stripMacroThresholdPairSentences(nextContent);
    const replacement = convictionRepairSentenceBySector(catalyst, agent.sector, mechanism.family);
    nextContent = ensureSingleConvictionCondition(nextContent, replacement);
    repaired = true;
    thresholdPairUsed = /\b(?:150\s?k|150k)\b/i.test(nextContent) && /\bcore pce\b/i.test(nextContent);
  }

  let mechanismFit = MECHANISM_FAMILY_KEYWORDS[mechanism.family].test(nextContent.toLowerCase());
  if (!mechanismFit) {
    nextContent = `The operative transmission mechanism here is ${mechanism.family.replace(/_/g, " ")}, and the elected catalyst must be read through that channel. ${nextContent}`.trim();
    repaired = true;
    mechanismFit = MECHANISM_FAMILY_KEYWORDS[mechanism.family].test(nextContent.toLowerCase());
  }
  let repeatDeltaVisible = hasDeltaSignal(nextContent);
  let suppressed = false;
  if (agent.sector === "Macro") {
    const recentFamilies = recentPosts
      .slice(0, 3)
      .map((post) => inferMechanismFamilyFromText(`${post.title || ""} ${post.catalyst || ""} ${post.content || ""}`));
    const repeatedSameFamily = recentFamilies.filter((family) => family === mechanism.family).length >= 3;
    if (repeatedSameFamily && !repeatDeltaVisible) {
      nextContent = `What changed now versus the prior macro read is explicit here: the current catalyst shifts the mechanism through ${mechanism.family.replace(/_/g, " ")}. ${nextContent}`.trim();
      repaired = true;
      repeatDeltaVisible = hasDeltaSignal(nextContent);
      if (!repeatDeltaVisible) {
        suppressed = true;
      }
    }
    if (thresholdPairUsed && !thresholdPairRelevant) {
      suppressed = true;
    }
  }

  return {
    content: nextContent,
    suppressed,
    metrics: {
      mechanismFamily: mechanism.family,
      houseViewVisible: initialHouseViewVisible,
      mechanismFit,
      macroThresholdPairUsed: thresholdPairUsed,
      macroThresholdPairRelevant: thresholdPairRelevant,
      repeatDeltaVisible,
      repaired
    }
  };
}

function stripMacroThresholdPairSentences(content: string): string {
  const sentences = content.split(/(?<=[.?!])\s+/);
  const filtered = sentences.filter((sentence) => {
    const has150k = /\b(?:150\s?k|150k)\b/i.test(sentence);
    const hasCorePce = /\bcore pce\b/i.test(sentence);
    return !(has150k && hasCorePce);
  });
  return filtered.join(" ").replace(/\s{2,}/g, " ").trim();
}

function ensureSingleConvictionCondition(content: string, replacement: string): string {
  const withoutOld = content.replace(/\bThis view changes if\b[^.?!]*(?:[.?!]|$)/gi, "").replace(/\s{2,}/g, " ").trim();
  return `${withoutOld} ${replacement}`.trim();
}

function hasSynthesisAnchorMismatch({
  content,
  selection
}: {
  content: string;
  selection: AgentSynthesisAnchorSelection;
}): boolean {
  const lower = content.toLowerCase();
  const anchorText = (selection.anchorHeadline?.title || "").toLowerCase();
  const anchorTokens = tokenizeAnchorTerms(anchorText);
  const anchorHit = anchorTokens.some((token) => lower.includes(token));
  const themeHit = selection.themeLabel
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 4)
    .some((token) => lower.includes(token));
  const mechanismHit = selection.mechanismTerms.some((term) => lower.includes(term.toLowerCase()));
  return !(anchorHit || (themeHit && mechanismHit));
}

function tokenizeAnchorTerms(text: string): string[] {
  const stop = new Set(["with", "from", "that", "this", "into", "after", "before", "amid", "over"]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 4 && !stop.has(token))
    .slice(0, 8);
}

function repairSynthesisAnchorContent(content: string, selection: AgentSynthesisAnchorSelection): string {
  const anchor = selection.anchorHeadline?.title || selection.themeLabel;
  const mechanism = selection.mechanismTerms[0] || "transmission channel";
  const bridge = `The elected synthesis anchor is ${anchor}, and the core mechanism is ${mechanism}; this post extends that catalyst into a forward cross-asset thesis.`;
  if (content.toLowerCase().includes(anchor.toLowerCase())) {
    return content;
  }
  return `${bridge} ${content}`;
}

function countConvictionSentences(content: string): number {
  return (content.match(/\bThis view changes if\b/gi) || []).length;
}

function keepSingleConvictionSentence(content: string): string {
  const matches = content.match(/\bThis view changes if\b[^.?!]*(?:[.?!]|$)/gi) || [];
  if (matches.length <= 1) {
    return content;
  }
  let cleaned = content;
  for (let i = 1; i < matches.length; i += 1) {
    cleaned = cleaned.replace(matches[i], "").replace(/\s{2,}/g, " ");
  }
  return cleaned.trim();
}

function hasDirectionalCall(content: string): boolean {
  return /\b(bullish|bearish|cautious-bullish|cautious-bearish)\b/i.test(content);
}

function hasDataAnchorNumber(content: string): boolean {
  return /\b\d+(?:\.\d+)?\s?(?:%|bps|bp|x|bn|billion|m|million|\$|oz|bbl)\b/i.test(content);
}

function hasDeltaSignal(content: string): boolean {
  return /\b(what changed|changed|delta|versus|vs\.|compared with|since last|now|previously)\b/i.test(content);
}

function hasSectorSpecificOpening(agent: Agent, content: string): boolean {
  const opening = content.split(/[.?!]/)[0] || "";
  const sectorKeywords: Record<string, RegExp> = {
    Macro: /\b(growth|inflation|fed|policy|payrolls|macro|cpi|pce)\b/i,
    Rates: /\b(10y|2y|yield|curve|duration|treasury|refunding)\b/i,
    FX: /\b(dxy|usd|eur|jpy|fx|carry|currency)\b/i,
    Equities: /\b(stock|equity|earnings|guidance|valuation|share|market cap|eps)\b/i,
    Commodities: /\b(wti|brent|crude|gold|copper|commodity|inventory)\b/i,
    "Risk/Sentiment": /\b(vix|spread|hy oas|risk|volatility|credit|sentiment)\b/i
  };
  return (sectorKeywords[agent.sector] || /.*/i).test(opening);
}

function isEligibleForSynthesisFloorRescue({
  selection,
  mechanism,
  postingDecision
}: {
  selection: AgentSynthesisAnchorSelection;
  mechanism: MechanismSelection;
  postingDecision: PostingDecision;
}): boolean {
  if (selection.isGenericFallback || !selection.anchorHeadline) {
    return false;
  }
  if (selection.relevanceScore < 3 || mechanism.score < 3) {
    return false;
  }
  // Only rescue soft outcomes; do not rescue explicit hard rejections.
  return (
    postingDecision.actionType === "comment_only" ||
    postingDecision.actionType === "stay_silent" ||
    postingDecision.reasonCodes.includes("no_fresh_signal") ||
    postingDecision.reasonCodes.includes("weak_catalyst_materiality_gate")
  );
}

function applySynthesisPublicationQualityGate({
  agent,
  content,
  selection,
  postingDecision,
  equityFundamentalsContext
}: {
  agent: Agent;
  content: string;
  selection: AgentSynthesisAnchorSelection;
  postingDecision: PostingDecision;
  equityFundamentalsContext: EquitySubjectDataContext | null;
}): {
  content: string;
  flags: PostQualityFlag[];
  suppressed: boolean;
  repaired: boolean;
  metrics: {
    anchorVisible: boolean;
    deltaVisible: boolean;
    directionalCall: boolean;
    dataAnchor: boolean;
    convictionCount: number;
    publicationGate: "passed" | "suppressed_hard_fail" | "suppressed_soft_fail_accumulated";
  };
} {
  let nextContent = content;
  const flags: PostQualityFlag[] = [];
  let repaired = false;

  const qualityState = () => {
    const anchorVisible = !hasSynthesisAnchorMismatch({ content: nextContent, selection });
    const deltaVisible = hasDeltaSignal(nextContent);
    const directionalCall = hasDirectionalCall(nextContent);
    const dataAnchor = hasDataAnchorNumber(nextContent);
    const convictionCount = countConvictionSentences(nextContent);
    const chainVisible = hasTransmissionChainShape(nextContent);
    const sectorOpening = hasSectorSpecificOpening(agent, nextContent);
    return { anchorVisible, deltaVisible, directionalCall, dataAnchor, convictionCount, chainVisible, sectorOpening };
  };

  let state = qualityState();

  if (!state.directionalCall) {
    flags.push("synthesis_directional_call_missing");
    nextContent = `${stanceFor(agent)} ${primaryAssetLabelFor(agent)} remains the base directional view under this elected anchor. ${nextContent}`.trim();
    repaired = true;
  }

  if (!state.dataAnchor) {
    flags.push("synthesis_data_anchor_missing");
  }

  if (state.convictionCount > 1) {
    flags.push("synthesis_duplicate_conviction_condition");
    nextContent = keepSingleConvictionSentence(nextContent);
    repaired = true;
  }

  if (!state.deltaVisible && postingDecision.actionType === "update_existing") {
    flags.push("synthesis_delta_missing");
    nextContent = `What changed versus the prior synthesis view is now explicit in this update. ${nextContent}`.trim();
    repaired = true;
  }

  if (!state.sectorOpening) {
    flags.push("synthesis_opening_not_sector_specific");
  }

  if (
    agent.sector === "Equities" &&
    selection.hasCompanyHeadline &&
    equityFundamentalsContext &&
    (equityFundamentalsContext.dataTier === "light" || equityFundamentalsContext.dataTier === "rich") &&
    !hasVisibleFetchedFundamentals(nextContent, equityFundamentalsContext).visible
  ) {
    const repair = buildEquityFundamentalsRepairSentence(equityFundamentalsContext);
    if (repair) {
      nextContent = `${nextContent} ${repair}`.trim();
      repaired = true;
    }
  }

  state = qualityState();
  const hardFailureReasons: string[] = [];
  if (!state.anchorVisible) hardFailureReasons.push("anchor_not_visible");
  if (!state.directionalCall) hardFailureReasons.push("directional_call_missing");
  if (state.convictionCount !== 1) hardFailureReasons.push("conviction_count_invalid");

  let softFailureCount = 0;
  if (!state.dataAnchor) softFailureCount += 1;
  if (!state.chainVisible) softFailureCount += 1;
  if (!state.sectorOpening && agent.sector === "Equities") softFailureCount += 1;
  if (postingDecision.actionType === "update_existing" && !state.deltaVisible) softFailureCount += 1;

  const hardFail = hardFailureReasons.length > 0;
  const softFailAccumulated = softFailureCount >= 4;
  const suppressed = hardFail || softFailAccumulated;
  const publicationGate: "passed" | "suppressed_hard_fail" | "suppressed_soft_fail_accumulated" =
    hardFail
      ? "suppressed_hard_fail"
      : softFailAccumulated
        ? "suppressed_soft_fail_accumulated"
        : "passed";

  return {
    content: nextContent,
    flags: uniqueQualityFlags(flags),
    suppressed,
    repaired,
    metrics: {
      anchorVisible: state.anchorVisible,
      deltaVisible: state.deltaVisible,
      directionalCall: state.directionalCall,
      dataAnchor: state.dataAnchor,
      convictionCount: state.convictionCount,
      publicationGate
    }
  };
}

function mapSynthesisAction({
  triggerMode,
  messageType,
  postingDecision
}: {
  triggerMode: DiscussionTriggerMode;
  messageType: "post" | "comment";
  postingDecision: PostingDecision;
}): "new_thesis" | "thesis_update" | "silent" {
  if (triggerMode !== "synthesis") {
    return messageType === "post" ? "new_thesis" : "thesis_update";
  }
  if (postingDecision.actionType === "stay_silent" || postingDecision.actionType === "comment_only") {
    return "silent";
  }
  if (postingDecision.actionType === "update_existing" || messageType === "comment") {
    return "thesis_update";
  }
  return "new_thesis";
}

function extractEngagedPeerAgent(content: string, peers: FrozenPeerThesisSnapshotRow[]): string | null {
  const lower = content.toLowerCase();
  const match = peers.find((peer) =>
    lower.includes(peer.agentId.toLowerCase()) || lower.includes(peer.agentName.toLowerCase())
  );
  return match?.agentId || null;
}

function hasTransmissionChainShape(content: string): boolean {
  const lower = content.toLowerCase();
  const hasMechanism = /transmi|because|drives|passes through|spillover/.test(lower);
  const hasCrossAsset = /yield|dxy|dollar|equities|credit|vix|oil|wti|spread/.test(lower);
  const hasFalsifier = /this view changes if/.test(lower);
  return hasMechanism && hasCrossAsset && hasFalsifier;
}

function countParagraphBlocks(content: string): number {
  const trimmed = content.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean).length;
}

function countWords(content: string): number {
  const words = content.trim().match(/\b[\w'-]+\b/g);
  return words ? words.length : 0;
}

function reflowSynthesisParagraphs(content: string): string {
  const cleaned = content.replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
  if (!cleaned) {
    return content;
  }
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
  if (sentences.length < 4) {
    return content;
  }
  const words = countWords(cleaned);
  const targetParagraphs = words >= 220 ? 3 : 2;
  const chunkSize = Math.max(1, Math.ceil(sentences.length / targetParagraphs));
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += chunkSize) {
    paragraphs.push(sentences.slice(i, i + chunkSize).join(" "));
  }
  return paragraphs.join("\n\n").trim();
}

function applySynthesisParagraphReadabilityGate(content: string): {
  content: string;
  paragraphs: number;
  repaired: boolean;
  gate: "passed" | "reflowed";
} {
  const words = countWords(content);
  const initialParagraphs = countParagraphBlocks(content);
  if (words < 140 || initialParagraphs !== 1) {
    return {
      content,
      paragraphs: Math.max(1, Math.min(initialParagraphs || 1, 4)),
      repaired: false,
      gate: "passed"
    };
  }

  const reflowed = reflowSynthesisParagraphs(content);
  const paragraphCount = countParagraphBlocks(reflowed);
  if (paragraphCount > 1) {
    return {
      content: reflowed,
      paragraphs: Math.min(paragraphCount, 4),
      repaired: true,
      gate: "reflowed"
    };
  }

  return {
    content,
    paragraphs: Math.max(1, Math.min(initialParagraphs, 4)),
    repaired: false,
    gate: "passed"
  };
}

function hasStoredDataCitation(content: string): boolean {
  return /\bcorrelation\b|\bstored data\b|\bobservations\b|\bbps\b|\b%/.test(content.toLowerCase());
}

function buildAgentTopicPlan(
  agent: Agent,
  marketSnapshot: MarketSnapshotPayload,
  previousSnapshot: MarketSnapshotPayload | null,
  recentPosts: AgentMessage[],
  priorRoomThreads: AgentDiscussionThread[],
  recentRoomCoverage: Map<string, number>,
  runThemeCoverage: Map<string, number>,
  generalHeadlines: SnapshotHeadline[],
  sectorHeadlines: SnapshotHeadline[],
  recentTheses: Thesis[],
  roomCoverage: RoomCoverageState | null
): AgentTopicPlan {
  const mergedHeadlines = relevantHeadlinesForAgent(agent, [
    ...sectorHeadlines,
    ...generalHeadlines,
    ...marketSnapshot.headlines
  ]).slice(0, 10);
  const candidateMap = new Map<string, ThemeOpportunity>();
  const recentThemeEntries = recentPosts
    .map((post) => ({
      post,
      themeKey:
        post.thesisTopicPrimary ||
        inferPrimaryThemeKey([post.title, post.catalyst, post.content].filter(Boolean).join(" "), agent.sector)
    }))
    .slice(0, 4);
  const recentAgentThemes = recentThemeEntries
    .map((entry) => entry.themeKey)
    .filter((theme, index, list) => list.indexOf(theme) === index);
  const recentRoomThemes = [...recentRoomCoverage.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([theme]) => humanizeThemeKey(theme))
    .slice(0, 5);

  for (const [index, headline] of mergedHeadlines.entries()) {
    const themeKey = inferPrimaryThemeKey(headline.title, agent.sector);
    const baseScore = Math.max(10 - index, 4) + scoreHeadlineForKeywords(headline, sectorKeywordsFor(agent));
    addThemeOpportunity(candidateMap, themeKey, {
      themeKey,
      label: humanizeThemeKey(themeKey),
      catalyst: `${headline.title} (${headline.source})`,
      score: adjustOpportunityScore(themeKey, baseScore, recentAgentThemes, recentRoomCoverage, runThemeCoverage, roomCoverage),
      evidence: [headline.title]
    });
  }

  for (const instrument of relevantInstrumentsForAgent(agent, marketSnapshot)) {
    const themeKey = instrumentThemeKey(agent, instrument.key);
    const baseScore =
      4 +
      Math.max(absolutePercentChangeFor(marketSnapshot, instrument.key), absoluteBpsChangeFor(marketSnapshot, instrument.key) / 4) +
      (instrument.status === "live" ? 1.5 : 0);
    addThemeOpportunity(candidateMap, themeKey, {
      themeKey,
      label: humanizeThemeKey(themeKey),
      catalyst: `${instrument.label} ${instrument.value}${instrument.change ? ` (${instrument.change})` : ""}`,
      score: adjustOpportunityScore(themeKey, baseScore, recentAgentThemes, recentRoomCoverage, runThemeCoverage, roomCoverage),
      evidence: [`${instrument.label} ${instrument.change || instrument.value}`]
    });
  }

  for (const watchlistOpportunity of equityWatchlistThemeOpportunities(agent, mergedHeadlines)) {
    addThemeOpportunity(candidateMap, watchlistOpportunity.themeKey, {
      ...watchlistOpportunity,
      score: adjustOpportunityScore(
        watchlistOpportunity.themeKey,
        watchlistOpportunity.score,
        recentAgentThemes,
        recentRoomCoverage,
        runThemeCoverage,
        roomCoverage
      )
    });
  }

  for (const evergreen of evergreenThemesFor(agent, marketSnapshot, previousSnapshot, priorRoomThreads)) {
    addThemeOpportunity(candidateMap, evergreen.themeKey, {
      ...evergreen,
      score: adjustOpportunityScore(
        evergreen.themeKey,
        evergreen.score,
        recentAgentThemes,
        recentRoomCoverage,
        runThemeCoverage,
        roomCoverage
      )
    });
  }

  const opportunities = [...candidateMap.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  const primaryCandidate =
    choosePrimaryOpportunity(opportunities, recentThemeEntries, agent) ||
    {
      themeKey: inferPrimaryThemeKey(agent.sector, agent.sector),
      label: `${agent.sector} market setup`,
      catalyst: fallbackCatalyst(agent, marketSnapshot),
      score: 1,
      evidence: ["fallback market setup"]
    };
  const activeTheses = recentTheses.filter((thesis) =>
    ["open", "developing", "waiting_for_data", "confirmed", "reopened"].includes(thesis.status)
  );
  const matchedFallbackOpportunity = opportunities.find((opportunity) =>
    Boolean(findBestMatchingThesis(opportunity.themeKey, recentTheses))
  );
  const primary =
    !findBestMatchingThesis(primaryCandidate.themeKey, recentTheses) &&
    matchedFallbackOpportunity &&
    activeTheses.length >= 2 &&
    matchedFallbackOpportunity.score >= primaryCandidate.score - 3
      ? matchedFallbackOpportunity
      : primaryCandidate;

  const matchedThesis = findBestMatchingThesis(primary.themeKey, recentTheses);
  const updateTarget =
    matchedThesis?.rootMessageId
      ? { id: matchedThesis.rootMessageId }
      : recentThemeEntries.find((entry) => entry.themeKey === primary.themeKey)?.post || null;
  const topRecentThemes = recentThemeEntries.slice(0, 2).map((entry) => entry.themeKey);
  const isImmediateRepeat = topRecentThemes[0] === primary.themeKey;
  const isMultiPostRepeat = topRecentThemes.filter((themeKey) => themeKey === primary.themeKey).length >= 2;
  const hasMeaningfulFreshSignal = checkMeaningfulFreshSignal(agent, sectorHeadlines, previousSnapshot, marketSnapshot);
  const shouldStaySilent =
    !matchedThesis &&
    primary.score <= 0 &&
    !hasMeaningfulFreshSignal &&
    recentPosts.length > 0;
  const shouldUpdateExistingThread =
    Boolean(matchedThesis || updateTarget) &&
    (Boolean(matchedThesis) || isImmediateRepeat || isMultiPostRepeat);
  const thesisStatus = matchedThesis
    ? nextThesisStatusForUpdate(matchedThesis, hasMeaningfulFreshSignal)
    : shouldStaySilent
      ? null
      : hasMeaningfulFreshSignal
        ? "open"
        : "waiting_for_data";

  return {
    primary,
    alternates: opportunities.slice(1, 4),
    recentAgentThemes: recentAgentThemes.map((theme) => humanizeThemeKey(theme)),
    recentRoomThemes,
    coveredThemesToAvoid: [
      ...[...recentRoomCoverage.entries()]
        .filter(([theme, count]) => count >= 2 && theme !== primary.themeKey)
        .map(([theme]) => humanizeThemeKey(theme)),
      ...(roomCoverage?.overcoveredTopics || [])
        .filter((t) => t !== primary.themeKey)
        .map((t) => humanizeThemeKey(t))
    ]
      .filter((theme, index, list) => list.indexOf(theme) === index)
      .slice(0, 6),
    action: shouldStaySilent ? "stay_silent" : shouldUpdateExistingThread ? "thread_update" : "new_post",
    updateTargetPostId: shouldUpdateExistingThread ? updateTarget?.id || null : null,
    matchedThesis,
    thesisStatus,
    topicPrimaryKey: primary.themeKey,
    topicSecondaryKey:
      opportunities.find((opportunity) => opportunity.themeKey !== primary.themeKey)?.themeKey || null,
    hasMeaningfulFreshSignal
  };
}

function checkMeaningfulFreshSignal(
  agent: Agent,
  sectorHeadlines: SnapshotHeadline[],
  previousSnapshot: MarketSnapshotPayload | null,
  marketSnapshot: MarketSnapshotPayload
): boolean {
  return (
    sectorHeadlines.length > 0 ||
    buildSectorDeltaSummary(agent, previousSnapshot, marketSnapshot).some(
      (delta) =>
        !delta.includes("broadly unchanged") &&
        !delta.includes("No prior snapshot is available")
    )
  );
}

function flattenThreadPosts(threads: AgentDiscussionThread[], limit = 12): AgentMessage[] {
  return threads.flatMap((t) => [t.post, ...t.comments]).slice(0, limit);
}

function findBestMatchingThesis(themeKey: string, recentTheses: Thesis[]): Thesis | null {
  const activeStatuses: ThesisStatus[] = ["open", "developing", "waiting_for_data", "confirmed", "reopened"];
  const matching = recentTheses.filter(
    (thesis) => thesisMatchesTheme(thesis, themeKey)
  );

  return (
    matching.find((thesis) => activeStatuses.includes(thesis.status)) ||
    matching.find((thesis) => thesis.status === "stale") ||
    matching.find((thesis) => thesis.status === "invalidated") ||
    null
  );
}

function thesisMatchesTheme(thesis: Thesis, themeKey: string): boolean {
  const targetFamily = topicFamilyFor(themeKey);
  return (
    thesis.topicPrimary === themeKey ||
    thesis.topicSecondary === themeKey ||
    topicFamilyFor(thesis.topicPrimary) === targetFamily ||
    (thesis.topicSecondary ? topicFamilyFor(thesis.topicSecondary) === targetFamily : false)
  );
}

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

function nextThesisStatusForUpdate(thesis: Thesis, hasMeaningfulFreshSignal: boolean): ThesisStatus {
  if (thesis.status === "stale" || thesis.status === "invalidated") {
    return "reopened";
  }

  if (!hasMeaningfulFreshSignal) {
    return "waiting_for_data";
  }

  return thesis.status === "confirmed" ? "confirmed" : "developing";
}

function buildPostThesisWritePlan({
  message,
  agent,
  marketSnapshot,
  eventId,
  snapshotId,
  topicPlan
}: {
  message: AgentMessage;
  agent: Agent;
  marketSnapshot: MarketSnapshotPayload;
  eventId: string;
  snapshotId: string;
  topicPlan: AgentTopicPlan;
}): ThesisWritePlan | null {
  if (!message.thesisId || !message.thesisUpdateId || !topicPlan.thesisStatus) {
    return null;
  }

  const update: ThesisUpdate = {
    id: message.thesisUpdateId,
    thesisId: message.thesisId,
    agentId: message.agentId,
    eventId,
    snapshotId,
    messageId: message.id,
    updateType:
      topicPlan.action === "thread_update" && topicPlan.thesisStatus === "reopened"
        ? "reopen"
        : topicPlan.action === "thread_update"
          ? "update"
          : "create",
    statusBefore: topicPlan.matchedThesis?.status || null,
    statusAfter: topicPlan.thesisStatus,
    confidenceBefore: topicPlan.matchedThesis?.confidenceCurrent ?? null,
    confidenceAfter: message.confidence,
    summary: summarizeThesisUpdate(message),
    createdAt: message.createdAt
  };

  if (topicPlan.action === "thread_update" && topicPlan.matchedThesis) {
    return {
      kind: "update",
      thesisId: topicPlan.matchedThesis.id,
      status: topicPlan.thesisStatus,
      confidenceCurrent: message.confidence,
      latestMessageId: message.id,
      latestSnapshotId: snapshotId,
      latestEventId: eventId,
      topicPrimary: message.thesisTopicPrimary || topicPlan.topicPrimaryKey,
      topicSecondary: message.thesisTopicSecondary || topicPlan.topicSecondaryKey,
      lastUpdatedAt: message.createdAt,
      update
    };
  }

  return {
    kind: "create",
    thesis: {
      id: message.thesisId,
      roomId: message.roomId,
      ownerAgentId: message.agentId,
      ownerAgentName: message.agentName,
      sector: agent.sector,
      canonicalClaim: canonicalClaimForMessage(message),
      title: message.title || fallbackForumTitle(agent, marketSnapshot, topicPlan),
      topicPrimary: message.thesisTopicPrimary || topicPlan.topicPrimaryKey,
      topicSecondary: message.thesisTopicSecondary || topicPlan.topicSecondaryKey,
      status: topicPlan.thesisStatus,
      confidenceCurrent: message.confidence,
      rootMessageId: message.id,
      latestMessageId: message.id,
      createdSnapshotId: snapshotId,
      latestSnapshotId: snapshotId,
      createdEventId: eventId,
      latestEventId: eventId,
      createdAt: message.createdAt,
      lastUpdatedAt: message.createdAt
    },
    update
  };
}

function buildCommentThesisWritePlan({
  message,
  post,
  eventId,
  snapshotId
}: {
  message: AgentMessage;
  post: AgentMessage;
  eventId: string;
  snapshotId: string;
}): ThesisWritePlan | null {
  if (!message.thesisId || !message.thesisUpdateId) {
    return null;
  }

  return {
    kind: "update",
    thesisId: message.thesisId,
    status: post.thesisStatus || "developing",
    confidenceCurrent: post.confidence,
    latestMessageId: message.id,
    latestSnapshotId: snapshotId,
    latestEventId: eventId,
    lastUpdatedAt: message.createdAt,
    update: {
      id: message.thesisUpdateId,
      thesisId: message.thesisId,
      agentId: message.agentId,
      eventId,
      snapshotId,
      messageId: message.id,
      updateType: "comment",
      statusBefore: post.thesisStatus,
      statusAfter: post.thesisStatus,
      confidenceBefore: post.confidence,
      confidenceAfter: post.confidence,
      summary: summarizeThesisUpdate(message),
      createdAt: message.createdAt
    }
  };
}

function canonicalClaimForMessage(message: AgentMessage): string {
  const firstSentence = message.content
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)[0]
    ?.trim();

  return truncateText(firstSentence || message.content, 220);
}

function summarizeThesisUpdate(message: AgentMessage): string {
  return truncateText(
    [message.title, message.catalyst, message.content].filter(Boolean).join(" | "),
    260
  );
}

function addThemeOpportunity(
  candidateMap: Map<string, ThemeOpportunity>,
  themeKey: string,
  opportunity: ThemeOpportunity
) {
  const existing = candidateMap.get(themeKey);

  if (!existing) {
    candidateMap.set(themeKey, opportunity);
    return;
  }

  candidateMap.set(themeKey, {
    ...existing,
    score: Math.max(existing.score, opportunity.score),
    catalyst: existing.score >= opportunity.score ? existing.catalyst : opportunity.catalyst,
    evidence: [...new Set([...existing.evidence, ...opportunity.evidence])].slice(0, 3)
  });
}

function adjustOpportunityScore(
  themeKey: string,
  baseScore: number,
  recentAgentThemes: string[],
  recentRoomCoverage: Map<string, number>,
  runThemeCoverage: Map<string, number>,
  roomCoverage: RoomCoverageState | null
): number {
  const personalPenalty = recentAgentThemes.includes(themeKey) ? 8 : 0;
  const roomPenalty = (recentRoomCoverage.get(themeKey) || 0) * 2.5;
  const currentRunPenalty = (runThemeCoverage.get(themeKey) || 0) * 4;
  const noveltyBonus = !recentAgentThemes.includes(themeKey) && !recentRoomCoverage.has(themeKey) ? 2.5 : 0;
  const persistentOvercoveredPenalty = roomCoverage?.overcoveredTopics.includes(themeKey) ? 3 : 0;
  const undercoveredBonus = roomCoverage?.undercoveredTopics.includes(themeKey) ? 4 : 0;
  const unresolvedBonus = roomCoverage?.unresolvedMajorThemes.some((t) => t.topicPrimary === themeKey) ? 2 : 0;
  return baseScore - personalPenalty - roomPenalty - currentRunPenalty + noveltyBonus - persistentOvercoveredPenalty + undercoveredBonus + unresolvedBonus;
}

function sectorKeywordsFor(agent: Agent): string[] {
  const keywordsBySector: Record<string, string[]> = {
    Macro: ["fed", "inflation", "jobs", "cpi", "payroll", "growth", "retail", "consumer", "yield", "policy"],
    Rates: ["yield", "treasury", "bond", "curve", "breakeven", "auction", "fed"],
    FX: ["dollar", "fx", "currency", "euro", "yen", "carry", "em", "funding"],
    Equities: ["stock", "equity", "earnings", "ai", "semiconductor", "bank", "small-cap", "sector", "breadth"],
    Commodities: ["oil", "wti", "brent", "gas", "gold", "copper", "metal", "inventory", "opec"],
    "Risk/Sentiment": ["risk", "volatility", "credit", "spread", "fragile", "positioning", "selloff", "bitcoin"]
  };

  return keywordsBySector[agent.sector] || [];
}

function equityWatchlistThemeOpportunities(
  agent: Agent,
  headlines: SnapshotHeadline[]
): ThemeOpportunity[] {
  if (agent.sector !== "Equities") {
    return [];
  }

  const mappings = [
    {
      themeKey: "ai_concentration",
      label: "AI concentration",
      catalyst: "AI leadership and semiconductor concentration",
      score: 9,
      pattern: /\bnvda\b|\bnvidia\b|\bmsft\b|\bmicrosoft\b|\bsemiconductor\b|\bsmh\b|\bxlk\b|\bai\b/i
    },
    {
      themeKey: "banks_small_caps",
      label: "banks and small caps",
      catalyst: "banks and small-cap participation",
      score: 8.5,
      pattern: /\bjpm\b|\bjpmorgan\b|\bbank\b|\bfinancial\b|\bxlf\b|\bkre\b|\biwm\b|\bsmall cap\b/i
    },
    {
      themeKey: "consumer_equities",
      label: "consumer equities",
      catalyst: "consumer-facing sector rotation",
      score: 8,
      pattern: /\bconsumer\b|\bretail\b|\bxly\b|\bxlp\b|\bstaples\b|\bdiscretionary\b/i
    },
    {
      themeKey: "breadth_rotation",
      label: "breadth and rotation",
      catalyst: "equal-weight versus cap-weight breadth",
      score: 8.5,
      pattern: /\brsp\b|\bequal[- ]weight\b|\bbreadth\b|\bparticipation\b|\brotation\b/i
    },
    {
      themeKey: "sector_defensives",
      label: "defensives versus cyclicals",
      catalyst: "defensive sector rotation",
      score: 7.5,
      pattern: /\bxlv\b|\bxlu\b|\bdefensive\b|\butilities\b|\bhealthcare\b/i
    }
  ];

  const opportunities: ThemeOpportunity[] = [];

  for (const headline of headlines) {
    for (const mapping of mappings) {
      if (!mapping.pattern.test(headline.title)) {
        continue;
      }

      opportunities.push({
        themeKey: mapping.themeKey,
        label: mapping.label,
        catalyst: `${headline.title} (${headline.source})`,
        score: mapping.score,
        evidence: [headline.title]
      });
    }
  }

  return opportunities;
}

function choosePrimaryOpportunity(
  opportunities: ThemeOpportunity[],
  recentThemeEntries: Array<{ post: AgentMessage; themeKey: string }>,
  agent: Agent
): ThemeOpportunity | null {
  if (opportunities.length === 0) {
    return null;
  }

  const mostRecentTheme = recentThemeEntries[0]?.themeKey;
  const freshAlternative = opportunities.find((opportunity) => opportunity.themeKey !== mostRecentTheme);
  const forceRotateSectors = new Set(["Equities", "Commodities", "FX", "Risk/Sentiment"]);

  if (
    freshAlternative &&
    mostRecentTheme &&
    forceRotateSectors.has(agent.sector) &&
    freshAlternative.themeKey !== mostRecentTheme
  ) {
    return freshAlternative;
  }

  if (freshAlternative && freshAlternative.score >= (opportunities[0]?.score ?? 0) - 2.5) {
    return freshAlternative;
  }

  return opportunities[0];
}

function evergreenThemesFor(
  agent: Agent,
  marketSnapshot: MarketSnapshotPayload,
  previousSnapshot: MarketSnapshotPayload | null,
  priorRoomThreads: AgentDiscussionThread[]
): ThemeOpportunity[] {
  const defaults: Record<string, Array<{ key: string; catalyst: string }>> = {
    Macro: [
      { key: "inflation_regime", catalyst: "Inflation and real-yield regime" },
      { key: "labor_growth", catalyst: "Labor and growth pulse" },
      { key: "policy_path", catalyst: "Fed path and policy restraint" },
      { key: "consumer_demand", catalyst: "Consumer and retail demand" }
    ],
    Rates: [
      { key: "curve_shape", catalyst: "Curve shape and front-end repricing" },
      { key: "duration_pressure", catalyst: "Duration pressure and term premium" },
      { key: "treasury_auctions", catalyst: "Treasury supply and auction tone" }
    ],
    FX: [
      { key: "dollar_path", catalyst: "Dollar path and funding conditions" },
      { key: "policy_divergence", catalyst: "Policy divergence across major currencies" },
      { key: "carry_em_fx", catalyst: "Carry and EM FX fragility" }
    ],
    Equities: [
      { key: "breadth_rotation", catalyst: "Breadth and sector rotation" },
      { key: "ai_concentration", catalyst: "AI leadership and concentration risk" },
      { key: "banks_small_caps", catalyst: "Banks and small-cap participation" },
      { key: "consumer_equities", catalyst: "Consumer-sensitive equities" },
      { key: "sector_defensives", catalyst: "Defensives versus cyclicals" }
    ],
    Commodities: [
      { key: "oil_structure", catalyst: "Oil structure and inventory confirmation" },
      { key: "gas_power", catalyst: "Gas and power-market stress" },
      { key: "metals_growth", catalyst: "Copper/metals and growth read-through" },
      { key: "gold_real_rates", catalyst: "Gold vs real yields" }
    ],
    "Risk/Sentiment": [
      { key: "market_fragility", catalyst: "Tape fragility and narrow leadership" },
      { key: "credit_stress", catalyst: "Credit stress and follow-through" },
      { key: "crypto_speculation", catalyst: "Crypto and speculative appetite" },
      { key: "crowding_positioning", catalyst: "Crowding and positioning risk" }
    ]
  };

  const priorThreadText = priorRoomThreads
    .slice(0, 8)
    .map((thread) => [thread.post.title, thread.post.catalyst, thread.post.content].filter(Boolean).join(" "))
    .join(" \n");
  const deltas = buildSectorDeltaSummary(agent, previousSnapshot, marketSnapshot).join(" ");

  return (defaults[agent.sector] || []).map((item, index) => ({
    themeKey: item.key,
    label: humanizeThemeKey(item.key),
    catalyst: item.catalyst,
    score: (priorThreadText.toLowerCase().includes(item.catalyst.toLowerCase()) ? 1.5 : 3.5) + Math.max(0, 3 - index) + (deltas.includes("newly tracked") ? 1 : 0),
    evidence: [item.catalyst]
  }));
}

function instrumentThemeKey(agent: Agent, instrumentKey: string): string {
  const instrumentThemes: Record<string, string> = {
    sp500: agent.sector === "Equities" ? "breadth_rotation" : "market_fragility",
    nasdaq: agent.sector === "Equities" ? "ai_concentration" : "duration_pressure",
    us10y: agent.sector === "Rates" ? "duration_pressure" : "real_yields",
    dxy: agent.sector === "FX" ? "dollar_path" : "policy_divergence",
    wti: "oil_structure",
    brent: "oil_structure",
    natural_gas: "gas_power",
    copper: "metals_growth",
    gold: agent.sector === "Risk/Sentiment" ? "crowding_positioning" : "gold_real_rates"
  };

  return instrumentThemes[instrumentKey] || inferPrimaryThemeKey(instrumentKey, agent.sector);
}

function inferPrimaryThemeKey(text: string, sector?: string): string {
  return inferThemeKeysFromText(text, sector)[0] || "cross_asset_setup";
}

function inferThemeKeysFromText(text: string, sector?: string): string[] {
  const normalized = text.toLowerCase();
  const matches: string[] = [];
  const themeMatchers: Array<[string, RegExp]> = [
    ["inflation_regime", /\bcpi\b|\binflation\b|\bpce\b|\bprice(s)?\b/],
    ["labor_growth", /\bpayroll\b|\bjobs\b|\bunemployment\b|\bnfp\b|\blabor\b/],
    ["policy_path", /\bfed\b|\bcentral bank\b|\bfomc\b|\bpolicy\b/],
    ["real_yields", /\breal yield\b|\b10y\b|\byield\b|\btreasury\b/],
    ["curve_shape", /\bcurve\b|\b2s10s\b|\bsteepen|\bflatten/],
    ["treasury_auctions", /\bauction\b|\btreasury supply\b/],
    ["dollar_path", /\bdollar\b|\bdxy\b|\bfx\b|\bcurrency\b/],
    ["policy_divergence", /\bpolicy divergence\b|\brate differential\b|\bcarry\b|\bem\b/],
    ["oil_structure", /\boil\b|\bwti\b|\bbrent\b|\bcrude\b|\bopec\b/],
    ["gas_power", /\bnatural gas\b|\blng\b|\bgas\b|\bpower\b/],
    ["metals_growth", /\bcopper\b|\bmetal\b|\bmining\b/],
    ["gold_real_rates", /\bgold\b/],
    ["breadth_rotation", /\bbreadth\b|\bsector rotation\b|\bequal-weight\b|\bparticipation\b/],
    ["ai_concentration", /\bai\b|\bsemiconductor\b|\bchip\b|\bnvidia\b|\bconcentration\b/],
    ["banks_small_caps", /\bbank\b|\bfinancial\b|\bsmall cap\b|\biwm\b/],
    ["consumer_equities", /\bconsumer\b|\bretail\b|\bdiscretionary\b|\bstaples\b|\bxly\b|\bxlp\b/],
    ["sector_defensives", /\bdefensive\b|\butilities\b|\bhealthcare\b|\bxlv\b|\bxlu\b/],
    ["market_fragility", /\bfragile\b|\bfollow-through\b|\btape\b|\brisk\b|\bselloff\b/],
    ["credit_stress", /\bcredit\b|\bspread\b|\bhy\b|\bcds\b/],
    ["crypto_speculation", /\bbitcoin\b|\bcrypto\b/],
    ["crowding_positioning", /\bcrowd(ed|ing)\b|\bpositioning\b|\bde-?risk\b/]
  ];

  for (const [themeKey, pattern] of themeMatchers) {
    if (pattern.test(normalized)) {
      matches.push(themeKey);
    }
  }

  if (matches.length === 0 && sector) {
    switch (sector) {
      case "Macro":
        matches.push("policy_path");
        break;
      case "Rates":
        matches.push("duration_pressure");
        break;
      case "FX":
        matches.push("dollar_path");
        break;
      case "Equities":
        matches.push("breadth_rotation");
        break;
      case "Commodities":
        matches.push("oil_structure");
        break;
      case "Risk/Sentiment":
        matches.push("market_fragility");
        break;
      default:
        matches.push("cross_asset_setup");
    }
  }

  return matches.filter((value, index, list) => list.indexOf(value) === index);
}

function humanizeThemeKey(themeKey: string): string {
  const labels: Record<string, string> = {
    inflation_regime: "inflation regime",
    labor_growth: "labor and growth",
    policy_path: "policy path",
    real_yields: "real yields",
    duration_pressure: "duration pressure",
    curve_shape: "curve shape",
    treasury_auctions: "Treasury auctions",
    dollar_path: "dollar path",
    policy_divergence: "policy divergence",
    carry_em_fx: "carry and EM FX",
    oil_structure: "oil structure",
    gas_power: "gas and power",
    metals_growth: "metals and growth",
    gold_real_rates: "gold vs real yields",
    breadth_rotation: "breadth and rotation",
    ai_concentration: "AI concentration",
    banks_small_caps: "banks and small caps",
    consumer_equities: "consumer equities",
    sector_defensives: "defensives versus cyclicals",
    consumer_demand: "consumer demand",
    market_fragility: "market fragility",
    credit_stress: "credit stress",
    crypto_speculation: "crypto speculation",
    crowding_positioning: "crowding and positioning",
    cross_asset_setup: "cross-asset setup"
  };

  return labels[themeKey] || themeKey.replace(/_/g, " ");
}

function pickCommentPurpose(responder: Agent, post: AgentMessage): CommentPurpose {
  const postText = `${post.title || ""} ${post.content} ${post.catalyst || ""}`.toLowerCase();

  // Risk/Sentiment: challenge signal quality or narrow scope
  if (responder.sector === "Risk/Sentiment") {
    return /significant|major|large|sharp|dramatic|clear|certain|confirmed/i.test(postText)
      ? "narrow_the_signal"
      : "call_out_noise";
  }

  // Cross-sector: FX or Macro → translate spillover
  if ((responder.sector === "FX" || responder.sector === "Macro") && post.sector !== responder.sector) {
    return "add_cross_asset_spillover";
  }

  // Rates agent on a post with rate/yield content → add confirmation signal
  if (responder.sector === "Rates" && /yield|treasury|bond|rate|bps|duration|curve/i.test(postText)) {
    return "ask_for_confirmation_signal";
  }

  // Commodities cross-sector → historical analog (commodities has strong playbook memory)
  if (responder.sector === "Commodities" && post.sector !== "Commodities") {
    return "add_historical_analog";
  }

  // Same sector: check if thesis already exists on same topic → confirm it
  if (responder.sector === post.sector) {
    if (post.thesisId && /strong|confirmed|playing\s+out|materializ/i.test(postText)) {
      return "confirm_existing_thesis";
    }
    // Post makes a large directional claim → challenge impact magnitude
    if (/significant|major|large|sharp|dramatic/i.test(postText)) {
      return "disagree_on_market_impact";
    }
    return "agree_and_extend";
  }

  // Cross-sector without specific mapping → challenge the mechanism
  return "disagree_on_mechanism";
}

function commentPurposeDescription(purpose: CommentPurpose, agent: Agent, post: AgentMessage): string {
  switch (purpose) {
    // Legacy
    case "disagreement":
      return `${agent.name} should challenge the weak point in ${post.agentName}'s thesis with a concrete sector reason. Name the specific mechanism step that is wrong and explain why.`;
    case "cross_asset_translation":
      return `${agent.name} should translate ${post.agentName}'s thesis into ${agent.sector} market consequences. Name the specific asset that moves and through what channel.`;
    case "missing_data_point":
      return `${agent.name} should add the missing datapoint or market confirmation needed before trusting the thesis. Name the specific indicator to watch.`;
    case "historical_analog":
      return `${agent.name} should bring in a historical analog with a specific date and event that sharpens the current thread. Say what that episode predicted and whether it played out.`;
    case "invalidation_warning":
      return `${agent.name} should spell out what could invalidate the thesis and what specific fragility signal to watch.`;
    case "agreement_with_extension":
      return `${agent.name} should extend the thesis with one materially new angle from ${agent.sector} that the post did not address.`;
    // Expanded taxonomy
    case "agree_and_extend":
      return `${agent.name} agrees with ${post.agentName}'s direction but must add ONE specific mechanism or data point the post missed — not just restate the thesis.`;
    case "disagree_on_mechanism":
      return `${agent.name} should identify the SPECIFIC step in ${post.agentName}'s transmission chain that breaks. Name the broken link and explain the correct mechanism.`;
    case "disagree_on_market_impact":
      return `${agent.name} should challenge the SIZE or DIRECTION of the market impact claimed by ${post.agentName}. Use a specific datapoint or historical size comparison.`;
    case "add_cross_asset_spillover":
      return `${agent.name} should name the SPECIFIC asset outside ${post.sector} that is affected and explain the exact transmission channel (e.g., dollar → EM debt → commodity demand).`;
    case "add_historical_analog":
      return `${agent.name} should name a SPECIFIC historical date/event that is analogous. State what that episode predicted, whether it played out, and why the current setup is similar or different.`;
    case "narrow_the_signal":
      return `${agent.name} should explain why ${post.agentName}'s thesis is directionally correct but too broad. Name the specific condition that makes this signal real versus noise.`;
    case "call_out_noise":
      return `${agent.name} should explain WHY this headline or catalyst is not a real market signal. Name the specific confirming data point that would make it actionable — and note that it is currently absent.`;
    case "ask_for_confirmation_signal":
      return `${agent.name} should name the ONE specific data point or market event that would confirm ${post.agentName}'s thesis — and explain what to do if it does not arrive.`;
    case "confirm_existing_thesis":
    default:
      return `${agent.name} should add fresh corroborating evidence to ${post.agentName}'s existing thesis. Name the specific new data point or event that has confirmed the thesis since it was written.`;
  }
}

function commentPurposeMustAdd(purpose: CommentPurpose): string {
  switch (purpose) {
    case "disagree_on_mechanism":   return "the specific broken link in the mechanism chain, with a correction";
    case "disagree_on_market_impact": return "a specific size or direction comparison using data";
    case "add_cross_asset_spillover": return "a named asset outside the original sector + the transmission path";
    case "add_historical_analog":   return "a specific date, event, and outcome — not a vague 'this reminds me of'";
    case "narrow_the_signal":       return "the one specific condition that separates signal from noise here";
    case "call_out_noise":          return "the specific confirming data that is absent and would make this real";
    case "ask_for_confirmation_signal": return "a single named indicator and the threshold that matters";
    case "confirm_existing_thesis": return "a new piece of evidence that was not available when the thesis was written";
    case "agree_and_extend":        return "one specific mechanism or implication the original post did not mention";
    default:                        return "one specific new angle not already in the post";
  }
}

function commentPurposeMustAvoid(purpose: CommentPurpose): string {
  switch (purpose) {
    case "disagree_on_mechanism":   return "vague disagreement without naming the broken step; 'I'm not sure about this' type phrases";
    case "disagree_on_market_impact": return "directional agreement while only quibbling on magnitude without data";
    case "add_cross_asset_spillover": return "mentioning cross-asset without naming the specific transmission channel";
    case "add_historical_analog":   return "vague historical references without dates or outcomes; 'this is like 2008' without specifics";
    case "narrow_the_signal":       return "just saying 'it's too early to know' without naming the condition to watch";
    case "call_out_noise":          return "generic skepticism; 'this doesn't matter' without explaining what would make it matter";
    case "ask_for_confirmation_signal": return "open-ended hedging; a list of 3+ things to watch instead of one specific signal";
    case "confirm_existing_thesis": return "restating the thesis without adding new corroborating evidence";
    case "agree_and_extend":        return "opening with 'great point' or restating the post thesis before adding an angle";
    default:                        return "restating the original post's main thesis without adding new content";
  }
}

function commentPurposeLabel(purpose: CommentPurpose): string {
  const labels: Record<CommentPurpose, string> = {
    disagreement: "challenge the thesis",
    cross_asset_translation: "cross-asset translation",
    missing_data_point: "missing datapoint",
    historical_analog: "historical analog",
    invalidation_warning: "invalidation warning",
    agreement_with_extension: "extend the thesis",
    agree_and_extend: "extend the thesis",
    disagree_on_mechanism: "challenge the mechanism",
    disagree_on_market_impact: "challenge the impact size",
    add_cross_asset_spillover: "cross-asset spillover",
    add_historical_analog: "historical analog",
    narrow_the_signal: "narrow the signal",
    call_out_noise: "call out noise",
    ask_for_confirmation_signal: "ask for confirmation signal",
    confirm_existing_thesis: "confirm existing thesis"
  };

  return labels[purpose] || purpose;
}

async function requestStructuredForumPost({
  env,
  agent,
  marketSnapshot,
  previousSnapshot,
  discussionPlan,
  topicPlan,
  recentPosts,
  relevantCases,
  knowledgeSnippets,
  generalHeadlines,
  sectorHeadlines,
  priorRoomThreads,
  dynamicMemory,
  agentState,
  roomCoverage,
  thisRunPosts,
  headlineAnalysis,
  verifiedMetrics,
  stanceChallenge,
  equityFundamentalsContext,
  triggerMode,
  frozenRunContext,
  synthesisSelection,
  mechanismSelection
}: {
  env: Env;
  agent: Agent;
  marketSnapshot: MarketSnapshotPayload;
  previousSnapshot: MarketSnapshotPayload | null;
  discussionPlan: DiscussionPlan;
  topicPlan: AgentTopicPlan;
  recentPosts: AgentMessage[];
  relevantCases: import("@market-room/shared").MarketCase[];
  knowledgeSnippets: LocalKnowledgeSnippet[];
  generalHeadlines: SnapshotHeadline[];
  sectorHeadlines: SnapshotHeadline[];
  priorRoomThreads: AgentDiscussionThread[];
  dynamicMemory: DynamicMemoryContext;
  agentState: AgentBehavioralSummary | null;
  roomCoverage: RoomCoverageState | null;
  /** Posts already published in this same discussion run — used to prevent echo between agents. */
  thisRunPosts: AgentMessage[];
  /** Pre-computed headline analysis for the top candidate headline. */
  headlineAnalysis: HeadlineAnalysis | null;
  /** Deterministic live/current metrics block for citation discipline. */
  verifiedMetrics: VerifiedMarketMetricsContext;
  /** Optional prompt nudge when an agent is stuck in one stance. */
  stanceChallenge: StanceLockChallenge | null;
  equityFundamentalsContext: EquitySubjectDataContext | null;
  triggerMode: DiscussionTriggerMode;
  frozenRunContext: FrozenRunContext;
  synthesisSelection: AgentSynthesisAnchorSelection | null;
  mechanismSelection: MechanismSelection;
}): Promise<{
  title?: string;
  content?: string;
  stance?: string;
  confidence?: number;
  catalyst?: string;
} | null> {
  if (!isLlmConfigured(env)) {
    return null;
  }

  try {
    const historicalContext = buildMarketRoomHistoricalContext(agent, generalHeadlines, sectorHeadlines);

    // Analog block + frozen peer-thesis view — run in parallel
    const topHeadlineTitle = sectorHeadlines[0]?.title ?? generalHeadlines[0]?.title ?? "";
    const snapshotSignal = extractSnapshotSignal(marketSnapshot);
    const [analogBlock] = await Promise.all([
      Promise.resolve(buildAnalogContextBlock(topHeadlineTitle, agent.sector, snapshotSignal)),
    ]);
    const peerThesisView = buildPeerAgentThesesView(agent, frozenRunContext.peerSnapshot, frozenRunContext.snapshotTimestamp);

    // Rates Agent: fetch live treasury auction results when the headline is auction-related (4-second hard timeout)
    const isAuctionHeadline = agent.sector === "Rates" &&
      /\b(?:auction|treasury.*note|treasury.*bond|bid.to.cover|refunding|coupon supply|note sale|bond sale)\b/i.test(
        `${topHeadlineTitle} ${headlineAnalysis?.headline_title || ""}`
      );
    const auctionBlock = isAuctionHeadline
      ? await Promise.race([
          fetchRecentTreasuryAuctionData().then(formatAuctionDataBlock),
          new Promise<string>((resolve) => setTimeout(() => resolve(""), 4000))
        ])
      : "";
    if (isAuctionHeadline) {
      console.log(`[rates-auction] injected=${Boolean(auctionBlock && !auctionBlock.startsWith("AUCTION DATA UNAVAILABLE"))} length=${auctionBlock.length}`);
    }

    // Macro Event Calendar — inject FRED print history for Macro agent only
    const macroEventCalendar = agent.sector === "Macro" ? buildMacroEventCalendarBlock() : "";

    // Build the prompt once — used by both passes
    const postPrompt =
      triggerMode === "synthesis"
        ? buildSynthesisPrompt({
            agent,
            marketSnapshot,
            previousSnapshot,
            discussionPlan,
            topicPlan,
            recentPosts,
            relevantCases,
            knowledgeSnippets,
            dynamicMemory,
            agentState,
            roomCoverage,
            historicalContext,
            analogBlock,
            macroEventCalendar,
            peerThesisView,
            verifiedMetrics,
            stanceChallenge,
            synthesisThemeDigest: frozenRunContext.synthesisThemeDigest,
            synthesisTopicLabel: synthesisSelection?.themeKey || frozenRunContext.synthesisTopicLabel,
            synthesisPrimaryHeadline: synthesisSelection?.anchorHeadline?.title || frozenRunContext.synthesisPrimaryHeadline,
            synthesisThemeLabel: synthesisSelection?.themeLabel || frozenRunContext.dominantSynthesisTheme?.label || "Cross-asset tape",
            synthesisThemeWhy: synthesisSelection
              ? `Selected for ${agent.sector} with relevance score ${synthesisSelection.relevanceScore} and confidence ${synthesisSelection.anchorConfidence}.`
              : "No strong sector-specific synthesis anchor was selected.",
            synthesisThemeDelta: recentPosts[0]
              ? `Versus your prior synthesis post at ${recentPosts[0].createdAt}, explain exactly what changed and why this update is material now.`
              : "First synthesis contribution in this window.",
            synthesisRepetitionChallenge: synthesisSelection?.repetitionChallenge || null,
            mechanismSelection
          })
        : buildForumPostPrompt(
            agent,
            marketSnapshot,
            previousSnapshot,
            discussionPlan,
            topicPlan,
            recentPosts,
            relevantCases,
            knowledgeSnippets,
            generalHeadlines,
            sectorHeadlines,
            priorRoomThreads,
            dynamicMemory,
            agentState,
            roomCoverage,
            thisRunPosts,
            headlineAnalysis,
            historicalContext,
            analogBlock,
            peerThesisView,
            equityFundamentalsContext?.promptBlock || "",
            verifiedMetrics,
            stanceChallenge,
            auctionBlock,
            macroEventCalendar,
            mechanismSelection
          );

    // ── Pass 1: View crystallisation ────────────────────────────────────────
    // Force a directional commitment before the full post is written.
    // Low temperature, tiny output — just one or two sentences.
    const viewPayload = await generateGeminiContent(env, {
      model: getLlmModel(env),
      instructions: [
        buildAgentInstructions(agent),
        "Respond in exactly two sentences. State your current directional view on your sector's primary asset and one specific number from the context that supports it.",
        "No hedging. No qualifiers. No 'it depends'. Pick a side.",
        "Format: '[bullish/bearish/cautious-bullish/cautious-bearish] [asset] at [specific level/figure] — [one-sentence reason]. This view changes if [specific metric/event] [crosses/prints/holds] [threshold] within [timeframe].'",
        "Example: 'Cautious-bearish WTI at $82.40 — the 3-week backwardation collapse signals demand softening. This view changes if EIA prints a crude draw above 4mb within the next two weekly reports.'",
      ].join("\n"),
      prompt: postPrompt,
      maxOutputTokens: 600,
      temperature: 0.3,
    });
    const crystallisedView = extractResponseOutputText(viewPayload)?.trim() ?? "";

    // ── Pass 2: Full post defending the crystallised view ────────────────────
    const payload = await generateGeminiContent(env, {
      model: getLlmModel(env),
      instructions: [
        crystallisedView
          ? `YOUR COMMITTED VIEW FOR THIS POST: "${crystallisedView}"\nWrite a post that defends and elaborates this exact view. Do not retreat from the directional call. Your job is to explain the evidence, the transmission mechanism, and the conviction condition in full.`
          : "",
        buildAgentInstructions(agent),
        "Write a standalone forum post, not a reply.",
        "Make it read like a real market specialist posting in a live internal forum, not a polished strategy memo.",
        "Aim for roughly 170 to 280 words in 2 to 4 short paragraphs.",
        triggerMode === "synthesis"
          ? "Synthesis readability rule: do not collapse the whole post into one block paragraph; prefer 2 to 4 short paragraphs."
          : "",
        triggerMode === "synthesis"
          ? "Synthesis paragraph flow: paragraph 1 = elected anchor + what changed, paragraph 2 = transmission + cross-asset impact, final paragraph = forward view + what to watch / invalidation."
          : "",
        "Do not start with 'Hypothesis', 'Base case', 'Trade implication', 'Biggest driver', 'Main risk', or similar section labels.",
        "Do not repeat your most recent post. If little changed, call it a smaller update and explain the delta in plain language.",
        "Lead with the catalyst or market move that matters most to your sector — not the room's broad macro theme unless macro IS your sector.",
        "Your post must open with a sector-specific observation, not a generic market statement that any agent could write.",
        "Prefer the uncovered topic inventory provided to you over the room's most repeated theme.",
        "Use the latest headlines, supporting context snippets, and the previous snapshot delta to form a fresh view.",
        "Reason from current evidence first; do not explain your thesis by saying a house view or playbook says so.",
        "Make the writing feel human, specific, and conversationally sharp.",
        // Hard analytical structure rules
        [
          "HARD RULES — VIOLATING ANY OF THESE MAKES YOUR POST WORTHLESS:",
          "1. Your post MUST be specifically about the named PRIMARY HEADLINE in the prompt — do NOT generalize it into a generic sector theme.",
          "   Example: a 'Fed SLR exemption' headline must produce a post about SLR mechanics and Treasury demand — not a generic 'Fed policy is supportive' post.",
          "   Example: a natural-gas storage print must name the storage level vs. expectations and the forward curve implication — not generic 'inflationary pressure'.",
          "2. Your post MUST explain the transmission mechanism — the specific path from event → market impact → what it means for your sector.",
          "3. Your post MUST state what specifically CHANGED vs. the prior state or prior thesis (not just that 'conditions evolved').",
          "4. Your post MUST name what to watch next — ONE specific indicator, level, or event that will confirm or invalidate.",
          "5. BANNED PHRASES — never write any of these:",
          "   - 'broadly similar to the previous snapshot'",
          "   - 'this only matters if it transmits into'",
          "   - 'broadly constructive backdrop'",
          "   - 'cautiously optimistic'",
          "   - 'look for a refreshed angle'",
          "   - 'consistent with the broader narrative'",
          "   - 'in line with market expectations'",
          "   - 'the market is pricing in' (without naming the specific mechanism)",
          "   - Any sentence starting 'As a [sector] specialist, I see...' without a specific new observation."
        ].join("\n"),
        [
          "VIEW PROTOCOL — every post MUST contain all three of these elements. Missing any one makes the post analytically worthless:",
          "1. DIRECTIONAL CALL: State explicitly bullish, bearish, cautious-bullish, or cautious-bearish on your sector's primary risk asset.",
          "   'Selective', 'watchful', and 'disciplined' are not directional calls — they are refusals to have a view.",
          "   Name the asset and your direction. Example: 'bearish WTI near-term', 'cautious-bullish on 10Y', 'bearish USD vs JPY'.",
          "2. DATA ANCHOR: Cite at least one specific number from the data provided in this prompt.",
          "   Use a price level, yield, percentage move, bps, or a stored correlation figure.",
          "   Do NOT assert statistical relationships or live market levels from memory — use VERIFIED MARKET METRICS, article context, historical-data blocks, analog blocks, chart data, or stored correlations in front of you.",
          "   Example: 'WTI at $82.40', '10Y at 4.28%', 'WTI/CPI YoY correlation +0.53 from stored data'.",
          "3. CONVICTION CONDITION: Include exactly one sentence beginning with 'This view changes if'.",
          "   It must name a metric/event, a threshold or explicit print, and a timeframe. 'If macro conditions change' is NOT acceptable.",
          "   Good: 'This view changes if 10Y holds below 4.0% for three sessions' or 'This view changes if EIA shows two consecutive crude draws above 3mb'.",
        ].join("\n"),
        "DATA GROUNDING RULE: If the prompt contains an 'Available Historical Data Context' section with stored correlations or computed statistics, you MUST cite at least one specific figure from it in your post (e.g. 'WTI/CPI YoY correlation +0.53 from stored data covering 180 observations'). Do not describe a correlation qualitatively when a computed number is sitting in front of you.",
        "CROSS-ASSET LINK: Your post must name at least one transmission effect into another asset class beyond your own sector. Example: 'This WTI move implies X for CPI → rates', or 'Dollar strength here pressures EM equities'. Staying entirely within your own sector lane is not sufficient analysis.",
        buildSectorSpecificInstructions(agent),
        thisRunPosts.length > 0
          ? `CRITICAL — these angles are already covered by other agents this session. Do NOT echo them. Take a genuinely different angle:\n${thisRunPosts.map((p) => `• ${p.agentName} (${p.sector}): "${p.title || "Untitled"}" — ${truncateText(p.content, 90)}`).join("\n")}`
          : "",
        `OUTPUT FORMAT: Return a single JSON object (no markdown fences). Required keys: title (string), catalyst (string), content (string, 170-280 words), stance (one of: bullish|bearish|cautious-bullish|cautious-bearish|neutral|alert — "selective", "watchful", and "disciplined" are BANNED, pick a direction), confidence (number 0.0-1.0).`
      ].filter(Boolean).join("\n"),
      prompt: postPrompt,
      // Gemma 4 / Gemini 2.5 count thinking tokens + output tokens against maxOutputTokens together.
      // With ~600-1200 thinking tokens per call, we need a generous budget for the actual post.
      maxOutputTokens: 3000,
      temperature: 0.72,
      responseJson: true  // JSON mime type without schema — avoids schema-truncation bugs
    });

    const parsed = parseStructuredResponseJson<{
      title?: string;
      content?: string;
      stance?: string;
      confidence?: number;
      catalyst?: string;
    }>(payload);

    // Normalise banned stances — safety net in case the model slips through
    const BANNED_STANCES = ["selective", "watchful", "disciplined", "cautious"];
    if (parsed?.stance && BANNED_STANCES.includes(parsed.stance)) {
      parsed.stance = "cautious-bullish";
    }

    return parsed;
  } catch {
    return null;
  }
}

async function requestStructuredForumComment({
  env,
  agent,
  post,
  marketSnapshot,
  previousSnapshot,
  commentPurpose,
  generalHeadlines,
  sectorHeadlines,
  knowledgeSnippets,
  dynamicMemory,
  agentState,
  roomCoverage,
  verifiedMetrics,
  frozenRunContext
}: {
  env: Env;
  agent: Agent;
  post: AgentMessage;
  marketSnapshot: MarketSnapshotPayload;
  previousSnapshot: MarketSnapshotPayload | null;
  commentPurpose: CommentPurpose;
  generalHeadlines: SnapshotHeadline[];
  sectorHeadlines: SnapshotHeadline[];
  knowledgeSnippets: LocalKnowledgeSnippet[];
  dynamicMemory: DynamicMemoryContext;
  agentState: AgentBehavioralSummary | null;
  roomCoverage: RoomCoverageState | null;
  verifiedMetrics: VerifiedMarketMetricsContext;
  frozenRunContext: FrozenRunContext;
}): Promise<{
  content?: string;
  stance?: string;
  confidence?: number;
  catalyst?: string;
} | null> {
  if (!isLlmConfigured(env)) {
    return null;
  }

  try {
    const peerThesisView = buildPeerAgentThesesView(agent, frozenRunContext.peerSnapshot, frozenRunContext.snapshotTimestamp);
    const payload = await generateGeminiContent(env, {
      model: getLlmModel(env),
      instructions: [
        buildAgentInstructions(agent),
        "Write a targeted forum comment under 110 words.",
        "React to the post directly with a specific new fact, mechanism, or challenge — not a restatement.",
        "Your comment job and what it MUST add are stated explicitly in the prompt — follow both exactly.",
        "Use approved long-term memory snippets only when they provide a concrete historical or data reference.",
        "Sound like a fast market reply — specific, sharp, one new angle only.",
        "BANNED: opening with 'great point', 'I agree', or any restatement of the post thesis before adding your contribution.",
        "BANNED: vague hedges like 'it's too early to know', 'this is uncertain', or 'we'll need to watch'.",
        "BANNED: listing 3 or more things to watch — name ONE specific indicator, level, or event.",
        `OUTPUT FORMAT: Return a single JSON object (no markdown fences). Required keys: catalyst (string), content (string, under 110 words), stance (one of: bullish|bearish|neutral|cautious|selective|alert|disciplined|watchful), confidence (number 0.0-1.0).`
      ].join("\n"),
      prompt: buildForumCommentPrompt(
        agent,
        post,
        marketSnapshot,
        previousSnapshot,
        commentPurpose,
        generalHeadlines,
        sectorHeadlines,
        knowledgeSnippets,
        dynamicMemory,
        agentState,
        roomCoverage,
        verifiedMetrics,
        peerThesisView
      ),
      maxOutputTokens: 1200,  // thinking + output budget combined for Gemma 4 / Gemini 2.5
      temperature: 0.60,
      responseJson: true  // JSON mime type without schema — avoids schema-truncation bugs
    });

    return parseStructuredResponseJson<{
      content?: string;
      stance?: string;
      confidence?: number;
      catalyst?: string;
    }>(payload);
  } catch {
    return null;
  }
}

function buildMarketRoomHistoricalContext(
  agent: Agent,
  generalHeadlines: SnapshotHeadline[],
  sectorHeadlines: SnapshotHeadline[]
): string {
  const allHeadlines = [...generalHeadlines, ...sectorHeadlines];

  const crisisSignal = allHeadlines.some((h) =>
    /\b(war|conflict|crisis|middle east|gulf|iran|iraq|russia|sanctions)\b/i.test(h.title)
  );
  const moneySupplySignal = allHeadlines.some((h) =>
    /\b(money supply|liquidity|m1|m2|monetary)\b/i.test(h.title)
  );

  let query: string;
  switch (agent.sector) {
    case "Commodities":
      query = "wti oil inflation correlation";
      break;
    case "Macro":
      query = moneySupplySignal
        ? "wti oil inflation m1 money supply correlation"
        : "wti oil inflation correlation";
      break;
    case "Rates":
      query = "yield treasury rates inflation correlation 10y 2y curve bps duration";
      break;
    case "FX":
      query = "dollar fx currency wti oil correlation";
      break;
    case "Equities":
      query = "spy equities stocks wti oil correlation";
      break;
    case "Risk/Sentiment":
      query = "vix volatility risk high yield credit spread correlation";
      break;
    default:
      return "";
  }

  if (crisisSignal) {
    query += " war middle east crisis";
  }

  return buildHistoricalDataPromptBlock(query);
}

/** Extract the primary numeric indicator values from the market snapshot instruments array.
 *  Values are stored as display strings ("$82.40/bbl", "4.30%") — strip non-numeric chars. */
function extractSnapshotSignal(snapshot: MarketSnapshotPayload): SnapshotSignal {
  const parseInstrumentValue = (value: string): number | undefined => {
    const match = value.replace(/,/g, "").match(/-?[\d.]+/);
    const n = match ? parseFloat(match[0]) : NaN;
    return isNaN(n) ? undefined : n;
  };
  const get = (key: string, validator?: (instrument: SnapshotInstrument, value: number) => boolean): number | undefined => {
    const inst = snapshot.instruments.find((i) => i.key === key);
    if (!inst || inst.status === "unavailable") {
      return undefined;
    }
    const value = parseInstrumentValue(inst.value);
    if (value === undefined) {
      return undefined;
    }
    return !validator || validator(inst, value) ? value : undefined;
  };
  return {
    wtiPrice: get("wti", (_instrument, value) => value > 0 && value < 250),
    us10yYield: get("us10y", (instrument, value) => {
      const descriptor = `${instrument.label} ${instrument.source}`.toLowerCase();
      const isRealYieldSource = /\b(tips|real yield|real-rate|real rate)\b/.test(descriptor);
      const isPlausibleNominalYield = value >= 0 && value <= 10;
      if (isRealYieldSource || !isPlausibleNominalYield) {
        console.log(
          `[market-data-sanity] skipped us10y snapshot injection label="${instrument.label}" source="${instrument.source}" value="${instrument.value}"`
        );
        return false;
      }
      return true;
    }),
    dxyLevel: get("dxy", (_instrument, value) => value >= 50 && value <= 150)
  };
}

function buildMarketDataSanityBlock(instruments: SnapshotInstrument[]): string {
  if (instruments.length === 0) {
    return "";
  }

  const hasNominal10y = instruments.some((instrument) => instrument.key === "us10y");
  const hasRealYield = instruments.some((instrument) =>
    /\b(tips|real yield|real-rate|real rate)\b/i.test(`${instrument.label} ${instrument.source}`)
  );
  const suspicious = instruments
    .map((instrument) => {
      const value = parseDisplayNumber(instrument.value);
      if (value === null) return null;
      if (instrument.key === "us10y" && (value < 0 || value > 10)) {
        return `${instrument.label}=${instrument.value} is outside plausible nominal 10Y range`;
      }
      if (/dxy|dollar/i.test(instrument.label) && (value < 50 || value > 150)) {
        return `${instrument.label}=${instrument.value} is outside plausible DXY range`;
      }
      if (/wti|brent|oil/i.test(instrument.label) && (value <= 0 || value > 250)) {
        return `${instrument.label}=${instrument.value} is outside plausible oil range`;
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));

  return [
    "MARKET DATA SOURCE SANITY:",
    hasNominal10y
      ? "- The live `us10y` metric is a nominal 10Y Treasury yield. Do not call it TIPS, real yield, or real-rate data unless a separate TIPS/real-yield instrument is explicitly shown."
      : "",
    !hasRealYield
      ? "- No live TIPS real-yield instrument is present in this snapshot. If discussing real yields, frame it as a mechanism or stored/historical context, not as a live quoted value."
      : "",
    ...suspicious.map((item) => `- Source sanity warning: ${item}. Treat this value as suspect unless corroborated.`)
  ].filter(Boolean).join("\n");
}

function buildTransmissionChainInstruction(mode: "mandatory" | "encouraged"): string {
  return [
    mode === "mandatory"
      ? "REQUIRED REASONING STRUCTURE (mandatory in synthesis):"
      : "REASONING STRUCTURE (strongly encouraged):",
    "1. Name the trigger or market condition you are responding to.",
    "2. Explain the transmission inside your sector.",
    "3. Trace at least one cross-asset implication where relevant.",
    "4. State a forward thesis with a concrete falsifier.",
    "Write this as one coherent desk note in short paragraphs, not numbered headings."
  ].join("\n");
}

function buildSharedPostSpecPromptBlock({
  primaryAnchorLabel,
  mode
}: {
  primaryAnchorLabel: string;
  mode: "reactive" | "synthesis";
}): string {
  return [
    mode === "synthesis"
      ? "=== SYNTHESIS QUALITY SPEC (same quality bar as reactive) ==="
      : "=== REACTIVE QUALITY SPEC ===",
    `PRIMARY ANCHOR RULE: your post must stay anchored to "${primaryAnchorLabel}".`,
    "YOUR POST MUST ANSWER ALL FIVE (in your own words, not as labelled sections):",
    "1. WHAT HAPPENED — state the specific event/condition from the anchor above.",
    "2. WHY IT MATTERS NOW — explain why this is material now.",
    "3. THROUGH WHAT MECHANISM — name the exact transmission channel to your sector.",
    "4. WHAT CHANGED — state what changed versus your prior view or prior market state.",
    "5. WHAT TO WATCH NEXT — name ONE specific indicator/level/event that confirms or invalidates.",
    "EVIDENCE-FIRST REASONING RULE:",
    "G. Build visible reasoning from the elected anchor, current market state, and verified/stored data points.",
    "H. Do not explain your thesis by citing 'house views', 'playbooks', or 'frameworks'.",
    "I. Treat stored frameworks as backend support only; if they do not fit current evidence, do not use them.",
    "VIEW PROTOCOL:",
    "A. Include one explicit directional call (bullish/bearish/cautious-bullish/cautious-bearish).",
    "B. Include at least one concrete data anchor number from provided context.",
    "C. Include exactly one sentence that begins with 'This view changes if'.",
    "READABILITY SHAPE:",
    "D. Aim for 2 to 4 short paragraphs (roughly 170 to 280 words unless the signal is genuinely brief).",
    "E. Do not collapse the post into one wall-of-text paragraph.",
    "F. Paragraph flow should read as: anchor + what changed, then mechanism + spillover, then forward view + falsifier.",
    "=== END QUALITY SPEC ==="
  ].join("\n");
}

type SynthesisPromptArgs = {
  agent: Agent;
  marketSnapshot: MarketSnapshotPayload;
  previousSnapshot: MarketSnapshotPayload | null;
  discussionPlan: DiscussionPlan;
  topicPlan: AgentTopicPlan;
  recentPosts: AgentMessage[];
  relevantCases: import("@market-room/shared").MarketCase[];
  knowledgeSnippets: LocalKnowledgeSnippet[];
  dynamicMemory: DynamicMemoryContext;
  agentState: AgentBehavioralSummary | null;
  roomCoverage: RoomCoverageState | null;
  historicalContext: string;
  analogBlock: string;
  macroEventCalendar: string;
  peerThesisView: string;
  verifiedMetrics: VerifiedMarketMetricsContext;
  stanceChallenge: StanceLockChallenge | null;
  synthesisThemeDigest: string[];
  synthesisTopicLabel: string;
  synthesisPrimaryHeadline: string;
  synthesisThemeLabel: string;
  synthesisThemeWhy: string;
  synthesisThemeDelta: string;
  synthesisRepetitionChallenge: string | null;
  mechanismSelection: MechanismSelection;
};

function buildSynthesisPrompt(args: SynthesisPromptArgs): string {
  const {
    agent,
    marketSnapshot,
    previousSnapshot,
    discussionPlan,
    topicPlan,
    recentPosts,
    relevantCases,
    knowledgeSnippets,
    dynamicMemory,
    agentState,
    roomCoverage,
    historicalContext,
    analogBlock,
    macroEventCalendar,
    peerThesisView,
    verifiedMetrics,
    stanceChallenge,
    synthesisThemeDigest,
    synthesisTopicLabel,
    synthesisPrimaryHeadline,
    synthesisThemeLabel,
    synthesisThemeWhy,
    synthesisThemeDelta,
    synthesisRepetitionChallenge,
    mechanismSelection
  } = args;
  const relevantInstruments = relevantInstrumentsForAgent(agent, marketSnapshot);
  const crossAssetDeltas = buildSnapshotDeltaSummary(previousSnapshot, marketSnapshot).slice(0, 5);
  const synthesisTask = [
    "MODE: SYNTHESIS. You are not reacting to one headline.",
    "Produce one of: (A) NEW THESIS, (B) THESIS UPDATE, (C) SILENT if signal is weak.",
    "A thesis update is publishable only if the delta is material; weak updates must resolve to silent.",
    "Do not output a casual comment-style reply.",
    "Aim for roughly 170 to 280 words in 2 to 4 short paragraphs.",
    "Do not collapse the whole post into one block paragraph.",
    "Paragraph 1 should state the elected anchor and what changed.",
    "Paragraph 2 should explain transmission plus cross-asset impact.",
    "Final paragraph should state the forward view plus what to watch / invalidation."
  ].join("\n");

  return [
    `Agent: ${agent.name} (${agent.sector})`,
    synthesisTask,
    "ELECTED SYNTHESIS ANCHOR (must lead your post):",
    `- Theme key: ${synthesisTopicLabel}`,
    `- Theme label: ${synthesisThemeLabel}`,
    `- Representative headline: ${synthesisPrimaryHeadline}`,
    `- Why this matters now: ${synthesisThemeWhy}`,
    `- What changed vs prior run: ${synthesisThemeDelta}`,
    "Your post must begin from this elected anchor. You may extend into cross-asset implications, but do not substitute a different invisible catalyst.",
    `Backend-selected mechanism family (support only): ${mechanismSelection.family}. Use this only if current evidence supports it.`,
    `Room route in the background: ${discussionPlan.profileLabel}.`,
    `Current snapshot provider: ${marketSnapshot.provider}`,
    `Broad room backdrop: ${marketSnapshot.headline}`,
    `Backdrop summary: ${marketSnapshot.summary}`,
    synthesisThemeDigest.length > 0 ? "24H MARKET THEMES (clustered):" : "",
    ...synthesisThemeDigest,
    relevantInstruments.length > 0 ? "Sector key instruments:" : "No sector metrics available.",
    ...relevantInstruments.map(
      (instrument) => `- ${instrument.label}: ${instrument.value}${instrument.change ? ` (${instrument.change})` : ""} [${instrument.source}]`
    ),
    crossAssetDeltas.length > 0 ? "Cross-asset deltas (most relevant):" : "",
    ...crossAssetDeltas,
    verifiedMetrics.block,
    buildMarketDataSanityBlock(relevantInstruments),
    buildDynamicMemoryPromptBlock(agent, dynamicMemory),
    ...(peerThesisView ? [peerThesisView] : []),
    ...(historicalContext ? [historicalContext] : []),
    ...(analogBlock ? [analogBlock] : []),
    ...(macroEventCalendar ? [macroEventCalendar] : []),
    ...(stanceChallenge?.block ? [stanceChallenge.block] : []),
    ...(synthesisRepetitionChallenge ? [synthesisRepetitionChallenge] : []),
    buildSharedPostSpecPromptBlock({
      primaryAnchorLabel: synthesisPrimaryHeadline,
      mode: "synthesis"
    }),
    ...(agentState ? [buildStatePromptBlock(agentState)] : []),
    ...(roomCoverage ? [buildRoomCoveragePromptBlock(roomCoverage)] : []),
    knowledgeSnippets.length > 0 ? "Supporting context snippets (backend-selected; do not cite these as 'house views'):" : "No supporting knowledge snippets were retrieved for this post.",
    ...knowledgeSnippets.map((snippet, index) => `${index + 1}. ${snippet.title} [${snippet.category}] ${snippet.excerpt}`),
    relevantCases.length > 0 ? "Relevant historical analogs:" : "No analog cases were retrieved for this post.",
    ...relevantCases.map(
      (marketCase, index) =>
        `${index + 1}. ${marketCase.title} [${marketCase.dateLabel}] tags=${marketCase.regimeTags.join(", ")} | pattern=${marketCase.patternSummary} | implication=${marketCase.implicationNote}`
    ),
    recentPosts.length > 0
      ? `Recent post context: ${recentPosts[0].createdAt} | ${recentPosts[0].title || "Untitled"} | ${truncateText(recentPosts[0].content, 180)}`
      : "No prior post found — this is your first directional call.",
    buildTransmissionChainInstruction("mandatory"),
    "Your thesis must be falsifiable in the next 2-4 weeks with a specific level, print, or event.",
    "Use deterministic figures from VERIFIED MARKET METRICS or explicit stored-data blocks. Do not cite numbers from memory."
  ].filter(Boolean).join("\n");
}

function parseDisplayNumber(value: string): number | null {
  const match = value.replace(/,/g, "").match(/-?[\d.]+/);
  if (!match) {
    return null;
  }
  const parsed = parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildForumPostPrompt(
  agent: Agent,
  marketSnapshot: MarketSnapshotPayload,
  previousSnapshot: MarketSnapshotPayload | null,
  discussionPlan: DiscussionPlan,
  topicPlan: AgentTopicPlan,
  recentPosts: AgentMessage[],
  relevantCases: import("@market-room/shared").MarketCase[],
  knowledgeSnippets: LocalKnowledgeSnippet[],
  generalHeadlines: SnapshotHeadline[],
  sectorHeadlines: SnapshotHeadline[],
  priorRoomThreads: AgentDiscussionThread[],
  dynamicMemory: DynamicMemoryContext,
  agentState: AgentBehavioralSummary | null,
  roomCoverage: RoomCoverageState | null,
  thisRunPosts: AgentMessage[] = [],
  headlineAnalysis: HeadlineAnalysis | null = null,
  historicalContext: string = "",
  analogBlock: string = "",
  crossAgentView: string = "",
  equityFundamentals: string = "",
  verifiedMetrics: VerifiedMarketMetricsContext = EMPTY_VERIFIED_MARKET_METRICS_CONTEXT,
  stanceChallenge: StanceLockChallenge | null = null,
  auctionBlock: string = "",
  macroEventCalendar: string = "",
  mechanismSelection: MechanismSelection
): string {
  const availableInstruments = relevantInstrumentsForAgent(agent, marketSnapshot);
  const mergedHeadlines = relevantHeadlinesForAgent(agent, [
    ...sectorHeadlines,
    ...generalHeadlines,
    ...marketSnapshot.headlines
  ]).slice(0, 6);
  const postType = postStyleFor(agent, marketSnapshot, previousSnapshot, mergedHeadlines);
  const ownedCatalystGuard = mainCatalystGuardFor(agent, mergedHeadlines, availableInstruments);
  const sectorDeltaSummary = buildSectorDeltaSummary(agent, previousSnapshot, marketSnapshot);
  const equityCompanyFirstBlock = buildEquityCompanyFirstBlock({
    agent,
    headlineAnalysis,
    equityFundamentals,
    recentPosts,
    sectorHeadlines
  });

  // Build the primary headline analysis block (shown at top when analysis is available)
  const primaryHeadlineBlock: string[] = [];
  if (headlineAnalysis && headlineAnalysis.market_signal_strength !== "noise") {
    primaryHeadlineBlock.push(
      "=== PRIMARY HEADLINE — YOUR POST MUST BE SPECIFICALLY ABOUT THIS ===",
      `"${headlineAnalysis.headline_title}"`,
      `Type: ${headlineAnalysis.headline_type} | Signal: ${headlineAnalysis.market_signal_strength} | New information: ${headlineAnalysis.is_new_information ? "yes" : "no"}`,
      (() => {
        // Inject article description when present so the agent can "read the article"
        const matchedHeadline = sectorHeadlines.find((h) => h.title === headlineAnalysis.headline_title);
        return matchedHeadline?.description
          ? `\nArticle context (read this — it is the source material your post must be grounded in):\n"${matchedHeadline.description}"\n`
          : "";
      })(),
      headlineAnalysis.primary_mechanism
        ? `Transmission mechanism: ${headlineAnalysis.primary_mechanism}`
        : "Mechanism: unclear — explain what you think the correct mechanism is, or route to a comment instead of a top-level post.",
      headlineAnalysis.affected_assets.length > 0
        ? `Affected instruments: ${headlineAnalysis.affected_assets.join(", ")}`
        : "",
      headlineAnalysis.what_changed
        ? `What changed: ${headlineAnalysis.what_changed}`
        : "",
      headlineAnalysis.historical_analog_candidate
        ? `Historical analog hint: ${headlineAnalysis.historical_analog_candidate}`
        : "",
      "",
      "YOUR POST MUST ANSWER ALL FIVE (in your own words, not as labelled sections):",
      "1. WHAT HAPPENED — state the specific event from the headline above, not a generalised version",
      "2. WHY IT MATTERS NOW — explain why this is material at this precise moment",
      "3. THROUGH WHAT MECHANISM — name the exact transmission channel to your sector",
      "4. WHAT CHANGED — say specifically what is different vs. the prior state or your prior thesis",
      "5. WHAT TO WATCH NEXT — name ONE specific indicator, level, or event that would confirm or invalidate",
      "=== END PRIMARY HEADLINE ==="
    );
  }

  return [
    `Agent: ${agent.name} (${agent.sector})`,
    topicPlan.action === "thread_update"
      ? "Forum objective: update your existing thread with only what changed."
      : "Forum objective: publish a fresh market view from your own sector lane.",
    `Room route in the background: ${discussionPlan.profileLabel}. Treat that as context, not a required lead angle.`,
    `Post type for this run: ${postType}.`,
    `Backend-selected mechanism family (support only): ${mechanismSelection.family}. Use it only if current evidence supports it.`,
    `Publishing mode for this run: ${topicPlan.action === "thread_update" ? "update your earlier thread, not a new thread" : "open a new thread if your angle is genuinely new"}.`,
    topicPlan.matchedThesis
      ? `Matched thesis in memory: ${topicPlan.matchedThesis.title} | status=${topicPlan.matchedThesis.status} | topic=${humanizeThemeKey(topicPlan.matchedThesis.topicPrimary)}`
      : "No matching live thesis was found for this angle.",
    // Primary headline analysis block (if available, shown before topic inventory)
    ...primaryHeadlineBlock,
    buildSharedPostSpecPromptBlock({
      primaryAnchorLabel:
        headlineAnalysis?.headline_title ||
        topicPlan.primary.catalyst ||
        "primary sector catalyst",
      mode: "reactive"
    }),
    equityCompanyFirstBlock,
    `Preferred fresh angle for this run: ${topicPlan.primary.label}.`,
    // When a high-quality headline is identified, lock the catalyst to it so the LLM gets a consistent signal
    headlineAnalysis && headlineAnalysis.market_signal_strength !== "noise" && headlineAnalysis.primary_mechanism !== ""
      ? `Preferred catalyst to lead with: ${headlineAnalysis.headline_title} (this is the PRIMARY HEADLINE — your post must be about this).`
      : `Preferred catalyst to lead with: ${topicPlan.primary.catalyst}.`,
    `Current snapshot provider: ${marketSnapshot.provider}`,
    `Broad room backdrop: ${marketSnapshot.headline}`,
    `Backdrop summary: ${marketSnapshot.summary}`,
    `User task: ${marketSnapshot.prompt}`,
    "Priority topic inventory in your lane:",
    `1. ${topicPlan.primary.label} | catalyst=${topicPlan.primary.catalyst} | evidence=${topicPlan.primary.evidence.join("; ") || "market setup"}`,
    ...topicPlan.alternates.map(
      (opportunity, index) =>
        `${index + 2}. ${opportunity.label} | catalyst=${opportunity.catalyst} | evidence=${opportunity.evidence.join("; ") || "market setup"}`
    ),
    sectorDeltaSummary.length > 0 ? "Context — instrument changes since the prior snapshot (do NOT copy these lines verbatim into your post):" : "",
    ...sectorDeltaSummary,
    availableInstruments.length > 0 ? "Current market metrics:" : "No market metrics available.",
    ...availableInstruments.map(
      (instrument) =>
        `- ${instrument.label}: ${instrument.value}${instrument.change ? ` (${instrument.change})` : ""} [${instrument.source}]`
    ),
    buildMarketDataSanityBlock(availableInstruments),
    mergedHeadlines.length > 0 ? "Additional sector headlines (context only — your primary focus is the headline above):" : "No current headlines available.",
    ...mergedHeadlines.map((headline, index) => `${index + 1}. ${headline.title} (${headline.source})`),
    `Catalyst discipline: ${ownedCatalystGuard}`,
    verifiedMetrics.block,
    recentPosts.length > 0
      ? [
          "PRIOR VIEW ACCOUNTABILITY — your most recent post and call:",
          `  Date: ${recentPosts[0].createdAt} | Stance: ${recentPosts[0].stance ?? "unknown"}`,
          `  Title: ${recentPosts[0].title ?? "Untitled"}`,
          `  Summary: ${truncateText(recentPosts[0].content, 200)}`,
          "Before writing: was this prior call correct, partially right, or wrong given what has happened since?",
          "Your new post MUST reference this assessment — do not silently abandon your prior view without explanation.",
        ].join("\n")
      : "No prior post found — this is your first directional call. State it clearly.",
    stanceChallenge?.block || "",
    recentPosts.length > 1 ? "Earlier posts (context — do not repeat these angles):" : "",
    ...recentPosts.slice(1).map(
      (message, index) =>
        `${index + 2}. ${message.createdAt} | ${message.title ?? "Untitled"} | ${truncateText(message.content, 120)}`
    ),
    topicPlan.recentAgentThemes.length > 0
      ? `Your recently used themes: ${topicPlan.recentAgentThemes.join("; ")}`
      : "No recent personal-theme history yet.",
    topicPlan.recentRoomThemes.length > 0
      ? `The room has recently talked most about: ${topicPlan.recentRoomThemes.join("; ")}`
      : "No strong room-wide topic concentration yet.",
    topicPlan.coveredThemesToAvoid.length > 0
      ? `Covered themes to avoid unless you add a clearly new angle: ${topicPlan.coveredThemesToAvoid.join("; ")}`
      : "No heavy coverage warning.",
    buildRoomConsensusBlock(thisRunPosts, priorRoomThreads) ?? "",
    buildTransmissionChainInstruction("encouraged"),
    buildDynamicMemoryPromptBlock(agent, dynamicMemory),
    ...(crossAgentView ? [crossAgentView] : []),
    ...(agentState ? [buildStatePromptBlock(agentState)] : []),
    ...(roomCoverage ? [buildRoomCoveragePromptBlock(roomCoverage)] : []),
    ...(historicalContext ? [historicalContext] : []),
    ...(analogBlock ? [analogBlock] : []),
    ...(equityFundamentals ? [equityFundamentals] : []),
    ...(auctionBlock ? [auctionBlock] : []),
    ...(macroEventCalendar ? [macroEventCalendar] : []),
    knowledgeSnippets.length > 0 ? "Supporting context snippets (backend-selected; do not cite these as 'house views'):" : "No supporting knowledge snippets were retrieved for this post.",
    ...knowledgeSnippets.map(
      (snippet, index) => `${index + 1}. ${snippet.title} [${snippet.category}] ${snippet.excerpt}`
    ),
    relevantCases.length > 0 ? "Relevant historical analogs:" : "No analog cases were retrieved for this post.",
    ...relevantCases.map(
      (marketCase, index) =>
        `${index + 1}. ${marketCase.title} [${marketCase.dateLabel}] tags=${marketCase.regimeTags.join(", ")} | pattern=${marketCase.patternSummary} | implication=${marketCase.implicationNote}`
    ),
    priorRoomThreads.length > 0 ? "Recent room threads for context:" : "No prior room threads were found.",
    ...priorRoomThreads.slice(0, 3).map(
      (thread, index) =>
        `${index + 1}. ${thread.post.agentName}: ${thread.post.title || "Untitled"} | ${truncateText(thread.post.content, 220)}`
    ),
    thisRunPosts.length > 0
      ? `--- ALREADY POSTED THIS SESSION (take a DIFFERENT angle — do not repeat these leads or arguments) ---`
      : "",
    ...thisRunPosts.map(
      (p) =>
        `• ${p.agentName} (${p.sector}): "${p.title || "Untitled"}" | ${truncateText(p.content, 150)}`
    ),
    thisRunPosts.length > 0
      ? `--- END OF THIS-SESSION POSTS — your job is to add something genuinely new ---`
      : "",
    "Return a fresh post with a strong title, a specific catalyst, a clear view, and one thing that would change your mind.",
    topicPlan.action === "thread_update"
      ? "Because this is an update, focus on the delta and do not restate the whole thesis."
      : "Because this is a new thread, make the angle feel distinct from your recent posts.",
    "Do not recycle the same theme if there is another uncovered opportunity in your lane.",
    "If your primary catalyst is not oil, do not let oil become the headline of your post.",
    "Root your post in sector-specific mechanics, not the broad market backdrop that every agent shares.",
    // ── Hard accuracy & attribution rules ──────────────────────────────────────
    "FACT ATTRIBUTION RULE: when multiple company events (layoffs, earnings, guidance cuts, M&A) appear in the same headline batch, every statistic must be preceded by the exact company name it belongs to. Never merge figures from different companies into a single clause. Example — correct: 'Meta announced 8,000 cuts; Amazon announced 16,000 cuts.' Example — wrong: 'the company cut 16,000 jobs.' If you cannot confirm which number belongs to which company, omit the specific figure rather than attributing it incorrectly.",
    "STORED DATA CITATION RULE: when citing a correlation coefficient, beta, ratio, or quantitative figure from the historical data blocks above, reproduce the figure exactly as it appears in those blocks. Do not round, adjust, or recall it from any other context. Example: if the block shows a Broad Dollar YoY% vs WTI YoY% correlation, use that exact value from the block rather than any remembered house number. Discrepancies between what is in the data block and what you recall from training must always resolve in favour of the data block.",
    "CATALYST QUALITY RULE: if the top headline appears to be a stock-screener list (e.g. 'N Most Undervalued Stocks to Buy Now', 'Best Dividend Stocks for 2025') treat it as noise. Do not use it as your primary catalyst. Instead, identify the specific company or macro development embedded in it — if no concrete company or data point can be extracted, skip the headline entirely and build your post from the next substantive catalyst in the list."
  ].filter(Boolean).join("\n");
}

function buildEquityCompanyFirstBlock({
  agent,
  headlineAnalysis,
  equityFundamentals,
  recentPosts,
  sectorHeadlines
}: {
  agent: Agent;
  headlineAnalysis: HeadlineAnalysis | null;
  equityFundamentals: string;
  recentPosts: AgentMessage[];
  sectorHeadlines: SnapshotHeadline[];
}): string {
  if (agent.sector !== "Equities") {
    return "";
  }

  const catalyst = headlineAnalysis?.headline_title || sectorHeadlines[0]?.title || "";
  const stockSpecific = isStockSpecificEquityCatalyst(agent, headlineAnalysis, catalyst);
  const recentBreadthMentions = recentPosts
    .slice(0, 2)
    .filter((post) => /\b(?:IWM\/SPY|IWM|SPY|XLF|VIX|breadth|small[-\s]?cap|mega-cap|other 490)\b/i.test(post.content))
    .length;

  if (!stockSpecific) {
    return [
      "EQUITIES MODE: INDEX / SECTOR / FACTOR CATALYST.",
      "You may use breadth, IWM/SPY, XLF, and VIX because the catalyst is not a single-company event.",
      "Still cite one concrete index, sector, earnings-revision, valuation, or breadth metric; do not rely on generic regime language."
    ].join("\n");
  }

  return [
    "EQUITIES MODE: NAMED-COMPANY / STOCK-SPECIFIC CATALYST.",
    "COMPANY-FIRST RULE: the first paragraph must be about the named company or deal in the primary headline. Do NOT open with IWM/SPY, XLF, VIX, megacap breadth, or the other-490 framework.",
    "REQUIRED NUMBERS: cite at least TWO company/deal-level numbers from the article or fundamentals block: price move, revenue, EPS, guidance, margin, market cap, P/E, EV/EBITDA, debt/leverage, cash flow, deal value, EBITDA, synergy target, dividend, buyback size, or gross proceeds.",
    equityFundamentals
      ? "The fundamentals block below is mandatory evidence. Use its actual P/E/EPS/market-cap fields if present."
      : "No usable fundamentals block was injected. If the article does not provide at least two company/deal numbers, do not fake them; the post may be suppressed after generation.",
    "BREADTH LIMIT: IWM/SPY, XLF, VIX, and broad market breadth can appear only after the company-specific analysis, and at most once as confirmation context.",
    recentBreadthMentions > 0
      ? `RECENT REPETITION WARNING: ${recentBreadthMentions} of your last 2 posts used breadth/IWM-SPY style framing. Avoid that framework here unless it is the catalyst itself.`
      : ""
  ].filter(Boolean).join("\n");
}

function buildForumCommentPrompt(
  agent: Agent,
  post: AgentMessage,
  marketSnapshot: MarketSnapshotPayload,
  previousSnapshot: MarketSnapshotPayload | null,
  commentPurpose: CommentPurpose,
  generalHeadlines: SnapshotHeadline[],
  sectorHeadlines: SnapshotHeadline[],
  knowledgeSnippets: LocalKnowledgeSnippet[],
  dynamicMemory: DynamicMemoryContext,
  agentState: AgentBehavioralSummary | null,
  roomCoverage: RoomCoverageState | null,
  verifiedMetrics: VerifiedMarketMetricsContext,
  peerThesisView: string
): string {
  const mergedHeadlines = relevantHeadlinesForAgent(agent, [
    ...sectorHeadlines,
    ...generalHeadlines,
    ...marketSnapshot.headlines
  ]).slice(0, 4);
  const relevantInstruments = relevantInstrumentsForAgent(agent, marketSnapshot);
  const sectorDeltaSummary = buildSectorDeltaSummary(agent, previousSnapshot, marketSnapshot);

  return [
    `You are replying as ${agent.name} (${agent.sector}).`,
    `Original post author: ${post.agentName} (${post.sector})`,
    `Original post title: ${post.title || "Untitled"}`,
    `Original post catalyst: ${post.catalyst || "none"}`,
    post.thesisId
      ? `Thread thesis context: status=${post.thesisStatus || "unknown"} | primary topic=${humanizeThemeKey(post.thesisTopicPrimary || "cross_asset_setup")}`
      : "This thread does not have thesis metadata yet.",
    `Original post body: ${truncateText(post.content, 900)}`,
    `Your comment job: ${commentPurposeDescription(commentPurpose, agent, post)}`,
    `Your comment MUST contribute: ${commentPurposeMustAdd(commentPurpose)}`,
    `Your comment MUST NOT: ${commentPurposeMustAvoid(commentPurpose)}`,
    `Snapshot headline: ${marketSnapshot.headline}`,
    relevantInstruments.length > 0 ? "Relevant sector metrics:" : "No sector metrics available.",
    ...relevantInstruments.map(
      (instrument) =>
        `- ${instrument.label}: ${instrument.value}${instrument.change ? ` (${instrument.change})` : ""}`
    ),
    verifiedMetrics.block,
    "What changed vs the previous snapshot:",
    ...sectorDeltaSummary.slice(0, 4),
    mergedHeadlines.length > 0 ? "Relevant headlines:" : "No headline context available.",
    ...mergedHeadlines.map((headline, index) => `${index + 1}. ${headline.title} (${headline.source})`),
    knowledgeSnippets.length > 0 ? "Approved long-term memory snippets:" : "No approved long-term memory snippets were retrieved for this comment.",
    ...knowledgeSnippets.map(
      (snippet, index) => `${index + 1}. ${snippet.title} [${snippet.category}] ${snippet.excerpt}`
    ),
    buildDynamicMemoryPromptBlock(agent, dynamicMemory),
    ...(peerThesisView ? [peerThesisView] : []),
    buildTransmissionChainInstruction("encouraged"),
    ...(agentState ? [buildStatePromptBlock(agentState)] : []),
    ...(roomCoverage ? [buildRoomCoveragePromptBlock(roomCoverage)] : []),
    "Write a reply that advances the thread with a distinct angle.",
    "Verified-metric discipline applies to comments too: cite only live/current market values from the VERIFIED MARKET METRICS block, article text, or stored/historical blocks.",
    "Do not say you agree and need confirmation unless you add a specific transmission channel, missing datapoint, or challenge."
  ].join("\n");
}

function relevantInstrumentsForAgent(agent: Agent, marketSnapshot: MarketSnapshotPayload): SnapshotInstrument[] {
  const keyGroups: Record<string, string[]> = {
    Macro: ["us10y", "dxy", "sp500", "gold", "wti"],
    Rates: ["us10y", "dxy", "gold", "sp500"],
    FX: ["dxy", "us10y", "gold", "sp500"],
    Equities: ["sp500", "nasdaq", "dxy", "us10y", "gold"],
    Commodities: ["wti", "brent", "natural_gas", "copper", "gold"],
    "Risk/Sentiment": ["sp500", "nasdaq", "gold", "dxy", "us10y"]
  };

  const keys = keyGroups[agent.sector] || marketSnapshot.instruments.map((instrument) => instrument.key);
  const selected = keys
    .map((key) => instrumentFor(marketSnapshot, key))
    .filter((instrument): instrument is SnapshotInstrument => Boolean(instrument))
    .filter((instrument) => instrument.status !== "unavailable");

  return selected.length > 0
    ? selected
    : marketSnapshot.instruments.filter((instrument) => instrument.status !== "unavailable").slice(0, 5);
}

function relevantHeadlinesForAgent(agent: Agent, headlines: SnapshotHeadline[]): SnapshotHeadline[] {
  const keywordsBySector: Record<string, string[]> = {
    Macro: ["fed", "inflation", "jobs", "economy", "growth", "cpi", "payroll", "yield"],
    Rates: ["yield", "treasury", "bond", "curve", "fed", "inflation"],
    FX: ["dollar", "fx", "currency", "yen", "euro", "carry", "em"],
    Equities: ["stock", "earnings", "equity", "sector", "nasdaq", "s&p", "valuation"],
    Commodities: ["oil", "wti", "brent", "gas", "gold", "copper", "energy", "opec"],
    "Risk/Sentiment": ["risk", "volatility", "credit", "spread", "sentiment", "selloff", "stress"]
  };

  const keywords = keywordsBySector[agent.sector] || [];
  const scored = dedupeHeadlines(headlines)
    .map((headline) => ({
      headline,
      // Demote screener / "N stocks to buy" listicles so they never land in
      // the top slot and trigger a weak catalyst analysis.
      score: isListicleHeadline(headline) ? -99 : scoreHeadlineForKeywords(headline, keywords)
    }))
    .sort((left, right) => right.score - left.score || compareHeadlineTimes(right.headline, left.headline));

  const filtered = scored.filter((item) => item.score > 0).map((item) => item.headline);
  return filtered.length > 0 ? filtered : dedupeHeadlines(headlines).filter((h) => !isListicleHeadline(h));
}

function postStyleFor(
  agent: Agent,
  marketSnapshot: MarketSnapshotPayload,
  previousSnapshot: MarketSnapshotPayload | null,
  headlines: SnapshotHeadline[]
): string {
  const deltas = buildSnapshotDeltaSummary(previousSnapshot, marketSnapshot);

  if (headlines.length > 0) {
    return "news reaction";
  }

  if (deltas.some((delta) => delta.toLowerCase().includes("newly tracked"))) {
    return "market regime update";
  }

  if (agent.sector === "Risk/Sentiment" || agent.sector === "FX") {
    return "cross-asset warning";
  }

  if (agent.sector === "Macro" || agent.sector === "Rates") {
    return "historical analog";
  }

  return "market regime update";
}

function choosePrimaryCatalystForAgent(
  agent: Agent,
  headlines: SnapshotHeadline[],
  instruments: SnapshotInstrument[],
  marketSnapshot: MarketSnapshotPayload
): string {
  const preferredHeadline = headlines[0];

  if (preferredHeadline) {
    return `${preferredHeadline.title} (${preferredHeadline.source})`;
  }

  const firstInstrument = instruments[0];

  if (firstInstrument) {
    return `${firstInstrument.label} at ${firstInstrument.value}${firstInstrument.change ? ` (${firstInstrument.change})` : ""}`;
  }

  return marketSnapshot.headline;
}

function buildSectorDeltaSummary(
  agent: Agent,
  previousSnapshot: MarketSnapshotPayload | null,
  nextSnapshot: MarketSnapshotPayload
): string[] {
  if (!previousSnapshot) {
    return ["No prior snapshot is available, so treat this as the first update for your lane."];
  }

  const relevantKeys = new Set(relevantInstrumentsForAgent(agent, nextSnapshot).map((instrument) => instrument.key));
  const previousMap = new Map(previousSnapshot.instruments.map((instrument) => [instrument.key, instrument]));
  const deltas = nextSnapshot.instruments
    .filter((instrument) => relevantKeys.has(instrument.key))
    .map((instrument) => {
      const previousInstrument = previousMap.get(instrument.key);

      if (!previousInstrument) {
        return `- ${instrument.label} is newly tracked at ${instrument.value}${instrument.change ? ` (${instrument.change})` : ""}.`;
      }

      if (
        previousInstrument.value === instrument.value &&
        (previousInstrument.change || "") === (instrument.change || "") &&
        previousInstrument.status === instrument.status
      ) {
        return null;
      }

      return `- ${instrument.label}: was ${previousInstrument.value}${previousInstrument.change ? ` (${previousInstrument.change})` : ""}, now ${instrument.value}${instrument.change ? ` (${instrument.change})` : ""}.`;
    })
    .filter((value): value is string => Boolean(value));

  return deltas.length > 0
    ? deltas.slice(0, 5)
    : ["- Your sector inputs are broadly unchanged versus the last check, so focus on a sharper interpretation rather than a new macro story."];
}

function mainCatalystGuardFor(
  agent: Agent,
  headlines: SnapshotHeadline[],
  instruments: SnapshotInstrument[]
): string {
  const oilHeadline = headlines.find((headline) => /oil|wti|brent|energy/i.test(headline.title));
  const oilInstrument = instruments.find((instrument) => /wti|brent|natural gas/i.test(instrument.label));

  if ((oilHeadline || oilInstrument) && !["Macro", "Commodities"].includes(agent.sector)) {
    return "Oil can be mentioned, but it cannot be the main hook unless it clearly transmits into your sector.";
  }

  if (agent.sector === "Rates") {
    return "Lead with yields, curve, Fed repricing, auctions, or breakevens before broader macro narration.";
  }

  if (agent.sector === "FX") {
    return "Lead with the dollar, carry, or rate differentials before discussing commodities.";
  }

  if (agent.sector === "Equities") {
    return "Lead with breadth, sector rotation, earnings sensitivity, or valuation pressure before macro summary.";
  }

  if (agent.sector === "Risk/Sentiment") {
    return "Lead with positioning, fragility, volatility, spreads, or follow-through before repeating the tape.";
  }

  return "Lead with the catalyst that most naturally belongs to your sector.";
}

function repeatedRecentCatalysts(recentPosts: AgentMessage[]): string[] {
  const counts = new Map<string, number>();

  for (const post of recentPosts) {
    const catalyst = (post.catalyst || "").trim();

    if (!catalyst) {
      continue;
    }

    counts.set(catalyst, (counts.get(catalyst) || 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 1)
    .map(([catalyst]) => catalyst)
    .slice(0, 3);
}

function forumPostSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      title: {
        type: "string",
        maxLength: 120
      },
      catalyst: {
        type: "string",
        maxLength: 120
      },
      content: {
        type: "string",
        maxLength: 2600
      },
      stance: {
        type: "string",
        maxLength: 40
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1
      }
    },
    required: ["title", "catalyst", "content", "stance", "confidence"]
  };
}

function forumCommentSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      catalyst: {
        type: "string",
        maxLength: 120
      },
      content: {
        type: "string",
        maxLength: 900
      },
      stance: {
        type: "string",
        maxLength: 40
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1
      }
    },
    required: ["catalyst", "content", "stance", "confidence"]
  };
}

function generateMockForumPosts(
  agents: Agent[],
  marketSnapshot: MarketSnapshotPayload,
  roomId: string,
  eventId: string,
  snapshotId: string
): PlannedForumEntry[] {
  return sortAgentsForForum(agents).map((agent, index) => {
    const message: AgentMessage = {
      id: crypto.randomUUID(),
      roomId,
      eventId,
      agentId: agent.id,
      agentName: agent.name,
      sector: agent.sector,
      role: "assistant",
      messageType: "post",
      parentMessageId: null,
      title: fallbackForumTitle(agent, marketSnapshot),
      catalyst: fallbackCatalyst(agent, marketSnapshot),
      thesisId: crypto.randomUUID(),
      thesisUpdateId: crypto.randomUUID(),
      thesisStatus: "open",
      thesisTopicPrimary: inferPrimaryThemeKey(agent.sector, agent.sector),
      thesisTopicSecondary: null,
      content: fallbackForumPost(agent, marketSnapshot, null),
      stance: stanceFor(agent),
      confidence: confidenceFor(agent),
      likeCount: 0,
      dislikeCount: 0,
      viewerReaction: null,
      createdAt: offsetTimestamp(index * 3)
    };

    return {
      message,
      thesisWrite: buildPostThesisWritePlan({
        message,
        agent,
        marketSnapshot,
        eventId,
        snapshotId,
        topicPlan: {
          primary: {
            themeKey: message.thesisTopicPrimary || inferPrimaryThemeKey(agent.sector, agent.sector),
            label: humanizeThemeKey(message.thesisTopicPrimary || inferPrimaryThemeKey(agent.sector, agent.sector)),
            catalyst: message.catalyst || fallbackCatalyst(agent, marketSnapshot),
            score: 1,
            evidence: ["mock fallback"]
          },
          alternates: [],
          recentAgentThemes: [],
          recentRoomThemes: [],
          coveredThemesToAvoid: [],
          action: "new_post",
          updateTargetPostId: null,
          matchedThesis: null,
          thesisStatus: "open",
          topicPrimaryKey: message.thesisTopicPrimary || inferPrimaryThemeKey(agent.sector, agent.sector),
          topicSecondaryKey: null,
          hasMeaningfulFreshSignal: true
        }
      })
    };
  });
}

function generateMockForumComments(
  agents: Agent[],
  posts: AgentMessage[],
  roomId: string,
  eventId: string
): PlannedForumEntry[] {
  const orderedAgents = sortAgentsForForum(agents);
  const comments: PlannedForumEntry[] = [];

  for (const [index, post] of posts.entries()) {
    const responder = pickCommentResponder(post, orderedAgents, []);

    if (!responder) {
      continue;
    }

    const message: AgentMessage = {
      id: crypto.randomUUID(),
      roomId,
      eventId,
      agentId: responder.id,
      agentName: responder.name,
      sector: responder.sector,
      role: "assistant",
      messageType: "comment",
      parentMessageId: post.id,
      title: null,
      catalyst: fallbackCatalyst(responder, marketSnapshotFromPost(post)),
      thesisId: post.thesisId,
      thesisUpdateId: post.thesisId ? crypto.randomUUID() : null,
      thesisStatus: post.thesisStatus,
      thesisTopicPrimary: post.thesisTopicPrimary,
      thesisTopicSecondary: post.thesisTopicSecondary,
      content: fallbackForumComment(responder, post, marketSnapshotFromPost(post)),
      stance: stanceFor(responder),
      confidence: confidenceFor(responder),
      likeCount: 0,
      dislikeCount: 0,
      viewerReaction: null,
      createdAt: offsetTimestamp(posts.length * 3 + index * 2)
    };

    comments.push({
      message,
      thesisWrite: null
    });
  }

  return comments;
}

function marketSnapshotFromPost(post: AgentMessage): MarketSnapshotPayload {
  return {
    provider: "forum-fallback",
    usedFallback: true,
    asOf: post.createdAt,
    headline: post.catalyst || post.title || "Forum update",
    summary: post.content,
    prompt: defaultDiscussionPrompt,
    instruments: [],
    headlines: []
  };
}

function sortAgentsForForum(agents: Agent[]): Agent[] {
  const sectorOrder = ["Macro", "Rates", "FX", "Equities", "Commodities", "Risk/Sentiment"];
  return [...agents].sort((left, right) => {
    const leftIndex = sectorOrder.indexOf(left.sector);
    const rightIndex = sectorOrder.indexOf(right.sector);
    return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
  });
}

function pickCommentResponder(
  post: AgentMessage,
  orderedAgents: Agent[],
  preferredAgents: Agent[],
  excludedIds: Set<string> = new Set()
): Agent | null {
  const preferredIds = new Set(preferredAgents.map((agent) => agent.id));
  const authoredIndex = orderedAgents.findIndex((agent) => agent.id === post.agentId);

  // First pass: preferred agents who are not excluded and not the author.
  for (let offset = 1; offset < orderedAgents.length; offset += 1) {
    const candidate = orderedAgents[(authoredIndex + offset) % orderedAgents.length];
    if (candidate.id === post.agentId) continue;
    if (excludedIds.has(candidate.id)) continue;
    if (preferredIds.size === 0 || preferredIds.has(candidate.id)) {
      return candidate;
    }
  }

  // Second pass: any agent not excluded and not the author (fallback when preferred agents exhausted).
  for (let offset = 1; offset < orderedAgents.length; offset += 1) {
    const candidate = orderedAgents[(authoredIndex + offset) % orderedAgents.length];
    if (candidate.id === post.agentId) continue;
    if (excludedIds.has(candidate.id)) continue;
    return candidate;
  }

  return null;
}

function buildSnapshotDeltaSummary(
  previousSnapshot: MarketSnapshotPayload | null,
  nextSnapshot: MarketSnapshotPayload
): string[] {
  if (!previousSnapshot) {
    return ["No prior snapshot is available, so this is the first forum update in the current comparison window."];
  }

  const previousMap = new Map(previousSnapshot.instruments.map((instrument) => [instrument.key, instrument]));
  const deltas = nextSnapshot.instruments
    .map((instrument) => {
      const previousInstrument = previousMap.get(instrument.key);

      if (!previousInstrument) {
        return `- ${instrument.label} is newly tracked at ${instrument.value}${instrument.change ? ` (${instrument.change})` : ""}.`;
      }

      if (
        previousInstrument.value === instrument.value &&
        (previousInstrument.change || "") === (instrument.change || "") &&
        previousInstrument.status === instrument.status
      ) {
        return null;
      }

      return `- ${instrument.label}: was ${previousInstrument.value}${previousInstrument.change ? ` (${previousInstrument.change})` : ""}, now ${instrument.value}${instrument.change ? ` (${instrument.change})` : ""}.`;
    })
    .filter((value): value is string => Boolean(value));

  return deltas.length > 0
    ? deltas.slice(0, 6)
    : [];
}

function dedupeHeadlines(headlines: SnapshotHeadline[]): SnapshotHeadline[] {
  const seen = new Set<string>();
  return headlines.filter((headline) => {
    const key = `${headline.title}|${headline.source}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function filterEligibleHeadlinesForAgent({
  agent,
  headlines,
  recentMessages,
  scope
}: {
  agent?: Agent;
  headlines: SnapshotHeadline[];
  recentMessages: AgentMessage[];
  scope: CatalystFilterScope;
}): SnapshotHeadline[] {
  const eligible: Array<{ headline: SnapshotHeadline; score: number }> = [];
  let skippedFirstTitle: string | null = null;

  for (const [index, headline] of headlines.entries()) {
    const quality = scoreCatalystElectionQuality(headline, agent);

    if (quality <= 0) {
      if (index === 0) {
        skippedFirstTitle = headline.title;
      }
      console.log(
        `[catalyst-quality] skipped weak title="${truncateText(headline.title, 110)}" source=${headline.source} agent=${agent?.name || "room"} scope=${scope} score=${quality}`
      );
      continue;
    }

    const repeat = findRecentCatalystRepeat({
      key: headlineCatalystKey(headline),
      recentMessages,
      agentId: agent?.id,
      roomLookbackHours: 48,
      agentLookbackHours: 72
    });

    if (repeat) {
      if (index === 0) {
        skippedFirstTitle = headline.title;
      }
      console.log(
        `[catalyst-filter] skipped repeated title="${truncateText(headline.title, 110)}" agent=${agent?.name || "room"} scope=${scope} matched=${repeat.matchScope} prior="${truncateText(repeat.message.title || repeat.message.catalyst || "", 90)}"`
      );
      continue;
    }

    eligible.push({ headline, score: quality });
  }

  const ranked = eligible.sort((left, right) =>
    right.score - left.score || compareHeadlineTimes(right.headline, left.headline)
  );

  if (skippedFirstTitle && ranked.length > 0) {
    console.log(
      `[catalyst-filter] selected alternate title="${truncateText(ranked[0].headline.title, 110)}" source=${ranked[0].headline.source} agent=${agent?.name || "room"} skipped="${truncateText(skippedFirstTitle, 90)}"`
    );
  }

  return ranked.map((item) => item.headline);
}

function applyRepeatedCatalystDecisionGate({
  agent,
  postingDecision,
  headlineAnalysis,
  topHeadline,
  topicPlan,
  recentMessages,
  recentAgentMessages,
  currentRunPosts
}: {
  agent: Agent;
  postingDecision: PostingDecision;
  headlineAnalysis: HeadlineAnalysis | null;
  topHeadline?: SnapshotHeadline;
  topicPlan: AgentTopicPlan;
  recentMessages: AgentMessage[];
  recentAgentMessages: AgentMessage[];
  currentRunPosts: AgentMessage[];
}): PostingDecision {
  if (postingDecision.actionType !== "new_post" && postingDecision.actionType !== "update_existing") {
    return postingDecision;
  }

  const catalystText =
    headlineAnalysis?.headline_title ||
    topicPlan.primary.catalyst ||
    postingDecision.suggestedTopic?.catalyst ||
    "";
  const catalystKey = normalizeCatalystKey(catalystText);
  if (!catalystKey) {
    return postingDecision;
  }

  const agentRepeat = findRecentCatalystRepeat({
    key: catalystKey,
    recentMessages: recentAgentMessages,
    agentId: agent.id,
    roomLookbackHours: 72,
    agentLookbackHours: 72
  });
  const roomRepeat = findRecentCatalystRepeat({
    key: catalystKey,
    recentMessages,
    agentId: agent.id,
    roomLookbackHours: 48,
    agentLookbackHours: 72
  });

  const repeat = agentRepeat || roomRepeat;
  if (!repeat) {
    return postingDecision;
  }

  const companyOwnedEquityCatalyst = isCompanyOwnedEquityCatalyst(headlineAnalysis, topHeadline);
  const currentRunPostIds = new Set(currentRunPosts.map((post) => post.id));
  if (agent.sector === "Equities" && companyOwnedEquityCatalyst && currentRunPostIds.has(repeat.message.id)) {
    console.log(
      `[catalyst-filter] decision_gate same-run company-owned equity catalyst bypassed title="${truncateText(catalystText, 110)}"`
    );
    return postingDecision;
  }
  if (
    agent.sector === "Equities" &&
    companyOwnedEquityCatalyst &&
    repeat.matchScope === "room" &&
    repeat.message.sector !== "Equities"
  ) {
    console.log(
      `[catalyst-filter] decision_gate non-equities room repeat bypassed for equities owner title="${truncateText(catalystText, 110)}"`
    );
    return postingDecision;
  }

  if (
    postingDecision.actionType === "update_existing" &&
    postingDecision.targetThesisId &&
    repeat.message.thesisId === postingDecision.targetThesisId
  ) {
    console.log(
      `[catalyst-filter] decision_gate update_existing same-thesis bypass title="${truncateText(catalystText, 110)}" thesis=${postingDecision.targetThesisId}`
    );
    return postingDecision;
  }

  console.log(
    `[catalyst-filter] decision_gate repeated title="${truncateText(catalystText, 110)}" agent=${agent.name} matched=${repeat.matchScope} prior="${truncateText(repeat.message.title || repeat.message.catalyst || "", 90)}"`
  );

  return {
    ...postingDecision,
    actionType: "stay_silent",
    reasonCodes: [...postingDecision.reasonCodes, "repeated_catalyst_no_delta" as const]
  };
}

function shouldSkipRepeatedComment({
  responder,
  post,
  commentPurpose,
  priorRoomThreads,
  currentComments
}: {
  responder: Agent;
  post: AgentMessage;
  commentPurpose: CommentPurpose;
  priorRoomThreads: AgentDiscussionThread[];
  currentComments: AgentMessage[];
}): boolean {
  const targetKey = messageCatalystKey(post);
  if (!targetKey) {
    return false;
  }

  const existingThreadComments = priorRoomThreads.find((thread) => thread.post.id === post.id)?.comments || [];
  const candidateMessages = [
    ...existingThreadComments,
    ...flattenThreadPosts(priorRoomThreads, 80),
    ...currentComments
  ].filter((message) => message.agentId === responder.id);
  const repeat = findRecentCatalystRepeat({
    key: targetKey,
    recentMessages: candidateMessages,
    agentId: responder.id,
    roomLookbackHours: 72,
    agentLookbackHours: 72
  });

  if (repeat) {
    console.log(
      `[catalyst-filter] skipped repeated comment title="${truncateText(post.title || post.catalyst || "", 110)}" agent=${responder.name} matched=${repeat.matchScope}`
    );
    return true;
  }

  const postAgeHours = ageHoursFor(post.createdAt);
  if (commentPurpose === "confirm_existing_thesis" && postAgeHours > 6) {
    console.log(
      `[catalyst-filter] skipped confirm_existing_thesis without new catalyst title="${truncateText(post.title || post.catalyst || "", 110)}" agent=${responder.name}`
    );
    return true;
  }

  return false;
}

function findRecentCatalystRepeat({
  key,
  recentMessages,
  agentId,
  roomLookbackHours,
  agentLookbackHours
}: {
  key: string;
  recentMessages: AgentMessage[];
  agentId?: string;
  roomLookbackHours: number;
  agentLookbackHours: number;
}): { message: AgentMessage; matchScope: "agent" | "room" } | null {
  if (!key) {
    return null;
  }

  const nowMs = Date.now();
  for (const message of recentMessages) {
    const messageKey = messageCatalystKey(message);
    if (!messageKey || !sameCatalystFamily(key, messageKey)) {
      continue;
    }

    const createdAtMs = Date.parse(message.createdAt);
    const ageHours = Number.isFinite(createdAtMs) ? Math.max(0, (nowMs - createdAtMs) / 3600000) : 0;
    const isSameAgent = Boolean(agentId && message.agentId === agentId);
    if (isSameAgent && ageHours <= agentLookbackHours) {
      return { message, matchScope: "agent" };
    }
    if (ageHours <= roomLookbackHours) {
      return { message, matchScope: "room" };
    }
  }

  return null;
}

function ageHoursFor(createdAt: string): number {
  const createdAtMs = Date.parse(createdAt);
  return Number.isFinite(createdAtMs) ? Math.max(0, (Date.now() - createdAtMs) / 3600000) : 0;
}

function headlineCatalystKey(headline: SnapshotHeadline): string {
  return normalizeCatalystKey(`${headline.title} ${headline.description || ""}`);
}

function messageCatalystKey(message: AgentMessage): string {
  return normalizeCatalystKey(`${message.title || ""} ${message.catalyst || ""}`);
}

function normalizeCatalystKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/['’]s\b/g, "")
    .replace(/\b(inc|incorporated|corp|corporation|co|company|companies|ltd|limited|plc|llc|group|holdings|bankshares|bancorp)\b/g, " ")
    .replace(/\b(the|a|an|and|or|of|to|for|with|on|in|by|from|about|amid|over|after|before)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameCatalystFamily(left: string, right: string): boolean {
  if (!left || !right) {
    return false;
  }
  if (left === right || left.includes(right) || right.includes(left)) {
    return true;
  }
  const leftTokens = new Set(left.split(/\s+/).filter((token) => token.length > 3));
  const rightTokens = new Set(right.split(/\s+/).filter((token) => token.length > 3));
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return false;
  }
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return overlap / union >= 0.72;
}

function scoreHeadlineForKeywords(headline: SnapshotHeadline, keywords: string[]): number {
  const text = `${headline.title} ${headline.description || ""} ${headline.source}`.toLowerCase();
  return keywords.reduce((score, keyword) => score + (matchesHeadlineKeyword(text, keyword) ? 1 : 0), 0);
}

function scoreCatalystElectionQuality(headline: SnapshotHeadline, agent?: Agent): number {
  const title = headline.title || "";
  const text = `${headline.title} ${headline.description || ""} ${headline.source || ""}`.toLowerCase();
  let score = 0;

  if (isWeakMarketRoomCatalyst(headline)) {
    return -100;
  }

  if (headline.description && headline.description.length > 80) score += 8;
  if (headline.entities && headline.entities.length > 0) score += 6;
  if (/\b\d+(?:[.,]\d+)?(?:\s*%|bps|k|bn|b\b|bbl|mmb|\/oz)?\b/i.test(title)) score += 6;
  if (/\b(?:earnings|revenue|guidance|trading update|beats?|misses?|downgrade|upgrade|acquisition|merger|buyback|dividend|cuts?|hikes?|surges?|plunges?|falls?|rises?|draw|inventory|incident|fire-related|clinical data|phase \d)\b/i.test(text)) score += 10;
  if (/\b(?:fed|fomc|cpi|pce|payrolls?|nfp|unemployment|gdp|pmi|ism|treasury|yield|bond|oil|wti|brent|gold|copper|dollar|dxy|fx|vix|credit|spread|stocks?|shares?|earnings|revenue|guidance)\b/i.test(text)) score += 8;

  if (/reuters|forexlive|businesswire|globenewswire|polygon|finnhub|marketaux/i.test(headline.source || "")) score += 3;
  if (/motley fool|benzinga/i.test(headline.source || "")) score -= 8;

  if (agent) {
    score += scoreHeadlineForKeywords(headline, sectorKeywordsFor(agent)) * 8;
    if (agent.sector === "Equities" && headline.entities && headline.entities.length > 0) score += 8;
    if (agent.sector !== "Macro" && scoreHeadlineForKeywords(headline, sectorKeywordsFor(agent)) === 0) score -= 8;
  }

  return score;
}

function isWeakMarketRoomCatalyst(headline: SnapshotHeadline): boolean {
  const text = `${headline.title} ${headline.description || ""} ${headline.source || ""}`.toLowerCase();

  const weakPatterns = [
    /\bmovie\s+screen\s+count\b/i,
    /\bscreen\s+count\s+in\s+south\s+india\b/i,
    /\bembassy\s+staffers?.*\b(?:die|crash|killed)\b/i,
    /\bmexican\s+officers?.*\b(?:die|crash|killed)\b/i,
    /\bchihuahua\s+crash\b/i,
    /\bdekra\b.*\b(?:anniversary|growth trajectory)\b/i,
    /\bagam\s+isac\b/i,
    /\bcontinued growth in bermuda\b/i,
    /\bpsychologist\b|\bhappiest relationships\b|\blifestyle\b|\bcelebrity\b/i,
    /\bmajor league fishing\b/i,
    /\bpassive income\b/i,
    /\bstocks?\s+to\s+(?:buy|own|watch|avoid)\b/i,
    /\bis\s+.+\s+stock\s+a\s+buy\b/i,
    /\bwhat lies behind\b/i
  ];

  if (weakPatterns.some((pattern) => pattern.test(text))) {
    return true;
  }

  const hasMarketAnchor =
    /\b(?:fed|fomc|treasury|yield|bond|cpi|pce|payroll|nfp|jobs|gdp|inflation|dollar|dxy|fx|currency|oil|wti|brent|gold|copper|opec|inventory|stocks?|shares?|equity|earnings|revenue|guidance|acquisition|merger|dividend|buyback|credit|spread|vix|volatility)\b/i.test(text);
  const hasCompanyEvent =
    /\b(?:earnings|revenue|guidance|trading update|reports?|announces?|acquires?|acquisition|merger|dividend|buyback|downgrade|upgrade|clinical|phase \d|fire-related incident)\b/i.test(text) &&
    Boolean(headline.entities && headline.entities.length > 0);

  return !hasMarketAnchor && !hasCompanyEvent;
}

function matchesHeadlineKeyword(text: string, keyword: string): boolean {
  const normalizedKeyword = keyword.toLowerCase();
  if (normalizedKeyword.length <= 3) {
    return new RegExp(`(^|[^a-z0-9])${escapeHeadlineRegExp(normalizedKeyword)}(?=[^a-z0-9]|$)`, "i").test(text);
  }
  return text.includes(normalizedKeyword);
}

function escapeHeadlineRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns true for stock-screener / clickbait listicle headlines that carry no
 * market signal — e.g. "12 Most Undervalued Natural Gas Stocks to Buy Now".
 * These headlines should be demoted to the bottom of the sorted slate so they
 * never become the top-of-post catalyst.
 */
function isListicleHeadline(headline: SnapshotHeadline): boolean {
  // Pattern: "N best/top/undervalued/... stocks ..."
  if (/\b\d+\s+(?:best|top|most|worst|cheapest|undervalued|overvalued|high[- ]?dividend|growth|value|small[- ]?cap)\b.*\bstock/i.test(headline.title)) {
    return true;
  }
  // Pattern: "stocks to buy now", "stocks to watch", "stocks to sell"
  if (/\bstocks?\s+to\s+(buy|sell|watch|avoid|own)\b/i.test(headline.title)) {
    return true;
  }
  // Pattern: "best stocks under $N" or "top stocks for 2025"
  if (/\b(best|top)\s+stocks?\s+(under|for|in|to)\b/i.test(headline.title)) {
    return true;
  }
  // Pattern: "N ETFs/funds to buy/own/watch"
  if (/\b\d+\s+\w+\s+(etfs?|funds?|reits?)\s+to\s+(buy|own|watch)\b/i.test(headline.title)) {
    return true;
  }
  return false;
}

function compareHeadlineTimes(left: SnapshotHeadline, right: SnapshotHeadline): number {
  return (Date.parse(left.publishedAt || "1970-01-01T00:00:00.000Z") || 0) -
    (Date.parse(right.publishedAt || "1970-01-01T00:00:00.000Z") || 0);
}

function truncateText(text: string, maxLength: number): string {
  const normalized = text.trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`;
}

function applyCatalystMaterialityGate({
  agent,
  postingDecision,
  noveltyAssessment,
  topicPlan,
  headlineAnalysis
}: {
  agent: Agent;
  postingDecision: PostingDecision;
  noveltyAssessment: NoveltyAssessment;
  topicPlan: AgentTopicPlan;
  headlineAnalysis: HeadlineAnalysis | null;
}): PostingDecision {
  if (postingDecision.actionType !== "new_post") {
    return postingDecision;
  }

  const hasOpenThesis = Boolean(topicPlan.matchedThesis);
  const noveltyScore = noveltyAssessment.compositeScore;

  // High novelty means the topic has genuinely fresh market signal — bypass all materiality checks.
  // A score ≥ 70 implies the catalyst is novel enough to warrant posting regardless of how the
  // LLM rated the individual headline's signal strength.
  if (noveltyScore >= 70) {
    return postingDecision;
  }

  const headlineIsMaterial = Boolean(
    headlineAnalysis &&
      headlineAnalysis.is_new_information &&
      headlineAnalysis.primary_mechanism.trim().length > 0 &&
      headlineAnalysis.direct_relevance_score >= 3 &&
      (headlineAnalysis.market_signal_strength === "high" || headlineAnalysis.market_signal_strength === "medium")
  );
  const topicIsMaterial = topicPlan.hasMeaningfulFreshSignal && noveltyScore >= 35;
  const shouldGate =
    !headlineIsMaterial &&
    !topicIsMaterial &&
    !hasOpenThesis &&
    (noveltyScore < 65 ||
      !headlineAnalysis ||
      headlineAnalysis.market_signal_strength === "low" ||
      headlineAnalysis.primary_mechanism.trim().length === 0);

  if (!shouldGate) {
    return postingDecision;
  }

  const reason = headlineAnalysis
    ? `headline signal=${headlineAnalysis.market_signal_strength}, direct=${headlineAnalysis.direct_relevance_score}, new=${headlineAnalysis.is_new_information}, mechanism=${headlineAnalysis.primary_mechanism ? "yes" : "no"}`
    : `no headline analysis, topicFresh=${topicPlan.hasMeaningfulFreshSignal}`;
  console.log(
    `[catalyst-materiality:${agent.name}] gated weak new_post before View Protocol — novelty=${noveltyScore}, ${reason}`
  );

  return {
    ...postingDecision,
    actionType: "stay_silent",
    reasonCodes: [...postingDecision.reasonCodes, "weak_catalyst_materiality_gate"],
    qualityFlags: [
      ...(postingDecision.qualityFlags || []),
      "weak_catalyst_forced_view"
    ]
  };
}

function applyDomainRelevanceDecisionGate(
  postingDecision: PostingDecision,
  domainRelevance: DomainRelevanceResult
): PostingDecision {
  if (domainRelevance.verdict !== "irrelevant") {
    return postingDecision;
  }

  const reasonCodes = uniqueReasonCodes([...postingDecision.reasonCodes, "domain_relevance_low"]);
  if (!domainRelevance.shouldSuppress || postingDecision.actionType === "stay_silent") {
    return {
      ...postingDecision,
      reasonCodes
    };
  }

  return {
    ...postingDecision,
    actionType: "stay_silent",
    reasonCodes
  };
}

function applyEquitiesStandaloneDecisionGate({
  agent,
  postingDecision,
  headlineAnalysis,
  topHeadline
}: {
  agent: Agent;
  postingDecision: PostingDecision;
  headlineAnalysis: HeadlineAnalysis | null;
  topHeadline?: SnapshotHeadline;
}): PostingDecision {
  if (agent.sector !== "Equities" || postingDecision.actionType !== "new_post" || !headlineAnalysis) {
    return postingDecision;
  }

  if (hasEquityStandaloneOwnership(headlineAnalysis, topHeadline)) {
    return postingDecision;
  }

  console.log(
    `[equities-standalone] downgraded reason=weak_equity_ownership headline="${truncateText(headlineAnalysis.headline_title, 90)}" direct=${headlineAnalysis.direct_relevance_score}`
  );

  return {
    ...postingDecision,
    actionType: "comment_only",
    reasonCodes: uniqueReasonCodes([...postingDecision.reasonCodes, "domain_relevance_low" as const])
  };
}

function applyLowSignalThesisOnlyDecisionGate({
  agent,
  postingDecision,
  headlineAnalysis,
  topHeadline,
  noveltyScore
}: {
  agent: Agent;
  postingDecision: PostingDecision;
  headlineAnalysis: HeadlineAnalysis | null;
  topHeadline?: SnapshotHeadline;
  noveltyScore: number;
}): PostingDecision {
  if (postingDecision.actionType === "stay_silent" || headlineAnalysis?.market_signal_strength !== "low") {
    return postingDecision;
  }

  // High novelty overrides a low signal rating — the topic carries enough fresh information
  // across the snapshot to warrant posting even if the individual headline is rated weak.
  if (noveltyScore >= 70) {
    console.log(
      `[trigger-election] high novelty=${noveltyScore} overrides low signal, keeping action=${postingDecision.actionType} agent=${agent.sector}`
    );
    return postingDecision;
  }

  const equityOwned =
    agent.sector === "Equities" &&
    headlineAnalysis.direct_relevance_score >= 3 &&
    hasEquityStandaloneOwnership(headlineAnalysis, topHeadline);

  if (equityOwned) {
    return postingDecision;
  }

  console.log(
    `[trigger-election] downgraded action=${postingDecision.actionType}->stay_silent reason=low_signal_thesis_only agent=${agent.sector} direct=${headlineAnalysis.direct_relevance_score} headline="${truncateText(headlineAnalysis.headline_title, 90)}"`
  );

  return {
    ...postingDecision,
    actionType: "stay_silent",
    reasonCodes: uniqueReasonCodes([...postingDecision.reasonCodes, "weak_catalyst_materiality_gate" as const])
  };
}

function applyCompanyFinancingOwnershipGate({
  agent,
  postingDecision,
  headlineAnalysis
}: {
  agent: Agent;
  postingDecision: PostingDecision;
  headlineAnalysis: HeadlineAnalysis | null;
}): PostingDecision {
  if (postingDecision.actionType === "stay_silent" || !headlineAnalysis) {
    return postingDecision;
  }

  const financingHeadline =
    /\b(?:private\s+placement|non-brokered\s+private\s+placement|registered\s+direct\s+offering|public\s+offering|gross\s+proceeds|at-the-market\s+offering|atm\s+offering|equity\s+financing|share\s+issuance)\b/i.test(
      headlineAnalysis.headline_title
    );

  if (!financingHeadline || agent.sector === "Equities") {
    return postingDecision;
  }

  console.log(
    `[trigger-election] downgraded action=${postingDecision.actionType}->stay_silent reason=company_financing_not_sector_catalyst agent=${agent.sector} headline="${truncateText(headlineAnalysis.headline_title, 90)}"`
  );

  return {
    ...postingDecision,
    actionType: "stay_silent",
    reasonCodes: uniqueReasonCodes([...postingDecision.reasonCodes, "weak_catalyst_materiality_gate" as const])
  };
}

function isCompanyOwnedEquityCatalyst(
  headlineAnalysis: HeadlineAnalysis | null,
  topHeadline?: SnapshotHeadline
): boolean {
  if (!headlineAnalysis) {
    return false;
  }
  const title = headlineAnalysis.headline_title || "";
  const description = topHeadline?.description || "";
  const text = `${title} ${description}`.toLowerCase();
  const hasCompanyHeadline =
    headlineAnalysis.headline_type === "company_news" ||
    /\b(?:earnings|revenue|guidance|transcript|results|orders|sales|margin|profit|loss|dividend|buyback|merger|acquisition|ipo|layoffs?|restructur|upgrade|downgrade|rating|price\s+target|target\s+(?:raise|cut)|initiates?|reiterates?|overweight|underweight|neutral|buy|sell)\b/i.test(
      text
    );
  const hasCompanySpecificity =
    (topHeadline?.entities?.length || 0) > 0 ||
    /\b(?:inc|corp|ltd|plc|group|holdings|class\s+[ab]|adr|common\s+stock|shares?)\b/i.test(text) ||
    /\b[A-Z]{1,5}\b(?=\s*(?:shares?|stock|earnings|transcript|results|guidance|rating|price\s+target|downgrade|upgrade))/i.test(
      headlineAnalysis.headline_title
    );
  const singleCompanyEvent =
    /\b(?:q[1-4]|quarterly|annual)\s+(?:earnings|results)\b/i.test(text) ||
    /\bearnings\s+transcript\b/i.test(text) ||
    /\b(?:raises?|cuts?|maintains?)\s+(?:guidance|outlook)\b/i.test(text) ||
    /\b(?:announces?|reports?)\b/i.test(text) && /\b(?:eps|revenue|guidance|margin|bookings|arr)\b/i.test(text) ||
    /\b(?:acquires?|acquisition|merger|buyout|takeover|all-cash|cash-and-stock)\b/i.test(text) ||
    /\b(?:upgrade|downgrade|price\s+target|target\s+(?:raise|cut)|initiates?|reiterates?|overweight|underweight|neutral|buy|sell)\b/i.test(text) ||
    /\b(?:cost\s+(?:cut|reduction|saving)|restructur|layoffs?|workforce\s+(?:reduction|cut)|hiring\s+freeze)\b/i.test(text) ||
    /\b(?:launches?|unveils?|introduces?|debuts?|ships?)\s+(?:new\s+)?(?:product|service|platform|chip|model|version|release|update)\b/i.test(text) ||
    /\b(?:names?|appoints?|hires?|promotes?|departs?|steps?\s+down|resigns?|fired|ousted)\s+.{0,30}(?:ceo|cfo|coo|cto|chair(?:man|person)?|president|director)\b/i.test(text) ||
    /\b(?:wins?|secures?|signs?|awarded)\s+.{0,40}(?:contract|deal|agreement|partnership|customer|order)\b/i.test(text) ||
    /\b(?:raises?\s+capital|files?\s+for\s+ipo|spin[-\s]?off|sells?\s+(?:unit|division|business)|stake\s+(?:sale|purchase)|debt\s+(?:offering|raise)|secondary\s+offering)\b/i.test(text) ||
    /\b(?:fda\s+approval|clinical\s+trial|drug\s+approval|patent\s+(?:granted|filed|denied)|recall|investigation|lawsuit\s+(?:filed|settled)|settles?\s+(?:with|case)|antitrust)\b/i.test(text);
  const multiEntityRoundup = (topHeadline?.entities?.length || 0) > 1;
  const broadRoundup = /\b(?:stocks?|shares?)\b/i.test(text) &&
    /\b(?:in focus|to watch|watchlist|roundup|across|among|sector|basket|multiple|several|mixed)\b/i.test(text);
  const earningsSeasonAggregate =
    /\b(?:earnings season|beat rate|companies beating|of companies beating|broad earnings)\b/i.test(text);
  const macroOrPolicyDominant =
    /\b(?:fomc|fed|ecb|boj|cpi|pce|nfp|payroll|treasury|auction|refunding|term premium|policy decision)\b/i.test(text);
  const creditSystemDominant = /\b(?:banking system|systemic|credit crunch|liquidity facility|stress test)\b/i.test(text);

  if (!hasCompanyHeadline || !hasCompanySpecificity || !singleCompanyEvent || multiEntityRoundup || broadRoundup || earningsSeasonAggregate) {
    return false;
  }
  return !macroOrPolicyDominant && !creditSystemDominant;
}

function isSingleCompanyEquityAnchor(headline?: SnapshotHeadline): boolean {
  if (!headline) {
    return false;
  }
  const text = `${headline.title} ${headline.description || ""}`;
  const entities = headline.entities || [];
  const hasCompanySpecificity =
    entities.length === 1 ||
    /\b(?:inc|corp|ltd|plc|group|holdings|class\s+[ab]|adr|common\s+stock|shares?)\b/i.test(text) ||
    /\b[A-Z]{1,5}\b(?=\s*(?:shares?|stock|earnings|transcript|results|guidance|rating|price\s+target|downgrade|upgrade))/i.test(
      headline.title
    );
  const singleCompanyEvent =
    /\b(?:q[1-4]|quarterly|annual)\s+(?:earnings|results)\b/i.test(text) ||
    /\bearnings\s+transcript\b/i.test(text) ||
    /\b(?:raises?|cuts?|maintains?)\s+(?:guidance|outlook)\b/i.test(text) ||
    /\b(?:announces?|reports?)\b/i.test(text) && /\b(?:eps|revenue|guidance|margin|bookings|arr)\b/i.test(text) ||
    /\b(?:acquires?|acquisition|merger|buyout|takeover|all-cash|cash-and-stock)\b/i.test(text) ||
    /\b(?:upgrade|downgrade|price\s+target|target\s+(?:raise|cut)|initiates?|reiterates?|overweight|underweight|neutral|buy|sell)\b/i.test(text) ||
    /\bstock\s+surges?\b/i.test(text) ||
    /\b(?:cost\s+(?:cut|reduction|saving)|restructur|layoffs?|workforce\s+(?:reduction|cut)|hiring\s+freeze)\b/i.test(text) ||
    /\b(?:launches?|unveils?|introduces?|debuts?|ships?)\s+(?:new\s+)?(?:product|service|platform|chip|model|version|release|update)\b/i.test(text) ||
    /\b(?:names?|appoints?|hires?|promotes?|departs?|steps?\s+down|resigns?|fired|ousted)\s+.{0,30}(?:ceo|cfo|coo|cto|chair(?:man|person)?|president|director)\b/i.test(text) ||
    /\b(?:wins?|secures?|signs?|awarded)\s+.{0,40}(?:contract|deal|agreement|partnership|customer|order)\b/i.test(text) ||
    /\b(?:raises?\s+capital|files?\s+for\s+ipo|spin[-\s]?off|sells?\s+(?:unit|division|business)|stake\s+(?:sale|purchase)|debt\s+(?:offering|raise)|secondary\s+offering)\b/i.test(text) ||
    /\b(?:fda\s+approval|clinical\s+trial|drug\s+approval|patent\s+(?:granted|filed|denied)|recall|investigation|lawsuit\s+(?:filed|settled)|settles?\s+(?:with|case)|antitrust)\b/i.test(text);
  const broadRoundup =
    /\b(?:stocks?|shares?)\b/i.test(text) &&
    /\b(?:in focus|to watch|watchlist|roundup|across|among|sector|basket|multiple|several|mixed)\b/i.test(text);
  const macroOrPolicyDominant =
    /\b(?:fomc|fed|ecb|boj|cpi|pce|nfp|payroll|treasury|auction|refunding|term premium|policy decision)\b/i.test(text);
  return hasCompanySpecificity && singleCompanyEvent && !broadRoundup && !macroOrPolicyDominant;
}

function isSingleCompanyEquityCatalystText(catalyst: string): boolean {
  const text = catalyst || "";
  const hasCompanySpecificity =
    /\b[A-Z]{1,5}\b(?=\s*(?:shares?|stock|earnings|transcript|results|guidance|rating|price\s+target|downgrade|upgrade))/i.test(text) ||
    /\b(?:inc|corp|ltd|plc|group|holdings|class\s+[ab]|adr|shares?|stock)\b/i.test(text);
  const singleCompanyEvent =
    /\b(?:q[1-4]|quarterly|annual)\s+(?:earnings|results)\b/i.test(text) ||
    /\bearnings\s+transcript\b/i.test(text) ||
    /\b(?:upgrade|downgrade|price\s+target|target\s+(?:raise|cut)|initiates?|reiterates?|overweight|underweight|neutral|buy|sell)\b/i.test(text) ||
    /\bstock\s+surges?\b/i.test(text) ||
    /\b(?:acquir|acquisition|merger|takeover|deal|buyout)\b/i.test(text) ||
    /\b(?:cost\s+(?:cut|reduction|saving)|restructur|layoffs?|workforce\s+(?:reduction|cut)|hiring\s+freeze)\b/i.test(text) ||
    /\b(?:launches?|unveils?|introduces?|debuts?|ships?)\s+(?:new\s+)?(?:product|service|platform|chip|model|version|release|update)\b/i.test(text) ||
    /\b(?:names?|appoints?|hires?|promotes?|departs?|steps?\s+down|resigns?|fired|ousted)\s+.{0,30}(?:ceo|cfo|coo|cto|chair(?:man|person)?|president|director)\b/i.test(text) ||
    /\b(?:wins?|secures?|signs?|awarded)\s+.{0,40}(?:contract|deal|agreement|partnership|customer|order)\b/i.test(text) ||
    /\b(?:raises?\s+capital|files?\s+for\s+ipo|spin[-\s]?off|sells?\s+(?:unit|division|business)|stake\s+(?:sale|purchase)|debt\s+(?:offering|raise)|secondary\s+offering)\b/i.test(text) ||
    /\b(?:fda\s+approval|clinical\s+trial|drug\s+approval|patent\s+(?:granted|filed|denied)|recall|investigation|lawsuit\s+(?:filed|settled)|settles?\s+(?:with|case)|antitrust)\b/i.test(text);
  const broadRoundup =
    /\b(?:stocks?|shares?)\b/i.test(text) &&
    /\b(?:in focus|to watch|watchlist|roundup|across|among|sector|basket|multiple|several|mixed)\b/i.test(text);
  return hasCompanySpecificity && singleCompanyEvent && !broadRoundup;
}

function applyEquityOwnedCompanyHeadlineGate({
  agent,
  postingDecision,
  headlineAnalysis,
  topHeadline,
  forceEquityOwnership = false
}: {
  agent: Agent;
  postingDecision: PostingDecision;
  headlineAnalysis: HeadlineAnalysis | null;
  topHeadline?: SnapshotHeadline;
  forceEquityOwnership?: boolean;
}): PostingDecision {
  const equityOwned = forceEquityOwnership || isCompanyOwnedEquityCatalyst(headlineAnalysis, topHeadline);
  if (!equityOwned || postingDecision.actionType === "stay_silent") {
    return postingDecision;
  }

  if (agent.sector === "Equities") {
    console.log(
      `[ownership-gate] agent=${agent.sector} equity_owned_company_headline=yes ownership_action=keep headline="${truncateText(headlineAnalysis?.headline_title || "none", 90)}"`
    );
    return postingDecision;
  }

  const hasSpilloverMechanism =
    (headlineAnalysis?.is_cross_asset_relevant || false) ||
    (headlineAnalysis?.indirect_relevance_score || 0) >= 5 ||
    /\b(?:spread|hy|credit|yield|dxy|risk premium|discount rate|financing cost)\b/i.test(
      `${headlineAnalysis?.primary_mechanism || ""} ${headlineAnalysis?.headline_title || ""}`
    );
  const nextAction = hasSpilloverMechanism ? "comment_only" : "stay_silent";
  console.log(
    `[ownership-gate] agent=${agent.sector} equity_owned_company_headline=yes ownership_action=${nextAction === "comment_only" ? "comment_only" : "silent"} headline="${truncateText(headlineAnalysis?.headline_title || "none", 90)}"`
  );
  return {
    ...postingDecision,
    actionType: nextAction,
    reasonCodes: uniqueReasonCodes([
      ...postingDecision.reasonCodes,
      hasSpilloverMechanism ? "headline_routed_to_comment" : "weak_catalyst_materiality_gate"
    ])
  };
}

function applyMacroSingleNameOwnershipGate({
  agent,
  postingDecision,
  headlineAnalysis,
  topHeadline,
  forceSingleCompany = false
}: {
  agent: Agent;
  postingDecision: PostingDecision;
  headlineAnalysis: HeadlineAnalysis | null;
  topHeadline?: SnapshotHeadline;
  forceSingleCompany?: boolean;
}): PostingDecision {
  if (
    agent.sector !== "Macro" ||
    (postingDecision.actionType !== "new_post" && postingDecision.actionType !== "update_existing") ||
    !headlineAnalysis
  ) {
    return postingDecision;
  }

  const title = `${headlineAnalysis.headline_title} ${topHeadline?.description || ""}`;
  const singleCompanyLikely =
    forceSingleCompany ||
    isCompanyOwnedEquityCatalyst(headlineAnalysis, topHeadline) ||
    ((topHeadline?.entities?.length || 0) === 1 && /\b(?:earnings|guidance|transcript|rating|target|dividend|buyback|acquisition|merger)\b/i.test(title));
  const systemicFrame =
    /\b(?:sector-wide|broad market|revisions breadth|index-level|systemic|financing conditions|credit cycle)\b/i.test(title);
  if (!singleCompanyLikely || systemicFrame) {
    return postingDecision;
  }

  const nextAction: PostingDecision["actionType"] =
    headlineAnalysis.indirect_relevance_score >= 5 ? "comment_only" : "stay_silent";
  console.log(
    `[ownership-gate] agent=${agent.sector} single_company_catalyst=yes ownership_action=${nextAction === "comment_only" ? "comment_only" : "silent"} headline="${truncateText(headlineAnalysis.headline_title, 90)}"`
  );
  return {
    ...postingDecision,
    actionType: nextAction,
    reasonCodes: uniqueReasonCodes([
      ...postingDecision.reasonCodes,
      nextAction === "comment_only" ? "headline_routed_to_comment" : "weak_catalyst_materiality_gate"
    ])
  };
}

function hasEquityStandaloneOwnership(
  headlineAnalysis: HeadlineAnalysis,
  topHeadline?: SnapshotHeadline
): boolean {
  if (isCompanyOwnedEquityCatalyst(headlineAnalysis, topHeadline)) {
    return true;
  }

  const text = `${headlineAnalysis.headline_title} ${topHeadline?.description || ""} ${topHeadline?.source || ""}`.toLowerCase();

  if (headlineAnalysis.direct_relevance_score >= 3) {
    return true;
  }

  if (headlineAnalysis.headline_type === "company_news") {
    return true;
  }

  if (/\b(?:stocks?|shares?|equities|s&p|nasdaq|dow|russell|earnings|eps|revenue|guidance|margin|valuation|multiple|financials?|banks?|small[-\s]?caps?|semiconductor|ai)\b/i.test(text)) {
    return true;
  }

  return false;
}

function applyNoFreshWeakDomainDecisionGate(postingDecision: PostingDecision): PostingDecision {
  if (
    postingDecision.actionType !== "new_post" ||
    !postingDecision.reasonCodes.includes("no_fresh_signal" as PostingDecision["reasonCodes"][number]) ||
    !postingDecision.reasonCodes.includes("domain_relevance_low" as PostingDecision["reasonCodes"][number])
  ) {
    return postingDecision;
  }

  console.log(
    `[trigger-election] downgraded action=new_post->stay_silent reason=no_fresh_signal_domain_low catalyst="${truncateText(postingDecision.suggestedTopic?.catalyst || "none", 90)}"`
  );

  return {
    ...postingDecision,
    actionType: "stay_silent",
    reasonCodes: uniqueReasonCodes([...postingDecision.reasonCodes, "weak_catalyst_materiality_gate" as const])
  };
}

function applyScheduledReactiveTopLevelRecoveryGate({
  triggerMode,
  agent,
  postingDecision,
  headlineAnalysis,
  topHeadline,
  domainRelevance,
  noveltyAssessment,
  topicPlan
}: {
  triggerMode: DiscussionTriggerMode;
  agent: Agent;
  postingDecision: PostingDecision;
  headlineAnalysis: HeadlineAnalysis | null;
  topHeadline?: SnapshotHeadline;
  domainRelevance: DomainRelevanceResult;
  noveltyAssessment: NoveltyAssessment;
  topicPlan: AgentTopicPlan;
}): PostingDecision {
  if (triggerMode !== "scheduled" || postingDecision.actionType !== "comment_only" || !headlineAnalysis) {
    return postingDecision;
  }
  if (postingDecision.reasonCodes.includes("run_catalyst_claimed" as PostingDecision["reasonCodes"][number])) {
    return postingDecision;
  }
  const strongSignal =
    headlineAnalysis.market_signal_strength !== "low" &&
    headlineAnalysis.direct_relevance_score >= 4 &&
    headlineAnalysis.primary_mechanism.trim().length > 0;
  const strongContext = noveltyAssessment.compositeScore >= 40 || topicPlan.hasMeaningfulFreshSignal;
  const domainOk = domainRelevance.verdict !== "irrelevant";
  const sectorOwned = agent.sector === "Equities"
    ? hasEquityStandaloneOwnership(headlineAnalysis, topHeadline)
    : headlineAnalysis.direct_relevance_score >= 3;
  if (!strongSignal || !strongContext || !domainOk || !sectorOwned) {
    return postingDecision;
  }
  console.log(
    `[volume-recovery] mode=scheduled action=comment_only->new_post agent=${agent.sector} headline="${truncateText(headlineAnalysis.headline_title, 90)}"`
  );
  return {
    ...postingDecision,
    actionType: "new_post"
  };
}

function buildStanceLockChallenge(agent: Agent, recentPosts: AgentMessage[]): StanceLockChallenge | null {
  const stances = recentPosts
    .filter((message) => message.messageType === "post" && message.stance)
    .map((message) => message.stance as string);
  if (stances.length < 5) {
    return null;
  }

  const firstFive = stances.slice(0, 5);
  const firstFiveSame = firstFive.every((stance) => stance === firstFive[0]);
  const firstTen = stances.slice(0, 10);
  const stanceCounts = firstTen.reduce<Record<string, number>>((counts, stance) => {
    counts[stance] = (counts[stance] || 0) + 1;
    return counts;
  }, {});
  const dominant = Object.entries(stanceCounts).sort((left, right) => right[1] - left[1])[0];
  const dominantShare = dominant ? dominant[1] / firstTen.length : 0;
  if (!firstFiveSame && dominantShare < 0.8) {
    return null;
  }

  const stance = firstFiveSame ? firstFive[0] : dominant[0];
  const streak = firstFiveSame ? 5 : dominant[1];
  console.log(`[stance-lock] agent=${agent.sector} streak=${streak} stance=${stance} challenge=injected`);

  return {
    active: true,
    stance,
    streak,
    block: [
      "STANCE REVIEW REQUIRED:",
      `Your recent posts are concentrated in a ${stance} stance (${streak} of the latest ${firstFiveSame ? 5 : firstTen.length}).`,
      "Before writing, state whether this catalyst gives evidence against that stance. If not, explain why the stance still holds. If yes, update the stance.",
      "Do not rotate stances artificially; the requirement is evidence-based re-evaluation."
    ].join("\n")
  };
}

function correctPostingDecisionCatalyst({
  agent,
  postingDecision,
  finalCatalyst
}: {
  agent: Agent;
  postingDecision: PostingDecision;
  finalCatalyst: string;
}): { decision: PostingDecision; corrected: boolean } {
  const oldCatalyst = postingDecision.suggestedTopic?.catalyst || "";
  if (!finalCatalyst || normalizeCatalystKey(oldCatalyst) === normalizeCatalystKey(finalCatalyst)) {
    return { decision: postingDecision, corrected: false };
  }

  console.log(
    `[pdj-catalyst] corrected agent=${agent.sector} old="${truncateText(oldCatalyst || "none", 80)}" final="${truncateText(finalCatalyst, 80)}"`
  );
  return {
    decision: {
      ...postingDecision,
      suggestedTopic: {
        ...postingDecision.suggestedTopic,
        catalyst: finalCatalyst
      }
    },
    corrected: true
  };
}

function resolveFinalTopicPrimaryKey(
  agent: Agent,
  headlineAnalysis: HeadlineAnalysis | null,
  finalCatalyst: string,
  plannedThemeKey: string
): string {
  const sourceText = [headlineAnalysis?.headline_title, finalCatalyst].filter(Boolean).join(" ");
  const inferred = inferPrimaryThemeKey(sourceText, agent.sector);
  if (!inferred || inferred === "cross_asset_setup") {
    return plannedThemeKey;
  }

  if (inferred !== plannedThemeKey) {
    console.log(
      `[topic-integrity] corrected agent=${agent.sector} planned=${plannedThemeKey} final=${inferred} catalyst="${truncateText(finalCatalyst, 90)}"`
    );
  }

  return inferred;
}

function uniqueReasonCodes(reasonCodes: PostingDecision["reasonCodes"]): PostingDecision["reasonCodes"] {
  return [...new Set(reasonCodes)] as PostingDecision["reasonCodes"];
}

function uniqueQualityFlags(flags: PostQualityFlag[]): PostQualityFlag[] {
  return [...new Set(flags)] as PostQualityFlag[];
}

function ensureRequiredConvictionCondition({
  agent,
  content,
  catalyst,
  mechanismFamily
}: {
  agent: Agent;
  content: string;
  catalyst: string;
  mechanismFamily?: MechanismFamily;
}): string {
  if (/\bThis view changes if\b/i.test(content) && !isWeakConvictionCondition(content)) {
    return content;
  }

  const repaired = `${content.trim()} ${convictionRepairSentence(agent, catalyst, mechanismFamily)}`.trim();
  console.log(`[conviction-repair] agent=${agent.sector} appended ${/\bThis view changes if\b/i.test(content) ? "stronger" : "required"} condition`);
  return repaired;
}

function ensureStanceLockReviewIfRequired({
  content,
  stanceChallenge,
  catalyst,
  stance,
  sector,
  mechanismFamily
}: {
  content: string;
  stanceChallenge: StanceLockChallenge | null;
  catalyst: string;
  stance: string;
  sector: Agent["sector"];
  mechanismFamily?: MechanismFamily;
}): string {
  if (!stanceChallenge?.active) {
    return content;
  }
  if (/\b(evidence against|still holds|does not change|doesn't change|counter[-\s]?evidence|contradict|re-evaluat|challenge)\b/i.test(content)) {
    console.log(`[stance-lock-repair] mode=skipped clean=yes agent=${sector}`);
    return content;
  }

  const hasAccountability =
    /\b(?:prior view|prior call|since (?:my|our) last|versus (?:my|our) prior|compared with (?:my|our) prior|was wrong|was right|partially right)\b/i.test(
      content
    );
  if (hasAccountability && /\bThis view changes if\b/i.test(content) && !isWeakConvictionCondition(content)) {
    console.log(`[stance-lock-repair] mode=skipped clean=yes agent=${sector}`);
    return content;
  }

  // Try to extract an explicit falsification condition already present in the content
  // (e.g. "unless crude breaks $70", "provided that NFP surprises above +200k")
  const conditionMatch = content.match(
    /\b(?:unless|except if|only if|provided that|contingent on)\s+([^.!?]{15,80}[.!?]?)/i
  );
  const convictionSentence = (
    content.match(/\bThis view changes if\b[^.?!]*(?:[.?!]|$)/gi) || []
  ).find((sentence) => isStrongConvictionSentence(sentence));
  const sectorDefaultSentence = convictionRepairSentenceBySector(catalyst, sector, mechanismFamily);
  const genericSectorFallback = /\bnamed catalyst\b/i.test(sectorDefaultSentence);
  const mode = conditionMatch
    ? "existing_condition"
    : convictionSentence
      ? "existing_condition"
      : genericSectorFallback
        ? "generic_fallback"
        : "sector_default";
  const conditionClause = conditionMatch
    ? `reconsidering specifically if ${conditionMatch[1].trim().replace(/[.!?]$/, "")}`
    : convictionSentence
      ? "while that invalidation condition remains unmet"
      : `only if ${sectorDefaultSentence.replace(/^This view changes if\s*/i, "").replace(/[.!?]$/, "")}`;
  const repairSentence = `The ${stance.replace(/-/g, " ")} read still holds here, but ${conditionClause}.`;
  let repaired = `${content.trim()} ${repairSentence}`.trim();
  let clean = true;
  if (/\b(materially different|outcome emerges)\b/i.test(repaired) || /\.\.\.|…/.test(repaired)) {
    const safeSentence = `The ${stance.replace(/-/g, " ")} read still holds here, but only if incoming data does not invalidate the stated mechanism over the next two weeks.`;
    repaired = `${content.trim()} ${safeSentence}`.trim();
    clean = false;
  }
  console.log(
    `[stance-lock-repair] mode=${mode} clean=${clean ? "yes" : "no"} agent=${sector} streak=${stanceChallenge.streak}`
  );
  return repaired;
}

/** Deterministic but varied hash for selecting conviction sentence variant. */
function convictionHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function convictionRepairSentence(agent: Agent, catalyst: string, mechanismFamily?: MechanismFamily, postId?: string): string {
  return convictionRepairSentenceBySector(catalyst, agent.sector, mechanismFamily, postId);
}

function convictionRepairSentenceBySector(
  catalyst: string,
  sector: Agent["sector"],
  mechanismFamily?: MechanismFamily,
  postId?: string
): string {
  // Use postId when available (unique per post → unique variant).
  // When postId is absent, mix catalyst with the current UTC hour so posts in different
  // hours don't all pick the same variant even when catalyst text is similar.
  const hourBucket = Math.floor(Date.now() / 3600000).toString(36);
  const seed = postId ?? (catalyst + hourBucket);
  const pick = (variants: string[]): string => variants[convictionHash(seed) % variants.length];

  if (mechanismFamily === "labor_inflation_persistence" || mechanismFamily === "fed_easing_timing") {
    return pick([
      "This view changes if monthly payroll momentum and core PCE both move decisively against the stated policy path within the next two releases.",
      "Falsifier: core PCE prints below 2.5% YoY AND NFP comes in below 100K in the same month.",
      "Reverse this if the Fed's dot plot median shifts down by 25bps or more at the next FOMC meeting.",
    ]);
  }
  if (mechanismFamily === "term_premium_repricing") {
    return pick([
      "This view changes if the US 10Y yield and curve slope move more than 20bps against the stated term-premium direction within the next five sessions.",
      "Falsifier: the 10Y term premium retraces 15bps with a stable 2Y over the next two auctions.",
      "Reverse this if indirect bidder share recovers above 60% on the next 10Y auction with a tail under 1bp.",
    ]);
  }
  if (mechanismFamily === "credit_stress") {
    return pick([
      "This view changes if HY OAS and equity volatility both reverse more than 5% against this credit-stress signal within the next three sessions.",
      "Falsifier: HY OAS tightens below 270bps for two consecutive sessions with equity vol sub-18.",
      "Reverse this if the investment-grade/HY spread ratio compresses for two consecutive trading days while equity futures hold positive.",
    ]);
  }
  if (mechanismFamily === "commodity_pass_through") {
    return pick([
      "This view changes if benchmark energy prices and inventory prints move against this pass-through channel for two consecutive updates.",
      "Falsifier: WTI drops below $75 AND EIA crude inventories build by more than 4mb for two consecutive weeks.",
      "Reverse this if the rig count rises by more than 15 over the next four weeks while product crack spreads compress below $15.",
    ]);
  }
  if (mechanismFamily === "earnings_fundamentals_deterioration" || mechanismFamily === "revisions_breadth_sector_weakness") {
    return pick([
      "This view changes if company guidance and sector breadth both improve materially against the stated weakness over the next two reporting checkpoints.",
      "Falsifier: the next two earnings prints in this sector beat consensus EPS by more than 5% and raise full-year guidance.",
      "Reverse this if the sector earnings revision breadth (% raising) flips above 50% in the next monthly reading.",
    ]);
  }
  const catalystText = catalyst.toLowerCase();
  if (sector === "Commodities" || /\boil|wti|brent|crude|gas|opec|eia|inventory|strait\b/.test(catalystText)) {
    return pick([
      "This view changes if EIA crude inventories print two consecutive moves above 3mb against the current supply signal within the next two weekly reports.",
      "Falsifier: WTI closes above $90 for three consecutive sessions with EIA builds instead of draws.",
      "Reverse this if OPEC+ announces production cuts exceeding 500kbd within the next two weeks while EIA demand revisions turn positive.",
    ]);
  }
  if (sector === "Rates" || /\byield|treasury|fed|fomc|curve|duration|auction\b/.test(catalystText)) {
    return pick([
      "This view changes if the 10Y yield and the curve slope both reverse the catalyst-implied direction — the size of the move that matters is whatever the catalyst implied, not a fixed threshold.",
      "Falsifier: the 2s10s spread reverses the stated steepening/flattening direction in the next three sessions with no new supply event to explain the move.",
      "Reverse this if the next 10Y auction clears with a tail above 2bps and indirect bidder share below 55%, signalling demand deterioration regardless of the stated direction.",
    ]);
  }
  if (sector === "FX" || /\bdollar|dxy|usd|jpy|eur|carry|currency|fx\b/.test(catalystText)) {
    return pick([
      "This view changes if DXY reverses by more than 1% while the 10Y yield confirms the opposite direction within the next five sessions.",
      "Falsifier: the named FX cross moves more than 80bps against the stated direction for two consecutive sessions.",
      "Reverse this if the Fed's real rate (10Y TIPS) declines by more than 15bps within two weeks while risk appetite stabilises.",
    ]);
  }
  if (sector === "Equities" || /\bstock|equity|shares|earnings|nasdaq|s&p|spy|xlf|iwm\b/.test(catalystText)) {
    return pick([
      "This view changes if sector breadth or earnings guidance moves more than 2% against the stated thesis within the next two weeks.",
      "Falsifier: the next two earnings prints in this sector beat consensus EPS by more than 5% and raise full-year guidance.",
      "Reverse this if the stock closes above its 50-day MA with sector breadth (advance-decline) turning positive for three consecutive sessions.",
    ]);
  }
  if (sector === "Risk/Sentiment" || /\bvix|credit|spread|risk|sentiment|volatility|crowding\b/.test(catalystText)) {
    return pick([
      "This view changes if VIX and HY OAS both move more than 5% against the stated risk signal within the next three sessions.",
      "Falsifier: HY OAS tightens below 280bps while VIX falls below 17 for two consecutive sessions.",
      "Reverse this if the put-to-call ratio drops below 0.7 and IG spreads tighten by more than 5bps within the next week.",
    ]);
  }
  return pick([
    "This view changes if the named catalyst is contradicted by a fresh market print moving more than 2% within the next two weeks.",
    "Falsifier: two consecutive data releases move materially against the stated mechanism within the next month.",
    "Reverse this if the primary driver cited here reverses by more than one standard deviation versus the trailing 30-day range.",
  ]);
}

function resolveForumPostTitle({
  agent,
  resultTitle,
  resultCatalyst,
  marketSnapshot,
  topicPlan,
  stance,
  isUpdate
}: {
  agent: Agent;
  resultTitle?: string | null;
  resultCatalyst?: string | null;
  marketSnapshot: MarketSnapshotPayload;
  topicPlan: AgentTopicPlan;
  stance: string | null;
  isUpdate: boolean;
}): { title: string | null; flags: PostQualityFlag[] } {
  if (isUpdate) {
    return { title: null, flags: [] };
  }

  const cleanedTitle = sanitizeTitle(resultTitle || "");
  if (cleanedTitle) {
    return { title: cleanedTitle, flags: [] };
  }

  const catalyst = sanitizeTitle(resultCatalyst || topicPlan.primary.catalyst || fallbackCatalyst(agent, marketSnapshot));
  const asset = primaryAssetLabelFor(agent);
  const directional = sanitizeTitle(stance || stanceFor(agent)).replace(/-/g, " ");
  const catalystSummary = catalyst || topicPlan.primary.label || fallbackCatalyst(agent, marketSnapshot);
  const title = sanitizeTitle(
    `${agent.sector}: ${titleCase(directional)} ${asset} View on ${truncateText(catalystSummary, 72)}`
  ) || fallbackForumTitle(agent, marketSnapshot, topicPlan);

  console.log(`[post-quality:${agent.name}] title fallback applied — generated="${title}"`);
  return { title, flags: ["missing_title", "title_fallback_applied"] };
}

function collectPostQualityFlags({
  agent,
  titleFlags,
  content,
  hasStoredContext,
  postingDecision,
  verifiedMetrics,
  stanceChallengeActive,
  headlineAnalysis
}: {
  agent: Agent;
  titleFlags: PostQualityFlag[];
  content: string;
  hasStoredContext: boolean;
  postingDecision: PostingDecision;
  verifiedMetrics: VerifiedMarketMetricsContext;
  stanceChallengeActive: boolean;
  headlineAnalysis: HeadlineAnalysis | null;
}): PostQualityFlag[] {
  const flags = new Set<PostQualityFlag>([
    ...(postingDecision.qualityFlags || []),
    ...titleFlags
  ]);

  const hasDataAnchor =
    /(?:\$|\b\d+(?:\.\d+)?\s?(?:%|bps|bp|mb|m bbl|million|bn|billion|x\b))/i.test(content) ||
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(content);
  flags.add(hasDataAnchor ? "data_anchor_present" : "data_anchor_missing");

  const citesStoredStat =
    /\b(stored data|stored correlation|correlation [+-]?\d|historical range|observations|analog|forward returns?|post-1990|YoY)\b/i.test(content);
  if (citesStoredStat) {
    flags.add("stored_stat_cited");
  } else if (hasStoredContext || /Rates|FX/.test(agent.sector)) {
    flags.add("no_stored_stat_cited");
  }

  const hasConvictionCondition = /\bThis view changes if\b/i.test(content);
  flags.add(hasConvictionCondition ? "conviction_condition_present" : "conviction_condition_missing");

  if (hasConvictionCondition && isWeakConvictionCondition(content)) {
    flags.add("weak_conviction_condition");
  }

  if (hasVerifiedMetricCitation(content, verifiedMetrics)) {
    flags.add("verified_metric_cited");
  }
  if (hasMissingMetricClaim(content, verifiedMetrics)) {
    flags.add("metric_missing");
  }
  if (hasUnverifiedMetricClaim(content, verifiedMetrics)) {
    flags.add("unverified_metric_claim");
  }

  if (
    stanceChallengeActive &&
    !/\b(evidence against|still holds|does not change|doesn't change|counter[-\s]?evidence|contradict|re-evaluat|challenge)\b/i.test(content)
  ) {
    flags.add("stance_lock_review_missing");
  }

  if (isStockSpecificEquityCatalyst(agent, headlineAnalysis, postingDecision.suggestedTopic?.catalyst || "")) {
    const companyEvidenceCount = countCompanyLevelNumericEvidence(content);
    const breadthMentions = countBreadthFrameworkMentions(content);
    if (companyEvidenceCount < 2) {
      flags.add("stock_specific_no_fundamentals");
    }
    if (breadthMentions >= 2 || (breadthMentions >= 1 && companyEvidenceCount < 2)) {
      flags.add("equity_breadth_overused");
    }
  }

  if (agent.sector === "Rates" && /\bbear steepener\b/i.test(content)) {
    const hasAuctionOrCurveSpecifics =
      /\b(?:bid-to-cover|no tail|tailed|tail|indirect bidder|direct bidder|dealer takedown|auction size|coupon supply|2s10s|10y-2y|10Y–2Y)\b/i.test(content) &&
      /\b\d+(?:\.\d+)?\s?(?:%|bps|bp|x|bn|billion|m|million)?\b/i.test(content);
    if (!hasAuctionOrCurveSpecifics) {
      flags.add("rates_template_repetition");
    }
  }

  // Detect nominal-as-real yield conflation (Rates + Macro only).
  // "real yield" / "real rate" without a TIPS or breakeven citation → agent is implicitly
  // treating a nominal rate as a real one. Suppressed downstream by shouldSuppressUnsafeMetricPost.
  if (["Rates", "Macro"].includes(agent.sector)) {
    const hasRealYieldClaim = /\breal\s+(?:yield|rate|return)s?\b/i.test(content);
    const hasTipsOrBreakeven = /\b(?:TIPS|breakeven|inflation[- ]adjusted|10Y TIPS|real yield from)\b/i.test(content);
    if (hasRealYieldClaim && !hasTipsOrBreakeven) {
      flags.add("nominal_yield_cited_as_real");
    }
  }

  // Detect unsupported HY OAS threshold claims (all sectors; informational — not suppressing).
  // Fires when an agent says OAS is "elevated" or "stress" without citing a quantitative baseline.
  // The verified metrics block now includes 90d mean + full-series percentile for agents to use.
  const hasOasClaim = /\b(?:HY OAS|credit spread|OAS)\b/i.test(content);
  const hasOasThresholdWord = /\b(?:elevated|stress|historical(?:ly)?|high for|risk-off level)\b/i.test(content);
  const hasOasQuantitativeBaseline =
    /\b(?:90[- ]?d(?:ay)?|average|mean|\d{2,3}(?:st|nd|rd|th)\s*percentile|vs\s+\d{2,4}|above\s+\d{2,4})\b/i.test(content);
  if (hasOasClaim && hasOasThresholdWord && !hasOasQuantitativeBaseline) {
    flags.add("hy_oas_threshold_unsupported");
  }

  return [...flags];
}

function evaluateEquityFundamentalsVisibility({
  agent,
  content,
  context,
  messageType
}: {
  agent: Agent;
  content: string;
  context: EquitySubjectDataContext | null;
  messageType: "post" | "comment";
}): { content: string; flags: PostQualityFlag[]; shouldSuppress: boolean } {
  if (
    agent.sector !== "Equities" ||
    !context ||
    context.resolution.classification !== "single_company" ||
    (context.dataTier !== "light" && context.dataTier !== "rich")
  ) {
    return { content, flags: [], shouldSuppress: false };
  }

  const initialVisibility = hasVisibleFetchedFundamentals(content, context);
  console.log(
    `[equity-fundamentals] fetched symbol=${context.resolution.entry?.symbol || "none"} tier=${context.dataTier} fields=${Object.keys(context.fetchedFields).join(",")}`
  );
  console.log(
    `[equity-fundamentals] visible_in_output=${initialVisibility.visible} exact_match=${initialVisibility.matchedFields.length > 0} message_type=${messageType}`
  );

  if (initialVisibility.visible) {
    return {
      content,
      flags: ["fetched_fundamentals_visible"],
      shouldSuppress: false
    };
  }

  if (messageType === "comment") {
    return {
      content,
      flags: ["fetched_fundamentals_available_but_unused", "article_only_company_numbers"],
      shouldSuppress: false
    };
  }

  const repairSentence = buildEquityFundamentalsRepairSentence(context);
  if (!repairSentence) {
    console.log("[equity-fundamentals] repair_applied=false");
    return {
      content,
      flags: ["fetched_fundamentals_available_but_unused", "article_only_company_numbers"],
      shouldSuppress: true
    };
  }

  const repairedContent = `${content.trim()} ${repairSentence}`.trim();
  console.log("[equity-fundamentals] repair_applied=true");
  const repairedVisibility = hasVisibleFetchedFundamentals(repairedContent, context);
  if (repairedVisibility.visible) {
    return {
      content: repairedContent,
      flags: ["fetched_fundamentals_visible"],
      shouldSuppress: false
    };
  }

  console.log("[equity-fundamentals] suppressed_after_repair=true");
  return {
    content,
    flags: ["fetched_fundamentals_available_but_unused", "article_only_company_numbers"],
    shouldSuppress: true
  };
}

function evaluateFxCorrelationGrounding({
  agent,
  content,
  headlineAnalysis,
  recentPosts,
  fxCorrelationMetadata
}: {
  agent: Agent;
  content: string;
  headlineAnalysis: HeadlineAnalysis | null;
  recentPosts: AgentMessage[];
  fxCorrelationMetadata: FxCorrelationMetadata;
}): PostQualityFlag[] {
  if (agent.sector !== "FX") {
    return [];
  }

  const fxCorrelationContext = fxCorrelationMetadata;
  const catalystText = [headlineAnalysis?.headline_title, headlineAnalysis?.primary_mechanism].filter(Boolean).join(" ");
  const relevant = /\b(oil|wti|brent|commodity fx|aud|cad|nok|broad dollar)\b/i.test(catalystText);
  const citedValueMatch =
    content.match(/\bcorrelation(?: of)?\s*([+-]?\d+(?:\.\d+)?)\b/i) ||
    content.match(/\bBroad Dollar[^.\n]{0,50}WTI[^.\n]{0,40}([+-]?\d+(?:\.\d+)?)\b/i);
  const cited = Boolean(citedValueMatch);
  const citedValue = citedValueMatch?.[1] || "";
  const staticAnchor = /\b-0\.55\b/.test(content);

  console.log(
    `[fx-correlation] relevant=${relevant} computed_block_present=${fxCorrelationContext.present} cited=${cited} value=${citedValue || "none"} expected=${fxCorrelationContext.value || "none"}`
  );

  const flags: PostQualityFlag[] = [];
  if (relevant && fxCorrelationContext.present && cited && citedValue === fxCorrelationContext.value) {
    flags.push("fx_correlation_from_computed_block");
  }
  if (relevant && fxCorrelationContext.present && !cited) {
    flags.push("fx_correlation_missing_when_required");
  }
  if (
    (staticAnchor && (!fxCorrelationContext.present || fxCorrelationContext.value !== "-0.55")) ||
    (fxCorrelationContext.present && cited && citedValue !== fxCorrelationContext.value)
  ) {
    flags.push("fx_correlation_static_anchor_suspected");
  }

  if (citedValue) {
    const priorValues = recentPosts
      .filter((post) => post.messageType === "post")
      .slice(0, 2)
      .map((post) => {
        const match =
          post.content.match(/\bcorrelation(?: of)?\s*([+-]?\d+(?:\.\d+)?)\b/i) ||
          post.content.match(/\bBroad Dollar[^.\n]{0,50}WTI[^.\n]{0,40}([+-]?\d+(?:\.\d+)?)\b/i);
        return match?.[1] || null;
      });
    const streak = [citedValue, ...priorValues].filter((value) => value === citedValue).length;
    if (streak >= 3) {
      console.log(`[fx-correlation-warning] repeated_value=${citedValue} streak=${streak} source=computed_block_present`);
    }
  }

  return flags;
}

function enforceFxCorrelationQuality({
  agent,
  content,
  headlineAnalysis,
  fxCorrelationMetadata
}: {
  agent: Agent;
  content: string;
  headlineAnalysis: HeadlineAnalysis | null;
  fxCorrelationMetadata: FxCorrelationMetadata;
}): { content: string; shouldSuppress: boolean; reason?: string } {
  if (agent.sector !== "FX") {
    return { content, shouldSuppress: false };
  }

  const fxCorrelationContext = fxCorrelationMetadata;
  const relevant = /\b(oil|wti|brent|commodity fx|aud|cad|nok|broad dollar)\b/i.test(
    [headlineAnalysis?.headline_title, headlineAnalysis?.primary_mechanism].filter(Boolean).join(" ")
  );
  const citedValueMatch =
    content.match(/\bcorrelation(?: of)?\s*([+-]?\d+(?:\.\d+)?)\b/i) ||
    content.match(/\bBroad Dollar[^.\n]{0,50}WTI[^.\n]{0,40}([+-]?\d+(?:\.\d+)?)\b/i);
  const citedValue = citedValueMatch?.[1] || null;

  if (!relevant || !fxCorrelationContext.present) {
    return { content, shouldSuppress: false };
  }

  if (!citedValue) {
    const repaired = `${content.trim()} Stored data shows Broad Dollar YoY% vs WTI YoY% correlation of ${fxCorrelationContext.value}, so the transmission should hit commodity FX more directly than a generic broad-dollar call.`.trim();
    console.log(`[fx-correlation] repair_applied=true value=${fxCorrelationContext.value}`);
    return { content: repaired, shouldSuppress: false };
  }

  if (citedValue !== fxCorrelationContext.value) {
    console.log(
      `[fx-correlation] repair_applied=false cited=${citedValue} expected=${fxCorrelationContext.value} reason=mismatch`
    );
    return { content, shouldSuppress: true, reason: "mismatch" };
  }

  return { content, shouldSuppress: false };
}

function shouldSuppressWeakEquityCompanyPost(
  agent: Agent,
  headlineAnalysis: HeadlineAnalysis | null,
  topHeadline: SnapshotHeadline | undefined,
  content: string,
  catalyst: string
): boolean {
  if (!isStockSpecificEquityCatalyst(agent, headlineAnalysis, catalyst)) {
    return false;
  }

  const evidenceCount = countCompanyLevelNumericEvidence(content);
  if (evidenceCount >= 2) {
    console.log(
      `[equities-company-fallback] fact_present=yes source=post_content catalyst="${truncateText(catalyst, 90)}"`
    );
    return false;
  }

  const headlineText = `${topHeadline?.title || ""} ${topHeadline?.description || ""} ${catalyst}`;
  const hasHeadlineCompanyFact =
    /\$\s?\d+(?:\.\d+)?\s?(?:bn|billion|m|million)?\b/i.test(headlineText) ||
    /\b\d+(?:\.\d+)?\s?%\s?(?:revenue|sales|margin|eps|guidance|growth|decline|beat|miss)\b/i.test(headlineText);
  if (hasHeadlineCompanyFact) {
    console.log(
      `[equities-company-fallback] fact_present=yes source=headline_context catalyst="${truncateText(catalyst, 90)}"`
    );
    return false;
  }

  const isMajorDeal = /\b(?:acquir|merger|takeover|deal|buyout|all-cash|cash-and-stock)\b/i.test(catalyst) &&
    /\$\s?\d+(?:\.\d+)?\s?(?:bn|billion|m|million)?/i.test(catalyst);

  // Major M&A can publish if the article itself supplies deal economics even
  // when Yahoo fundamentals are unavailable. Ordinary earnings/company posts
  // need company-level numbers or they become generic breadth commentary.
  if (isMajorDeal) {
    console.log(
      `[equities-company-fallback] fact_present=yes source=deal_value catalyst="${truncateText(catalyst, 90)}"`
    );
    return false;
  }

  // Qualitative carve-out: post is single-company-specific and contains substantive
  // event language even if the LLM couldn't anchor to live numbers (e.g. Yahoo down).
  // Better to publish a qualitative view than to stay silent — flagged for governance.
  if (hasSubstantiveCompanyEventLanguage(content, catalyst)) {
    console.log(
      `[equities-company-fallback] fact_present=no qualitative_substance=yes catalyst="${truncateText(catalyst, 90)}"`
    );
    return false;
  }

  console.log(
    `[equities-company-fallback] fact_present=no ownership_action=silent catalyst="${truncateText(catalyst, 90)}"`
  );
  return true;
}

/**
 * Detects whether a post contains a single-company subject + an event verb
 * from the expanded singleCompanyEvent vocabulary. Used as a fallback so that
 * substantive qualitative posts can publish when fundamentals fetch fails.
 */
function hasSubstantiveCompanyEventLanguage(content: string, catalyst: string): boolean {
  const text = `${content} ${catalyst}`;
  const hasSubject =
    /\b[A-Z][A-Za-z0-9&\.\-]{2,}(?:\s+(?:Inc|Corp|Corporation|Ltd|Plc|Group|Holdings|AG|SA|NV))?\b/.test(content) ||
    /\b[A-Z]{1,5}\b(?=\s*(?:shares?|stock|earnings|guidance|rating|price\s+target|downgrade|upgrade|reports?|announces?))/.test(text);
  const hasEventVerb =
    /\b(?:earnings|revenue|guidance|results|transcript|margin|profit|loss|dividend|buyback|merger|acquisition|ipo|layoffs?|restructur|upgrade|downgrade|rating|target)\b/i.test(text) ||
    /\b(?:cost\s+(?:cut|reduction|saving)|workforce\s+(?:reduction|cut)|hiring\s+freeze)\b/i.test(text) ||
    /\b(?:launches?|unveils?|introduces?|debuts?|ships?)\s+(?:new\s+)?(?:product|service|platform|chip|model|version|release|update)\b/i.test(text) ||
    /\b(?:names?|appoints?|hires?|promotes?|departs?|steps?\s+down|resigns?|fired|ousted)\s+.{0,30}(?:ceo|cfo|coo|cto|chair(?:man|person)?|president|director)\b/i.test(text) ||
    /\b(?:wins?|secures?|signs?|awarded)\s+.{0,40}(?:contract|deal|agreement|partnership|customer|order)\b/i.test(text) ||
    /\b(?:raises?\s+capital|files?\s+for\s+ipo|spin[-\s]?off|sells?\s+(?:unit|division|business)|stake\s+(?:sale|purchase))\b/i.test(text) ||
    /\b(?:fda\s+approval|clinical\s+trial|drug\s+approval|patent|recall|investigation|lawsuit|settles?|antitrust)\b/i.test(text);
  return hasSubject && hasEventVerb;
}

function shouldSuppressUnsafeMetricPost(agent: Agent, flags: PostQualityFlag[]): boolean {
  // Keep the high-risk numeric disciplines strict: these agents routinely cite
  // HY OAS, yields, WTI, DXY, VIX, and SPY levels. A bad number is worse than
  // silence in Market Room.
  if (
    flags.includes("unverified_metric_claim") &&
    ["Macro", "Rates", "FX", "Risk/Sentiment", "Commodities"].includes(agent.sector)
  ) {
    return true;
  }

  // Suppress Rates and Macro posts that treat nominal Treasury yields as real yields
  // without citing TIPS or breakeven data. These posts contain a material factual error
  // (confusing ~4% nominal yields with much lower/negative real yields historically).
  if (
    flags.includes("nominal_yield_cited_as_real") &&
    ["Rates", "Macro"].includes(agent.sector)
  ) {
    return true;
  }

  return false;
}

/**
 * Sector-specific catalyst keyword vocabularies. Used by the catalyst-relevance gate
 * below to skip posts where the agent has been routed an off-sector catalyst (e.g.
 * Macro receiving a single-stock earnings catalyst, Rates receiving a dividend
 * announcement). Only enforced for FX/Macro/Rates — these three agents repeatedly
 * forced off-topic catalysts into templated regime narratives in the v1.1 audit.
 *
 * Equities/Commodities/Risk-Sentiment are intentionally absent: their existing data
 * paths and prompts already produce well-grounded posts on a wider catalyst surface.
 */
const SECTOR_CATALYST_KEYWORDS: Record<string, string[]> = {
  Macro: [
    "fed", "fomc", "powell", "cpi", "pce", "ppi", "payroll", "nonfarm", "unemployment",
    "jobless", "ecb", "boj", "boe", "lagarde", "ueda", "bailey", "rate decision",
    "inflation", "gdp", "retail sales", "industrial production", "consumer confidence",
    "ism", "pmi", "housing", "mortgage rates", "central bank", "interest rate", "rate cut",
    "rate hike", "monetary policy", "fiscal policy", "deficit", "debt ceiling", "tariff",
    "trade war", "geopolitical", "oil shock", "energy shock", "recession", "stagflation",
    "labor market", "wage growth", "money supply", "m1", "m2"
  ],
  Rates: [
    "treasury", "auction", "refunding", "yield", "10y", "2y", "30y", "curve", "term premium",
    "duration", "fed funds", "fomc", "breakeven", "tips", "real yield", "carry trade",
    "jgb", "bund", "gilt", "rate cut", "rate hike", "policy rate", "discount rate",
    "bid-to-cover", "indirect bidder", "dealer takedown", "bond market", "fixed income",
    "convexity", "swap spread", "ois", "sofr", "repo", "qt", "qe", "balance sheet"
  ],
  FX: [
    "dxy", "dollar", "euro", "yen", "pound", "sterling", "yuan", "peso", "rupee", "real",
    "aud", "cad", "nzd", "chf", "krw", "brl", "mxn", "inr", "fx", "currency", "cross-rate",
    "carry", "funding stress", "intervention", "reserve diversification", "exchange rate",
    "eur/usd", "usd/jpy", "gbp/usd", "usd/cad", "aud/usd", "usd/cnh", "ecb", "boj", "boe",
    "snb", "rba", "rbnz", "boc", "pboc", "central bank", "currency war", "devaluation"
  ]
  // Equities, Commodities, Risk/Sentiment intentionally omitted — pass-through (no gating).
};

type CatalystRelevanceScore = { score: number; matchedKeywords: string[] };

function scoreCatalystRelevance(agent: Agent, catalyst: string): CatalystRelevanceScore {
  const keywords = SECTOR_CATALYST_KEYWORDS[agent.sector];
  if (!keywords || keywords.length === 0) {
    // Pass-through for sectors without a vocabulary — counts as fully relevant.
    return { score: 1, matchedKeywords: [] };
  }
  const lower = (catalyst || "").toLowerCase();
  const matched = keywords.filter((k) => lower.includes(k));
  // Score = matches / (vocab/4) so even a couple of keyword hits yields a meaningful score.
  return { score: matched.length / Math.max(1, keywords.length / 4), matchedKeywords: matched };
}

/**
 * Decision-level gate that suppresses off-sector catalysts for FX/Macro/Rates only.
 * If the catalyst headline has zero overlap with the agent's sector vocabulary, the
 * post is silenced with reason code "off_sector_catalyst_skipped".
 *
 * Rationale: the v1.1 Opus qualitative review found Macro receiving micro-cap earnings
 * catalysts (Smith Micro, Nayax, JinkoSolar — 84.6% of Macro catalysts last week were
 * earnings/other) and Rates receiving dividend/tariff catalysts (50% of Rates posts).
 * The agents force-fitted these into templated regime narratives, hurting quality.
 *
 * Equities/Commodities/Risk-Sentiment are pass-through (no vocabulary defined).
 */
function applyCatalystRelevanceGate({
  agent,
  postingDecision,
  headlineAnalysis
}: {
  agent: Agent;
  postingDecision: PostingDecision;
  headlineAnalysis: HeadlineAnalysis | null;
}): PostingDecision {
  if (
    postingDecision.actionType === "stay_silent" ||
    postingDecision.actionType === "comment_only"
  ) {
    return postingDecision;
  }
  if (!["Macro", "Rates", "FX"].includes(agent.sector)) {
    return postingDecision;
  }

  // Concatenate every catalyst-bearing field so we don't false-suppress when one is empty.
  const catalystText = [
    postingDecision.suggestedTopic?.catalyst,
    postingDecision.suggestedTopic?.label,
    postingDecision.suggestedTopic?.themeKey,
    headlineAnalysis?.headline_title,
    headlineAnalysis?.what_changed
  ]
    .filter(Boolean)
    .join(" ");

  const relevance = scoreCatalystRelevance(agent, catalystText);
  if (relevance.matchedKeywords.length > 0) {
    return postingDecision;
  }

  console.log(
    `[catalyst-relevance-gate:${agent.name}] suppressed off-topic catalyst="${truncateText(catalystText, 110)}"`
  );

  return {
    ...postingDecision,
    actionType: "stay_silent",
    reasonCodes: uniqueReasonCodes([
      ...postingDecision.reasonCodes,
      "off_sector_catalyst_skipped"
    ])
  };
}

function applyRatesTemplateDecisionGate({
  agent,
  postingDecision,
  headlineAnalysis,
  topicPlan,
  recentPosts
}: {
  agent: Agent;
  postingDecision: PostingDecision;
  headlineAnalysis: HeadlineAnalysis | null;
  topicPlan: AgentTopicPlan;
  recentPosts: AgentMessage[];
}): PostingDecision {
  if (
    agent.sector !== "Rates" ||
    postingDecision.actionType === "stay_silent" ||
    postingDecision.actionType === "comment_only"
  ) {
    return postingDecision;
  }

  const recentBearSteepenerCount = countRecentBearSteepenerPosts(recentPosts, 6);
  if (recentBearSteepenerCount < 2) {
    return postingDecision;
  }

  const candidateText = [
    headlineAnalysis?.headline_title,
    headlineAnalysis?.primary_mechanism,
    headlineAnalysis?.what_changed,
    topicPlan.primary.catalyst,
    topicPlan.primary.label
  ]
    .filter(Boolean)
    .join(" ");

  if (isHardRatesCatalyst(candidateText)) {
    return postingDecision;
  }

  console.log(
    `[rates-template-gate] suppressed recent_bear_steepeners=${recentBearSteepenerCount} catalyst="${truncateText(candidateText, 110)}"`
  );

  return {
    ...postingDecision,
    actionType: "stay_silent",
    reasonCodes: uniqueReasonCodes([
      ...postingDecision.reasonCodes,
      "rates_template_repetition",
      "no_fresh_signal"
    ])
  };
}

/**
 * Decision-level gate that suppresses conceptual template repetition — cases where an agent
 * is about to produce a post that is thematically and directionally identical to its recent
 * output, even if the surface text differs (which 3-gram Jaccard similarity would miss).
 *
 * Uses a multi-signal score (threshold ≥ 3) so that no single signal alone suppresses.
 * A fresh catalyst on a known theme with new data and a different stance is not suppressed.
 *
 * Follows the exact pattern of applyRatesTemplateDecisionGate().
 */
function applyConceptualRepetitionGate({
  agent,
  postingDecision,
  agentState,
  topicPlan,
  recentPosts,
  headlineAnalysis
}: {
  agent: Agent;
  postingDecision: PostingDecision;
  agentState: AgentBehavioralSummary | null;
  topicPlan: AgentTopicPlan;
  recentPosts: AgentMessage[];
  headlineAnalysis: HeadlineAnalysis | null;
}): PostingDecision {
  if (postingDecision.actionType === "stay_silent") return postingDecision;

  let score = 0;
  const signals: string[] = [];

  // Signal 1 (+2): same themeKey as one of last 3 agent posts.
  // Uses thesisTopicPrimary — the persisted theme key field on AgentMessage.
  const candidateThemeKey = postingDecision.suggestedTopic?.themeKey;
  if (candidateThemeKey) {
    const recentThemeKeys = recentPosts.slice(0, 3).map((p) => p.thesisTopicPrimary).filter(Boolean);
    if (recentThemeKeys.includes(candidateThemeKey)) {
      score += 2;
      signals.push("same_theme_key");
    }
  }

  // Signal 2 (+1): same stance for all of last 3 posts (monotone directional lock).
  const recentStances = recentPosts.slice(0, 3).map((p) => p.stance).filter(Boolean);
  if (recentStances.length >= 3 && new Set(recentStances).size === 1) {
    score += 1;
    signals.push("same_stance_streak");
  }

  // Signal 3 (+2): candidate topic text contains a frame the agent has recently overused.
  // Uses agentState.recentlyOverusedFrames — the native array field, not a JSON string.
  const overusedFrames = agentState?.recentlyOverusedFrames ?? [];
  const candidateText = [
    postingDecision.suggestedTopic?.themeKey,
    postingDecision.suggestedTopic?.catalyst,
    postingDecision.suggestedTopic?.label
  ].filter(Boolean).join(" ").toLowerCase();
  if (overusedFrames.some((f) => candidateText.includes(f.toLowerCase()))) {
    score += 2;
    signals.push("overused_frame_in_candidate");
  }

  // Signal 4 (+1): targeting the same thesis as the previous post (update loop risk).
  if (postingDecision.targetThesisId && recentPosts[0]?.thesisId === postingDecision.targetThesisId) {
    score += 1;
    signals.push("same_thesis_update_loop");
  }

  // Signal 5 (+1): no material numeric delta in headline (only scores if score > 0 —
  // does not independently suppress; data-less headline amplifies other signals).
  if (score > 0) {
    const headlineDelta = headlineAnalysis?.what_changed ?? "";
    if (!/\b\d+(?:\.\d+)?\s?(?:%|bps|bp|\$|k|K|m|bn)\b/.test(headlineDelta)) {
      score += 1;
      signals.push("no_new_data_anchor_in_headline");
    }
  }

  if (score < 3) return postingDecision;

  console.log(
    `[conceptual-repetition-gate:${agent.name}] suppressed score=${score} signals=[${signals.join(",")}]`
  );
  return {
    ...postingDecision,
    actionType: "stay_silent",
    reasonCodes: uniqueReasonCodes([...postingDecision.reasonCodes, "conceptual_repetition_suppressed"]),
    qualityFlags: uniqueQualityFlags([...(postingDecision.qualityFlags ?? [])])
  };
}

function countRecentBearSteepenerPosts(recentPosts: AgentMessage[], limit: number): number {
  return recentPosts
    .slice(0, limit)
    .filter(
      (post) =>
        post.messageType === "post" &&
        /\bbear steepener\b/i.test(`${post.title || ""} ${post.content || ""}`)
    ).length;
}

function isHardRatesCatalyst(text: string): boolean {
  const normalized = text.toLowerCase();
  if (/\b(?:nominee|investors should know|average investors|watchlist|top things|opinion|interview)\b/.test(normalized)) {
    return false;
  }
  return /\b(?:treasury\s+(?:auction|refunding|supply|issuance)|auction|refunding|fomc|minutes|sep|dot plot|cpi|pce|nfp|payroll|jobs report|fed decision|rate decision|policy statement|breakeven|term premium|yield curve|2s10s|10y-2y|bid-to-cover|indirect bidder|dealer takedown|tail(?:ed)?)\b/i.test(
    text
  );
}

function shouldSuppressRatesTemplatePost(
  agent: Agent,
  headlineAnalysis: HeadlineAnalysis | null,
  content: string,
  recentPosts: AgentMessage[]
): boolean {
  if (agent.sector !== "Rates" || !/\bbear steepener\b/i.test(content)) {
    return false;
  }

  const recentBearSteepenerCount = countRecentBearSteepenerPosts(recentPosts, 6);
  if (recentBearSteepenerCount < 2) {
    return false;
  }

  const catalyst = headlineAnalysis?.headline_title || "";
  const auctionOrCurveSpecific = /\b(?:auction|refunding|bid-to-cover|tail|indirect bidder|direct bidder|dealer takedown|coupon supply|2y|10y|2s10s|curve)\b/i.test(
    `${catalyst} ${content}`
  );
  const hasSpecificAuctionDetails =
    /\b(?:bid-to-cover|no tail|tailed|tail|indirect bidder|direct bidder|dealer takedown|auction size|coupon supply)\b/i.test(content) &&
    /\b\d+(?:\.\d+)?\s?(?:%|bps|bp|x|bn|billion|m|million)?\b/i.test(content);

  if (auctionOrCurveSpecific && hasSpecificAuctionDetails) {
    return false;
  }

  return true;
}

function shouldSuppressEquityBreadthRepeatPost(
  agent: Agent,
  postQualityFlags: PostQualityFlag[],
  recentPosts: AgentMessage[]
): boolean {
  if (agent.sector !== "Equities") return false;
  if (!postQualityFlags.includes("equity_breadth_overused")) return false;

  // Suppress only if the last 3 equities posts were also breadth-framework-heavy,
  // meaning breadth is the default lens rather than a specific analytical choice.
  const recentEquityPosts = recentPosts
    .filter((p) => p.agentId === agent.id && p.messageType === "post")
    .slice(0, 3);

  const recentBreadthCount = recentEquityPosts.filter(
    (p) => countBreadthFrameworkMentions(p.content) >= 2
  ).length;

  return recentBreadthCount >= 2;
}

function isStockSpecificEquityCatalyst(
  agent: Agent,
  headlineAnalysis: HeadlineAnalysis | null,
  catalyst: string
): boolean {
  if (agent.sector !== "Equities") {
    return false;
  }

  const text = `${headlineAnalysis?.headline_title || ""} ${catalyst}`.toLowerCase();
  if (headlineAnalysis?.headline_type === "company_news") {
    return true;
  }

  return /\b(?:nasdaq|nyse|tsx|lse|asx|ticker|earnings|eps|revenue|guidance|margin|profit|loss|dividend|buyback|share repurchase|acquir|merger|takeover|deal|private placement|offering|gross proceeds|upgrade|downgrade|price target)\b/i.test(text);
}

function countCompanyLevelNumericEvidence(content: string): number {
  const evidencePatterns = [
    /\$\s?\d+(?:\.\d+)?\s?(?:bn|billion|m|million)?\b/gi,
    /\b\d+(?:\.\d+)?\s?%\s?(?:revenue|sales|margin|gross margin|operating margin|ebitda margin|eps|guidance|growth|decline|beat|miss|stake|ownership|debt|leverage|synerg)/gi,
    /\b(?:revenue|sales|margin|gross margin|operating margin|ebitda|eps|p\/e|pe|ev\/ebitda|free cash flow|fcf|debt|leverage|net debt|guidance|synerg(?:y|ies)|market cap|valuation|multiple)\s+(?:of|at|near|around|above|below|to|from|by)?\s*\$?\d+(?:\.\d+)?\s?(?:%|x|bn|billion|m|million)?/gi,
    /\b\d+(?:\.\d+)?x\b/gi
  ];

  const matches = new Set<string>();
  for (const pattern of evidencePatterns) {
    for (const match of content.matchAll(pattern)) {
      const value = match[0].toLowerCase().replace(/\s+/g, " ").trim();
      if (!/\b(?:10y|2y|dxy|vix|spy|iwm|xlf|hy oas|bps|wti|brent|gold)\b/i.test(value)) {
        matches.add(value);
      }
    }
  }
  return matches.size;
}

function countBreadthFrameworkMentions(content: string): number {
  const matches = content.match(/\b(?:IWM\/SPY|IWM|SPY|XLF|VIX|breadth|small[-\s]?cap|mega-cap|other 490|index level|headline indices)\b/gi);
  return matches?.length || 0;
}

function isWeakConvictionCondition(content: string): boolean {
  const matches = content.match(/\bThis view changes if\b[^.?!]*(?:[.?!]|$)/gi);
  if (!matches || matches.length === 0) return true;
  return !matches.some((sentence) => isStrongConvictionSentence(sentence));
}

function isStrongConvictionSentence(sentence: string): boolean {
  const hasThreshold =
    /\b\d+(?:\.\d+)?\s?(?:%|bps|bp|mb|m bbl|million|bn|billion|x|\$)?\b/i.test(sentence) ||
    /\b(above|below|under|over|breaks?|holds?|compresses?|widens?|prints?|surprises?|cuts?|hikes?)\b/i.test(sentence);
  const hasTimeframe = /\b(sessions?|days?|weeks?|months?|quarters?|next|within|by|after|before|consecutive|weekly|monthly)\b/i.test(sentence);
  const hasEvent = /\b(FOMC|CPI|PCE|NFP|payrolls?|EIA|OPEC|earnings|guidance|auction|inventory|inventories|spread|yield|WTI|DXY|VIX|SPY)\b/i.test(sentence);
  return hasThreshold && (hasTimeframe || hasEvent);
}

function sanitizeTitle(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim()
    .slice(0, 120);
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

function primaryAssetLabelFor(agent: Agent): string {
  const labels: Record<string, string> = {
    Macro: "Macro",
    Rates: "Duration",
    FX: "USD",
    Equities: "Equity",
    Commodities: "WTI",
    "Risk/Sentiment": "Risk"
  };
  return labels[agent.sector] || agent.sector;
}

function fallbackForumTitle(
  agent: Agent,
  marketSnapshot: MarketSnapshotPayload,
  topicPlan?: AgentTopicPlan
): string {
  const catalyst = topicPlan?.primary.label || fallbackCatalyst(agent, marketSnapshot);
  return `${agent.sector} view: ${catalyst}`;
}

function fallbackCatalyst(agent: Agent, marketSnapshot: MarketSnapshotPayload): string {
  const metrics = snapshotMetricsMap(marketSnapshot);

  switch (agent.sector) {
    case "Macro":
      return `Rates, inflation, and policy still dominate`;
    case "Rates":
      return `Treasury repricing remains the key signal`;
    case "FX":
      return `Dollar direction is steering cross-asset pressure`;
    case "Equities":
      return `Leadership breadth is still the equity test`;
    case "Commodities":
      return `Oil and metals are driving the inflation impulse`;
    case "Risk/Sentiment":
      return `The tape still needs confirmation from positioning`;
    default:
      return `Cross-asset moves are still shifting the market map`;
  }
}

function fallbackForumPost(
  agent: Agent,
  marketSnapshot: MarketSnapshotPayload,
  previousSnapshot: MarketSnapshotPayload | null
): string {
  const deltaSummary = buildSnapshotDeltaSummary(previousSnapshot, marketSnapshot).join(" ");
  const metrics = snapshotMetricsMap(marketSnapshot);

  switch (agent.sector) {
    case "Macro":
      return `US 10Y sits at ${metricValue(metrics, "us10y")}, DXY is ${metricValue(metrics, "dxy")}. ${deltaSummary} The key question is whether incoming inflation, labor, and headline data give central banks room to ease or force them to hold longer. Every rally has to be tested against that constraint. Watch the next CPI print and whether the curve is repricing the terminal rate lower or higher — that is what separates a policy pivot from a pause.`;
    case "Rates":
      return `The 10Y yield at ${metricValue(metrics, "us10y")} is the rate the market is pricing against. ${deltaSummary} Duration pressure can tighten financial conditions even when equity headlines look calm. The key question is whether the long end is moving on inflation fears, growth reassessment, or supply concerns — each implies a different trade. Watch auction demand and whether breakevens are leading or lagging the nominal move.`;
    case "FX":
      return `DXY is at ${metricValue(metrics, "dxy")}. ${deltaSummary} The dollar is acting as the cross-asset pressure valve — a firm dollar tightens conditions for EM, commodity-linked currencies, and risk assets simultaneously. The transmission chain to watch is whether the dollar move is being driven by rate differentials or safe-haven demand, because the second one implies the market is pricing a risk event, not just a policy gap.`;
    case "Equities":
      return `S&P 500 at ${metricValue(metrics, "sp500")}, Nasdaq at ${metricValue(metrics, "nasdaq")}. ${deltaSummary} The key question is whether the move has sector breadth or is concentrated in a few names. A narrow rally driven by a handful of large-caps is a different signal from broad participation. Watch whether defensives are outperforming or underperforming cyclicals — that tells you whether the market is risk-on or just resilient at the index level.`;
    case "Commodities":
      return `WTI at ${metricValue(metrics, "wti")}, gold at ${metricValue(metrics, "gold")}. ${deltaSummary} Commodity moves reveal whether the market is pricing growth, inflation, or a geopolitical risk premium. A firmer energy tape can slow central bank progress on inflation and force tighter-for-longer. The next thing to watch is inventory data and whether the OPEC production discipline is holding — that determines whether the energy bid is structural or temporary.`;
    case "Risk/Sentiment":
      return `${deltaSummary} The question is not the direction of the move but whether it is being confirmed by internals: breadth, credit spread direction, and cross-asset correlation. A market that looks calm at the index level while spreads are widening or vol is rising is more fragile than it appears. Watch whether this move is drawing in new buyers or just short covering — that determines the staying power.`;
    default:
      return `${agent.name}: ${deltaSummary} Watch for the next data point that either confirms or contradicts this signal before assuming the trend has legs.`;
  }
}

function fallbackForumComment(agent: Agent, post: AgentMessage, marketSnapshot: MarketSnapshotPayload): string {
  const catalyst = post.catalyst || post.title || "the catalyst";
  const instruments = relevantInstrumentsForAgent(agent, marketSnapshot).slice(0, 1);
  const metric = instruments.length > 0 ? `${instruments[0].label} at ${instruments[0].value}` : "current market levels";
  return `${agent.name}: worth checking the ${agent.sector.toLowerCase()} confirmation signal here. ${catalyst} has to show up in ${metric} before the thesis holds. Without that cross, this is directionally interesting but not yet actionable from my seat.`;
}

function buildRoomConsensusBlock(
  thisRunPosts: AgentMessage[],
  priorRoomThreads: AgentDiscussionThread[]
): string | null {
  // Collect stances from this run + recent prior threads
  const runStances = thisRunPosts
    .filter((p) => p.stance)
    .map((p) => ({ agent: p.agentName, stance: p.stance! }));
  const priorStances = priorRoomThreads
    .slice(0, 6)
    .map((t) => t.post)
    .filter((p) => p.stance)
    .map((p) => ({ agent: p.agentName, stance: p.stance! }));

  const allStances = [...runStances, ...priorStances];
  if (allStances.length < 2) return null;

  // Count dominant stance
  const stanceCounts: Record<string, number> = {};
  for (const { stance } of allStances) {
    stanceCounts[stance] = (stanceCounts[stance] ?? 0) + 1;
  }
  const [dominantStance, dominantCount] = Object.entries(stanceCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  return [
    `ROOM CONSENSUS CHECK — stance distribution across ${allStances.length} recent posts:`,
    ...allStances.map(({ agent, stance }) => `  ${agent}: ${stance}`),
    `Dominant stance: ${dominantStance} (${dominantCount}/${allStances.length} agents)`,
    "You MUST position yourself relative to this consensus: either (a) agree and state one specific supporting reason the others may have missed, or (b) push back with a counter-argument grounded in your sector's data.",
    "Do not silently adopt the consensus stance without explaining why you share it — that is echo, not analysis.",
  ].join("\n");
}

function buildSectorSpecificInstructions(agent: Agent): string | null {
  switch (agent.sector) {
    case "Macro":
      return [
        "MACRO PRECISION (mandatory):",
        "- Every post must cite ONE specific macro print as its numeric anchor: a named central bank decision (Fed/ECB/BoJ/BoE) with prior vs current rate, OR a labor print (NFP MoM delta / unemployment / jobless claims) with prior/current numbers, OR an inflation print (CPI/PCE/core) with prior/current YoY.",
        "- The MACRO EVENT CALENDAR block in your context contains the last three prints of NFP, CPI, core PCE, fed funds, and unemployment. Lead with one of these when the catalyst is macro-relevant.",
        "- The catalyst must drive the regime call. If the catalyst is a single-company earnings story (Smith Micro, Nayax, JinkoSolar, etc.), the relevance gate should have already silenced you — if you reached this prompt with a stock catalyst, narrow the scope to ONE testable macro implication for that sector and skip the broad regime restatement.",
        "- Do not lead with HY OAS or 10Y yield unless the catalyst itself is a credit or rates event. They are confirmation tools, not framing tools.",
        "- ANTI-TEMPLATE RULE: do not use the same regime label ('tightening regime', 'growth softness vs multiple risk') as the lead in two consecutive posts. Vary the framing — supply-chain pass-through, fiscal impulse, term premium, real-yield channel, FX-driven inflation pass-through, productivity divergence, energy-input shock, etc.",
        "- Do not recycle the SAME numeric triplet (10Y at X%, 2Y at Y%, HY OAS Z bps) across posts. Pick the one number that actually moved this catalyst and lead with it.",
      ].join("\n");
    case "Risk/Sentiment":
      return [
        "REGIME CALL REQUIRED: Your primary job is to call the current risk regime — not describe it.",
        "Every post must state explicitly: risk-on or risk-off — right now, because of [one specific observable reason].",
        "If the regime is genuinely ambiguous, state the exact signal that would resolve it. Do not leave it open-ended.",
        "A permanently cautious or watchful stance is not a regime call. Pick risk-on or risk-off and defend it.",
      ].join("\n");
    case "Equities":
      return [
        "EQUITY SPECIFICITY RULE: Index-level moves alone (e.g. 'SPY up 1%') are not sufficient anchors.",
        "If the primary catalyst names a company, deal, earnings report, guidance change, buyback, dividend, financing, upgrade/downgrade, or ticker, your post must be COMPANY-FIRST.",
        "Company-first means: name the stock/deal in paragraph one, cite at least TWO company/deal-level numbers, and explain revenue/EPS/margin/leverage/valuation/cash-flow implications before any market-breadth discussion.",
        "IWM/SPY, XLF, VIX, megacap breadth, and 'the other 490 names' are confirmation tools only. They must not be the thesis of a named-company post.",
        "For index, sector, or factor catalysts, breadth and sector-relative performance are acceptable, but still cite a concrete metric.",
        "Generic index commentary is what a news terminal provides. Analyst work names the stock, the multiple, the earnings driver, or the balance-sheet constraint.",
      ].join("\n");
    case "FX":
      return [
        "FX DATA CITATION RULE: If the historical-data block contains a computed Broad Dollar YoY% vs WTI YoY% correlation and your catalyst genuinely involves oil-dollar transmission or commodity FX, cite that exact computed figure.",
        "If the catalyst is not about oil-dollar transmission, do NOT force the correlation into the post just because you are the FX agent.",
        "If the block is absent, do NOT cite a correlation number from memory.",
        "Example: 'Stored data shows Broad Dollar YoY% vs WTI YoY% correlation of -0.42 — dollar strength here structurally pressures commodity FX (AUD, CAD, NOK).'",
        "Name at least one specific FX cross that is most relevant to the catalyst — not a default choice. Catalyst-to-cross guide: ECB/EU data → EUR/USD; BoJ/Japan/Asia flows → USD/JPY; UK data → GBP/USD; China/commodities/Australian → AUD/USD; oil/Canada → USD/CAD; EM/China → USD/CNH. State whether current price action aligns with or contradicts the stored dollar/oil relationship when that relationship is actually part of the thesis.",
        "",
        "CARRY MECHANICS PRECISION — be exact about directionality:",
        "  • High US real yields = USD attractive = EM-funded carry trades (short USD, long EM high-yielder) get UNWOUND. This is USD bullish, EM FX bearish.",
        "  • 'Carry compression' means the EM-USD yield spread is NARROWING — either US yields rise faster than EM, or EM yields fall. State which is happening.",
        "  • High US yields do NOT compress carry by themselves — they expand the US-side of the spread. Compression only occurs when the EM yield fails to keep up or when risk sentiment forces carry unwind.",
        "  • If you are bearish EM FX, state it as: 'bearish EM FX / USD bullish' — not as 'bearish USD carry' (which would mean bearish on holding USD).",
        "  • Avoid saying yields 'compress carry' without specifying the EM side of the spread. State the mechanism precisely.",
        "",
        "FX CROSS PRECISION: Every post must name the FX cross that is most directly implicated by the catalyst (not whichever you defaulted to last time). If the catalyst is a US data print with no cross-specific driver, use DXY direction but also name the cross most affected: e.g. 'DXY +0.4%, USD/JPY bears the most of the move as BoJ remains on hold.' Do not name USD/JPY by default when the catalyst is about European or commodity markets.",
        "CORRELATION RATE LIMIT: Do not cite the same correlation coefficient (e.g., the Broad Dollar vs WTI correlation) in more than 1-of-3 consecutive posts. If your last two posts cited it, use a different metric instead: rate differential, real-yield spread, central-bank policy gap, or trade-balance data.",
        "ANTI-FABRICATION: Never add window qualifiers ('during crisis periods', '2007-2009 stress window') to the stored correlation unless the historical context block explicitly states that window. The computed value is unconditional across all periods.",
      ].join("\n");
    case "Rates":
      return [
        "RATES DATA CITATION RULE: The prompt contains a computed 10Y yield vs CPI YoY correlation and historical yield/spread ranges from stored data.",
        "You MUST cite at least one of these figures explicitly: the 10Y/CPI correlation coefficient, the historical 10Y yield range, or the 10Y-2Y spread range.",
        "Example: 'Per stored data, 10Y yield vs CPI YoY correlation is +0.XX across XXX monthly observations — inflation persistence is structurally bullish for long yields and confirms duration pressure is not mean-reverting quickly.'",
        "Name a specific yield level or spread as your data anchor — e.g. '10Y at 4.26%, in the upper half of the post-1990 stored range of X%–Y%' — not a qualitative description of rates being 'elevated'.",
        "ANTI-TEMPLATE RULE: do not default to 'bear steepener' unless the catalyst specifically changes the curve, term premium, Treasury supply, auction demand, breakevens, or front-end policy path.",
        "If the catalyst is Treasury auction/refunding/supply, cite an auction-specific number: bid-to-cover, tail/no-tail size, indirect bidder share, dealer takedown, auction size, coupon supply, or 2s10s/10Y-2Y move.",
        "If you cannot name the fresh curve/auction datapoint, do not publish another bear-steepener post; say the catalyst is not a rates catalyst or stay silent.",
        "A Rates post that does not cite a stored figure from the historical context block has failed the data grounding standard.",
        "",
        "RATES MECHANISM MENU: When the catalyst is not an auction/supply event, choose from these alternative framings instead of defaulting to bear steepener:",
        "  • Bull flattener: Fed dovish surprise — front-end rates drop faster than back-end (cite the 2Y move)",
        "  • Real-yield squeeze: TIPS rallying faster than nominals (cite TIPS yield or breakeven level)",
        "  • Carry compression: US-EM yield spread narrowing — specify which EM currency and which side is moving",
        "  • Post-inversion re-steepening: 2s10s flipping after prolonged inversion (cite the 2s10s level)",
        "  • Volatility regime: MOVE index inflection as the primary signal (cite the MOVE level)",
        "Match the mechanism to what the catalyst describes. Do not default.",
      ].join("\n");
    default:
      return null;
  }
}

function buildAgentInstructions(agent: Agent): string {
  const knowledgeBaseNote =
    agent.vectorStoreId
      ? `You also have access to a curated ${agent.sector} knowledge base through file search. Use it when it adds sector-specific context, frameworks, event playbooks, or house-view guidance.`
      : null;

  return [
    agent.systemPrompt,
    `Agent memory: ${agent.memorySummary}`,
    `Sector focus: ${sectorFocusFor(agent)}`,
    `Writing style: ${sectorVoiceFor(agent)}`,
    knowledgeBaseNote,
    "Write like a distinct specialist, not a generic market commentator.",
    "Keep the tone professional, crisp, and suitable for a live market forum, not a bank research PDF.",
    "Do not open with labels like 'Hypothesis', 'Base case', 'Trade implication', 'Biggest driver', 'Main risk', or 'One thing to watch'.",
    "Do not write in numbered memo format unless explicitly asked.",
    "Prefer natural sentences over templated framing. Sound like a sharp human analyst posting in real time.",
    "Avoid repeating points already made unless you are refining, disagreeing with, or translating them.",
    sectorPrecisionRulesFor(agent)
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Returns sector-specific data-precision rules injected as hard constraints into agent
 * instructions. Each rule targets a known hallucination or conflation pattern identified
 * in the v1.1 credibility audit.
 */
function sectorPrecisionRulesFor(agent: Agent): string | null {
  const rules: string[] = [];

  // Nominal-vs-real yield: Rates and Macro agents conflate nominal Treasury yields with real yields.
  if (["Rates", "Macro"].includes(agent.sector)) {
    rules.push(
      "YIELD PRECISION: If you write \"real yield\" or \"real rate\", you must cite TIPS yields or inflation breakevens explicitly. " +
      "If that data is not in your context, refer to nominal yields and label them as nominal."
    );
  }

  // HY OAS threshold language: Risk/Sentiment and Macro agents use "elevated" / "stress" without
  // quantitative baseline. The verified metrics block now includes 90d mean + full-series percentile.
  if (["Risk/Sentiment", "Macro"].includes(agent.sector)) {
    rules.push(
      "HY OAS PRECISION: Your data context includes HY OAS current level, 90-day mean, and full-series percentile. " +
      "Use these to substantiate threshold claims: cite the 90d mean when claiming \"above recent average\"; " +
      "cite the full-series percentile when claiming \"historically elevated\" or \"stress territory\". " +
      "Do not use threshold language without referencing whichever baseline applies."
    );
  }

  // FX correlation: FX agents sometimes cite static or hallucinated correlation coefficients.
  if (agent.sector === "FX") {
    rules.push(
      "CORRELATION PRECISION: You may describe directional relationships without citing coefficients. " +
      "If you state a specific correlation value (e.g. \"-0.55\" or \"X% correlated\"), it must exactly match " +
      "the computed value in your data context. If the computed value is absent, describe the mechanism directionally only."
    );
  }

  return rules.length > 0 ? rules.join("\n") : null;
}

function sectorFocusFor(agent: Agent): string {
  switch (agent.sector) {
    case "Macro":
      return "Focus on growth, inflation, central banks, policy, liquidity, and cross-asset conditions.";
    case "Equities":
      return "Focus on indices, sectors, breadth, earnings expectations, leadership quality, and risk appetite.";
    case "Commodities":
      return "Focus on oil, gas, industrial metals, and gold, and tie commodity moves back to the wider market.";
    case "FX":
      return "Focus on the dollar, major crosses, policy divergence, carry, and how currencies transmit macro pressure.";
    case "Rates":
      return "Focus on Treasury yields, duration, curve shape, inflation expectations, and policy repricing.";
    case "Risk/Sentiment":
      return "Focus on positioning, crowding, defensiveness, momentum, and whether the tape looks resilient or fragile.";
    default:
      return "Focus on the most relevant part of the snapshot for your sector.";
  }
}

function sectorVoiceFor(agent: Agent): string {
  switch (agent.sector) {
    case "Macro":
      return "Sound like a macro strategist who can simplify regime shifts without sounding academic.";
    case "Equities":
      return "Sound like a fundamental investor watching tape quality, breadth, and earnings revision risk.";
    case "Commodities":
      return "Sound like a trader-analyst who thinks in flows, inventories, supply risk, and transmission into inflation.";
    case "FX":
      return "Sound like an FX strategist who sees regime change through relative rates, carry, and funding stress.";
    case "Rates":
      return "Sound like a rates strategist who cares about repricing, curve shape, and cross-asset spillover.";
    case "Risk/Sentiment":
      return "Sound like a positioning and tape watcher who cares about fragility, crowding, and follow-through.";
    default:
      return "Sound like a practical market specialist, not a generic summarizer.";
  }
}

function trimToWordLimit(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);

  if (words.length <= maxWords) {
    return text.trim();
  }

  return `${words.slice(0, maxWords).join(" ")}...`;
}

async function generateTurnBasedDiscussion(
  env: Env,
  discussionPlan: DiscussionPlan,
  marketSnapshot: MarketSnapshotPayload,
  roomId: string,
  eventId: string
): Promise<AgentMessage[]> {
  const thread: AgentMessage[] = [];
  const relevantCasesByAgent = new Map<string, Awaited<ReturnType<typeof listRelevantMarketCasesForAgent>>>();

  for (const agent of discussionPlan.selectedAgents) {
    const relevantCases = await listRelevantMarketCasesForAgent(
      env,
      agent,
      marketSnapshot,
      discussionPlan.profile
    );
    relevantCasesByAgent.set(agent.id, relevantCases);
  }

  const openerMessage = await generatePrimaryTurn({
    env,
    agent: discussionPlan.opener,
    marketSnapshot,
    discussionPlan,
    roomId,
    eventId,
    roundLabel: "Round 1",
    instruction:
      "Open the thread from your macro lens. Set the main framing for this event profile, state your stance and confidence, and tee up the specialists without trying to cover every asset.",
    priorMessages: [],
    relevantCases: relevantCasesByAgent.get(discussionPlan.opener.id) || [],
    createdAt: offsetTimestamp(0)
  });
  thread.push(openerMessage);

  for (const [index, agent] of discussionPlan.roundTwoAgents.entries()) {
    const reply = await generatePrimaryTurn({
      env,
      agent,
      marketSnapshot,
      discussionPlan,
      roomId,
      eventId,
      roundLabel: "Round 2",
      instruction:
        "Reply after reading the earlier thread. Add your sector-specific angle, reference earlier points where useful, and keep the discussion differentiated rather than repetitive.",
      priorMessages: thread,
      relevantCases: relevantCasesByAgent.get(agent.id) || [],
      createdAt: offsetTimestamp(index + 1)
    });
    thread.push(reply);
  }

  if (discussionPlan.roundThreeAgent) {
    const finalSpecialist = await generatePrimaryTurn({
      env,
      agent: discussionPlan.roundThreeAgent,
      marketSnapshot,
      discussionPlan,
      roomId,
      eventId,
      roundLabel: "Round 3",
      instruction:
        "Close the first pass of the discussion. Add the missing sector angle, sharpen one important implication, and stay concise.",
      priorMessages: thread,
      relevantCases: relevantCasesByAgent.get(discussionPlan.roundThreeAgent.id) || [],
      createdAt: offsetTimestamp(thread.length)
    });
    thread.push(finalSpecialist);
  }

  return thread;
}

async function generatePrimaryTurn({
  env,
  agent,
  marketSnapshot,
  discussionPlan,
  roomId,
  eventId,
  roundLabel,
  instruction,
  priorMessages,
  relevantCases,
  createdAt
}: {
  env: Env;
  agent: Agent;
  marketSnapshot: MarketSnapshotPayload;
  discussionPlan: DiscussionPlan;
  roomId: string;
  eventId: string;
  roundLabel: string;
  instruction: string;
  priorMessages: AgentMessage[];
  relevantCases: import("@market-room/shared").MarketCase[];
  createdAt: string;
}): Promise<AgentMessage> {
  const fallbackContent = fallbackContributionText(agent, marketSnapshot, discussionPlan, priorMessages);
  const result = await requestStructuredAgentTurn(
    env,
    agent,
    marketSnapshot,
    discussionPlan,
    roundLabel,
    instruction,
    priorMessages,
    relevantCases
  );

  return {
    id: crypto.randomUUID(),
    roomId,
    eventId,
    agentId: agent.id,
    agentName: agent.name,
    sector: agent.sector,
    role: "assistant",
    messageType: "post",
    parentMessageId: null,
    title: null,
    catalyst: null,
    thesisId: null,
    thesisUpdateId: null,
    thesisStatus: null,
    thesisTopicPrimary: null,
    thesisTopicSecondary: null,
    content: trimToWordLimit(result?.content || fallbackContent, 120),
    stance: result?.stance || stanceFor(agent),
    confidence: result?.confidence ?? confidenceFor(agent),
    likeCount: 0,
    dislikeCount: 0,
    viewerReaction: null,
    createdAt
  };
}

async function requestStructuredAgentTurn(
  env: Env,
  agent: Agent,
  marketSnapshot: MarketSnapshotPayload,
  discussionPlan: DiscussionPlan,
  roundLabel: string,
  instruction: string,
  priorMessages: AgentMessage[],
  relevantCases: import("@market-room/shared").MarketCase[]
): Promise<{
  content?: string;
  stance?: string;
  confidence?: number;
} | null> {
  if (!isLlmConfigured(env)) {
    return null;
  }

  try {
    const knowledgeSnippets = await findRelevantKnowledgeSnippets(
      env,
      agent,
      [
        roundLabel,
        instruction,
        marketSnapshot.headline,
        marketSnapshot.summary
      ].join("\n"),
      3
    );

    const payload = await generateGeminiContent(env, {
      model: getLlmModel(env),
      instructions: buildAgentInstructions(agent),
      prompt: buildTurnPrompt(
        roundLabel,
        instruction,
        marketSnapshot,
        discussionPlan,
        priorMessages,
        relevantCases,
        knowledgeSnippets
      ),
      maxOutputTokens: 300,
      temperature: 0.25,
      responseSchema: primaryTurnSchema()
    });

    return parseStructuredResponseJson<{
      content?: string;
      stance?: string;
      confidence?: number;
    }>(payload);
  } catch {
    return null;
  }
}

function generateMockThread(
  discussionPlan: DiscussionPlan,
  marketSnapshot: MarketSnapshotPayload,
  roomId: string,
  eventId: string
): AgentMessage[] {
  const selectedAgents = [
    discussionPlan.opener,
    ...discussionPlan.roundTwoAgents,
    ...(discussionPlan.roundThreeAgent ? [discussionPlan.roundThreeAgent] : [])
  ].filter((agent, index, list) => list.findIndex((candidate) => candidate.id === agent.id) === index);

  const thread: AgentMessage[] = [];

  for (const [index, agent] of selectedAgents.entries()) {
    const message: AgentMessage = {
      id: crypto.randomUUID(),
      roomId,
      eventId,
      agentId: agent.id,
      agentName: agent.name,
      sector: agent.sector,
      role: "assistant",
      messageType: "post",
      parentMessageId: null,
      title: null,
      catalyst: null,
      thesisId: null,
      thesisUpdateId: null,
      thesisStatus: null,
      thesisTopicPrimary: null,
      thesisTopicSecondary: null,
      content: fallbackContributionText(agent, marketSnapshot, discussionPlan, thread),
      stance: stanceFor(agent),
      confidence: confidenceFor(agent),
      likeCount: 0,
      dislikeCount: 0,
      viewerReaction: null,
      createdAt: offsetTimestamp(index)
    };
    thread.push(message);
  }

  return thread;
}

function buildTurnPrompt(
  roundLabel: string,
  instruction: string,
  marketSnapshot: MarketSnapshotPayload,
  discussionPlan: DiscussionPlan,
  priorMessages: AgentMessage[],
  relevantCases: import("@market-room/shared").MarketCase[],
  knowledgeSnippets: LocalKnowledgeSnippet[]
): string {
  const availableInstruments = marketSnapshot.instruments.filter(
    (instrument) => instrument.status !== "unavailable"
  );

  return [
    `${roundLabel}`,
    instruction,
    `Event profile: ${discussionPlan.profileLabel}`,
    `Routing reason: ${discussionPlan.routingReason}`,
    `Selected agents: ${discussionPlan.selectedAgents.map((agent) => `${agent.name} (${agent.sector})`).join(", ")}`,
    `Snapshot provider: ${marketSnapshot.provider}`,
    `Snapshot as of: ${marketSnapshot.asOf}`,
    `Fallback mode: ${marketSnapshot.usedFallback ? "yes" : "no"}`,
    `Snapshot headline: ${marketSnapshot.headline}`,
    `Snapshot summary: ${marketSnapshot.summary}`,
    `User task: ${marketSnapshot.prompt}`,
    availableInstruments.length > 0 ? "Market metrics:" : "No live market metrics were available.",
    ...availableInstruments.map(
      (instrument) =>
        `- ${instrument.label}: ${instrument.value}${instrument.change ? ` (${instrument.change})` : ""} [${instrument.status}]`
    ),
    marketSnapshot.headlines.length > 0 ? "Top financial headlines:" : "No headlines available.",
    ...marketSnapshot.headlines.slice(0, 3).map((headline, index) => `${index + 1}. ${headline.title} (${headline.source})`),
    knowledgeSnippets.length > 0 ? "Approved long-term memory snippets:" : "No approved long-term memory snippets available.",
    ...knowledgeSnippets.map(
      (snippet, index) => `${index + 1}. ${snippet.title} [${snippet.category}] ${snippet.excerpt}`
    ),
    relevantCases.length > 0 ? "Relevant past market cases:" : "No structured analog cases were retrieved for this turn.",
    ...relevantCases.map(
      (marketCase, index) =>
        `${index + 1}. ${marketCase.title} [${marketCase.dateLabel}] tags=${marketCase.regimeTags.join(", ") || "none"} | pattern=${marketCase.patternSummary} | implication=${marketCase.implicationNote} | outcome=${marketCase.outcomeNote}`
    ),
    priorMessages.length > 0 ? "Earlier thread messages:" : "No earlier thread messages.",
    ...priorMessages.map(
      (message, index) =>
        `${index + 1}. ${message.agentName} (${message.sector}) said: ${message.content}`
    )
  ].join("\n");
}

function primaryTurnSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      content: {
        type: "string",
        description:
          "A short market-room post under 120 words that interprets the snapshot, references earlier messages when relevant, and states a stance with confidence."
      },
      stance: {
        type: "string"
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1
      }
    },
    required: ["content", "stance", "confidence"]
  };
}

function offsetTimestamp(offsetSeconds: number): string {
  return new Date(Date.now() + offsetSeconds * 1000).toISOString();
}

function parseSnapshotPayload(snapshot: MarketSnapshot | null): MarketSnapshotPayload | null {
  if (!snapshot) {
    return null;
  }

  try {
    return JSON.parse(snapshot.payloadJson) as MarketSnapshotPayload;
  } catch {
    return null;
  }
}

function snapshotMetricsMap(snapshot: MarketSnapshotPayload): Map<string, string> {
  return new Map(snapshot.instruments.map((instrument) => [instrument.key, instrument.value]));
}

function metricValue(metrics: Map<string, string>, key: string): string {
  return metrics.get(key) || "unavailable";
}

function instrumentFor(snapshot: MarketSnapshotPayload, key: string): SnapshotInstrument | undefined {
  return snapshot.instruments.find((instrument) => instrument.key === key);
}

function metricChangeOrValue(snapshot: MarketSnapshotPayload, key: string): string {
  const instrument = instrumentFor(snapshot, key);

  if (!instrument) {
    return "is unavailable";
  }

  return instrument.change || instrument.value;
}

function absolutePercentChangeFor(snapshot: MarketSnapshotPayload, key: string): number {
  const instrument = instrumentFor(snapshot, key);

  if (!instrument?.change) {
    return 0;
  }

  const match = instrument.change.match(/-?\d+(\.\d+)?/);
  return match ? Math.abs(Number.parseFloat(match[0])) : 0;
}

function absoluteBpsChangeFor(snapshot: MarketSnapshotPayload, key: string): number {
  const instrument = instrumentFor(snapshot, key);

  if (!instrument?.change) {
    return 0;
  }

  const match = instrument.change.match(/-?\d+(\.\d+)?/);
  return match ? Math.abs(Number.parseFloat(match[0])) : 0;
}

function headlineKeywordScore(snapshot: MarketSnapshotPayload, keywords: string[]): number {
  const headlineText = snapshot.headlines
    .slice(0, 3)
    .map((headline) => headline.title.toLowerCase())
    .join(" ");

  return keywords.some((keyword) => headlineText.includes(keyword)) ? 1 : 0;
}
