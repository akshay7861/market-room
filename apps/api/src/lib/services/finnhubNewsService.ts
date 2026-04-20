/**
 * Finnhub News Service
 *
 * Adds Finnhub as a parallel catalyst source for Market Room. It mirrors the
 * Marketaux briefing contract so the existing downstream dedupe, novelty,
 * routing, and fetched-news logging can remain unchanged.
 */
import type { Agent, SnapshotHeadline } from "@market-room/shared";
import type { Env } from "../../index";
import type { FetchedNewsItem } from "../repositories/fetchedNewsRepository";

type FinnhubArticle = {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  summary: string | null;
  related: string;
  source: string;
  url: string;
};

const SECTOR_KEYWORDS: Record<string, string[]> = {
  Macro: ["fed", "inflation", "cpi", "pce", "gdp", "jobs", "payroll", "growth", "retail", "consumer", "policy", "yield", "spending", "fomc", "powell", "tariff", "recession"],
  Rates: ["yield", "treasury", "bond", "curve", "breakeven", "auction", "fed", "duration", "slr", "leverage", "bps", "10y", "2y", "note"],
  FX: ["dollar", "fx", "currency", "euro", "yen", "sterling", "carry", "em", "funding", "dxy", "exchange", "gbp", "usd", "eur", "jpy"],
  Equities: ["stock", "equity", "earnings", "ai", "semiconductor", "bank", "sector", "breadth", "s&p", "nasdaq", "valuation", "ipo", "buyback", "dividend"],
  Commodities: ["oil", "wti", "brent", "crude", "barrel", "gas", "gold", "copper", "opec", "metal", "inventory", "supply", "demand", "bcf", "storage", "draw", "futures", "lng", "wheat", "corn", "silver"],
  "Risk/Sentiment": ["risk", "volatility", "credit", "spread", "fragile", "positioning", "selloff", "bitcoin", "vix", "default", "stress", "hedge", "safe-haven"]
};

const NOISE_TITLE_PATTERNS: RegExp[] = [
  /markets?\s+(?:remain|are|stay|look)\s+(?:broadly|cautiously|generally)/i,
  /broadly\s+(?:similar|unchanged|stable|supportive|positive|negative|flat)/i,
  /investors?\s+(?:await|watch|eye|monitor)\s+/i,
  /week\s+ahead[\s:]/i,
  /what\s+to\s+watch\s+(?:this\s+)?week/i,
  /markets?\s+(?:digest|absorb|weigh)/i,
  /no\s+major\s+(?:moves?|changes?|catalyst)/i,
  /mixed\s+(?:signals?|picture|session)/i
];

const MECHANISM_WORDS = /\b(?:cut|hike|ban|beats?|misses?|surges?|plunges?|spikes?|draw|surplus|deficit|suspend|reject|impose|lift|sanction|merger|acquisition|bankruptcy|default|downgrade|upgrade)\b/i;
const HAS_NUMBER = /\b\d+(?:[.,]\d+)?(?:\s*%|bps|k|bn|b\b|bbl|mmb|\/oz)?\b/;
const FINNHUB_BASE = "https://finnhub.io/api/v1/news";
const FINNHUB_CATEGORIES = ["general", "forex", "merger"];
const MARKET_RELEVANCE_WORDS =
  /\b(?:market|markets|stock|stocks|equity|equities|s&p|nasdaq|dow|russell|bond|bonds|treasury|yield|yields|fed|fomc|inflation|cpi|pce|payroll|jobs|gdp|recession|dollar|currency|forex|fx|euro|yen|rupee|oil|wti|brent|crude|gold|copper|commodity|commodities|earnings|revenue|profit|margin|guidance|merger|acquisition|ipo|buyback|dividend|credit|spread|vix|volatility|tariff|sanction)\b/i;
const EQUITY_MARKET_PHRASES =
  /\b(?:shares?\s+(?:rise|rises|rose|fall|falls|fell|drop|drops|jump|jumps|muted|wobble|wobbles|rally|rallies|slide|slides|gain|gains|lose|loses|close|closes|open|opens)|(?:indian|asian|european|u\.?s\.?|wall\s+street)\s+shares?)\b/i;
