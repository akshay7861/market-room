import type { MarketSnapshot, MarketSnapshotPayload, ScheduledRunResult, SnapshotHeadline, SnapshotInstrument } from "@market-room/shared";
import type { Env } from "../../index";
import { fetchLatestMarketSnapshot } from "../market-data";
import { createRepositories } from "../repositories";
import { getDefaultDiscussionPrompt, runMarketDiscussion } from "./marketRoomService";

export async function runScheduledMarketCheck(
  env: Env,
  source: "cron" | "manual_test" = "cron"
): Promise<ScheduledRunResult> {
  const tickNumber = await incrementAndGetTick(env);
  const synthesisEnabled = parseBooleanEnv(env.SYNTHESIS_ENABLED);
  const synthesisEveryNTicks = Math.max(1, Math.floor(parseNumberEnv(env.SYNTHESIS_EVERY_N_TICKS, 2)));
  const isSynthesisTick = synthesisEnabled && tickNumber % synthesisEveryNTicks === 0;

  console.log(
    `[scheduler-mode] tick=${tickNumber} mode=${isSynthesisTick ? "synthesis" : "reactive"} enabled=${synthesisEnabled} every=${synthesisEveryNTicks}`
  );

  if (isSynthesisTick) {
    return runSynthesisScheduledCheck(env, source, tickNumber);
  }

  return runReactiveScheduledCheck(env, source);
}

async function runReactiveScheduledCheck(
  env: Env,
  source: "cron" | "manual_test" = "cron"
): Promise<ScheduledRunResult> {
  if (!isSchedulerEnabled(env)) {
    return {
      status: "disabled",
      reason: "Scheduled discussions are disabled.",
      materialityReasons: []
    };
  }

  const repositories = createRepositories(env);
  const previousSnapshotRecord = await repositories.marketSnapshots.getLatest();
  const previousSnapshot = parseSnapshotPayload(previousSnapshotRecord);
  const prompt = getSchedulerPrompt(env);
  const latestSnapshot = await fetchLatestMarketSnapshot(env, prompt, {
    previousSnapshot
  });
  const latestDiscussionEvent = await repositories.events.getLatestDiscussionEvent();
  const materiality = evaluateMateriality({
    currentSnapshot: latestSnapshot,
    previousSnapshot,
    lastDiscussionCreatedAt: latestDiscussionEvent?.createdAt || null,
    env
  });

  if (!materiality.shouldTrigger) {
    if (
      !requiresMateriality(env) &&
      !isInsideCooldown(latestDiscussionEvent?.createdAt || null, getSchedulerCooldownMinutes(env))
    ) {
      const discussion = await runMarketDiscussion(env, prompt, {
        triggerMode: "scheduled",
        snapshotPayload: latestSnapshot,
        triggerReason: `${source}:hourly_refresh`,
        materialityReasons: materiality.reasons.length > 0
          ? materiality.reasons
          : ["Hourly scheduled refresh ran without a materiality threshold breach."]
      });

      return {
        status: "triggered",
        reason: "Hourly scheduled discussion ran without requiring a materiality threshold breach.",
        snapshotId: discussion.snapshotId,
        materialityReasons: materiality.reasons,
        discussion
      };
    }

    const savedSnapshot = await saveSnapshotRecord(env, latestSnapshot);

    return {
      status: "skipped",
      reason: materiality.skipReason || "No material change was detected.",
      snapshotId: savedSnapshot.id,
      materialityReasons: materiality.reasons
    };
  }

  const discussion = await runMarketDiscussion(env, prompt, {
    triggerMode: "scheduled",
    snapshotPayload: latestSnapshot,
    triggerReason: source,
    materialityReasons: materiality.reasons
  });

  return {
    status: "triggered",
    reason: "Material market changes triggered a scheduled discussion.",
    snapshotId: discussion.snapshotId,
    materialityReasons: materiality.reasons,
    discussion
  };
}

