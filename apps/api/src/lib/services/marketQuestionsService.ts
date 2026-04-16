import type {
  Agent,
  MarketQuestionMessage,
  MarketQuestionThread,
  MarketQuestionThreadView,
  MarketQuestionsView,
  MarketSnapshotPayload,
  SnapshotHeadline,
  SnapshotInstrument
} from "@market-room/shared";
import type { Env } from "../../index";
import { generateGeminiContent, getLlmModel, isLlmConfigured } from "../gemini";
import { fetchLatestMarketSnapshot } from "../market-data";
import { extractResponseOutputText, parseStructuredResponseJson } from "../openAiResponses";
import { createRepositories } from "../repositories";
import { fetchOfficialCatalystLayer } from "./officialCatalystService";
import { findRelevantKnowledgeSnippets, listApprovedKnowledgeDocuments } from "./knowledgeSnippetService";
import { fetchYahooFinanceBriefing } from "./yahooFinanceNewsService";
import { listRelevantMarketCasesForAgent } from "./marketCaseService";
import { buildDynamicMemoryContext, buildDynamicMemoryPromptBlock } from "./dynamicMemoryService";
import {
  buildEquityQuoteContext,
  buildEquityQuotePromptBlock,
  type EquityQuoteContext
} from "./equityQuoteService";
import { buildHistoricalDataPromptBlock, buildChartDataFromQuestion } from "./historicalDataContextService";

type RoutingBreakdown = {
  agent: Agent;
  score: number;
  contributions: string[];
};

export async function getMarketQuestionsView(env: Env): Promise<MarketQuestionsView> {
  const repositories = createRepositories(env);
  const [threads, activeAgents] = await Promise.all([
    repositories.marketQuestionThreads.list(24),
    repositories.agents.listActive()
  ]);

  return {
    threads,
    activeAgents
  };
}

export async function getMarketQuestionThreadView(
  env: Env,
  threadId: string
): Promise<MarketQuestionThreadView | null> {
  const repositories = createRepositories(env);
  const [thread, messages] = await Promise.all([
    repositories.marketQuestionThreads.getById(threadId),
    repositories.marketQuestionMessages.listByThread(threadId)
  ]);

  if (!thread) {
    return null;
  }

  return {
    thread,
    messages
  };
}

export async function createMarketQuestionThread(
  env: Env,
  question: string
): Promise<MarketQuestionThreadView> {
  const repositories = createRepositories(env);
  const agents = await repositories.agents.listActive();
  const assignedAgent = await selectAgentForQuestion(env, agents, question);
  const now = new Date().toISOString();
  const threadId = crypto.randomUUID();
  const title = buildQuestionThreadTitle(question, assignedAgent);

  await repositories.marketQuestionThreads.create({
    id: threadId,
    title,
    assignedAgentId: assignedAgent.id,
    status: "open",
    createdAt: now,
    updatedAt: now
  });

  const userMessage: MarketQuestionMessage = {
    id: crypto.randomUUID(),
    threadId,
    role: "user",
    agentId: null,
    agentName: null,
    agentSector: null,
    content: question.trim(),
    createdAt: now
  };

  await repositories.marketQuestionMessages.create({
    id: userMessage.id,
    threadId: userMessage.threadId,
    role: userMessage.role,
    agentId: null,
    content: userMessage.content,
    createdAt: userMessage.createdAt
  });

  const assistantMessage = await generateAgentQuestionReply(env, assignedAgent, [userMessage], question.trim());

  await repositories.marketQuestionMessages.create({
    id: assistantMessage.id,
    threadId: assistantMessage.threadId,
    role: assistantMessage.role,
    agentId: assistantMessage.agentId,
    content: assistantMessage.content,
    createdAt: assistantMessage.createdAt
  });
  await repositories.marketQuestionThreads.touch(threadId, assistantMessage.createdAt);

  const thread = await repositories.marketQuestionThreads.getById(threadId);

  return {
    thread: thread as MarketQuestionThread,
    messages: [
      userMessage,
      assistantMessage
    ]
  };
}

export async function replyToMarketQuestionThread(
  env: Env,
  threadId: string,
  question: string
): Promise<MarketQuestionThreadView | null> {
  const repositories = createRepositories(env);
  const thread = await repositories.marketQuestionThreads.getById(threadId);

  if (!thread) {
    return null;
  }

  const currentAgent = await repositories.agents.getById(thread.assignedAgentId);

  if (!currentAgent) {
    return null;
  }

  const agents = await repositories.agents.listActive();
  const agent = await selectAgentForFollowUp(env, agents, currentAgent, question);

  const now = new Date().toISOString();
  const userMessage: MarketQuestionMessage = {
    id: crypto.randomUUID(),
    threadId,
    role: "user",
    agentId: null,
    agentName: null,
    agentSector: null,
    content: question.trim(),
    createdAt: now
  };

  await repositories.marketQuestionMessages.create({
    id: userMessage.id,
    threadId: userMessage.threadId,
    role: userMessage.role,
    agentId: null,
    content: userMessage.content,
    createdAt: userMessage.createdAt
  });

  const priorMessages = await repositories.marketQuestionMessages.listByThread(threadId);
  const assistantMessage = await generateAgentQuestionReply(
    env,
    agent,
    [...priorMessages, userMessage],
    question.trim()
  );

  await repositories.marketQuestionMessages.create({
    id: assistantMessage.id,
    threadId: assistantMessage.threadId,
    role: assistantMessage.role,
    agentId: assistantMessage.agentId,
    content: assistantMessage.content,
    createdAt: assistantMessage.createdAt
  });
  await repositories.marketQuestionThreads.touchAndAssign(threadId, agent.id, assistantMessage.createdAt);

  return getMarketQuestionThreadView(env, threadId);
}