const FINANCIAL_RATE_PHRASES =
  /\b(?:interest\s+rates?|policy\s+rates?|fed\s+funds|rate\s+(?:cut|cuts|hike|hikes|hold|holds)|rates?\s+(?:cut|cuts|hike|hikes|hold|holds|rise|fall|jump|drop))\b/i;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeyword(text: string, keyword: string): boolean {
  if (keyword.length <= 3) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}(?=[^a-z0-9]|$)`, "i").test(text);
  }
  return text.includes(keyword);
}

function articleUuid(article: FinnhubArticle): string {
  return `fh_${article.id}`;
}

function publishedAt(article: FinnhubArticle): string | undefined {
  if (!Number.isFinite(article.datetime) || article.datetime <= 0) return undefined;
  return new Date(article.datetime * 1000).toISOString();
}

function articleDescription(article: FinnhubArticle): string {
  return article.summary?.trim() || "";
}

function articleEntities(article: FinnhubArticle): string[] {
  const related = article.related?.trim();
  return related ? [related] : [];
}

function hasMarketRelevance(article: FinnhubArticle): boolean {
  if (article.category === "forex" || article.category === "merger") return true;
  if (articleEntities(article).length > 0) return true;
  const text = `${article.headline} ${articleDescription(article)}`;
  return MARKET_RELEVANCE_WORDS.test(text) || EQUITY_MARKET_PHRASES.test(text) || FINANCIAL_RATE_PHRASES.test(text);
}

function scoreArticle(article: FinnhubArticle): number {
  let score = 0;
  const description = articleDescription(article);
  const articlePublishedAt = publishedAt(article);
  const ageHours = articlePublishedAt
    ? (Date.now() - new Date(articlePublishedAt).getTime()) / 3_600_000
    : Number.POSITIVE_INFINITY;

  if (ageHours <= 6) score += 30;
  else if (ageHours <= 12) score += 20;
  else if (ageHours <= 24) score += 10;

  if (description.length > 80) score += 20;
  else if (description.length > 30) score += 10;

  if (articleEntities(article).length > 0) score += 15;
  if (HAS_NUMBER.test(article.headline)) score += 10;
  if (MECHANISM_WORDS.test(article.headline)) score += 10;
  if (!NOISE_TITLE_PATTERNS.some((p) => p.test(article.headline))) score += 15;

  return Math.min(100, score);
}

function toSnapshotHeadline(article: FinnhubArticle): SnapshotHeadline {
  const entities = articleEntities(article);
  return {
    title: article.headline,
    source: article.source || "Finnhub",
    url: article.url || undefined,
    publishedAt: publishedAt(article),
    description: articleDescription(article) || undefined,
    entities: entities.length > 0 ? entities.slice(0, 8) : undefined
  };
}

function scoreArticleForSector(article: FinnhubArticle, sector: string, keywords: string[]): number {
  const text = `${article.headline} ${articleDescription(article)} ${article.related || ""} ${article.category || ""}`.toLowerCase();
  let score = keywords.filter((kw) => matchesKeyword(text, kw)).length;
  if (article.category === "forex" && sector === "FX") score += 2;
  if (article.category === "merger" && sector === "Equities") score += 2;
  return score;
}

async function fetchFinnhubCategory(apiKey: string, category: string): Promise<FinnhubArticle[]> {
  const query = new URLSearchParams({ category, token: apiKey });
  const response = await fetch(`${FINNHUB_BASE}?${query.toString()}`, {
    headers: { "Accept": "application/json" }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Finnhub API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as FinnhubArticle[] | { error?: string; msg?: string };
  if (!Array.isArray(data)) {
    throw new Error(`Finnhub API error: ${data.error || data.msg || "unexpected response"}`);
  }

  return data.map((article) => ({ ...article, category: article.category || category }));
}

export async function fetchFinnhubBriefing(
  env: Env,
  agents: Agent[]
): Promise<{
  generalHeadlines: SnapshotHeadline[];
  headlinesByAgentId: Map<string, SnapshotHeadline[]>;
  logItems: Omit<FetchedNewsItem, "eventId">[];
}> {
  const empty = {
    generalHeadlines: [],
    headlinesByAgentId: new Map<string, SnapshotHeadline[]>(),
    logItems: []
  };

  if (!env.FINNHUB_API_KEY) {
    console.log("[finnhub] No API key configured - skipping.");
    return empty;
  }

  const settled = await Promise.allSettled(
    FINNHUB_CATEGORIES.map((category) => fetchFinnhubCategory(env.FINNHUB_API_KEY!, category))
  );

  const rawArticles: FinnhubArticle[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") rawArticles.push(...result.value);
    else console.error("[finnhub] Category fetch failed:", result.reason);
  }

  if (rawArticles.length === 0) {
    console.log("[finnhub] No articles returned from any category.");
    return empty;
  }

  let seenRecentUuids = new Set<string>();
  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const result = await env.DB.prepare(
      `SELECT DISTINCT article_uuid FROM fetched_news_items
       WHERE provider = 'finnhub' AND fetched_at >= ? AND selection_outcome = 'selected'`
    ).bind(cutoff).all<{ article_uuid: string }>();
    seenRecentUuids = new Set(result.results.map((r) => r.article_uuid));
    if (seenRecentUuids.size > 0) {
      console.log(`[finnhub] Cross-run dedup: ${seenRecentUuids.size} UUIDs already seen in last 2h`);
    }
  } catch {
    // If fetched_news_items is unavailable, continue without cross-run dedup.
  }

  const now = new Date().toISOString();
  const seenUuids = new Set<string>();
  const candidates: Array<FinnhubArticle & { selectionScore: number; selectionOutcome: FetchedNewsItem["selectionOutcome"] }> = [];

  for (const article of rawArticles) {
    const uuid = articleUuid(article);
    if (seenUuids.has(uuid)) continue;
    seenUuids.add(uuid);

    const description = articleDescription(article);
    const articlePublishedAt = publishedAt(article);
    const ageHours = articlePublishedAt
      ? (Date.now() - new Date(articlePublishedAt).getTime()) / 3_600_000
      : Number.POSITIVE_INFINITY;

    if (seenRecentUuids.has(uuid)) {
      candidates.push({ ...article, selectionScore: 0, selectionOutcome: "rejected_seen" });
      continue;
    }

    if (ageHours > 24) {
      candidates.push({ ...article, selectionScore: 0, selectionOutcome: "rejected_stale" });
      continue;
    }

    if (!description || description.length < 20) {
      candidates.push({ ...article, selectionScore: 0, selectionOutcome: "rejected_no_description" });
      continue;
    }

    if (!hasMarketRelevance(article)) {
      candidates.push({ ...article, selectionScore: 0, selectionOutcome: "rejected_noise" });
      continue;
    }

    if (NOISE_TITLE_PATTERNS.some((p) => p.test(article.headline))) {
      candidates.push({ ...article, selectionScore: 0, selectionOutcome: "rejected_noise" });
      continue;
    }

    candidates.push({ ...article, selectionScore: scoreArticle(article), selectionOutcome: "selected" });
  }

  const scored = candidates
    .filter((candidate) => candidate.selectionOutcome === "selected")
    .sort((a, b) => b.selectionScore - a.selectionScore);

  const selectedArticles: FinnhubArticle[] = [];
  const selectedTokenSets: string[][] = [];

  for (const candidate of scored) {
    const tokens = tokenize(`${candidate.headline} ${articleDescription(candidate)}`);
    const tooSimilar = selectedTokenSets.some((existing) => jaccardSimilarity(tokens, existing) >= 0.65);
    if (tooSimilar) {
      candidate.selectionOutcome = "rejected_duplicate";
      continue;
    }
    selectedArticles.push(candidate);
    selectedTokenSets.push(tokens);
    if (selectedArticles.length >= 12) break;
  }

  const headlinesByAgentId = new Map<string, SnapshotHeadline[]>();
  const articleRoutedTo = new Map<string, string[]>();

  for (const agent of agents) {
    const keywords = SECTOR_KEYWORDS[agent.sector] || [];
    const agentHeadlines: SnapshotHeadline[] = [];

    for (const article of selectedArticles) {
      if (agentHeadlines.length >= 3) break;
      const sectorScore = scoreArticleForSector(article, agent.sector, keywords);
      if (sectorScore > 0) {
        agentHeadlines.push(toSnapshotHeadline(article));
        const uuid = articleUuid(article);
        const existing = articleRoutedTo.get(uuid) || [];
        existing.push(agent.id);
        articleRoutedTo.set(uuid, existing);
      }
    }

    if (agentHeadlines.length > 0) {
      headlinesByAgentId.set(agent.id, agentHeadlines);
    }
  }

  const logItems: Omit<FetchedNewsItem, "eventId">[] = candidates.map((candidate) => {
    const uuid = articleUuid(candidate);
    const routedTo = articleRoutedTo.get(uuid) || [];
    const entities = articleEntities(candidate);

    return {
      id: `fh_${candidate.id}_${Date.now()}`,
      articleUuid: uuid,
      provider: "finnhub",
      title: candidate.headline,
      source: candidate.source || "Finnhub",
      url: candidate.url || undefined,
      publishedAt: publishedAt(candidate),
      description: articleDescription(candidate) || undefined,
      entitiesJson: entities.length > 0 ? JSON.stringify(entities) : undefined,
      selectionScore: candidate.selectionScore,
      selectionOutcome: candidate.selectionOutcome,
      routedAgentIdsJson: routedTo.length > 0 ? JSON.stringify(routedTo) : undefined,
      fetchedAt: now
    };
  });

  const generalHeadlines = selectedArticles.map(toSnapshotHeadline);

  console.log(
    `[finnhub] Fetched ${rawArticles.length} raw -> ${selectedArticles.length} selected -> ` +
    `${headlinesByAgentId.size} agents routed`
  );

  return { generalHeadlines, headlinesByAgentId, logItems };
}
