import type { AuthorMemoryContext, ForecastWithOutcome, Thesis, TrainingExample } from "@market-room/shared";
import type { Env } from "../../index";
import { createRepositories } from "../repositories";

export async function buildAuthorMemoryContext(
  env: Env,
  agentId: string,
  roomId: string
): Promise<AuthorMemoryContext> {
  const repos = createRepositories(env);

  const [resolvedForecasts, goodExamples, badExamples, recentTheses] = await Promise.all([
    repos.agentForecasts.listRecentResolvedWithOutcomes(agentId, 10),
    repos.trainingExamples.listRecentByLabel(agentId, "good", 3),
    repos.trainingExamples.listRecentByLabel(agentId, "bad", 3),
    repos.theses.listRecentByRoom(roomId, 30)
  ]);

  const agentTheses = recentTheses.filter((t) => t.ownerAgentId === agentId);

  return {
    trackRecord: buildTrackRecord(resolvedForecasts),
    calibrationNotes: buildCalibrationNotes(resolvedForecasts),
    recentAccuracy: buildRecentAccuracy(resolvedForecasts),
    behavioralGuidance: buildBehavioralGuidance(goodExamples, badExamples),
    openTheses: buildOpenThesesSummary(agentTheses),
    overusedThemes: buildOverusedThemes(agentTheses)
  };
}

function buildTrackRecord(forecasts: ForecastWithOutcome[]): string {
  if (forecasts.length === 0) {
    return "No resolved forecasts yet. You are building your track record.";
  }

  const correct = forecasts.filter((f) => f.outcomeLabel === "correct").length;
  const partial = forecasts.filter((f) => f.outcomeLabel === "partial").length;
  const incorrect = forecasts.filter((f) => f.outcomeLabel === "incorrect").length;
  const unscored = forecasts.filter((f) => !f.outcomeLabel).length;

  const lines = [`Last ${forecasts.length} resolved calls: ${correct} correct, ${partial} partial, ${incorrect} wrong${unscored > 0 ? `, ${unscored} unscored` : ""}.`];

  const recent = forecasts.slice(0, 5);
  for (const f of recent) {
    const outcome = f.outcomeLabel || "unscored";
    const direction = f.actualDirection ? ` (actual: ${f.actualDirection}${f.actualMove ? ` ${f.actualMove}` : ""})` : "";
    lines.push(`- ${f.targetInstrumentLabel}: called ${f.signal} at ${(f.confidence * 100).toFixed(0)}% confidence → ${outcome}${direction}`);
  }

  return lines.join("\n");
}

function buildCalibrationNotes(forecasts: ForecastWithOutcome[]): string {
  if (forecasts.length < 3) {
    return "Not enough data for calibration yet.";
  }

  const notes: string[] = [];

  // Accuracy by instrument
  const byInstrument = new Map<string, { correct: number; total: number }>();
  for (const f of forecasts) {
    if (!f.outcomeLabel) continue;
    const entry = byInstrument.get(f.targetInstrumentKey) || { correct: 0, total: 0 };
    entry.total++;
    if (f.outcomeLabel === "correct") entry.correct++;
    byInstrument.set(f.targetInstrumentKey, entry);
  }

  const sorted = [...byInstrument.entries()]
    .filter(([, v]) => v.total >= 2)
    .sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total));

  if (sorted.length > 0) {
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best[0] !== worst[0]) {
      notes.push(`Your strongest instrument: ${best[0]} (${best[1].correct}/${best[1].total} correct). Your weakest: ${worst[0]} (${worst[1].correct}/${worst[1].total} correct).`);
    }
  }

  // Confidence calibration
  const highConf = forecasts.filter((f) => f.confidence >= 0.7 && f.outcomeLabel);
  const highCorrect = highConf.filter((f) => f.outcomeLabel === "correct").length;
  if (highConf.length >= 3) {
    const hitRate = ((highCorrect / highConf.length) * 100).toFixed(0);
    if (Number(hitRate) < 60) {
      notes.push(`When you say 70%+ confidence, you're right ${hitRate}% of the time. Consider moderating high-confidence calls.`);
    } else {
      notes.push(`Your high-confidence calls (70%+) hit at ${hitRate}% — your conviction is reasonably calibrated.`);
    }
  }

  // Directional bias
  const directions = forecasts.filter((f) => f.outcomeLabel);
  const upCalls = directions.filter((f) => f.signal === "up").length;
  const downCalls = directions.filter((f) => f.signal === "down").length;
  if (directions.length >= 5) {
    const upPct = ((upCalls / directions.length) * 100).toFixed(0);
    if (Number(upPct) > 75) {
      notes.push(`You have a bullish lean (${upPct}% up calls). Consider whether you're underweighting downside scenarios.`);
    } else if (Number(upPct) < 25) {
      notes.push(`You have a bearish lean (${((downCalls / directions.length) * 100).toFixed(0)}% down calls). Consider whether you're underweighting upside scenarios.`);
    }
  }

  return notes.length > 0 ? notes.join(" ") : "Calibration looks balanced so far.";
}