async function selectAgentForFollowUp(
  env: Env,
  agents: Agent[],
  currentAgent: Agent,
  question: string
): Promise<Agent> {
  const rankedHeuristic = await heuristicAgentMatch(env, agents, question);
  const winner = rankedHeuristic[0];
  const currentRank = rankedHeuristic.find((entry) => entry.agent.id === currentAgent.id);

  if (!winner || winner.agent.id === currentAgent.id) {
    console.log(`[routing-followup] staying with ${currentAgent.name}`);
    return currentAgent;
  }

  const currentScore = currentRank?.score ?? 0;
  const marginVsCurrent = winner.score - currentScore;
  const explicitPivot =
    winner.contributions.includes("explicit-agent") ||
    winner.contributions.includes("explicit-sector") ||
    winner.contributions.includes("asked-sector-frame") ||
    winner.contributions.includes("commodity-agent-request") ||
    winner.contributions.includes("equity-quote-intent");
  const strongSpecialistPivot = winner.score >= 8 && marginVsCurrent >= 3;

  if (explicitPivot || strongSpecialistPivot) {
    console.log(
      `[routing-followup] switched ${currentAgent.name} -> ${winner.agent.name} score=${winner.score.toFixed(1)} current=${currentScore.toFixed(1)} margin=${marginVsCurrent.toFixed(1)} via=${winner.contributions.join(", ")}`
    );
    return winner.agent;
  }

  console.log(
    `[routing-followup] kept ${currentAgent.name}; ${winner.agent.name} lead was not strong enough score=${winner.score.toFixed(1)} current=${currentScore.toFixed(1)} margin=${marginVsCurrent.toFixed(1)}`
  );
  return currentAgent;
}

async function selectAgentForQuestion(env: Env, agents: Agent[], question: string): Promise<Agent> {
  const rankedHeuristic = await heuristicAgentMatch(env, agents, question);
  const heuristic = rankedHeuristic[0] || {
    agent: agents[0],
    score: 0,
    contributions: ["fallback"]
  };
  const second = rankedHeuristic[1];
  const margin = heuristic.score - (second?.score || 0);

  console.log(
    `[routing] heuristic top=${heuristic.agent.name} score=${heuristic.score.toFixed(1)} margin=${margin.toFixed(1)} question="${question.slice(0, 140)}"`
  );
  for (const entry of rankedHeuristic.slice(0, 3)) {
    console.log(
      `[routing]   ${entry.agent.name} score=${entry.score.toFixed(1)} via=${entry.contributions.join(", ")}`
    );
  }

  if (
    second &&
    !hasExplicitRoutingSignal(heuristic) &&
    hasExplicitRoutingSignal(second) &&
    margin <= 2
  ) {
    console.log(
      `[routing] selected explicit runner-up ${second.agent.name} over narrow heuristic winner ${heuristic.agent.name} margin=${margin.toFixed(1)}`
    );
    return second.agent;
  }

  if (shouldTrustHeuristic(question, heuristic, second)) {
    console.log(`[routing] selected heuristic winner ${heuristic.agent.name} without llm tie-break`);
    return heuristic.agent;
  }

  if (!isLlmConfigured(env)) {
    console.log(`[routing] llm unavailable — using heuristic winner ${heuristic.agent.name}`);
    return heuristic.agent;
  }

  try {
    const payload = await generateGeminiContent(env, {
      model: getLlmModel(env),
      instructions: [
        "Route a market question to the single most relevant specialist.",
        "Pick exactly one agent sector from the provided roster.",
        "Prefer the clearest specialist fit, not the broadest catch-all answer.",
        "If the question mixes macro language with clear sector-specific instruments or market structure terms, prefer the specialist over Macro.",
        "Treat yields, curve, breakeven, term premium, duration, Treasury instruments as Rates signals.",
        "Treat DXY, EURUSD, USDJPY, carry, basis, cross-currency, intervention, dollar funding, divergence as FX signals.",
        "Treat breadth, equal-weight, leadership, margins, earnings quality, revisions, sector rotation as Equities signals.",
        "If the user asks for stocks, tickers, companies, names, picks, what to buy, watchlists, ETFs, sectors to own, or thematic baskets, route to Equities unless they explicitly ask for commodity prices or physical-market mechanics.",
        "Treat VIX, HY spreads, positioning, crowding, fragility, de-grossing as Risk/Sentiment signals."
      ].join("\n"),
      prompt: [
        `Question: ${question}`,
        "Heuristic routing ranking:",
        ...rankedHeuristic.slice(0, 3).map((entry, index) =>
          `${index + 1}. ${entry.agent.id} | ${entry.agent.sector} | score=${entry.score.toFixed(1)} | signals=${entry.contributions.join(", ")}`
        ),
        "Available agents:",
        ...agents.map((agent) => `- ${agent.id} | ${agent.name} | ${agent.sector} | ${agent.bio}`)
      ].join("\n"),
      maxOutputTokens: 140,
      temperature: 0.1,
      responseSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" }
        },
        required: ["agentId"]
      }
    });

    const parsed = parseStructuredResponseJson<{ agentId?: string }>(payload);
    const chosen = agents.find((agent) => agent.id === parsed?.agentId);
    if (chosen) {
      console.log(`[routing] llm selected ${chosen.name}`);
      return chosen;
    }
    console.log(`[routing] llm returned no usable choice — falling back to heuristic ${heuristic.agent.name}`);
    return heuristic.agent;
  } catch {
    console.log(`[routing] llm routing failed — falling back to heuristic ${heuristic.agent.name}`);
    return heuristic.agent;
  }
}

