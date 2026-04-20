/**
 * Polygon News Service
 *
 * Adds Polygon as a parallel catalyst source for Market Room. It returns the
 * same briefing shape as Marketaux and Finnhub while keeping Polygon-specific
 * insights out of prompts for this phase.
 */
import type { Agent, SnapshotHeadline } from "@market-room/shared";
import type { Env } from "../../index";
import type { FetchedNewsItem } from "../repositories/fetchedNewsRepository";

type PolygonArticle = {
  id: string;
  published_utc: string;
  title: string;
  description: string | null;
  article_url: string;
  publisher?: { name?: string };
  tickers?: string[];
  keywords?: string[];
  insights?: Array<{
    ticker: string;
    sentiment: "bullish" | "bearish" | "neutral";
    sentiment_reasoning: string;
  }>;
};

type PolygonResponse = {
  results?: PolygonArticle[];
  status?: string;
  error?: string;
  message?: string;
};

const SECTOR_KEYWORDS: Record<string, string[]> = {
  Macro: ["fed", "inflation", "cpi", "pce", "gdp", "jobs", "payroll", "growth", "retail", "consumer", "policy", "yield", "spending", "fomc", "powell", "tariff", "recession"],
  Rates: ["yield", "treasury", "bond", "curve", "breakeven", "auction", "fed", "duration", "slr", "leverage", "bps", "10y", "2y", "note"],
  FX: ["dollar", "fx", "currency", "euro", "yen", "sterling", "carry", "em", "funding", "dxy", "exchange", "gbp", "usd", "eur", "jpy"],
  Equities: ["stock", "equity", "earnings", "ai", "semiconductor", "bank", "sector", "breadth", "s&p", "nasdaq", "valuation", "ipo", "buyback", "dividend"],
  Commodities: ["oil", "wti", "brent", "crude", "barrel", "gas", "gold", "copper", "opec", "metal", "inventory", "supply", "demand", "bcf", "storage", "draw", "futures", "lng", "wheat", "corn", "silver"],
  "Risk/Sentiment": ["risk", "volatility", "credit", "spread", "fragile", "positioning", "selloff", "bitcoin", "vix", "default", "stress", "hedge", "safe-haven"]
};

