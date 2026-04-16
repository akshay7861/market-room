import type { Env } from "../../index";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FetchedNewsSelectionOutcome =
  | "selected"
  | "rejected_duplicate"
  | "rejected_stale"
  | "rejected_noise"
  | "rejected_seen"
  | "rejected_no_description";

export type FetchedNewsItem = {
  id: string;
  eventId: string;
  articleUuid: string;
  provider: string;
  title: string;
  source: string;
  url?: string;
  publishedAt?: string;
  description?: string;
  entitiesJson?: string;         // JSON-serialised string[]
  selectionScore?: number;
  selectionOutcome: FetchedNewsSelectionOutcome;
  routedAgentIdsJson?: string;   // JSON-serialised string[]
  fetchedAt: string;
};

type FetchedNewsRow = {
  id: string;
  event_id: string;
  article_uuid: string;
  provider: string;
  title: string;
  source: string;
  url: string | null;
  published_at: string | null;
  description: string | null;
  entities_json: string | null;
  selection_score: number | null;
  selection_outcome: string;
  routed_agent_ids_json: string | null;
  fetched_at: string;
};

function mapRow(row: FetchedNewsRow): FetchedNewsItem {
  return {
    id: row.id,
    eventId: row.event_id,
    articleUuid: row.article_uuid,
    provider: row.provider,
    title: row.title,
    source: row.source,
    url: row.url ?? undefined,
    publishedAt: row.published_at ?? undefined,
    description: row.description ?? undefined,
    entitiesJson: row.entities_json ?? undefined,
    selectionScore: row.selection_score ?? undefined,
    selectionOutcome: row.selection_outcome as FetchedNewsSelectionOutcome,
    routedAgentIdsJson: row.routed_agent_ids_json ?? undefined,
    fetchedAt: row.fetched_at
  };
}

// ---------------------------------------------------------------------------
// Repository factory
// ---------------------------------------------------------------------------

export function createFetchedNewsRepository(env: Env) {
  return {
    async log(item: FetchedNewsItem): Promise<void> {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO fetched_news_items
          (id, event_id, article_uuid, provider, title, source, url, published_at,
           description, entities_json, selection_score, selection_outcome,
           routed_agent_ids_json, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          item.id,
          item.eventId,
          item.articleUuid,
          item.provider,
          item.title,
          item.source,
          item.url ?? null,
          item.publishedAt ?? null,
          item.description ?? null,
          item.entitiesJson ?? null,
          item.selectionScore ?? null,
          item.selectionOutcome,
          item.routedAgentIdsJson ?? null,
          item.fetchedAt
        )
        .run();
    },

    async logBatch(items: FetchedNewsItem[]): Promise<void> {
      if (items.length === 0) return;
      const stmts = items.map((item) =>
        env.DB.prepare(
          `INSERT OR IGNORE INTO fetched_news_items
            (id, event_id, article_uuid, provider, title, source, url, published_at,
             description, entities_json, selection_score, selection_outcome,
             routed_agent_ids_json, fetched_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          item.id,
          item.eventId,
          item.articleUuid,
          item.provider,
          item.title,
          item.source,
          item.url ?? null,
          item.publishedAt ?? null,
          item.description ?? null,
          item.entitiesJson ?? null,
          item.selectionScore ?? null,
          item.selectionOutcome,
          item.routedAgentIdsJson ?? null,
          item.fetchedAt
        )
      );
      await env.DB.batch(stmts);
    },

    async listByEvent(eventId: string): Promise<FetchedNewsItem[]> {
      const result = await env.DB.prepare(
        `SELECT * FROM fetched_news_items
         WHERE event_id = ?
         ORDER BY selection_score DESC, fetched_at DESC`
      )
        .bind(eventId)
        .all<FetchedNewsRow>();
      return result.results.map(mapRow);
    },

    async listRecent(hours = 24, limit = 100): Promise<FetchedNewsItem[]> {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const result = await env.DB.prepare(
        `SELECT * FROM fetched_news_items
         WHERE fetched_at >= ?
         ORDER BY fetched_at DESC
         LIMIT ?`
      )
        .bind(cutoff, limit)
        .all<FetchedNewsRow>();
      return result.results.map(mapRow);
    },

    /** Returns set of article_uuid values seen in the last N hours — used for cross-run dedup. */
    async listRecentUuids(hours = 2): Promise<Set<string>> {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const result = await env.DB.prepare(
        `SELECT DISTINCT article_uuid FROM fetched_news_items
         WHERE fetched_at >= ? AND selection_outcome = 'selected'`
      )
        .bind(cutoff)
        .all<{ article_uuid: string }>();
      return new Set(result.results.map((r) => r.article_uuid));
    }
  };
}