async function heuristicAgentMatch(env: Env, agents: Agent[], question: string): Promise<RoutingBreakdown[]> {
  const text = question.toLowerCase();
  const lead = text.split(/[.!?]/)[0] || text;
  const strongNonEquityIntent = hasStrongNonEquityIntent(question);
  const routingSignals: Array<{
    sector: string;
    weightedTerms: Array<{ term: string; score: number }>;
    weightedPhrases: Array<{ phrase: string; score: number }>;
  }> = [
    {
      sector: "Macro",
      weightedTerms: [
        { term: "cpi", score: 2 },
        { term: "pce", score: 2 },
        { term: "inflation", score: 2 },
        { term: "fed", score: 1.5 },
        { term: "economy", score: 1.5 },
        { term: "growth", score: 1.5 },
        { term: "payroll", score: 1.5 },
        { term: "jobs", score: 1.5 },
        { term: "jolts", score: 2 },
        { term: "quits", score: 2 },
        { term: "unemployment", score: 2 }
      ],
      weightedPhrases: [
        { phrase: "labor market", score: 3 },
        { phrase: "reaction function", score: 3 },
        { phrase: "dual mandate", score: 3 },
        { phrase: "inflation regime", score: 3 }
      ]
    },
    {
      sector: "Equities",
      weightedTerms: [
        { term: "equity", score: 2 },
        { term: "stock", score: 2 },
        { term: "stocks", score: 3 },
        { term: "ticker", score: 3 },
        { term: "tickers", score: 3 },
        { term: "companies", score: 3 },
        { term: "names", score: 3 },
        { term: "buy", score: 2.5 },
        { term: "watchlist", score: 3 },
        { term: "etf", score: 2.5 },
        { term: "etfs", score: 2.5 },
        { term: "green", score: 2.5 },
        { term: "renewable", score: 3 },
        { term: "solar", score: 3 },
        { term: "wind", score: 2.5 },
        { term: "battery", score: 2.5 },
        { term: "lithium", score: 2.5 },
        { term: "nuclear", score: 2.5 },
        { term: "uranium", score: 2.5 },
        { term: "nasdaq", score: 2.5 },
        { term: "earnings", score: 2.5 },
        { term: "margin", score: 2.5 },
        { term: "leadership", score: 2.5 },
        { term: "breadth", score: 2.5 },
        { term: "sector", score: 1.5 },
        { term: "revisions", score: 2 },
        { term: "equal", score: 1.5 },
        { term: "mega", score: 1.5 }
      ],
      weightedPhrases: [
        { phrase: "equal-weight", score: 3 },
        { phrase: "sector rotation", score: 4 },
        { phrase: "earnings quality", score: 4 },
        { phrase: "which stocks", score: 8 },
        { phrase: "best stocks", score: 8 },
        { phrase: "stock names", score: 8 },
        { phrase: "what stocks", score: 8 },
        { phrase: "what to buy", score: 7 },
        { phrase: "green stocks", score: 9 },
        { phrase: "clean energy", score: 7 },
        { phrase: "renewable energy", score: 7 },
        { phrase: "energy stocks", score: 7 },
        { phrase: "thematic basket", score: 6 },
        { phrase: "operating margin", score: 3.5 },
        { phrase: "free cash flow", score: 3.5 },
        { phrase: "late-cycle narrow leadership", score: 4 }
      ]
    },
    {
      sector: "Commodities",
      weightedTerms: [
        { term: "commodity", score: 2.5 },
        { term: "commodities", score: 3 },
        { term: "crude", score: 3 },
        { term: "oil", score: 2.5 },
        { term: "wti", score: 3 },
        { term: "brent", score: 3 },
        { term: "inventory", score: 3 },
        { term: "cushing", score: 3.5 },
        { term: "opec", score: 3.5 },
        { term: "gas", score: 2 },
        { term: "copper", score: 2.5 },
        { term: "gold", score: 1.5 },
        { term: "refinery", score: 3 }
      ],
      weightedPhrases: [
        { phrase: "commodity agent", score: 10 },
        { phrase: "commodities agent", score: 10 },
        { phrase: "wti prices", score: 5 },
        { phrase: "wti price", score: 5 },
        { phrase: "oil prices", score: 4 },
        { phrase: "historical patterns in wti", score: 7 },
        { phrase: "middle east wars", score: 6 },
        { phrase: "gulf war", score: 5 },
        { phrase: "crude draw", score: 4 },
        { phrase: "petroleum report", score: 4 },
        { phrase: "physical tightness", score: 3.5 },
        { phrase: "calendar spread", score: 3 }
      ]
    },
    {
      sector: "FX",
      weightedTerms: [
        { term: "dxy", score: 3 },
        { term: "eurusd", score: 3.5 },
        { term: "usdjpy", score: 3.5 },
        { term: "audjpy", score: 3.5 },
        { term: "carry", score: 3 },
        { term: "currency", score: 2 },
        { term: "dollar", score: 2 },
        { term: "yen", score: 2.5 },
        { term: "euro", score: 2.5 },
        { term: "basis", score: 3 },
        { term: "intervention", score: 3 },
        { term: "swap", score: 2.5 }
      ],
      weightedPhrases: [
        { phrase: "cross-currency basis", score: 5 },
        { phrase: "policy divergence", score: 4 },
        { phrase: "dollar funding", score: 5 },
        { phrase: "offshore dollar", score: 5 },
        { phrase: "carry trade", score: 4 },
        { phrase: "funding stress", score: 5 }
      ]
    },
    {
      sector: "Rates",
      weightedTerms: [
        { term: "yield", score: 2.5 },
        { term: "treasury", score: 3 },
        { term: "curve", score: 3 },
        { term: "duration", score: 3 },
        { term: "bond", score: 2 },
        { term: "tips", score: 3 },
        { term: "breakeven", score: 3.5 },
        { term: "term", score: 1.5 },
        { term: "premium", score: 1.5 },
        { term: "2year", score: 2.5 },
        { term: "10year", score: 2.5 }
      ],
      weightedPhrases: [
        { phrase: "term premium", score: 5 },
        { phrase: "fed funds futures", score: 4 },
        { phrase: "real yield", score: 4 },
        { phrase: "bear steepener", score: 4 },
        { phrase: "yield curve", score: 4 },
        { phrase: "bond vigilante", score: 4 }
      ]
    },
    {
      sector: "Risk/Sentiment",
      weightedTerms: [
        { term: "vix", score: 3.5 },
        { term: "credit", score: 2.5 },
        { term: "fragile", score: 2.5 },
        { term: "vol", score: 2 },
        { term: "positioning", score: 3 },
        { term: "crowding", score: 3 },
        { term: "degrossing", score: 3.5 },
        { term: "fragility", score: 3 },
        { term: "spread", score: 1.5 },
        { term: "risk", score: 1.5 }
      ],
      weightedPhrases: [
        { phrase: "hy spreads", score: 4 },
        { phrase: "risk-on", score: 3 },
        { phrase: "risk-off", score: 3 },
        { phrase: "fragile equilibrium", score: 4 },
        { phrase: "active stress", score: 4 },
        { phrase: "narrow leadership", score: 3.5 }
      ]
    }
  ];

  const knowledgePools = await Promise.all(
    agents.map(async (agent) => ({
      agent,
      documents: await listApprovedKnowledgeDocuments(env, agent.id, 12)
    }))
  );

  const ranked = agents.map((agent) => {
    const signal = routingSignals.find((entry) => entry.sector === agent.sector);
    const contributions: string[] = [];
    let score = 0;

    const negatedSectorFrame = hasNegatedSectorFrame(text, agent.sector);

    if (!negatedSectorFrame && sectorAliases(agent.sector).some((alias) => new RegExp(`\\b${escapeRegex(alias)}\\b`).test(text))) {
      score += 6;
      contributions.push("explicit-sector");
    }
    if (!negatedSectorFrame && hasAskedSectorFrame(text, agent.sector)) {
      score += 14;
      contributions.push("asked-sector-frame");
    }
    if (!negatedSectorFrame && new RegExp(`\\b${escapeRegex(agent.name.toLowerCase())}\\b`).test(text)) {
      score += 7;
      contributions.push("explicit-agent");
    }

    for (const weighted of signal?.weightedTerms || []) {
      const hitWhole = containsWord(text, weighted.term);
      const hitLead = containsWord(lead, weighted.term);
      if (hitWhole) {
        score += weighted.score;
        contributions.push(`term:${weighted.term}`);
      }
      if (hitLead) {
        score += weighted.score * 0.75;
        contributions.push(`lead:${weighted.term}`);
      }
    }

    for (const weighted of signal?.weightedPhrases || []) {
      const whole = text.includes(weighted.phrase);
      const leadHit = lead.includes(weighted.phrase);
      if (whole) {
        score += weighted.score;
        contributions.push(`phrase:${weighted.phrase}`);
      }
      if (leadHit) {
        score += weighted.score * 0.5;
        contributions.push(`lead-phrase:${weighted.phrase}`);
      }
    }

    if (negatedSectorFrame) {
      score -= 12;
      contributions.push(`-negated-sector:${agent.sector}`);
    }

    if (hasEquityQuoteIntent(question)) {
      if (agent.sector === "Equities") {
        score += 14;
        contributions.push("equity-quote-intent");
      } else if (agent.sector === "Commodities" && !hasPhysicalCommodityIntent(question)) {
        score -= 6;
        contributions.push("-equity-quote-not-commodity");
      }
    }

    if (agent.sector === "Equities" && strongNonEquityIntent && !hasStockIdeaIntent(question)) {
      score -= 14;
      contributions.push("-specialist-non-equity-intent");
    }

    if (agent.sector === "Commodities" && /\b(commodity|commodities)\s+agent\b/.test(text)) {
      score += 12;
      contributions.push("commodity-agent-request");
    }

    const knowledgePool = knowledgePools.find((entry) => entry.agent.id === agent.id)?.documents || [];
    const knowledgeScore = scoreKnowledgeRoutingMatch(knowledgePool, question);
    if (knowledgeScore > 0) {
      score += knowledgeScore;
      contributions.push(`knowledge:${knowledgeScore.toFixed(1)}`);
    }

    return { agent, score, contributions };
  });

  return ranked.sort((left, right) => right.score - left.score);
}

