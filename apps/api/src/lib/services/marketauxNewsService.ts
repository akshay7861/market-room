/**
 * Marketaux News Service
 *
 * Fetches fresh market-moving articles from the Marketaux API and routes them
 * to the right agents by sector.  Up to 3 sequential requests × 3 articles each
 * = 9 raw candidates per refresh.  The best 6 are selected, scored, and assigned
 * to agent-specific headline lists so `analyzeTopHeadlinesForAgent` sees them first.
 *
 * Free tier: 3 articles per request, ~100 requests / day.
 */
import type { Agent, SnapshotHeadline } from "@market-room/shared";
import type { Env } from "../../index";
import type { FetchedNewsItem } from "../repositories/fetchedNewsRepository";

// ---------------------------------------------------------------------------
// Internal types (not exported)
// ---------------------------------------------------------------------------

type MarketauxEntity = {
  symbol?: string;
  name: string;
  type: string;
  industry?: string;
};

type MarketauxArticle = {
  uuid: string;
  title: string;
  description: string | null;
  snippet: string | null;         // Marketaux also returns snippet; use as description fallback
  url: string;
  source: string;                 // source.name in Marketaux response
  published_at: string;           // ISO timestamp
  entities: MarketauxEntity[];
  relevance_score?: number;
  sentiment?: number;
};

type RawMarketauxResponse = {
  data?: MarketauxArticle[];
  meta?: { found?: number; returned?: number };
  error?: { message?: string; code?: string };
};

// ---------------------------------------------------------------------------
// Sector keyword table — mirrors headlineAnalysisService.ts SECTOR_KEYWORDS
// ---------------------------------------------------------------------------

const SECTOR_KEYWORDS: Record<string, string[]> = {
  Macro:            ["fed", "inflation", "cpi", "pce", "gdp", "jobs", "payroll", "growth", "retail", "consumer", "policy", "yield", "spending", "fomc", "powell", "tariff", "recession"],
  Rates:            ["yield", "treasury", "bond", "curve", "breakeven", "auction", "fed", "duration", "slr", "leverage", "bps", "10y", "2y", "note"],
  FX:               ["dollar", "fx", "currency", "euro", "yen", "sterling", "carry", "em", "funding", "dxy", "exchange", "gbp", "usd", "eur", "jpy"],
  Equities:         ["stock", "equity", "earnings", "ai", "semiconductor", "bank", "sector", "breadth", "s&p", "nasdaq", "valuation", "ipo", "buyback", "dividend"],
  Commodities:      ["oil", "wti", "brent", "crude", "barrel", "gas", "gold", "copper", "opec", "metal", "inventory", "supply", "demand", "bcf", "storage", "draw", "futures", "lng", "wheat", "corn", "silver"],
  "Risk/Sentiment": ["risk", "volatility", "credit", "spread", "fragile", "positioning", "selloff", "bitcoin", "vix", "default", "stress", "hedge", "safe-haven"]
};

// ---------------------------------------------------------------------------
// Noise patterns — discard low-quality titles before scoring
// ---------------------------------------------------------------------------

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

// Words that indicate the headline contains a specific, market-moving event
const MECHANISM_WORDS = /\b(?:cut|hike|ban|beats?|misses?|surges?|plunges?|spikes?|draw|surplus|deficit|suspend|reject|impose|lift|sanction|merger|acquisition|bankruptcy|default|downgrade|upgrade)\b/i;
const HAS_NUMBER = /\b\d+(?:[.,]\d+)?(?:\s*%|bps|k|bn|b\b|bbl|mmb|\/oz)?\b/;

// ---------------------------------------------------------------------------
// Article selection scoring (0-100)
// ---------------------------------------------------------------------------

function scoreArticle(article: MarketauxArticle): number {
  let score = 0;
  const description = article.description || article.snippet || "";
  const now = Date.now();
  const publishedMs = new Date(article.published_at).getTime();
  const ageHours = (now - publishedMs) / 3_600_000;

  // Recency
  if (ageHours <= 6)  score += 30;
  else if (ageHours <= 12) score += 20;
  else if (ageHours <= 24) score += 10;
  // else 0 (24–48h)

  // Has a useful description
  if (description.length > 80) score += 20;
  else if (description.length > 30) score += 10;

  // Has entities (Marketaux parsed real companies / symbols)
  if (article.entities.length > 0) score += 15;

  // Specificity: title contains a number or %
  if (HAS_NUMBER.test(article.title)) score += 10;

  // Mechanism word in title
  if (MECHANISM_WORDS.test(article.title)) score += 10;

  // Not a noise pattern
  const isNoise = NOISE_TITLE_PATTERNS.some((p) => p.test(article.title));
  if (!isNoise) score += 15;

  return Math.min(100, score);
}

