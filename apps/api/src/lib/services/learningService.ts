import type {
  AgentEvaluation,
  AgentForecast,
  AgentLearningView,
  AgentMessage,
  ForecastOutcome,
  ForecastSignal,
  LearningRefreshResult,
  MarketEvent,
  MarketSnapshot,
  MarketSnapshotPayload,
  TrainingExample,
  TrainingExampleLabel
} from "@market-room/shared";
import type { Env } from "../../index";
import { generateGeminiContent, getLlmModel, isLlmConfigured } from "../gemini";
import { parseStructuredResponseJson } from "../openAiResponses";
import { createRepositories } from "../repositories";

const instrumentUniverse = [
  "sp500",
  "nasdaq",
  "wti",
  "brent",
  "natural_gas",
  "copper",
  "gold",
  "dxy",
  "us10y"
] as const;

type InstrumentKey = (typeof instrumentUniverse)[number];

export async function recordDiscussionLearning({
  env,
  event,
  snapshot,
  marketSnapshot,
  messages
}: {
  env: Env;
  event: MarketEvent;
  snapshot: MarketSnapshot;
  marketSnapshot: MarketSnapshotPayload;
  messages: AgentMessage[];
}): Promise<void> {
  await resolvePendingForecastsAgainstSnapshot(env, snapshot, marketSnapshot);

  for (const message of messages) {
    const forecast = await buildAgentForecast(env, event, snapshot, marketSnapshot, message);
    await createRepositories(env).agentForecasts.create(forecast);

    const evaluation = await buildAgentEvaluation(env, event, marketSnapshot, message);
    await createRepositories(env).agentEvaluations.create(evaluation);
  }
}

export async function refreshLearningSignals(env: Env): Promise<LearningRefreshResult> {
  const repositories = createRepositories(env);
  const latestSnapshot = await repositories.marketSnapshots.getLatest();
  const latestSnapshotPayload = parseSnapshotPayload(latestSnapshot);

  if (!latestSnapshot || !latestSnapshotPayload) {
    return {
      resolvedForecastCount: 0,
      createdTrainingExampleCount: 0,
      latestSnapshotId: null
    };
  }

  const resolutionResult = await resolvePendingForecastsAgainstSnapshot(env, latestSnapshot, latestSnapshotPayload);
  const backfilledTrainingExampleCount = await backfillTrainingExamples(env);

  return {
    resolvedForecastCount: resolutionResult.resolvedForecastCount,
    createdTrainingExampleCount:
      resolutionResult.createdTrainingExampleCount + backfilledTrainingExampleCount,
    latestSnapshotId: resolutionResult.latestSnapshotId
  };
}

export async function getAgentLearningView(env: Env, agentId: string): Promise<AgentLearningView | null> {
  const repositories = createRepositories(env);
  const agent = await repositories.agents.getById(agentId);

  if (!agent) {
    return null;
  }

  const [forecasts, outcomes, evaluations, trainingExamples] = await Promise.all([
    repositories.agentForecasts.listByAgent(agentId),
    repositories.forecastOutcomes.listByAgent(agentId),
    repositories.agentEvaluations.listByAgent(agentId),
    repositories.trainingExamples.listByAgent(agentId)
  ]);

  return {
    forecasts,
    outcomes,
    evaluations,
    trainingExamples
  };
}

async function buildAgentForecast(
  env: Env,
  event: MarketEvent,
  snapshot: MarketSnapshot,
  marketSnapshot: MarketSnapshotPayload,
  message: AgentMessage
): Promise<AgentForecast> {
  const extracted = isLlmConfigured(env)
    ? await extractForecastWithOpenAi(env, marketSnapshot, message)
    : null;
  const fallback = buildFallbackForecast(message, marketSnapshot);
  const createdAt = new Date().toISOString();
  const targetInstrumentKey: InstrumentKey =
    normalizeInstrumentKey(extracted?.targetInstrumentKey) || fallback.targetInstrumentKey;

  return {
    id: crypto.randomUUID(),
    agentId: message.agentId,
    eventId: event.id,
    messageId: message.id,
    snapshotId: snapshot.id,
    targetInstrumentKey,
    targetInstrumentLabel: instrumentLabelFor(targetInstrumentKey),
    horizon: "next_snapshot",
    signal: extracted?.signal || fallback.signal,
    confidence: clampConfidence(extracted?.confidence ?? message.confidence ?? 0.65),
    thesis: trimSentence(extracted?.thesis || fallback.thesis, 40),
    status: "pending",
    createdAt,
    resolvedAt: null
  };
}

