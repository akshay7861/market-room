import type {
  CreateMarketCaseInput,
  DiscussionRun,
  KnowledgeProcessingJob,
  KnowledgeProcessingResult,
  LearningRefreshResult,
  ScheduledRunResult,
  TrainingExamplesExportGroupBy,
  UpdateAgentInput
} from "@market-room/shared";
import { json } from "../lib/http";
import {
  buildAdminSummary,
  backfillAdminKnowledgeVectors,
  createAdminAgentMarketCase,
  exportTrainingExamplesJsonl,
  getAdminAgentKnowledgeStore,
  getAdminAgentLearningView,
  listAdminAgentKnowledgeProcessingJobs,
  listAdminAgentMarketCases,
  listAdminAgents,
  processAdminAgentKnowledgeFiles,
  queueAdminAgentKnowledgeProcessingJob,
  refreshAdminLearningSignals,
  reviewAdminAgentKnowledgeProcessingJobItem,
  runAdminAgentKnowledgeProcessingJob,
  updateAdminAgent,
  updateAdminAgentKnowledgeGovernance,
  uploadAdminAgentKnowledgeFiles
} from "../lib/services/adminService";
import {
  createMarketQuestionThread,
  getMarketQuestionThreadView,
  getMarketQuestionsView,
  replyToMarketQuestionThread
} from "../lib/services/marketQuestionsService";
import {
  getLiveMarketView,
  getMarketRoomView,
  listAgents,
  reactToMarketRoomMessage,
  runMarketDiscussion
} from "../lib/services/marketRoomService";
import { createRepositories } from "../lib/repositories";
import { isKnowledgeCategory } from "../lib/services/agentKnowledgeService";
import { runScheduledMarketCheck } from "../lib/services/scheduledMarketService";
import { fetchLatestMarketSnapshot } from "../lib/market-data";
import { loadRoom } from "../lib/room";
import type { Env } from "../index";