async function runSynthesisScheduledCheck(
  env: Env,
  source: "cron" | "manual_test" = "cron",
  tickNumber: number
): Promise<ScheduledRunResult> {
  if (!isSchedulerEnabled(env)) {
    return {
      status: "disabled",
      reason: "Scheduled discussions are disabled.",
      materialityReasons: []
    };
  }

  const repositories = createRepositories(env);
  const previousSnapshotRecord = await repositories.marketSnapshots.getLatest();
  const previousSnapshot = parseSnapshotPayload(previousSnapshotRecord);
  const prompt = getSchedulerPrompt(env);
  const latestSnapshot = await fetchLatestMarketSnapshot(env, prompt, {
    previousSnapshot
  });

  const discussion = await runMarketDiscussion(env, prompt, {
    triggerMode: "synthesis",
    snapshotPayload: latestSnapshot,
    triggerReason: `synthesis_tick_${tickNumber}`,
    materialityReasons: [
      `Synthesis cadence tick from ${source}.`,
      "Agents formed forward theses from shared market state and peer desk context."
    ]
  });

  await markSynthesisTickAt(env, new Date().toISOString());

  return {
    status: "triggered",
    reason: "Synthesis tick triggered a thesis-building run.",
    snapshotId: discussion.snapshotId,
    materialityReasons: ["synthesis_tick"],
    discussion
  };
}

export function isSchedulerEnabled(env: Env): boolean {
  return parseBooleanEnv(env.SCHEDULED_DISCUSSIONS_ENABLED);
}

export function requiresMateriality(env: Env): boolean {
  return (env.SCHEDULED_DISCUSSION_REQUIRE_MATERIALITY || "true").toLowerCase() !== "false";
}

export function getSchedulerPrompt(env: Env): string {
  return env.SCHEDULED_DISCUSSION_PROMPT?.trim() || getDefaultDiscussionPrompt();
}

export function getSchedulerCooldownMinutes(env: Env): number {
  return parseNumberEnv(env.SCHEDULED_DISCUSSION_COOLDOWN_MINUTES, 120);
}

async function saveSnapshotRecord(env: Env, snapshotPayload: MarketSnapshotPayload): Promise<MarketSnapshot> {
  const snapshot: MarketSnapshot = {
    id: crypto.randomUUID(),
    snapshotType: snapshotPayload.usedFallback ? "fallback_market_snapshot" : "live_market_snapshot",
    payloadJson: JSON.stringify(snapshotPayload, null, 2),
    createdAt: new Date().toISOString()
  };

  await createRepositories(env).marketSnapshots.create(snapshot);
  return snapshot;
}

function evaluateMateriality({
  currentSnapshot,
  previousSnapshot,
  lastDiscussionCreatedAt,
  env
}: {
  currentSnapshot: MarketSnapshotPayload;
  previousSnapshot: MarketSnapshotPayload | null;
  lastDiscussionCreatedAt: string | null;
  env: Env;
}): {
  shouldTrigger: boolean;
  reasons: string[];
  skipReason?: string;
} {
  const reasons: string[] = [];

  if (!previousSnapshot) {
    reasons.push("No previous snapshot exists yet, so the scheduler is bootstrapping the room.");
  } else {
    if (previousSnapshot.usedFallback !== currentSnapshot.usedFallback) {
      reasons.push("The snapshot moved between fallback mode and live market data.");
    }

    reasons.push(...materialInstrumentReasons(previousSnapshot, currentSnapshot, env));
    reasons.push(...headlineReasons(previousSnapshot.headlines, currentSnapshot.headlines, env));
  }

  if (reasons.length === 0) {
    return {
      shouldTrigger: false,
      reasons,
      skipReason: "No instrument move or headline shift crossed the materiality rules."
    };
  }

  if (isInsideCooldown(lastDiscussionCreatedAt, getSchedulerCooldownMinutes(env))) {
    return {
      shouldTrigger: false,
      reasons,
      skipReason: `A material change was detected, but the scheduler is inside the ${getSchedulerCooldownMinutes(env)} minute cooldown window.`
    };
  }

  return {
    shouldTrigger: true,
    reasons
  };
}