function shouldTrustHeuristic(
  question: string,
  winner: RoutingBreakdown,
  runnerUp: RoutingBreakdown | undefined
): boolean {
  if (hasExplicitRoutingSignal(winner)) {
    return true;
  }

  const margin = winner.score - (runnerUp?.score || 0);
  const lower = question.toLowerCase();
  const hasSpecialistStructure =
    /(cross-currency basis|carry trade|term premium|breakeven|equal-weight|sector rotation|earnings quality|free cash flow|which stocks|best stocks|stock names|what stocks|green stocks|clean energy|renewable energy|vix|hy spreads|cushing|opec|jolts|quits)/i.test(
      lower
    );

  return margin >= 4 || (margin >= 2.5 && hasSpecialistStructure);
}

function hasExplicitRoutingSignal(entry: RoutingBreakdown): boolean {
  return (
    entry.contributions.includes("explicit-agent") ||
    entry.contributions.includes("explicit-sector") ||
    entry.contributions.includes("asked-sector-frame") ||
    entry.contributions.includes("commodity-agent-request")
  );
}

function hasStockIdeaIntent(question: string): boolean {
  const text = question.toLowerCase();
  if (hasNegatedSectorFrame(text, "Equities") || hasStrongNonEquityIntent(question) || hasNegatedStockIdeaIntent(text)) {
    return false;
  }

  return /\b(which|what|best|top|good|names?|tickers?|companies|stocks?|etfs?|watchlist|basket|buy|own|invest)\b/.test(text) &&
    /\b(stocks?|tickers?|companies|names?|etfs?|buy|own|invest|watchlist|basket|sector|theme|green|clean energy|renewable|solar|wind|battery|lithium|nuclear|uranium|energy)\b/.test(text);
}