// ---------------------------------------------------------------------------
// Jaccard dedup — reject if too similar to an already-selected article
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Convert to SnapshotHeadline (extended shape)
// ---------------------------------------------------------------------------

function toSnapshotHeadline(article: MarketauxArticle): SnapshotHeadline {
  return {
    title: article.title,
    source: article.source,
    url: article.url,
    publishedAt: article.published_at,
    description: article.description || article.snippet || undefined,
    entities: article.entities.length > 0
      ? article.entities.map((e) => e.name).slice(0, 8)
      : undefined
  };
}

// ---------------------------------------------------------------------------
// Per-agent routing: score an article against a sector's keyword list
// ---------------------------------------------------------------------------

function scoreArticleForSector(article: MarketauxArticle, keywords: string[]): number {
  const text = `${article.title} ${article.description || ""} ${article.snippet || ""}`.toLowerCase();
  return keywords.filter((kw) => text.includes(kw)).length;
}

// ---------------------------------------------------------------------------
// Deterministic UUID / hash for non-UUID sources
// ---------------------------------------------------------------------------

function articleHash(article: MarketauxArticle): string {
  return article.uuid || djb2Hash(`${article.title}|${article.source}|${article.published_at}`);
}

function djb2Hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul((h << 5) + h, 1) ^ text.charCodeAt(i);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Single Marketaux API request
// ---------------------------------------------------------------------------

const MARKETAUX_BASE = "https://api.marketaux.com/v1/news/all";