function materialInstrumentReasons(
  previousSnapshot: MarketSnapshotPayload,
  currentSnapshot: MarketSnapshotPayload,
  env: Env
): string[] {
  const previousMap = snapshotMap(previousSnapshot.instruments);
  const currentMap = snapshotMap(currentSnapshot.instruments);
  const reasons: string[] = [];
  const indexThreshold = parseNumberEnv(env.SCHEDULED_MATERIALITY_INDEX_MOVE_PCT, 1);
  const commodityThreshold = parseNumberEnv(env.SCHEDULED_MATERIALITY_COMMODITY_MOVE_PCT, 2);
  const dxyThreshold = parseNumberEnv(env.SCHEDULED_MATERIALITY_DXY_MOVE_PCT, 0.5);
  const yieldThresholdBps = parseNumberEnv(env.SCHEDULED_MATERIALITY_US10Y_BPS, 8);

  const rules = [
    { key: "sp500", label: "S&P 500", threshold: indexThreshold, type: "relative" as const },
    { key: "nasdaq", label: "Nasdaq", threshold: indexThreshold, type: "relative" as const },
    { key: "wti", label: "WTI crude", threshold: commodityThreshold, type: "relative" as const },
    { key: "brent", label: "Brent crude", threshold: commodityThreshold, type: "relative" as const },
    { key: "natural_gas", label: "Natural gas", threshold: commodityThreshold, type: "relative" as const },
    { key: "copper", label: "Copper", threshold: commodityThreshold, type: "relative" as const },
    { key: "gold", label: "Gold", threshold: commodityThreshold, type: "relative" as const },
    { key: "dxy", label: "DXY", threshold: dxyThreshold, type: "relative" as const },
    { key: "us10y", label: "US 10Y yield", threshold: yieldThresholdBps, type: "yield_bps" as const }
  ];

  for (const rule of rules) {
    const previousValue = parseInstrumentNumber(previousMap.get(rule.key)?.value);
    const currentValue = parseInstrumentNumber(currentMap.get(rule.key)?.value);

    if (previousValue === null || currentValue === null) {
      continue;
    }

    if (rule.type === "yield_bps") {
      const basisPoints = Math.abs(currentValue - previousValue) * 100;

      if (basisPoints >= rule.threshold) {
        reasons.push(`${rule.label} moved by ${basisPoints.toFixed(1)} bps versus the previous snapshot.`);
      }

      continue;
    }

    if (previousValue === 0) {
      continue;
    }

    const relativeMovePct = (Math.abs(currentValue - previousValue) / Math.abs(previousValue)) * 100;

    if (relativeMovePct >= rule.threshold) {
      reasons.push(`${rule.label} moved ${relativeMovePct.toFixed(2)}% versus the previous snapshot.`);
    }
  }

  return reasons;
}

function headlineReasons(
  previousHeadlines: SnapshotHeadline[],
  currentHeadlines: SnapshotHeadline[],
  env: Env
): string[] {
  const threshold = Math.max(1, Math.round(parseNumberEnv(env.SCHEDULED_HEADLINE_CHANGE_COUNT, 2)));
  const previousSet = new Set(previousHeadlines.slice(0, 3).map((headline) => normalizeHeadline(headline.title)));
  const freshHeadlines = currentHeadlines
    .slice(0, 3)
    .filter((headline) => !previousSet.has(normalizeHeadline(headline.title)));

  if (freshHeadlines.length >= threshold) {
    return [`${freshHeadlines.length} of the top ${Math.min(3, currentHeadlines.length)} headlines are new since the previous snapshot.`];
  }

  return [];
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

function snapshotMap(instruments: SnapshotInstrument[]): Map<string, SnapshotInstrument> {
  return new Map(instruments.map((instrument) => [instrument.key, instrument]));
}

function parseInstrumentNumber(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);

  if (!normalized) {
    return null;
  }

  return Number(normalized[0]);
}

function normalizeHeadline(title: string): string {
  return title.trim().toLowerCase();
}

function isInsideCooldown(lastDiscussionCreatedAt: string | null, cooldownMinutes: number): boolean {
  if (!lastDiscussionCreatedAt) {
    return false;
  }

  const lastDiscussionTime = new Date(lastDiscussionCreatedAt).valueOf();

  if (Number.isNaN(lastDiscussionTime)) {
    return false;
  }

  return Date.now() - lastDiscussionTime < cooldownMinutes * 60 * 1000;
}

function parseBooleanEnv(value?: string): boolean {
  return (value || "").toLowerCase() === "true";
}

function parseNumberEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function ensureSchedulerTickState(env: Env): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS scheduler_tick_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_ticks INTEGER NOT NULL DEFAULT 0,
      last_tick_at TEXT,
      last_synthesis_at TEXT
    )`
  ).run();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO scheduler_tick_state (id, total_ticks) VALUES (1, 0)"
  ).run();
}

async function incrementAndGetTick(env: Env): Promise<number> {
  await ensureSchedulerTickState(env);
  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE scheduler_tick_state SET total_ticks = total_ticks + 1, last_tick_at = ? WHERE id = 1"
  ).bind(now).run();
  const row = await env.DB.prepare(
    "SELECT total_ticks FROM scheduler_tick_state WHERE id = 1"
  ).first<{ total_ticks: number }>();
  return row?.total_ticks ?? 0;
}

async function markSynthesisTickAt(env: Env, timestamp: string): Promise<void> {
  await ensureSchedulerTickState(env);
  await env.DB.prepare(
    "UPDATE scheduler_tick_state SET last_synthesis_at = ? WHERE id = 1"
  ).bind(timestamp).run();
}