async function buildAgentEvaluation(
  env: Env,
  event: MarketEvent,
  marketSnapshot: MarketSnapshotPayload,
  message: AgentMessage
): Promise<AgentEvaluation> {
  const extracted = isLlmConfigured(env)
    ? await evaluateMessageWithOpenAi(env, marketSnapshot, message)
    : null;
  const fallback = buildFallbackEvaluation(message);

  return {
    id: crypto.randomUUID(),
    agentId: message.agentId,
    eventId: event.id,
    messageId: message.id,
    clarityScore: clampScore(extracted?.clarityScore ?? fallback.clarityScore),
    specificityScore: clampScore(extracted?.specificityScore ?? fallback.specificityScore),
    actionabilityScore: clampScore(extracted?.actionabilityScore ?? fallback.actionabilityScore),
    distinctivenessScore: clampScore(extracted?.distinctivenessScore ?? fallback.distinctivenessScore),
    overallScore: clampScore(extracted?.overallScore ?? fallback.overallScore),
    strengths: trimSentence(extracted?.strengths || fallback.strengths, 35),
    weaknesses: trimSentence(extracted?.weaknesses || fallback.weaknesses, 35),
    createdAt: new Date().toISOString()
  };
}

async function resolvePendingForecastsAgainstSnapshot(
  env: Env,
  evaluationSnapshot: MarketSnapshot,
  evaluationSnapshotPayload: MarketSnapshotPayload
): Promise<LearningRefreshResult> {
  const repositories = createRepositories(env);
  const pendingForecasts = await repositories.agentForecasts.listPending();
  let resolvedForecastCount = 0;
  let createdTrainingExampleCount = 0;

  for (const forecast of pendingForecasts) {
    if (forecast.snapshotId === evaluationSnapshot.id) {
      continue;
    }

    const baselineSnapshot = await repositories.marketSnapshots.getById(forecast.snapshotId);
    const baselinePayload = parseSnapshotPayload(baselineSnapshot);

    if (!baselineSnapshot || !baselinePayload) {
      continue;
    }

    const outcome = buildForecastOutcome(forecast, baselinePayload, evaluationSnapshot, evaluationSnapshotPayload);

    if (!outcome) {
      continue;
    }

    await repositories.forecastOutcomes.create(outcome);
    await repositories.agentForecasts.markResolved(forecast.id, outcome.createdAt);
    resolvedForecastCount += 1;

    const evaluation = await repositories.agentEvaluations.getByMessageId(forecast.messageId);
    const existingExample = await repositories.trainingExamples.getByForecastId(forecast.id);
    const message = await repositories.messages.getById(forecast.messageId);

    if (!evaluation || !message || existingExample) {
      continue;
    }

    const createdExample = await createTrainingExampleIfEligible(
      env,
      forecast,
      baselineSnapshot.id,
      evaluationSnapshot.id,
      outcome,
      evaluation,
      message.content
    );

    if (createdExample) {
      createdTrainingExampleCount += 1;
    }
  }

  return {
    resolvedForecastCount,
    createdTrainingExampleCount,
    latestSnapshotId: evaluationSnapshot.id
  };
}

async function backfillTrainingExamples(env: Env): Promise<number> {
  const repositories = createRepositories(env);
  const resolvedForecasts = await repositories.agentForecasts.listResolved();
  let createdTrainingExampleCount = 0;

  for (const forecast of resolvedForecasts) {
    const [outcome, evaluation, message] = await Promise.all([
      repositories.forecastOutcomes.getByForecastId(forecast.id),
      repositories.agentEvaluations.getByMessageId(forecast.messageId),
      repositories.messages.getById(forecast.messageId)
    ]);

    if (!outcome || !evaluation || !message) {
      continue;
    }

    const normalizedOutcome = await normalizeResolvedOutcome(env, forecast, outcome);
    const createdExample = await createTrainingExampleIfEligible(
      env,
      forecast,
      forecast.snapshotId,
      normalizedOutcome.evaluationSnapshotId,
      normalizedOutcome,
      evaluation,
      message.content
    );

    if (createdExample) {
      createdTrainingExampleCount += 1;
    }
  }

  return createdTrainingExampleCount;
}