const SECTOR_TICKERS: Record<string, string[]> = {
  Equities: [],
  FX: ["UUP", "FXE", "FXY", "EEM"],
  "Risk/Sentiment": ["VXX", "HYG", "JNK", "TLT"],
  Rates: ["TLT", "IEF", "SHY", "TBT"],
  Commodities: ["GLD", "SLV", "USO", "UNG", "PDBC"]
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
const POLYGON_BASE = "https://api.polygon.io/v2/reference/news";

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

function articleUuid(article: PolygonArticle): string {
  return `pg_${article.id}`;
}

function articleDescription(article: PolygonArticle): string {
  return article.description?.trim() || "";
}

function articleEntities(article: PolygonArticle): string[] {
  return (article.tickers || []).map((ticker) => ticker.trim()).filter(Boolean).slice(0, 12);
}

function articleKeywords(article: PolygonArticle): string {
  return (article.keywords || []).join(" ");
}

function sourceName(article: PolygonArticle): string {
  return article.publisher?.name || "Polygon";
}

function scoreArticle(article: PolygonArticle): number {
  let score = 0;
  const description = articleDescription(article);
  const ageHours = (Date.now() - new Date(article.published_utc).getTime()) / 3_600_000;

  if (ageHours <= 6) score += 30;
  else if (ageHours <= 12) score += 20;
  else if (ageHours <= 24) score += 10;

  if (description.length > 80) score += 20;
  else if (description.length > 30) score += 10;

  if (articleEntities(article).length > 0) score += 15;
  if (HAS_NUMBER.test(article.title)) score += 10;
  if (MECHANISM_WORDS.test(article.title)) score += 10;
  if (!NOISE_TITLE_PATTERNS.some((p) => p.test(article.title))) score += 15;

  return Math.min(100, score);
}

function toSnapshotHeadline(article: PolygonArticle): SnapshotHeadline {
  const entities = articleEntities(article);
  return {
    title: article.title,
    source: sourceName(article),
    url: article.article_url || undefined,
    publishedAt: article.published_utc || undefined,
    description: articleDescription(article) || undefined,
    entities: entities.length > 0 ? entities : undefined
  };
}

function scoreArticleForSector(article: PolygonArticle, sector: string, keywords: string[]): number {
  const text = `${article.title} ${articleDescription(article)} ${articleKeywords(article)} ${(article.tickers || []).join(" ")}`.toLowerCase();
  let score = keywords.filter((kw) => text.includes(kw)).length;

  const tickers = new Set((article.tickers || []).map((ticker) => ticker.toUpperCase()));
  if (sector === "Equities" && tickers.size > 0) score += 3;

  const sectorTickers = SECTOR_TICKERS[sector] || [];
  if (sectorTickers.some((ticker) => tickers.has(ticker))) score += 3;

  return score;
}

async function fetchPolygonArticles(apiKey: string): Promise<PolygonArticle[]> {
  const query = new URLSearchParams({
    limit: "50",
    sort: "published_utc.desc",
    apiKey
  });
  const response = await fetch(`${POLYGON_BASE}?${query.toString()}`, {
    headers: { "Accept": "application/json" }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Polygon API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as PolygonResponse;
  if (data.error || data.status === "ERROR") {
    throw new Error(`Polygon API error: ${data.error || data.message || "unexpected response"}`);
  }

  return data.results || [];
}

export async function fetchPolygonBriefing(
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

  if (!env.POLYGON_API_KEY) {
    console.log("[polygon] No API key configured - skipping.");
    return empty;
  }

  let rawArticles: PolygonArticle[] = [];
  try {
    rawArticles = await fetchPolygonArticles(env.POLYGON_API_KEY);
  } catch (err) {
    console.error("[polygon] Fetch failed:", err);
    return empty;
  }

  if (rawArticles.length === 0) {
    console.log("[polygon] No articles returned.");
    return empty;
  }

  let seenRecentUuids = new Set<string>();
  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const result = await env.DB.prepare(
      `SELECT DISTINCT article_uuid FROM fetched_news_items
       WHERE provider = 'polygon' AND fetched_at >= ? AND selection_outcome = 'selected'`
    ).bind(cutoff).all<{ article_uuid: string }>();
    seenRecentUuids = new Set(result.results.map((r) => r.article_uuid));
    if (seenRecentUuids.size > 0) {
      console.log(`[polygon] Cross-run dedup: ${seenRecentUuids.size} UUIDs already seen in last 2h`);
    }
  } catch {
    // If fetched_news_items is unavailable, continue without cross-run dedup.
  }

  const now = new Date().toISOString();
  const seenUuids = new Set<string>();
  const candidates: Array<PolygonArticle & { selectionScore: number; selectionOutcome: FetchedNewsItem["selectionOutcome"] }> = [];

  for (const article of rawArticles) {
    const uuid = articleUuid(article);
    if (seenUuids.has(uuid)) continue;
    seenUuids.add(uuid);

    const description = articleDescription(article);
    const ageHours = (Date.now() - new Date(article.published_utc).getTime()) / 3_600_000;

    if (seenRecentUuids.has(uuid)) {
      candidates.push({ ...article, selectionScore: 0, selectionOutcome: "rejected_seen" });
      continue;
    }

    if (!Number.isFinite(ageHours) || ageHours > 24) {
      candidates.push({ ...article, selectionScore: 0, selectionOutcome: "rejected_stale" });
      continue;
    }

    if (!description || description.length < 20) {
      candidates.push({ ...article, selectionScore: 0, selectionOutcome: "rejected_no_description" });
      continue;
    }

    if (NOISE_TITLE_PATTERNS.some((p) => p.test(article.title))) {
      candidates.push({ ...article, selectionScore: 0, selectionOutcome: "rejected_noise" });
      continue;
    }

    candidates.push({ ...article, selectionScore: scoreArticle(article), selectionOutcome: "selected" });
  }

  const scored = candidates
    .filter((candidate) => candidate.selectionOutcome === "selected")
    .sort((a, b) => b.selectionScore - a.selectionScore);

  const selectedArticles: PolygonArticle[] = [];
  const selectedTokenSets: string[][] = [];

  for (const candidate of scored) {
    const tokens = tokenize(`${candidate.title} ${articleDescription(candidate)}`);
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
      id: `pg_${candidate.id}_${Date.now()}`,
      articleUuid: uuid,
      provider: "polygon",
      title: candidate.title,
      source: sourceName(candidate),
      url: candidate.article_url || undefined,
      publishedAt: candidate.published_utc || undefined,
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
    `[polygon] Fetched ${rawArticles.length} raw -> ${selectedArticles.length} selected -> ` +
    `${headlinesByAgentId.size} agents routed`
  );

  return { generalHeadlines, headlinesByAgentId, logItems };
}
