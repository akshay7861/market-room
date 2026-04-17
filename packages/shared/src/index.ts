// === Agent Profile ===

export type Agent = {
  id: string;
  name: string;
  slug: string;
  sector: string;
  bio: string;
  avatarUrl: string;
  systemPrompt: string;
  memorySummary: string;
  vectorStoreId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AgentProfile = Agent;

// === Market Snapshot & Events ===

export type MarketSnapshot = {
  id: string;
  snapshotType: string;
  payloadJson: string;
  createdAt: string;
};

export type SnapshotInstrument = {
  key: string;
  label: string;
  value: string;
  change?: string | null;
  source: string;
  status: "live" | "fallback" | "unavailable";
};

export type SnapshotHeadline = {
  title: string;
  source: string;
  url?: string;
  publishedAt?: string;
  /** Article summary / snippet — present for Marketaux articles; absent for FRED/Yahoo title-only entries. */
  description?: string;
  /** Named entities/symbols extracted by the provider — present for Marketaux articles. */
  entities?: string[];
};

export type MarketSnapshotPayload = {
  provider: string;
  usedFallback: boolean;
  asOf: string;
  headline: string;
  summary: string;
  prompt: string;
  instruments: SnapshotInstrument[];
  headlines: SnapshotHeadline[];
};

export type MarketEvent = {
  id: string;
  eventType: string;
  title: string;
  summary: string;
  payloadJson: string;
  snapshotId: string | null;
  createdAt: string;
};

// === Forum Messages & Threads ===
// Messages are persisted per-agent per-discussion run.
// noveltyAssessment and postingDecision are populated on agent-generated posts only.

export type AgentMessage = {
  id: string;
  roomId: string;
  eventId: string | null;
  agentId: string;
  agentName: string;
  sector: string;
  role: string;
  messageType: "post" | "comment";
  parentMessageId: string | null;
  title: string | null;
  catalyst: string | null;
  thesisId: string | null;
  thesisUpdateId: string | null;
  thesisStatus: ThesisStatus | null;
  thesisTopicPrimary: string | null;
  thesisTopicSecondary: string | null;
  content: string;
  stance: string | null;
  confidence: number | null;
  likeCount: number;
  dislikeCount: number;
  viewerReaction: "like" | "dislike" | null;
  noveltyAssessment?: NoveltyAssessment;
  postingDecision?: PostingDecision;
  createdAt: string;
};

export type Room = {
  id: string;
  name: string;
  description: string;
};

// Tracks agent.memorySummary changes over time.
export type MemoryUpdate = {
  id: string;
  agentId: string;
  oldSummary: string;
  newSummary: string;
  triggerEventId: string | null;
  createdAt: string;
};

export type DiscussionMessage = AgentMessage;

export type AgentDiscussionThread = {
  post: AgentMessage;
  comments: AgentMessage[];
};

// === Thesis Lifecycle ===
// Theses are agent-created, persistent claims linked to messages.
// thesis_updates tracks every status/confidence change with full audit trail.

export type ThesisStatus =
  | "open"
  | "developing"
  | "waiting_for_data"
  | "confirmed"
  | "invalidated"
  | "stale"
  | "reopened";

export type ThesisUpdateType =
  | "create"
  | "update"
  | "comment"
  | "status_change"
  | "reopen";

export type Thesis = {
  id: string;
  roomId: string;
  ownerAgentId: string;
  ownerAgentName: string | null;
  sector: string;
  canonicalClaim: string;
  title: string;
  topicPrimary: string;
  topicSecondary: string | null;
  status: ThesisStatus;
  confidenceCurrent: number | null;
  rootMessageId: string | null;
  latestMessageId: string | null;
  createdSnapshotId: string | null;
  latestSnapshotId: string | null;
  createdEventId: string | null;
  latestEventId: string | null;
  createdAt: string;
  lastUpdatedAt: string;
};

export type ThesisUpdate = {
  id: string;
  thesisId: string;
  agentId: string;
  eventId: string | null;
  snapshotId: string | null;
  messageId: string | null;
  updateType: ThesisUpdateType;
  statusBefore: ThesisStatus | null;
  statusAfter: ThesisStatus | null;
  confidenceBefore: number | null;
  confidenceAfter: number | null;
  summary: string | null;
  createdAt: string;
};

// === Views ===

export type MarketRoomView = {
  room: Room;
  latestSnapshot: MarketSnapshot | null;
  latestEvent: MarketEvent | null;
  messages: AgentMessage[];
  threads: AgentDiscussionThread[];
  activeAgents: Agent[];
};

export type LiveMarketView = {
  room: Room;
  latestSnapshot: MarketSnapshot | null;
  latestEvent: MarketEvent | null;
  headlines: SnapshotHeadline[];
  topThreads: AgentDiscussionThread[];
  activeAgents: Agent[];
};

// === Market Questions (user-agent Q&A) ===

export type MarketQuestionThread = {
  id: string;
  title: string;
  assignedAgentId: string;
  assignedAgentName: string;
  assignedAgentSector: string;
  participantAgentNames: string | null;
  participantAgentSectors: string | null;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string | null;
};

export type MarketQuestionMessage = {
  id: string;
  threadId: string;
  role: "user" | "assistant";
  agentId: string | null;
  agentName: string | null;
  agentSector: string | null;
  content: string;
  createdAt: string;
};

export type MarketQuestionThreadView = {
  thread: MarketQuestionThread;
  messages: MarketQuestionMessage[];
};

export type MarketQuestionsView = {
  threads: MarketQuestionThread[];
  activeAgents: Agent[];
};

// === Admin ===

export type AdminSummary = {
  roomName: string;
  agentCount: number;
  activeAgentCount: number;
  snapshotCount: number;
  eventCount: number;
  messageCount: number;
  memoryUpdateCount: number;
  marketCaseCount: number;
  forecastCount: number;
  resolvedForecastCount: number;
  evaluationCount: number;
  trainingExampleCount: number;
  openAiConfigured: boolean;
  scheduledDiscussionsEnabled: boolean;
  schedulerCooldownMinutes: number;
  schedulerPrompt: string;
};

export type UpdateAgentInput = {
  name: string;
  bio: string;
  systemPrompt: string;
  memorySummary: string;
  active: boolean;
};

// === Knowledge Processing & Market Cases ===
// Knowledge files are processed into distilled markdown and analog market cases.
// Retrieval uses text-based scoring (knowledgeSnippetService) over distilled_markdown.
// The external vector store (agents.vector_store_id) is a separate retrieval path.

export type KnowledgeCategory =
  | "foundations"
  | "frameworks"
  | "event_playbooks"
  | "instrument_guides"
  | "house_view_notes";

export type AgentKnowledgeFile = {
  id: string;
  fileId: string;
  filename: string;
  category: string;
  status: string;
  governanceTier?: "active" | "fallback" | "legacy";
  governanceSource?: "manual" | "derived";
  governanceReason?: string;
  governancePriority?: number;
  title?: string | null;
  summary?: string | null;
  usageBytes: number | null;
  createdAt: string | null;
  lastError: string | null;
};

export type AgentKnowledgeStore = {
  agentId: string;
  agentName: string;
  sector: string;
  vectorStoreId: string | null;
  files: AgentKnowledgeFile[];
};

export type KnowledgeProcessingArtifact = {
  sourceFilename: string;
  processedFilename: string;
  title: string;
  summary: string;
  marketCaseCount: number;
};

export type KnowledgeProcessingResult = {
  agent: Agent;
  knowledgeStore: AgentKnowledgeStore;
  processingModel: string;
  processedFileCount: number;
  createdMarketCaseCount: number;
  artifacts: KnowledgeProcessingArtifact[];
};

export type KnowledgeProcessingJobStatus = "queued" | "running" | "completed" | "failed";
export type KnowledgeProcessingJobItemStatus = "pending" | "running" | "completed" | "failed";
export type KnowledgeProcessingReviewStatus = "pending" | "approved" | "rejected";

export type KnowledgeProcessingJobItem = {
  id: string;
  jobId: string;
  sourceFilename: string;
  status: KnowledgeProcessingJobItemStatus;
  processedFilename: string | null;
  title: string | null;
  summary: string | null;
  marketCaseCount: number;
  distilledMarkdown: string | null;
  marketCases: CreateMarketCaseInput[];
  reviewStatus: KnowledgeProcessingReviewStatus | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  persistedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeProcessingJob = {
  id: string;
  agentId: string;
  category: KnowledgeCategory;
  status: KnowledgeProcessingJobStatus;
  processingModel: string;
  totalFiles: number;
  processedFiles: number;
  completedFiles: number;
  failedFiles: number;
  lastError: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  items: KnowledgeProcessingJobItem[];
};

// Analog case memory: historical market regimes and playbooks extracted from knowledge files.
export type MarketCase = {
  id: string;
  agentId: string;
  title: string;
  dateLabel: string;
  regimeTags: string[];
  marketContext: string;
  patternSummary: string;
  implicationNote: string;
  outcomeNote: string;
  sourceLabel: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateMarketCaseInput = {
  title: string;
  dateLabel: string;
  regimeTags: string[];
  marketContext: string;
  patternSummary: string;
  implicationNote: string;
  outcomeNote: string;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
};

// === Learning Loop (Forecasts, Outcomes, Evaluations, Training) ===
// Forecasts are created per message, resolved against future snapshots.
// Outcomes drive training example creation. Evaluations score message quality.

export type ForecastSignal = "up" | "down" | "flat";
export type ForecastStatus = "pending" | "resolved";
export type ForecastOutcomeLabel = "correct" | "partial" | "incorrect";
export type TrainingExampleLabel = "good" | "bad";

export type AgentForecast = {
  id: string;
  agentId: string;
  eventId: string;
  messageId: string;
  snapshotId: string;
  targetInstrumentKey: string;
  targetInstrumentLabel: string;
  horizon: string;
  signal: ForecastSignal;
  confidence: number;
  thesis: string;
  status: ForecastStatus;
  createdAt: string;
  resolvedAt: string | null;
};

export type ForecastOutcome = {
  id: string;
  forecastId: string;
  evaluationSnapshotId: string;
  actualDirection: ForecastSignal;
  actualMove: string;
  score: number;
  label: ForecastOutcomeLabel;
  notes: string;
  createdAt: string;
};

export type AgentEvaluation = {
  id: string;
  agentId: string;
  eventId: string;
  messageId: string;
  clarityScore: number;
  specificityScore: number;
  actionabilityScore: number;
  distinctivenessScore: number;
  overallScore: number;
  strengths: string;
  weaknesses: string;
  createdAt: string;
};

export type TrainingExample = {
  id: string;
  agentId: string;
  forecastId: string;
  evaluationId: string;
  outcomeId: string;
  label: TrainingExampleLabel;
  inputContextJson: string;
  responseText: string;
  feedbackSummary: string;
  createdAt: string;
};

export type AgentLearningView = {
  forecasts: AgentForecast[];
  outcomes: ForecastOutcome[];
  evaluations: AgentEvaluation[];
  trainingExamples: TrainingExample[];
};

export type LearningRefreshResult = {
  resolvedForecastCount: number;
  createdTrainingExampleCount: number;
  latestSnapshotId: string | null;
};

// Join view used by authorMemoryService to build the agent's track record summary.
export type ForecastWithOutcome = {
  forecastId: string;
  agentId: string;
  targetInstrumentKey: string;
  targetInstrumentLabel: string;
  signal: ForecastSignal;
  confidence: number;
  thesis: string;
  createdAt: string;
  resolvedAt: string | null;
  outcomeLabel: ForecastOutcomeLabel | null;
  outcomeScore: number | null;
  actualDirection: ForecastSignal | null;
  actualMove: string | null;
  evalOverallScore: number | null;
};

// === Author Memory (prompt context built fresh from learning history) ===
// AuthorMemoryContext is computed per discussion run from forecasts, training examples,
// and theses. It is NOT persisted — it assembles prompt text from up-to-date D1 sources.

export type AuthorMemoryContext = {
  trackRecord: string;
  calibrationNotes: string;
  recentAccuracy: string;
  behavioralGuidance: string;
  openTheses: string;
  overusedThemes: string;
};

// === Dynamic Memory (Phase 1) ===
// Compact rolling memory layer built from existing system state.
// Only houseView is persisted to agents.memory_summary in phase 1.
// The other blocks are derived fresh at prompt time.

export type DynamicMemoryContext = {
  houseView: string;
  openTheses: string;
  strongTopics: string;
  weakTopics: string;
  calibration: string;
};

// === Agent Behavioral Summary (control signals, refreshed post-run) ===
// Persisted to agent_state_features table after each discussion run.
// Contains aggregated behavioral signals: theme overuse, hit rates, confidence bias,
// topics to deprioritize/revisit. Used by novelty scorer and decision engine.

export type AgentBehavioralSummary = {
  agentId: string;
  activeThesisCount: number;
  openTopics: string[];
  recentThemeCounts: Record<string, number>;
  recentCatalystCounts: Record<string, number>;
  recentPostModes: Record<string, number>;
  recentlyOverusedFrames: string[];
  last20HitRate: number | null;
  last20LowValuePostRate: number | null;
  confidenceBiasScore: number | null;
  topicsToDeprioritize: string[];
  topicsToRevisit: string[];
  recentDisagreementTargets: string[];
  avgNoveltyScore7d: number | null;
  lastUpdatedAt: string;
};

// === Room Coverage Memory ===
// Persisted to room_coverage_state (single row per room) after each discussion run.
// Tracks theme/sector saturation and unresolved theses across the room.
// Note: a separate ephemeral recentRoomCoverage Map (12-thread window) runs inside
// each discussion run to catch same-run repeats — these serve different time horizons.

export type RoomCoverageState = {
  roomId: string;
  themeCounts: Record<string, number>;
  catalystCounts: Record<string, number>;
  sectorCoverage: Record<string, number>;
  undercoveredTopics: string[];
  overcoveredTopics: string[];
  disagreementMap: Record<string, string[]>;
  unresolvedMajorThemes: Array<{
    topicPrimary: string;
    thesisTitle: string;
    status: string;
    ageDays: number;
  }>;
  postDensityBySector: Record<string, number>;
  latestRefreshedAt: string;
};

// === Posting Decisions & Novelty Scoring ===
// Computed pre-generation for each agent. Stored as JSON on the messages table
// (novelty_assessment_json, posting_decision_json) when a message is created.
// Silent/comment-only decisions are also logged to decision_event_log for traceability.

export type PostingReasonCode =
  | "novelty_above_threshold"
  | "novelty_below_threshold"
  | "low_novelty_range"
  | "matched_thesis_update"
  | "fresh_catalyst_signal"
  | "undercoverage_opportunity"
  | "unresolved_thesis_nudge"
  | "overcovered_topic_penalty"
  | "no_fresh_signal"
  | "deprioritized_topic"
  | "high_thesis_load"
  | "stale_agent_thesis"
  // Headline analysis gate codes (added with headline-analysis layer)
  | "headline_noise_gate"
  | "low_headline_relevance"
  | "stale_headline_no_thesis"
  | "stale_headline_thesis_update"
  | "headline_routed_to_comment"
  | "run_catalyst_claimed"
  // Macro materiality gate — agent silenced due to low novelty within cooldown window
  | "macro_low_novelty_cooldown";

export type PostingDecision = {
  actionType: "new_post" | "update_existing" | "comment_only" | "stay_silent";
  targetThesisId: string | null;
  targetPostId: string | null;
  reasonCodes: PostingReasonCode[];
  suggestedTopic: {
    themeKey: string;
    label: string;
    catalyst: string;
  };
  suggestedCommentPurpose: string | null;
  noveltyScore: number;
  decidedAt: string;
};

export type NoveltyAssessment = {
  themeNovelty: number;
  catalystNovelty: number;
  stanceNovelty: number;
  framingNovelty: number;
  sectorRepetitionPenalty: number;
  undercoverageBonus: boolean;
  unresolvedThesisBonus: boolean;
  freshCatalystBonus: boolean;
  compositeScore: number;
  policyBucket: "new_post" | "update_existing" | "comment_only" | "stay_silent";
  scoringInputs: {
    candidateThemeKey: string;
    candidateCatalyst: string;
    recentThemeKeys: string[];
    recentCatalysts: string[];
    recentStances: Array<{ themeKey: string; stance: string }>;
    roomOvercoveredTopics: string[];
    roomUndercoveredTopics: string[];
    agentRecentThemeCounts: Record<string, number>;
  };
};

// === Decision Event Log ===
// Persisted to decision_event_log for every agent decision each run,
// including stay_silent and comment_only (where no message is created).
// message_id is null when no message was generated.

export type DecisionLogEntry = {
  id: string;
  agentId: string;
  roomId: string;
  actionType: "new_post" | "update_existing" | "comment_only" | "stay_silent";
  reasonCodes: PostingReasonCode[];
  noveltyScore: number | null;
  candidateThemeKey: string | null;
  targetThesisId: string | null;
  messageId: string | null;
  decidedAt: string;
  /** Serialized HeadlineAnalysis object. Shape mirrors a future SQL table (flat, snake_case keys). */
  headlineAnalysisJson: string | null;
};

// === Discussion Run ===

export type TrainingExamplesExportGroupBy = "all" | "agent";

export type DiscussionRun = {
  id: string;
  roomId: string;
  prompt: string;
  snapshotId: string;
  eventId: string;
  createdAt: string;
  status: "completed" | "failed";
  messages: DiscussionMessage[];
  threads: AgentDiscussionThread[];
};

export type ScheduledRunResult = {
  status: "disabled" | "skipped" | "triggered";
  reason: string;
  snapshotId?: string;
  materialityReasons: string[];
  discussion?: DiscussionRun;
};

export const roomSeed: Room = {
  id: "market-room",
  name: "Market Room",
  description: "A shared room where specialist finance agents discuss the market together."
};

const initialSeedTimestamp = "2026-04-04T00:00:00.000Z";

export const starterAgents: AgentProfile[] = [
  {
    id: "macro-agent",
    name: "Macro Agent",
    slug: "macro-agent",
    sector: "Macro",
    bio: "Tracks the big picture across rates, inflation, policy, and global risk.",
    avatarUrl: "/avatars/macro-agent.svg",
    systemPrompt:
      "You are Macro Agent inside Market Room. Speak like a sharp macro strategist. Focus on inflation, central banks, rates, FX, liquidity, and cross-asset risk. Give a clear view, explain what could invalidate it, and connect your thinking to the other agents.",
    memorySummary:
      "Starts from policy and liquidity first, treats rate repricing as a major driver, and usually frames the market through inflation pressure versus growth slowdown.",
    vectorStoreId: null,
    active: true,
    createdAt: initialSeedTimestamp,
    updatedAt: initialSeedTimestamp
  },
  {
    id: "equities-agent",
    name: "Equities Agent",
    slug: "equities-agent",
    sector: "Equities",
    bio: "Focuses on public equities, earnings narratives, sector rotation, and sentiment.",
    avatarUrl: "/avatars/equities-agent.svg",
    systemPrompt:
      "You are Equities Agent inside Market Room. Think like a public-markets investor. Focus on earnings quality, valuation pressure, leadership breadth, sector rotation, and risk appetite. Keep your answer crisp and useful for a market discussion.",
    memorySummary:
      "Usually interprets the tape through earnings revisions, margin durability, and whether leadership is broadening or narrowing under pressure.",
    vectorStoreId: null,
    active: true,
    createdAt: initialSeedTimestamp,
    updatedAt: initialSeedTimestamp
  },
  {
    id: "commodities-agent",
    name: "Commodities Agent",
    slug: "commodities-agent",
    sector: "Commodities",
    bio: "Looks at oil, metals, supply shocks, and commodity-linked inflation signals.",
    avatarUrl: "/avatars/commodities-agent.svg",
    systemPrompt:
      "You are Commodities Agent inside Market Room. Think like a cross-commodity analyst. Focus on oil, metals, physical supply, inventories, and geopolitical shocks. Explain how commodity moves feed into inflation, margins, and broader market sentiment.",
    memorySummary:
      "Anchors views in physical market tightness, inventory direction, and supply shocks, with a habit of translating commodity moves into inflation and equity implications.",
    vectorStoreId: null,
    active: true,
    createdAt: initialSeedTimestamp,
    updatedAt: initialSeedTimestamp
  },
  {
    id: "fx-agent",
    name: "FX Agent",
    slug: "fx-agent",
    sector: "FX",
    bio: "Tracks the dollar, major currency crosses, and how policy divergence travels across markets.",
    avatarUrl: "/avatars/fx-agent.svg",
    systemPrompt:
      "You are FX Agent inside Market Room. Think like a macro-FX strategist. Focus on the dollar, major currency crosses, policy divergence, real-rate differentials, carry, and cross-border transmission into commodities, equities, and risk appetite.",
    memorySummary:
      "Usually frames moves through dollar direction, policy divergence, and whether FX is tightening or easing broader financial conditions.",
    vectorStoreId: null,
    active: true,
    createdAt: initialSeedTimestamp,
    updatedAt: initialSeedTimestamp
  },
  {
    id: "rates-agent",
    name: "Rates Agent",
    slug: "rates-agent",
    sector: "Rates",
    bio: "Focuses on Treasury yields, duration, curve moves, and policy repricing.",
    avatarUrl: "/avatars/rates-agent.svg",
    systemPrompt:
      "You are Rates Agent inside Market Room. Think like a rates strategist. Focus on Treasury yields, curve shape, duration pressure, inflation expectations, Fed repricing, and what rate moves mean for other assets. Keep your take crisp and cross-asset aware.",
    memorySummary:
      "Usually interprets the market through yield repricing, curve signals, and whether duration is tightening or loosening conditions for risk assets.",
    vectorStoreId: null,
    active: true,
    createdAt: initialSeedTimestamp,
    updatedAt: initialSeedTimestamp
  },
  {
    id: "risk-sentiment-agent",
    name: "Risk/Sentiment Agent",
    slug: "risk-sentiment-agent",
    sector: "Risk/Sentiment",
    bio: "Reads positioning, risk appetite, and whether the tape looks calm, crowded, or fragile.",
    avatarUrl: "/avatars/risk-sentiment-agent.svg",
    systemPrompt:
      "You are Risk/Sentiment Agent inside Market Room. Think like a cross-asset positioning and sentiment analyst. Focus on risk-on versus risk-off behavior, leadership quality, crowding, defensiveness, momentum, and whether the tape looks resilient or fragile.",
    memorySummary:
      "Usually translates price action into positioning, crowding, and whether sentiment is broadening, complacent, or starting to crack.",
    vectorStoreId: null,
    active: true,
    createdAt: initialSeedTimestamp,
    updatedAt: initialSeedTimestamp
  }
];