function buildForecastOutcome(
  forecast: AgentForecast,
  baselineSnapshot: MarketSnapshotPayload,
  evaluationSnapshot: MarketSnapshot,
  evaluationSnapshotPayload: MarketSnapshotPayload
): ForecastOutcome | null {
  const baselineInstrument = baselineSnapshot.instruments.find(
    (instrument) => instrument.key === forecast.targetInstrumentKey
  );
  const evaluationInstrument = evaluationSnapshotPayload.instruments.find(
    (instrument) => instrument.key === forecast.targetInstrumentKey
  );

  const baselineValue = parseInstrumentNumber(baselineInstrument?.value);
  const evaluationValue = parseInstrumentNumber(evaluationInstrument?.value);

  if (baselineValue === null || evaluationValue === null) {
    return null;
  }

  const actual = actualDirectionFor(forecast.targetInstrumentKey as InstrumentKey, baselineValue, evaluationValue);
  const score = outcomeScoreFor(forecast.signal, actual.direction);
  const label = outcomeLabelFor(forecast.signal, actual.direction, score);

  return {
    id: crypto.randomUUID(),
    forecastId: forecast.id,
    evaluationSnapshotId: evaluationSnapshot.id,
    actualDirection: actual.direction,
    actualMove: actual.moveText,
    score,
    label,
    notes: buildOutcomeNote(forecast, actual.direction, actual.moveText),
    createdAt: new Date().toISOString()
  };
}

async function extractForecastWithOpenAi(
  env: Env,
  marketSnapshot: MarketSnapshotPayload,
  message: AgentMessage
): Promise<{
  targetInstrumentKey: string;
  signal: ForecastSignal;
  confidence: number;
  thesis: string;
} | null> {
  try {
    const payload = await generateGeminiContent(env, {
      model: getLlmModel(env),
      instructions:
        "Extract one short-term forecast from the agent message. Choose the single instrument that best represents the agent's thesis and predict its direction into the next saved market snapshot.",
      prompt: [
        `Agent sector: ${message.sector}`,
        `Agent stance: ${message.stance || "none"}`,
        `Message: ${message.content}`,
        "Available instruments:",
        ...marketSnapshot.instruments.map(
          (instrument) => `${instrument.key}: ${instrument.label} ${instrument.value} ${instrument.change || ""}`
        )
      ].join("\n"),
      maxOutputTokens: 220,
      temperature: 0.1,
      responseSchema: {
        type: "object",
        properties: {
          targetInstrumentKey: {
            type: "string",
            enum: [...instrumentUniverse]
          },
          signal: {
            type: "string",
            enum: ["up", "down", "flat"]
          },
          confidence: {
            type: "number"
          },
          thesis: {
            type: "string"
          }
        },
        required: ["targetInstrumentKey", "signal", "confidence", "thesis"]
      }
    });

    return parseStructuredResponseJson(payload);
  } catch {
    return null;
  }
}

async function evaluateMessageWithOpenAi(
  env: Env,
  marketSnapshot: MarketSnapshotPayload,
  message: AgentMessage
): Promise<{
  clarityScore: number;
  specificityScore: number;
  actionabilityScore: number;
  distinctivenessScore: number;
  overallScore: number;
  strengths: string;
  weaknesses: string;
} | null> {
  try {
    const payload = await generateGeminiContent(env, {
      model: getLlmModel(env),
      instructions:
        "Score the market-room message for training quality. Focus on clarity, specificity, actionability, and how distinct the sector view sounds.",
      prompt: [
        `Sector: ${message.sector}`,
        `Stance: ${message.stance || "none"}`,
        `Message: ${message.content}`,
        `Snapshot headline: ${marketSnapshot.headline}`
      ].join("\n"),
      maxOutputTokens: 260,
      temperature: 0.1,
      responseSchema: {
        type: "object",
        properties: {
          clarityScore: { type: "number" },
          specificityScore: { type: "number" },
          actionabilityScore: { type: "number" },
          distinctivenessScore: { type: "number" },
          overallScore: { type: "number" },
          strengths: { type: "string" },
          weaknesses: { type: "string" }
        },
        required: [
          "clarityScore",
          "specificityScore",
          "actionabilityScore",
          "distinctivenessScore",
          "overallScore",
          "strengths",
          "weaknesses"
        ]
      }
    });

    return parseStructuredResponseJson(payload);
  } catch {
    return null;
  }
}