function hasNegatedStockIdeaIntent(text: string): boolean {
  return (
    /\b(do not|don't|dont|not|no)\s+(give|answer|provide|make|turn this into)\b.{0,50}\b(stock picks?|watchlist|stock watchlist|basket|names?|tickers?|buy recommendation)\b/.test(text) ||
    /\b(not|no)\s+(a|an)?\s*(stock picks?|watchlist|stock watchlist|basket|names?|tickers?|buy recommendation)\b/.test(text) ||
    /\binstead of\s+(a|an)?\s*(stock picks?|watchlist|stock watchlist|basket|names?|tickers?)\b/.test(text)
  );
}

function hasEquityQuoteIntent(question: string): boolean {
  if (hasStockIdeaIntent(question)) {
    return true;
  }

  if (hasStrongNonEquityIntent(question)) {
    return false;
  }

  const explicitSymbols = question.match(/\b[A-Z]{1,5}(?:\.[A-Z]{1,3})?\b/g) || [];
  const excluded = new Set([
    "WTI",
    "DXY",
    "CPI",
    "PCE",
    "FED",
    "GDP",
    "ECB",
    "BOJ",
    "BOE",
    "RBA",
    "US",
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "UK",
    "EU",
    "FX",
    "AI",
    "EIA",
    "LNG",
    "VIX",
    "OAS",
    "IG",
    "HY",
    "NAV"
  ]);
  const hasLikelyTicker = explicitSymbols.some((symbol) => !excluded.has(symbol));
  return hasLikelyTicker && /\b(why|moving|move|up|down|rally|selloff|compare|versus|vs|price|stock|shares?)\b/i.test(question);
}

function hasStrongNonEquityIntent(question: string): boolean {
  const text = question.toLowerCase();
  return (
    /\b(henry hub|natural gas|gas storage|lng feedgas|bcf|eia storage|five-year range)\b/.test(text) ||
    /\b(vix|high-yield|hy spreads?|oas|ig spreads?|credit etf|discount to nav|liquidity stress|degrossing|de-grossing|crowded|crowding|high-short-interest|correlations? (are )?(jumping|rising|spiking))\b/.test(text) ||
    /\b(eur\/usd|eurusd|usd\/jpy|usdjpy|dxy|currency|fx perspective|central-bank divergence|rate differential|real yields? rose versus)\b/.test(text) ||
    /\b(treasury auction|tailed|bid-to-cover|indirect demand|dealer takedown|10s30s)\b/.test(text) ||
    /\b(sofr|ois|effective fed funds|fed funds|rrp|reverse repo|repo rates?|money-market plumbing|bill yields)\b/.test(text)
  );
}

function hasAskedSectorFrame(text: string, sector: string): boolean {
  const aliases = sectorAliases(sector);

  return aliases.some((alias) => {
    const escaped = escapeRegex(alias);
    return (
      new RegExp(`\\bas\\s+(an?\\s+)?${escaped}\\b`).test(text) ||
      new RegExp(`\\bfrom\\s+(an?\\s+)?${escaped}\\s+(perspective|standpoint|lens)\\b`).test(text)
    );
  });
}

function sectorAliases(sector: string): string[] {
  const normalizedSector = sector.toLowerCase();
  if (normalizedSector === "risk/sentiment") return ["risk/sentiment", "risk sentiment"];
  if (normalizedSector === "commodities") return ["commodities", "commodity"];
  if (normalizedSector === "equities") return ["equities", "equity"];
  return [normalizedSector];
}

function hasPhysicalCommodityIntent(question: string): boolean {
  const text = question.toLowerCase();
  return /\b(wti|brent|crude|oil price|inventory|inventories|cushing|opec|refinery|barrels?|physical tightness|backwardation|contango|calendar spread|eia)\b/.test(text) &&
    !/\b(stocks?|tickers?|companies|names?|etfs?|watchlist|buy|own|invest)\b/.test(text);
}

function hasNegatedSectorFrame(text: string, sector: string): boolean {
  const normalizedSector = sector.toLowerCase();
  const aliases =
    normalizedSector === "risk/sentiment"
      ? ["risk/sentiment", "risk sentiment"]
      : normalizedSector === "commodities"
        ? ["commodities", "commodity"]
        : normalizedSector === "equities"
          ? ["equities", "equity", "stocks", "stock", "sectors", "sector"]
          : [normalizedSector];

  return aliases.some((alias) => {
    const escaped = escapeRegex(alias);
    return (
      new RegExp(`\\b(do not|don't|dont)\\s+(answer|route|treat|frame)?\\s*(this\\s*)?(as|like)?\\s*${escaped}\\b`).test(text) ||
      new RegExp(`\\bnot\\s+${escaped}\\b`).test(text) ||
      new RegExp(`\\bnot\\s+(as|a|an)\\s+${escaped}\\b`).test(text) ||
      new RegExp(`\\b(rather than|instead of)\\s+${escaped}\\b`).test(text)
    );
  });
}

function scoreKnowledgeRoutingMatch(
  documents: Array<{ title: string; summary: string; content: string }>,
  question: string
): number {
  const tokens = tokenizeRouting(question);
  if (tokens.length === 0 || documents.length === 0) {
    return 0;
  }

  let best = 0;
  for (const document of documents) {
    const metadata = extractRoutingMetadata(document.content);
    const haystack = [document.title, document.summary, metadata].join(" ").toLowerCase();
    const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 0.5 : 0), 0);
    best = Math.max(best, score);
  }

  return Math.min(best, 6);
}