async function fetchMarketauxPage(
  apiKey: string,
  params: Record<string, string>
): Promise<MarketauxArticle[]> {
  const published_after = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split(".")[0];
  const query = new URLSearchParams({
    api_token: apiKey,
    language: "en",
    filter_entities: "true",
    limit: "3",
    published_after,
    sort: "published_desc",
    group_similar: "true",
    ...params
  });

  const url = `${MARKETAUX_BASE}?${query.toString()}`;
  const response = await fetch(url, {
    headers: { "Accept": "application/json" }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Marketaux API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as RawMarketauxResponse;

  if (data.error) {
    throw new Error(`Marketaux API error: ${data.error.message || data.error.code}`);
  }

  return (data.data || []).map((raw) => ({
    ...raw,
    // Normalise source: Marketaux nests it in an object in some responses
    source: typeof (raw as unknown as { source: { name?: string; domain?: string } | string }).source === "object"
      ? ((raw as unknown as { source: { name?: string; domain?: string } }).source.name ||
         (raw as unknown as { source: { name?: string; domain?: string } }).source.domain ||
         "Marketaux")
      : (raw.source as unknown as string) || "Marketaux"
  }));
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function fetchMarketauxBriefing(
  env: Env,
  agents: Agent[]
): Promise<{
  generalHeadlines: SnapshotHeadline[];
  headlinesByAgentId: Map<string, SnapshotHeadline[]>;
  logItems: Omit<FetchedNewsItem, "eventId">[];   // caller fills eventId and calls logBatch
}> {
  const empty = {
    generalHeadlines: [],
    headlinesByAgentId: new Map<string, SnapshotHeadline[]>(),
    logItems: []
  };

  if (!env.MARKETAUX_API_KEY) {
    console.log("[marketaux] No API key configured — skipping.");
    return empty;
  }

  // ── 3 sequential requests (avoids rate-limit burst) ───────────────────────
  const rawArticles: MarketauxArticle[] = [];
  const requests: Record<string, string>[] = [
    // Request 1: Macro, rates, policy, inflation
    { categories: "general,business" },
    // Request 2: Commodities, energy, FX — use keywords to bias search
    { industries: "energy,forex,commodities,mining" },
    // Request 3: Equities, earnings, risk — shift published_after window slightly for diversity
    { categories: "general", industries: "technology,financials,healthcare" }
  ];

  for (const params of requests) {
    try {
      const page = await fetchMarketauxPage(env.MARKETAUX_API_KEY, params);
      rawArticles.push(...page);
    } catch (err) {
      console.error("[marketaux] Page fetch failed:", err);
      // Continue with what we have — partial results are still useful
    }
  }

  if (rawArticles.length === 0) {
    console.log("[marketaux] No articles returned from any request.");
    return empty;
  }

  // ── Cross-run dedup: skip UUIDs seen as 'selected' in the last 2 hours ───
  let seenRecentUuids = new Set<string>();
  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const result = await env.DB.prepare(
      `SELECT DISTINCT article_uuid FROM fetched_news_items
       WHERE fetched_at >= ? AND selection_outcome = 'selected'`
    ).bind(cutoff).all<{ article_uuid: string }>();
    seenRecentUuids = new Set(result.results.map((r) => r.article_uuid));
    if (seenRecentUuids.size > 0) {
      console.log(`[marketaux] Cross-run dedup: ${seenRecentUuids.size} UUIDs already seen in last 2h`);
    }
  } catch {
    // DB unavailable (e.g. table not yet created) — proceed without dedup
  }

  // ── Hard filters ──────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const logItems: Omit<FetchedNewsItem, "eventId">[] = [];
  const seenUuids = new Set<string>();  // dedup within this batch
  const candidates: Array<MarketauxArticle & { selectionScore: number; selectionOutcome: FetchedNewsItem["selectionOutcome"] }> = [];

  for (const article of rawArticles) {
    const uuid = articleHash(article);

    // Intra-batch dedup
    if (seenUuids.has(uuid)) continue;
    seenUuids.add(uuid);

    const description = article.description || article.snippet || "";
    const ageHours = (Date.now() - new Date(article.published_at).getTime()) / 3_600_000;

    // Cross-run dedup: already used in a recent run — log as rejected_seen but still track
    if (seenRecentUuids.has(uuid)) {
      candidates.push({ ...article, selectionScore: 0, selectionOutcome: "rejected_seen" });
      continue;
    }

    // Hard reject: too old
    if (ageHours > 48) {
      candidates.push({ ...article, selectionScore: 0, selectionOutcome: "rejected_stale" });
      continue;
    }

    // Hard reject: no description
    if (!description || description.length < 20) {
      candidates.push({ ...article, selectionScore: 0, selectionOutcome: "rejected_no_description" });
      continue;
    }

    // Hard reject: pure noise title AND low relevance
    const isNoisyTitle = NOISE_TITLE_PATTERNS.some((p) => p.test(article.title));
    if (isNoisyTitle && (article.relevance_score ?? 1) < 1) {
      candidates.push({ ...article, selectionScore: 0, selectionOutcome: "rejected_noise" });
      continue;
    }

    candidates.push({ ...article, selectionScore: scoreArticle(article), selectionOutcome: "selected" });
  }

  // ── Jaccard near-duplicate removal (across candidates, not batch) ─────────
  const scored = candidates
    .filter((c) => c.selectionOutcome === "selected")
    .sort((a, b) => b.selectionScore - a.selectionScore);

  const selectedArticles: MarketauxArticle[] = [];
  const selectedTokenSets: string[][] = [];

  for (const candidate of scored) {
    const tokens = tokenize(`${candidate.title} ${candidate.description || candidate.snippet || ""}`);
    const tooSimilar = selectedTokenSets.some((existing) => jaccardSimilarity(tokens, existing) >= 0.65);
    if (tooSimilar) {
      candidate.selectionOutcome = "rejected_duplicate";
      continue;
    }
    selectedArticles.push(candidate);
    selectedTokenSets.push(tokens);
    if (selectedArticles.length >= 6) break; // keep top 6
  }

  // ── Per-agent routing ─────────────────────────────────────────────────────
  const headlinesByAgentId = new Map<string, SnapshotHeadline[]>();
  const articleRoutedTo = new Map<string, string[]>();  // uuid → agent IDs

  for (const agent of agents) {
    const keywords = SECTOR_KEYWORDS[agent.sector] || [];
    const agentHeadlines: SnapshotHeadline[] = [];

    for (const article of selectedArticles) {
      if (agentHeadlines.length >= 3) break;
      const sectorScore = scoreArticleForSector(article, keywords);
      if (sectorScore > 0) {
        agentHeadlines.push(toSnapshotHeadline(article));
        const uuid = articleHash(article);
        const existing = articleRoutedTo.get(uuid) || [];
        existing.push(agent.id);
        articleRoutedTo.set(uuid, existing);
      }
    }

    if (agentHeadlines.length > 0) {
      headlinesByAgentId.set(agent.id, agentHeadlines);
    }
  }

  // ── Build log items ───────────────────────────────────────────────────────
  for (const candidate of candidates) {
    const uuid = articleHash(candidate);
    const routedTo = articleRoutedTo.get(uuid) || [];

    logItems.push({
      id: `maux_${uuid}_${Date.now()}`,
      articleUuid: uuid,
      provider: "marketaux",
      title: candidate.title,
      source: candidate.source,
      url: candidate.url || undefined,
      publishedAt: candidate.published_at || undefined,
      description: candidate.description || candidate.snippet || undefined,
      entitiesJson: candidate.entities.length > 0
        ? JSON.stringify(candidate.entities.map((e) => e.name))
        : undefined,
      selectionScore: candidate.selectionScore,
      selectionOutcome: candidate.selectionOutcome,
      routedAgentIdsJson: routedTo.length > 0 ? JSON.stringify(routedTo) : undefined,
      fetchedAt: now
    });
  }

  const generalHeadlines = selectedArticles.map(toSnapshotHeadline);

  console.log(
    `[marketaux] Fetched ${rawArticles.length} raw → ${selectedArticles.length} selected → ` +
    `${headlinesByAgentId.size} agents routed`
  );

  return { generalHeadlines, headlinesByAgentId, logItems };
}