function buildFallbackForecast(
  message: AgentMessage,
  marketSnapshot: MarketSnapshotPayload
): {
  targetInstrumentKey: InstrumentKey;
  signal: ForecastSignal;
  thesis: string;
} {
  const targetInstrumentKey = fallbackInstrumentForSector(message.sector);
  const lower = message.content.toLowerCase();

  if (lower.includes("fragile") || lower.includes("pressure") || lower.includes("tight")) {
    return {
      targetInstrumentKey,
      signal: "down",
      thesis: `Expect ${instrumentLabelFor(targetInstrumentKey)} to stay under pressure into the next snapshot.`
    };
  }

  if (lower.includes("firm") || lower.includes("resilient") || lower.includes("improving")) {
    return {
      targetInstrumentKey,
      signal: "up",
      thesis: `Expect ${instrumentLabelFor(targetInstrumentKey)} to stay firm into the next snapshot.`
    };
  }

  return {
    targetInstrumentKey,
    signal: message.stance === "selective" ? "up" : message.stance === "cautious" || message.stance === "defensive" ? "down" : "flat",
    thesis: `Use the ${message.sector} view as a short-term signal for ${instrumentLabelFor(targetInstrumentKey)}.`
  };
}

function buildFallbackEvaluation(
  message: AgentMessage
): Pick<
  AgentEvaluation,
  "clarityScore" | "specificityScore" | "actionabilityScore" | "distinctivenessScore" | "overallScore" | "strengths" | "weaknesses"
> {
  const lower = message.content.toLowerCase();
  const hasNumbers = /\d/.test(message.content);
  const clarityScore = message.content.length > 80 ? 0.72 : 0.58;
  const specificityScore = hasNumbers ? 0.74 : 0.5;
  const actionabilityScore = lower.includes("watch") || lower.includes("because") ? 0.68 : 0.54;
  const distinctivenessScore = lower.includes(message.sector.toLowerCase()) ? 0.7 : 0.56;
  const overallScore = clampScore(
    (clarityScore + specificityScore + actionabilityScore + distinctivenessScore) / 4
  );

  return {
    clarityScore,
    specificityScore,
    actionabilityScore,
    distinctivenessScore,
    overallScore,
    strengths: hasNumbers
      ? "Uses concrete market references and keeps the view readable."
      : "Readable but still broadly framed.",
    weaknesses: !hasNumbers
      ? "Needs more concrete market markers and sharper specificity."
      : "Could still sharpen the implied trade or trigger."
  };
}

function fallbackInstrumentForSector(sector: string): InstrumentKey {
  switch (sector) {
    case "Macro":
      return "us10y";
    case "Equities":
      return "sp500";
    case "Commodities":
      return "wti";
    case "FX":
      return "dxy";
    case "Rates":
      return "us10y";
    case "Risk/Sentiment":
      return "nasdaq";
    default:
      return "sp500";
  }
}

function instrumentLabelFor(key: InstrumentKey): string {
  const map: Record<InstrumentKey, string> = {
    sp500: "S&P 500",
    nasdaq: "Nasdaq",
    wti: "WTI crude",
    brent: "Brent crude",
    natural_gas: "Natural gas",
    copper: "Copper",
    gold: "Gold",
    dxy: "DXY",
    us10y: "US 10Y yield"
  };

  return map[key];
}