export async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders()
    });
  }

  if (
    isProtectedAdminPath(url.pathname) &&
    !isLocalRequest(url) &&
    env.ADMIN_API_ENABLED !== "true" &&
    !hasValidAdminToken(request, env)
  ) {
    return json(
      {
        error:
          "Admin API is disabled for hosted traffic until Cloudflare Access protection or a valid admin token is configured."
      },
      { status: 403 }
    );
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    const database = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
    return json({
      ok: true,
      appName: env.APP_NAME,
      now: new Date().toISOString(),
      database: database?.ok === 1 ? "connected" : "unavailable"
    });
  }

  if (url.pathname === "/api/room" && request.method === "GET") {
    const room = loadRoom();
    return json(room);
  }

  if (url.pathname === "/api/agents" && request.method === "GET") {
    const agents = await listAgents(env);
    return json({ agents });
  }

  if (url.pathname === "/api/market-room" && request.method === "GET") {
    const rawThreadLimit = url.searchParams.get("threadLimit");
    const rawThreadOffset = url.searchParams.get("threadOffset");
    const threadLimit = rawThreadLimit ? Number.parseInt(rawThreadLimit, 10) : undefined;
    const threadOffset = rawThreadOffset ? Number.parseInt(rawThreadOffset, 10) : undefined;
    const marketRoom = await getMarketRoomView(env, getClientId(request), { threadLimit, threadOffset });
    return json(marketRoom);
  }

  if (url.pathname === "/api/live-market" && request.method === "GET") {
    const liveMarket = await getLiveMarketView(env, getClientId(request));
    return json(liveMarket);
  }

  if (url.pathname === "/api/market-questions" && request.method === "GET") {
    const marketQuestions = await getMarketQuestionsView(env);
    return json(marketQuestions);
  }

  if (url.pathname === "/api/market-questions" && request.method === "POST") {
    const body = (await request.json().catch(() => null)) as { question?: string } | null;
    const question = body?.question?.trim();

    if (!question) {
      return json({ error: "A market question is required." }, { status: 400 });
    }

    try {
      const threadView = await createMarketQuestionThread(env, question);
      return json(threadView, { status: 201 });
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : "Could not create the market question thread."
        },
        { status: 400 }
      );
    }
  }

  if (url.pathname === "/api/admin/summary" && request.method === "GET") {
    const summary = await buildAdminSummary(env);
    return json(summary);
  }

  if (url.pathname === "/api/admin/agents" && request.method === "GET") {
    const agents = await listAdminAgents(env);
    return json({ agents });
  }

  if (url.pathname === "/api/admin/room-coverage" && request.method === "GET") {
    const room = loadRoom();
    const repositories = createRepositories(env);
    const state = await repositories.roomCoverage.getByRoomId(room.id);
    return json({ state });
  }

  // Force a fresh market data fetch and persist it.
  // Loads the current DB snapshot and passes it as carry-forward context so instruments
  // that are already live accumulate — call 3× (spaced 1 min apart) to fill all 9 instruments.
  // Pass ?fresh=true to skip carry-forward entirely and start from scratch.
  if (url.pathname === "/api/admin/market-data/refresh" && request.method === "POST") {
    const repositories = createRepositories(env);
    const prompt = "Discuss the biggest market drivers right now, the main risk, and one thing investors should watch next.";
    const skipCarryForward = url.searchParams.get("fresh") === "true";
    let previousSnapshot = null;
    if (!skipCarryForward) {
      const latest = await repositories.marketSnapshots.getLatest();
      if (latest) {
        try { previousSnapshot = JSON.parse(latest.payloadJson); } catch { /* ignore */ }
      }
    }
    const freshPayload = await fetchLatestMarketSnapshot(env, prompt, {
      previousSnapshot: previousSnapshot ?? undefined
    });
    const snapshotId = crypto.randomUUID();
    const now = new Date().toISOString();
    await repositories.marketSnapshots.create({
      id: snapshotId,
      snapshotType: "live_market_snapshot",
      payloadJson: JSON.stringify(freshPayload),
      createdAt: now
    });
    const liveCount = freshPayload.instruments.filter((i) => i.status === "live").length;
    return json({ ok: true, snapshotId, provider: freshPayload.provider, liveCount, instruments: freshPayload.instruments });
  }

  const adminMessageDecisionMatch = new URLPattern({ pathname: "/api/admin/messages/:messageId/decision" }).exec(url);
  if (adminMessageDecisionMatch && request.method === "GET") {
    const messageId = adminMessageDecisionMatch.pathname.groups.messageId!;
    const repositories = createRepositories(env);
    const postingDecision = await repositories.messages.getPostingDecision(messageId);
    return json({ messageId, postingDecision: postingDecision ?? null });
  }

  if (url.pathname === "/api/admin/decision-log" && request.method === "GET") {
    const repositories = createRepositories(env);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20;
    const agentId = url.searchParams.get("agentId");
    if (agentId) {
      const decisions = await repositories.decisionLog.listByAgent(agentId, limit);
      return json({ decisions });
    }
    const room = loadRoom();
    const decisions = await repositories.decisionLog.listByRoom(room.id, limit);
    return json({ decisions });
  }

  if (url.pathname === "/api/admin/news-feed" && request.method === "GET") {
    const repositories = createRepositories(env);
    const hoursParam = url.searchParams.get("hours");
    const limitParam = url.searchParams.get("limit");
    const hours = hoursParam ? Math.min(parseInt(hoursParam, 10), 72) : 24;
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 50;
    const items = await repositories.fetchedNews.listRecent(hours, limit);
    return json({ items, meta: { hours, count: items.length } });
  }

  if (url.pathname === "/api/admin/knowledge/vector-backfill" && request.method === "POST") {
    const result = await backfillAdminKnowledgeVectors(env);
    return json(result, { status: result.ok ? 200 : 503 });
  }

  const adminMessageNoveltyMatch = new URLPattern({ pathname: "/api/admin/messages/:messageId/novelty" }).exec(url);
  if (adminMessageNoveltyMatch && request.method === "GET") {
    const messageId = adminMessageNoveltyMatch.pathname.groups.messageId!;
    const repositories = createRepositories(env);
    const noveltyAssessment = await repositories.messages.getNoveltyAssessment(messageId);
    if (!noveltyAssessment) {
      return json({ messageId, noveltyAssessment: null });
    }
    return json({ messageId, noveltyAssessment });
  }

  if (url.pathname === "/api/admin/novelty-stats" && request.method === "GET") {
    const room = loadRoom();
    const repositories = createRepositories(env);
    const scores = await repositories.messages.listRecentNoveltyScores(room.id, 20);
    return json({ scores });
  }

  if (url.pathname === "/api/admin/learning/refresh" && request.method === "POST") {
    const result = await refreshAdminLearningSignals(env);
    ctx.waitUntil(Promise.resolve(result as LearningRefreshResult));
    return json(result);
  }

  if (url.pathname === "/api/admin/learning/export" && request.method === "GET") {
    const groupBy = normalizeExportGroupBy(url.searchParams.get("groupBy"));
    const jsonl = await exportTrainingExamplesJsonl(env, groupBy);
    const suffix = groupBy === "agent" ? "by-agent" : "all";

    return new Response(jsonl, {
      status: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Content-Disposition": `attachment; filename="training-examples-${suffix}.jsonl"`
      }
    });
  }

  const adminAgentMatch = url.pathname.match(/^\/api\/admin\/agents\/([^/]+)(?:\/(knowledge-store))?$/);
  const adminAgentCasesMatch = url.pathname.match(/^\/api\/admin\/agents\/([^/]+)\/market-cases$/);
  const adminAgentLearningMatch = url.pathname.match(/^\/api\/admin\/agents\/([^/]+)\/learning$/);
  const adminAgentProcessingMatch = url.pathname.match(/^\/api\/admin\/agents\/([^/]+)\/knowledge-processing$/);
  const adminAgentProcessingJobsMatch = url.pathname.match(/^\/api\/admin\/agents\/([^/]+)\/knowledge-processing\/jobs$/);
  const adminAgentProcessingJobReviewMatch = url.pathname.match(
    /^\/api\/admin\/agents\/([^/]+)\/knowledge-processing\/jobs\/([^/]+)\/items\/([^/]+)\/review$/
  );
  const adminAgentKnowledgeGovernanceMatch = url.pathname.match(
    /^\/api\/admin\/agents\/([^/]+)\/knowledge-store\/([^/]+)\/governance$/
  );
  const adminAgentStateMatch = url.pathname.match(/^\/api\/admin\/agents\/([^/]+)\/state$/);
  const marketQuestionThreadMatch = url.pathname.match(/^\/api\/market-questions\/([^/]+)$/);
  const marketQuestionMessagesMatch = url.pathname.match(/^\/api\/market-questions\/([^/]+)\/messages$/);
  const messageReactionMatch = url.pathname.match(/^\/api\/messages\/([^/]+)\/reaction$/);

  if (messageReactionMatch && request.method === "POST") {
    const clientId = getClientId(request);
    const body = (await request.json().catch(() => null)) as { reaction?: "like" | "dislike" | null } | null;

    if (!clientId) {
      return json({ error: "A client id is required for reactions." }, { status: 400 });
    }

    if (!body || !["like", "dislike", null].includes(body.reaction ?? null)) {
      return json({ error: "A valid reaction is required." }, { status: 400 });
    }

    const message = await reactToMarketRoomMessage(env, messageReactionMatch[1], clientId, body.reaction ?? null);

    if (!message) {
      return json({ error: "Message not found." }, { status: 404 });
    }

    return json({ message });
  }

  if (marketQuestionThreadMatch && request.method === "GET") {
    const threadId = marketQuestionThreadMatch[1];
    const threadView = await getMarketQuestionThreadView(env, threadId);

    if (!threadView) {
      return json({ error: "Market question thread not found." }, { status: 404 });
    }

    return json(threadView);
  }

  if (marketQuestionMessagesMatch && request.method === "POST") {
    const threadId = marketQuestionMessagesMatch[1];
    const body = (await request.json().catch(() => null)) as { question?: string } | null;
    const question = body?.question?.trim();

    if (!question) {
      return json({ error: "A follow-up question is required." }, { status: 400 });
    }

    try {
      const threadView = await replyToMarketQuestionThread(env, threadId, question);

      if (!threadView) {
        return json({ error: "Market question thread not found." }, { status: 404 });
      }

      return json(threadView);
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : "Could not post the follow-up question."
        },
        { status: 400 }
      );
    }
  }

  if (adminAgentMatch && request.method === "GET" && adminAgentMatch[2] === "knowledge-store") {
    const agentId = adminAgentMatch[1];
    const knowledgeStore = await getAdminAgentKnowledgeStore(env, agentId);

    if (!knowledgeStore) {
      return json({ error: "Agent not found" }, { status: 404 });
    }

    return json({ knowledgeStore });
  }

  if (adminAgentCasesMatch && request.method === "GET") {
    const agentId = adminAgentCasesMatch[1];
    const marketCases = await listAdminAgentMarketCases(env, agentId);

    if (!marketCases) {
      return json({ error: "Agent not found" }, { status: 404 });
    }

    return json({ marketCases });
  }

  if (adminAgentLearningMatch && request.method === "GET") {
    const agentId = adminAgentLearningMatch[1];
    const learning = await getAdminAgentLearningView(env, agentId);

    if (!learning) {
      return json({ error: "Agent not found" }, { status: 404 });
    }

    return json({ learning });
  }

  if (adminAgentStateMatch && request.method === "GET") {
    const agentId = adminAgentStateMatch[1];
    const repositories = createRepositories(env);
    const agent = await repositories.agents.getById(agentId);

    if (!agent) {
      return json({ error: "Agent not found" }, { status: 404 });
    }

    const state = await repositories.agentState.getByAgentId(agentId);
    return json({ state });
  }

  if (adminAgentProcessingJobsMatch && request.method === "GET") {
    const agentId = adminAgentProcessingJobsMatch[1];
    const jobs = await listAdminAgentKnowledgeProcessingJobs(env, agentId);

    if (!jobs) {
      return json({ error: "Agent not found" }, { status: 404 });
    }

    return json({ jobs });
  }

  if (adminAgentKnowledgeGovernanceMatch && request.method === "PATCH") {
    const agentId = adminAgentKnowledgeGovernanceMatch[1];
    const itemId = adminAgentKnowledgeGovernanceMatch[2];
    const body = (await request.json().catch(() => null)) as {
      tier?: "active" | "fallback" | "legacy";
      priority?: number;
    } | null;

    if (!body || !body.tier || !["active", "fallback", "legacy"].includes(body.tier)) {
      return json({ error: "A valid governance tier is required." }, { status: 400 });
    }

    const knowledgeStore = await updateAdminAgentKnowledgeGovernance(env, agentId, itemId, {
      tier: body.tier,
      priority: typeof body.priority === "number" ? body.priority : 0
    });

    if (!knowledgeStore) {
      return json({ error: "Knowledge item not found." }, { status: 404 });
    }

    return json({ knowledgeStore });
  }

  if (url.pathname.startsWith("/api/admin/agents/") && request.method === "PATCH") {
    const agentId = url.pathname.split("/").pop();
    const body = (await request.json().catch(() => null)) as UpdateAgentInput | null;

    if (!agentId || !body) {
      return json({ error: "Invalid request body" }, { status: 400 });
    }

    const updatedAgent = await updateAdminAgent(env, agentId, body);

    if (!updatedAgent) {
      return json({ error: "Agent not found" }, { status: 404 });
    }

    return json({ agent: updatedAgent });
  }

  if (adminAgentMatch && request.method === "POST" && adminAgentMatch[2] === "knowledge-store") {
    const agentId = adminAgentMatch[1];
    const formData = await request.formData().catch(() => null);
    const categoryValue = formData?.get("category");

    if (!formData || typeof categoryValue !== "string" || !isKnowledgeCategory(categoryValue)) {
      return json({ error: "A valid knowledge category is required." }, { status: 400 });
    }

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      return json({ error: "Choose at least one file to upload." }, { status: 400 });
    }

    try {
      const result = await uploadAdminAgentKnowledgeFiles(env, agentId, categoryValue, files);
      return json(result);
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : "Knowledge upload failed."
        },
        { status: 400 }
      );
    }
  }

  if (adminAgentProcessingMatch && request.method === "POST") {
    const agentId = adminAgentProcessingMatch[1];
    const formData = await request.formData().catch(() => null);
    const categoryValue = formData?.get("category");

    if (!formData || typeof categoryValue !== "string" || !isKnowledgeCategory(categoryValue)) {
      return json({ error: "A valid knowledge category is required." }, { status: 400 });
    }

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      return json({ error: "Choose at least one raw research file to process." }, { status: 400 });
    }

    try {
      const result = await processAdminAgentKnowledgeFiles(env, agentId, categoryValue, files);
      ctx.waitUntil(Promise.resolve(result as KnowledgeProcessingResult));
      return json(result);
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : "Research processing failed."
        },
        { status: 400 }
      );
    }
  }

  if (adminAgentProcessingJobsMatch && request.method === "POST") {
    const agentId = adminAgentProcessingJobsMatch[1];
    const formData = await request.formData().catch(() => null);
    const categoryValue = formData?.get("category");

    if (!formData || typeof categoryValue !== "string" || !isKnowledgeCategory(categoryValue)) {
      return json({ error: "A valid knowledge category is required." }, { status: 400 });
    }

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      return json({ error: "Choose at least one raw research file to process." }, { status: 400 });
    }

    try {
      const job = await queueAdminAgentKnowledgeProcessingJob(env, agentId, categoryValue, files);
      ctx.waitUntil(
        runAdminAgentKnowledgeProcessingJob(env, job.id, files).then((result) =>
          Promise.resolve(result as KnowledgeProcessingJob | null)
        )
      );
      return json({ job }, { status: 202 });
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : "Knowledge batch queueing failed."
        },
        { status: 400 }
      );
    }
  }

  if (adminAgentProcessingJobReviewMatch && request.method === "POST") {
    const agentId = adminAgentProcessingJobReviewMatch[1];
    const jobId = adminAgentProcessingJobReviewMatch[2];
    const itemId = adminAgentProcessingJobReviewMatch[3];
    const body = (await request.json().catch(() => null)) as { decision?: "approve" | "reject" } | null;

    if (!body || (body.decision !== "approve" && body.decision !== "reject")) {
      return json({ error: "A valid review decision is required." }, { status: 400 });
    }

    try {
      const job = await reviewAdminAgentKnowledgeProcessingJobItem(env, agentId, jobId, itemId, body.decision);

      if (!job) {
        return json({ error: "Processing job or item not found." }, { status: 404 });
      }

      return json({ job });
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : "Review decision failed."
        },
        { status: 400 }
      );
    }
  }

  if (adminAgentCasesMatch && request.method === "POST") {
    const agentId = adminAgentCasesMatch[1];
    const body = (await request.json().catch(() => null)) as CreateMarketCaseInput | null;

    if (!body) {
      return json({ error: "Invalid market case payload." }, { status: 400 });
    }

    try {
      const marketCase = await createAdminAgentMarketCase(env, agentId, body);

      if (!marketCase) {
        return json({ error: "Agent not found" }, { status: 404 });
      }

      return json({ marketCase });
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : "Market case creation failed."
        },
        { status: 400 }
      );
    }
  }

  if (url.pathname === "/api/discussions/run" && request.method === "POST") {
    const body = (await request.json().catch(() => ({}))) as { prompt?: string };
    // Keep the route logic shallow so a beginner can trace requests quickly.
    const run = await runMarketDiscussion(env, body.prompt);
    ctx.waitUntil(Promise.resolve(run as DiscussionRun));
    return json(run);
  }

  if (url.pathname === "/api/scheduler/run" && request.method === "POST") {
    const result = await runScheduledMarketCheck(env, "manual_test");
    ctx.waitUntil(Promise.resolve(result as ScheduledRunResult));
    return json(result);
  }

  return json({ error: "Not found" }, { status: 404 });
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Client-Id, X-Admin-Token",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS"
  };
}

function isProtectedAdminPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/admin") ||
    pathname === "/api/discussions/run" ||
    pathname === "/api/scheduler/run"
  );
}

function isLocalRequest(url: URL): boolean {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

function hasValidAdminToken(request: Request, env: Env): boolean {
  const expected = env.ADMIN_API_TOKEN?.trim();
  const provided = request.headers.get("X-Admin-Token")?.trim();
  return Boolean(expected && provided && provided === expected);
}

function normalizeExportGroupBy(value: string | null): TrainingExamplesExportGroupBy {
  return value === "agent" ? "agent" : "all";
}

function getClientId(request: Request): string | null {
  const rawClientId = request.headers.get("X-Client-Id")?.trim();
  return rawClientId || null;
}