function buildRecentAccuracy(forecasts: ForecastWithOutcome[]): string {
  const scored = forecasts.filter((f) => f.outcomeLabel);
  if (scored.length === 0) return "No scored forecasts yet.";

  const correct = scored.filter((f) => f.outcomeLabel === "correct").length;
  const pct = ((correct / scored.length) * 100).toFixed(0);

  return `Recent accuracy: ${pct}% correct out of ${scored.length} scored calls.`;
}

function buildBehavioralGuidance(
  goodExamples: TrainingExample[],
  badExamples: TrainingExample[]
): string {
  const lines: string[] = [];

  if (goodExamples.length > 0) {
    lines.push("What worked in your best posts:");
    for (const ex of goodExamples.slice(0, 2)) {
      if (ex.feedbackSummary) {
        lines.push(`- ${truncate(ex.feedbackSummary, 200)}`);
      }
    }
  }

  if (badExamples.length > 0) {
    lines.push("What to avoid based on your worst posts:");
    for (const ex of badExamples.slice(0, 2)) {
      if (ex.feedbackSummary) {
        lines.push(`- ${truncate(ex.feedbackSummary, 200)}`);
      }
    }
  }

  if (lines.length === 0) {
    return "No training examples yet to guide behavioral adjustments.";
  }

  return lines.join("\n");
}

function buildOpenThesesSummary(theses: Thesis[]): string {
  const active = theses.filter((t) =>
    ["open", "developing", "waiting_for_data", "reopened"].includes(t.status)
  );

  if (active.length === 0) {
    return "You have no open theses right now.";
  }

  const lines = [`You have ${active.length} open ${active.length === 1 ? "thesis" : "theses"}:`];
  for (const t of active.slice(0, 5)) {
    const conf = t.confidenceCurrent != null ? ` | confidence=${(t.confidenceCurrent * 100).toFixed(0)}%` : "";
    lines.push(`- "${t.title}" [${t.status}]${conf} | topic=${t.topicPrimary || "general"}`);
  }

  return lines.join("\n");
}

function buildOverusedThemes(theses: Thesis[]): string {
  const themeCounts = new Map<string, number>();
  for (const t of theses) {
    if (t.topicPrimary) {
      themeCounts.set(t.topicPrimary, (themeCounts.get(t.topicPrimary) || 0) + 1);
    }
  }

  const overused = [...themeCounts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  if (overused.length === 0) {
    return "No overused themes detected.";
  }

  return `Overused themes to rotate away from: ${overused.map(([theme, count]) => `"${humanize(theme)}" (${count} times)`).join(", ")}. Find a genuinely new angle or stay silent on these unless there is a material catalyst change.`;
}

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 3).trim()}...` : text;
}