function extractRoutingMetadata(content: string): string {
  const matches = [
    content.match(/^## Coverage\n(.+)$/m)?.[1] ?? "",
    content.match(/^## Triggers\n(.+)$/m)?.[1] ?? "",
    content.match(/^## Use When\n(.+)$/m)?.[1] ?? "",
    content.match(/^## Instruments\n(.+)$/m)?.[1] ?? ""
  ];
  return matches.join(" ").toLowerCase();
}

function tokenizeRouting(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/\b2-year\b/g, "2year")
    .replace(/\b10-year\b/g, "10year")
    .replace(/\bequal-weight\b/g, "equalweight")
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function containsWord(text: string, term: string): boolean {
  return new RegExp(`\\b${escapeRegex(term)}\\b`).test(text.replace(/\b2-year\b/g, "2year").replace(/\b10-year\b/g, "10year"));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function generateAgentQuestionReply(
  env: Env,
  agent: Agent,
  messages: MarketQuestionMessage[],
  latestQuestion: string
): Promise<MarketQuestionMessage> {
  const repositories = createRepositories(env);
  const previousSnapshotRecord = await repositories.marketSnapshots.getLatest();
  const previousSnapshot = previousSnapshotRecord ? parseSnapshotPayload(previousSnapshotRecord.payloadJson) : null;
  const marketSnapshot = await fetchLatestMarketSnapshot(env, latestQuestion, {
    previousSnapshot,
    now: new Date().toISOString()
  });
  const [officialBriefing, yahooBriefing] = await Promise.all([
    fetchOfficialCatalystLayer(env, [agent]),
    fetchYahooFinanceBriefing([agent])
  ]);
  const headlines = dedupeHeadlines([
    ...(officialBriefing.headlinesByAgentId.get(agent.id) || []),
    ...(yahooBriefing.headlinesByAgentId.get(agent.id) || []),
    ...marketSnapshot.headlines
  ]).slice(0, 6);
  const relevantCases = await listRelevantMarketCasesForAgent(env, agent, marketSnapshot, "question_thread", 4);
  const equityQuoteContext =
    agent.sector === "Equities" && hasEquityQuoteIntent(latestQuestion)
      ? await buildEquityQuoteContext(latestQuestion)
      : null;
  const knowledgeSnippets = await findRelevantKnowledgeSnippets(
    env,
    agent,
    [
      latestQuestion,
      marketSnapshot.headline,
      marketSnapshot.summary,
      ...headlines.map((headline) => headline.title)
    ].join("\n"),
    4
  );
  const dynamicMemory = await buildDynamicMemoryContext(env, agent);

  const content =
    isLlmConfigured(env)
      ? await requestAgentQuestionReply(env, agent, messages, marketSnapshot, headlines, relevantCases, knowledgeSnippets, dynamicMemory, equityQuoteContext)
      : fallbackQuestionReply(agent, marketSnapshot, latestQuestion);

  const chartData = buildChartDataFromQuestion(latestQuestion);
  const finalContent = chartData ? `${content}\n[CHART_JSON:${JSON.stringify(chartData)}]` : content;

  return {
    id: crypto.randomUUID(),
    threadId: messages[0]?.threadId || crypto.randomUUID(),
    role: "assistant",
    agentId: agent.id,
    agentName: agent.name,
    agentSector: agent.sector,
    content: finalContent,
    createdAt: new Date().toISOString()
  };
}

async function requestAgentQuestionReply(
  env: Env,
  agent: Agent,
  messages: MarketQuestionMessage[],
  marketSnapshot: MarketSnapshotPayload,
  headlines: SnapshotHeadline[],
  relevantCases: import("@market-room/shared").MarketCase[],
  knowledgeSnippets: import("./knowledgeSnippetService").LocalKnowledgeSnippet[],
  dynamicMemory: import("@market-room/shared").DynamicMemoryContext,
  equityQuoteContext: EquityQuoteContext | null
): Promise<string> {
  try {
    const payload = await generateGeminiContent(env, {
      model: getLlmModel(env),
      instructions: [
        agent.systemPrompt,
        `Agent memory: ${agent.memorySummary}`,
        "You are answering a user's market question in a dedicated private thread.",
        "Treat user messages as sentiment, curiosity, or hypothesis, not as established facts.",
        "If the user premise is wrong, correct it gently using current market data, fresh headlines, and historical analogs.",
        "Use actual available market context before agreeing with the user.",
        "Do not claim another agent is working behind the scenes. If a different specialist is needed, answer only if you are that selected agent; otherwise say the thread should be routed to that specialist.",
        "Do not invent exact correlations, charts, or backtest numbers. Use only supplied historical-data context for exact statistics, and say when a requested series is not currently available.",
        "Be conversational and helpful, not defensive or robotic.",
        "Keep the reply under 220 words and end with one follow-up prompt or one next thing to watch."
      ].join("\n"),
      prompt: buildQuestionThreadPrompt(agent, messages, marketSnapshot, headlines, relevantCases, knowledgeSnippets, dynamicMemory, equityQuoteContext),
      maxOutputTokens: equityQuoteContext ? 900 : 700,
      temperature: 0.3
    });
    const directText = sanitizeQuestionReplyContent(extractResponseOutputText(payload));
    return directText || fallbackQuestionReply(agent, marketSnapshot, messages[messages.length - 1]?.content || "");
  } catch {
    return fallbackQuestionReply(agent, marketSnapshot, messages[messages.length - 1]?.content || "");
  }
}

function buildQuestionThreadPrompt(
  agent: Agent,
  messages: MarketQuestionMessage[],
  marketSnapshot: MarketSnapshotPayload,
  headlines: SnapshotHeadline[],
  relevantCases: import("@market-room/shared").MarketCase[],
  knowledgeSnippets: import("./knowledgeSnippetService").LocalKnowledgeSnippet[],
  dynamicMemory: import("@market-room/shared").DynamicMemoryContext,
  equityQuoteContext: EquityQuoteContext | null
): string {
  const relevantInstruments = relevantInstrumentsForQuestion(agent, marketSnapshot);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";
  const stockIdeaMode = agent.sector === "Equities" && hasStockIdeaIntent(latestUserMessage);

  return [
    `Assigned agent: ${agent.name} (${agent.sector})`,
    `Snapshot headline: ${marketSnapshot.headline}`,
    `Snapshot summary: ${marketSnapshot.summary}`,
    relevantInstruments.length > 0 ? "Relevant market metrics:" : "No relevant market metrics available.",
    ...relevantInstruments.map((instrument) => `- ${formatInstrumentForPrompt(instrument)} [${instrument.source}]`),
    headlines.length > 0 ? "Relevant headlines:" : "No fresh headlines available.",
    ...headlines.map((headline, index) => `${index + 1}. ${headline.title} (${headline.source})`),
    buildEquityQuotePromptBlock(equityQuoteContext),
    buildHistoricalDataPromptBlock(latestUserMessage),
    stockIdeaMode ? buildStockIdeaAnswerModeBlock(latestUserMessage) : "",
    buildDynamicMemoryPromptBlock(agent, dynamicMemory),
    knowledgeSnippets.length > 0 ? "Relevant long-term memory snippets:" : "No approved long-term memory snippets available.",
    ...knowledgeSnippets.map(
      (snippet, index) => `${index + 1}. ${snippet.title} [${snippet.category}] ${snippet.excerpt}`
    ),
    relevantCases.length > 0 ? "Relevant historical analogs:" : "No analog cases available.",
    ...relevantCases.map(
      (marketCase, index) =>
        `${index + 1}. ${marketCase.title} | pattern=${marketCase.patternSummary} | implication=${marketCase.implicationNote}`
    ),
    "Conversation so far:",
    ...messages.map((message) => `${message.role === "user" ? "User" : message.agentName || agent.name}: ${message.content}`),
    "Answer the latest user message directly. Treat the user's framing as sentiment or a hypothesis that may be incomplete or wrong."
  ].filter(Boolean).join("\n");
}

function buildStockIdeaAnswerModeBlock(question: string): string {
  const basket = thematicEquityBasketForQuestion(question);

  return [
    "## Stock-Idea Answer Mode",
    "The user is asking for investable stocks, names, ETFs, or a watchlist. Do not answer only with macro, WTI, commodity, or index context.",
    "Give a categorized list of named candidates, explain the market driver for each category, and separate direct plays from second-order beneficiaries.",
    "Be clear that this is a watchlist / thematic screen, not personalized financial advice or a live valuation-ranked buy list.",
    "For each category, include what would make the idea work, what would invalidate it, and the main false signal.",
    basket
  ].join("\n");
}

function thematicEquityBasketForQuestion(question: string): string {
  const text = question.toLowerCase();

  if (/\b(green|clean energy|renewable|solar|wind|battery|lithium|ev|electrification|grid)\b/.test(text)) {
    return [
      "Relevant green / clean-energy basket candidates:",
      "- Solar manufacturing / equipment: FSLR, ENPH, SEDG, RUN. Driver: policy support, module pricing, financing rates, residential/commercial demand.",
      "- Renewable utilities / operators: NEE, BEP, IBE.MC, ORSTED.CO. Driver: power prices, project economics, bond yields, subsidy visibility.",
      "- Grid and electrification picks-and-shovels: ETN, SU.PA, PWR, ABBNY. Driver: grid capex, data-center power demand, electrification infrastructure.",
      "- Batteries / lithium supply chain: ALB, SQM, LAC, PCRFY. Driver: lithium prices, EV demand, China supply, inventory cycle.",
      "- Basket ETFs: TAN, ICLN, QCLN. Use when the user wants theme exposure rather than single-name risk.",
      "Key false signal: higher oil does not automatically mean green stocks outperform. For many clean-energy equities, real yields and financing conditions matter more than WTI."
    ].join("\n");
  }

  if (/\b(oil stocks|energy stocks|higher oil|wti|brent|opec)\b/.test(text)) {
    return [
      "Relevant energy-equity basket candidates:",
      "- Integrated majors: XOM, CVX, SHEL, TTE. Driver: oil price, refining margin, capital returns, balance-sheet quality.",
      "- E&P / upstream beta: COP, EOG, PXD-style upstream exposure, DVN, FANG. Driver: WTI/Brent beta, production growth, shale discipline.",
      "- Oilfield services: SLB, HAL, BKR. Driver: capex cycle, rig count, international project activity.",
      "- Midstream / pipelines: ENB, KMI, WMB, ET. Driver: volumes and yield, less direct spot-oil beta.",
      "- ETFs: XLE, XOP, OIH. Use to separate large-cap quality, E&P beta, and services beta.",
      "Key false signal: a WTI spike helps equities only if it is not demand destruction or policy/geopolitical risk that compresses market multiples."
    ].join("\n");
  }

  if (/\b(ai|semiconductor|chips|data center|datacenter|cloud|compute)\b/.test(text)) {
    return [
      "Relevant AI / infrastructure basket candidates:",
      "- Semiconductors / accelerators: NVDA, AMD, AVGO, MRVL. Driver: AI capex, supply constraints, margin durability.",
      "- Equipment / foundry: ASML, TSM, AMAT, LRCX. Driver: capex cycle, export controls, foundry utilization.",
      "- Power / electrification: ETN, VRT, PWR, SU.PA. Driver: data-center power demand and grid bottlenecks.",
      "- Cloud/platform: MSFT, AMZN, GOOGL. Driver: AI monetization vs capex intensity.",
      "Key false signal: AI revenue growth is not enough if capex intensity rises faster than free cash flow visibility."
    ].join("\n");
  }

  return [
    "If no specific theme is clear, structure the answer as: core quality names, high-beta names, picks-and-shovels names, ETF alternatives, key macro driver, invalidation signal.",
    "Ask one follow-up only if the user did not specify region, risk tolerance, or theme."
  ].join("\n");
}

function relevantInstrumentsForQuestion(agent: Agent, marketSnapshot: MarketSnapshotPayload): SnapshotInstrument[] {
  const keyGroups: Record<string, string[]> = {
    Macro: ["us10y", "dxy", "sp500", "wti", "gold"],
    Equities: ["sp500", "nasdaq", "dxy", "us10y", "gold"],
    Commodities: ["wti", "brent", "natural_gas", "copper", "gold"],
    FX: ["dxy", "us10y", "gold", "sp500"],
    Rates: ["us10y", "dxy", "gold", "sp500"],
    "Risk/Sentiment": ["sp500", "nasdaq", "gold", "dxy", "us10y"]
  };

  return (keyGroups[agent.sector] || [])
    .map((key) => marketSnapshot.instruments.find((instrument) => instrument.key === key))
    .filter((instrument): instrument is SnapshotInstrument => Boolean(instrument));
}

function fallbackQuestionReply(agent: Agent, marketSnapshot: MarketSnapshotPayload, question: string): string {
  if (agent.sector === "Equities" && hasEquityQuoteIntent(question)) {
    if (!hasStockIdeaIntent(question)) {
      return fallbackEquitySingleStockMovementReply(question);
    }
    return fallbackEquityStockIdeaReply(question);
  }

  const anchorSummary = summarizeRelevantFallbackInstruments(agent, marketSnapshot);

  return `${agent.name} would frame that through ${agent.sector.toLowerCase()} conditions rather than taking the premise at face value. Right now the market snapshot is anchored by ${anchorSummary}. If your question assumes a stronger or cleaner move than the data shows, the safer read is to check whether price action, headlines, and cross-asset confirmation actually support it. The next thing I would watch is whether that thesis broadens beyond the first market signal.`;
}

function fallbackEquitySingleStockMovementReply(question: string): string {
  const explicitSymbols = question.match(/\b[A-Z]{1,5}(?:\.[A-Z]{1,3})?\b/g) || [];
  const symbol = explicitSymbols.find((candidate) => !["CPI", "PCE", "FED", "GDP", "DXY", "WTI", "US", "UK", "AI"].includes(candidate)) || "the stock";
  const lower = question.toLowerCase();
  const signals: string[] = [];

  if (/margin|gross margin|operating margin/.test(lower)) {
    signals.push("margin pressure points to earnings-quality deterioration");
  }
  if (/guidance|outlook/.test(lower)) {
    signals.push("guidance quality matters more than the backward-looking beat");
  }
  if (/real yield|yields|rates|10-year|10 year/.test(lower)) {
    signals.push("higher real yields pressure the valuation multiple, especially for long-duration growth stocks");
  }
  if (/revenue beat|beat/.test(lower)) {
    signals.push("a headline beat is not enough if cash flow, margins, or guidance disappoint");
  }

  const mechanism = signals.length > 0
    ? signals.join("; ")
    : "separate company-specific news from sector beta, factor beta, and valuation multiple pressure";

  return [
    `${symbol} should be read as a single-stock movement question, not a watchlist request.`,
    `The first-pass attribution is: ${mechanism}.`,
    "I would not call it a full thesis change unless the weakness persists beyond one print and shows up in forward guidance, margin trajectory, cash conversion, or estimate revisions.",
    "If the stock fell despite a headline beat, the likely market message is multiple compression or earnings-quality concern rather than simple sector beta.",
    "Next thing to watch: whether analysts cut forward estimates and whether the move is isolated to the stock or spreading across the sector/factor group."
  ].join("\n\n");
}

function fallbackEquityStockIdeaReply(question: string): string {
  const basket = thematicEquityBasketForQuestion(question)
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .slice(0, 8)
    .join("\n");

  return [
    "For a stock-name question, I would treat this as a watchlist screen rather than a personalized buy recommendation.",
    basket,
    "The key regime filter is real yields and financing conditions: if real yields rise or credit spreads widen, long-duration thematic stocks can underperform even when the theme is attractive.",
    "Next thing to watch: whether the basket is being driven by company fundamentals and breadth, or only by a short-lived theme headline."
  ].join("\n\n");
}

function buildQuestionThreadTitle(question: string, agent: Agent): string {
  const trimmed = question.trim().replace(/\s+/g, " ");
  const short = trimmed.length > 84 ? `${trimmed.slice(0, 81)}...` : trimmed;
  return `${agent.sector}: ${short}`;
}

function sanitizeQuestionReplyContent(content: string | null): string | null {
  if (!content) {
    return null;
  }

  const cleaned = content
    .replace(/filecite[^ ]+/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned || null;
}

function summarizeRelevantFallbackInstruments(agent: Agent, marketSnapshot: MarketSnapshotPayload): string {
  const instruments = relevantInstrumentsForQuestion(agent, marketSnapshot).slice(0, 3);

  if (instruments.length === 0) {
    return marketSnapshot.headline.toLowerCase();
  }

  return instruments.map((instrument) => formatInstrumentForSummary(instrument)).join(", ");
}

function formatInstrumentForPrompt(instrument: SnapshotInstrument): string {
  const base = `${instrument.label}: ${formatInstrumentValue(instrument)}`;
  const change = formatChangeValue(instrument.change);
  return change ? `${base} (${change})` : base;
}

function formatInstrumentForSummary(instrument: SnapshotInstrument): string {
  const change = formatChangeValue(instrument.change);
  const base = `${instrument.label} ${formatInstrumentValue(instrument)}`;
  return change ? `${base} ${change}` : base;
}

function formatInstrumentValue(instrument: SnapshotInstrument): string {
  const rawValue = instrument.value.trim();

  if (rawValue.startsWith("$")) {
    const formattedCurrency = formatTrimmedNumber(rawValue.slice(1), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formattedCurrency ? `$${formattedCurrency}` : rawValue;
  }

  if (rawValue.endsWith("%")) {
    const formattedPercent = formatTrimmedNumber(rawValue.slice(0, -1), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      forceSign: rawValue.startsWith("+") || rawValue.startsWith("-")
    });
    return formattedPercent ? `${formattedPercent}%` : rawValue;
  }

  const formattedNumber = formatTrimmedNumber(rawValue, {
    minimumFractionDigits: rawValue.includes(".") ? 0 : 0,
    maximumFractionDigits: 2
  });

  return formattedNumber || rawValue;
}

function formatChangeValue(change: string | null | undefined): string | null {
  if (!change) {
    return null;
  }

  const trimmed = change.trim();

  if (trimmed.toLowerCase().includes("bps")) {
    return trimmed;
  }

  if (trimmed.endsWith("%")) {
    const formattedPercent = formatTrimmedNumber(trimmed.slice(0, -1), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      forceSign: true
    });
    return formattedPercent ? `${formattedPercent}%` : trimmed;
  }

  if (trimmed.startsWith("$")) {
    const formattedCurrency = formatTrimmedNumber(trimmed.slice(1), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      forceSign: trimmed.startsWith("$+") || trimmed.startsWith("$-")
    });
    return formattedCurrency ? `$${formattedCurrency}` : trimmed;
  }

  return trimmed;
}

function formatTrimmedNumber(
  value: string,
  options: { minimumFractionDigits: number; maximumFractionDigits: number; forceSign?: boolean }
): string | null {
  const normalized = value.replace(/,/g, "");
  const isExplicitPositive = normalized.startsWith("+");
  const isExplicitNegative = normalized.startsWith("-");
  const numeric = Number.parseFloat(normalized);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits
  });
  let formatted = formatter.format(numeric);

  if (options.forceSign && numeric > 0 && !formatted.startsWith("+")) {
    formatted = `+${formatted}`;
  }

  if (!options.forceSign && isExplicitPositive && numeric > 0 && !formatted.startsWith("+")) {
    formatted = `+${formatted}`;
  }

  if (isExplicitNegative && numeric < 0 && !formatted.startsWith("-")) {
    formatted = `-${formatted}`;
  }

  return formatted;
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

function parseSnapshotPayload(payloadJson: string): MarketSnapshotPayload | null {
  try {
    return JSON.parse(payloadJson) as MarketSnapshotPayload;
  } catch {
    return null;
  }
}