function normalizeInstrumentKey(value?: string | null): InstrumentKey | null {
  return instrumentUniverse.includes(value as InstrumentKey) ? (value as InstrumentKey) : null;
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

function parseInstrumentNumber(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return normalized ? Number(normalized[0]) : null;
}

function actualDirectionFor(
  instrumentKey: InstrumentKey,
  baselineValue: number,
  evaluationValue: number
): {
  direction: ForecastSignal;
  moveText: string;
} {
  if (instrumentKey === "us10y") {
    const deltaBps = (evaluationValue - baselineValue) * 100;
    const direction: ForecastSignal =
      Math.abs(deltaBps) < 2 ? "flat" : deltaBps > 0 ? "up" : "down";
    return {
      direction,
      moveText: `${deltaBps >= 0 ? "+" : ""}${deltaBps.toFixed(1)} bps`
    };
  }

  if (baselineValue === 0) {
    return {
      direction: "flat",
      moveText: "0.00%"
    };
  }

  const relativeMovePct = ((evaluationValue - baselineValue) / Math.abs(baselineValue)) * 100;
  const direction: ForecastSignal =
    Math.abs(relativeMovePct) < 0.35 ? "flat" : relativeMovePct > 0 ? "up" : "down";

  return {
    direction,
    moveText: `${relativeMovePct >= 0 ? "+" : ""}${relativeMovePct.toFixed(2)}%`
  };
}

function outcomeScoreFor(predicted: ForecastSignal, actual: ForecastSignal): number {
  if (predicted === actual) {
    return actual === "flat" ? 0.75 : 1;
  }

  if (predicted === "flat" || actual === "flat") {
    return 0.5;
  }

  return 0.1;
}

function outcomeLabelFor(
  predicted: ForecastSignal,
  actual: ForecastSignal,
  score: number
): ForecastOutcome["label"] {
  if (predicted === actual) {
    return "correct";
  }

  if (score >= 0.8) {
    return "correct";
  }

  if (score >= 0.45) {
    return "partial";
  }

  return "incorrect";
}

function buildOutcomeNote(
  forecast: AgentForecast,
  actualDirection: ForecastSignal,
  actualMove: string
): string {
  if (forecast.signal === actualDirection) {
    return `The forecast matched the next snapshot: ${forecast.targetInstrumentLabel} moved ${actualMove}.`;
  }

  if (forecast.signal === "flat" || actualDirection === "flat") {
    return `The forecast was only partially aligned: ${forecast.targetInstrumentLabel} moved ${actualMove}.`;
  }

  return `The forecast missed the next snapshot: ${forecast.targetInstrumentLabel} moved ${actualMove} against the predicted direction.`;
}

function trainingLabelFor(
  forecast: AgentForecast,
  evaluation: AgentEvaluation,
  outcome: ForecastOutcome
): TrainingExampleLabel | null {
  if (
    evaluation.overallScore >= 0.67 &&
    (outcome.label === "correct" || (forecast.signal === outcome.actualDirection && outcome.score >= 0.75))
  ) {
    return "good";
  }

  if (outcome.label === "incorrect") {
    return "bad";
  }

  if (
    outcome.label === "partial" &&
    evaluation.overallScore < 0.69 &&
    (evaluation.actionabilityScore < 0.6 || evaluation.specificityScore < 0.65)
  ) {
    return "bad";
  }

  return null;
}

function buildTrainingFeedbackSummary(
  evaluation: AgentEvaluation,
  outcome: ForecastOutcome
): string {
  return [
    `Outcome: ${outcome.label} (${outcome.actualMove}).`,
    `Strengths: ${evaluation.strengths}`,
    `Weaknesses: ${evaluation.weaknesses}`
  ].join(" ");
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function clampConfidence(value: number): number {
  return clampScore(value);
}

function trimSentence(value: string, maxWords: number): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length <= maxWords ? value.trim() : `${words.slice(0, maxWords).join(" ")}...`;
}

async function createTrainingExampleIfEligible(
  env: Env,
  forecast: AgentForecast,
  baselineSnapshotId: string,
  evaluationSnapshotId: string,
  outcome: ForecastOutcome,
  evaluation: AgentEvaluation,
  responseText: string
): Promise<boolean> {
  const repositories = createRepositories(env);
  const existingExample = await repositories.trainingExamples.getByForecastId(forecast.id);
  const label = trainingLabelFor(forecast, evaluation, outcome);

  if (!label) {
    return false;
  }

  const example: TrainingExample = {
    id: crypto.randomUUID(),
    agentId: forecast.agentId,
    forecastId: forecast.id,
    evaluationId: evaluation.id,
    outcomeId: outcome.id,
    label,
    inputContextJson: JSON.stringify(
      {
        targetInstrumentKey: forecast.targetInstrumentKey,
        targetInstrumentLabel: forecast.targetInstrumentLabel,
        horizon: forecast.horizon,
        signal: forecast.signal,
        baselineSnapshotId,
        evaluationSnapshotId,
        thesis: forecast.thesis
      },
      null,
      2
    ),
    responseText,
    feedbackSummary: buildTrainingFeedbackSummary(evaluation, outcome),
    createdAt: new Date().toISOString()
  };

  await repositories.trainingExamples.create(example);
  return !existingExample || existingExample.label !== label || existingExample.feedbackSummary !== example.feedbackSummary;
}

async function normalizeResolvedOutcome(
  env: Env,
  forecast: AgentForecast,
  outcome: ForecastOutcome
): Promise<ForecastOutcome> {
  const repositories = createRepositories(env);
  const normalizedLabel = outcomeLabelFor(forecast.signal, outcome.actualDirection, outcome.score);
  const normalizedNotes = buildOutcomeNote(forecast, outcome.actualDirection, outcome.actualMove);

  if (normalizedLabel !== outcome.label || normalizedNotes !== outcome.notes) {
    await repositories.forecastOutcomes.updateClassification(outcome.id, normalizedLabel, normalizedNotes);
  }

  return {
    ...outcome,
    label: normalizedLabel,
    notes: normalizedNotes
  };
}
