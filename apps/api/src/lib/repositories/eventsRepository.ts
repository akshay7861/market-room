import type { MarketEvent } from "@market-room/shared";
import type { Env } from "../../index";

export function createEventsRepository(env: Env) {
  return {
    async create(event: MarketEvent): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO events (id, event_type, title, summary, payload_json, snapshot_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          event.id,
          event.eventType,
          event.title,
          event.summary,
          event.payloadJson,
          event.snapshotId,
          event.createdAt
        )
        .run();
    },

    async getLatestDiscussionEvent(): Promise<MarketEvent | null> {
      const row = await env.DB.prepare(
        `SELECT
          id,
          event_type AS eventType,
          title,
          summary,
          payload_json AS payloadJson,
          snapshot_id AS snapshotId,
          created_at AS createdAt
        FROM events
        WHERE event_type = 'market_discussion_run'
        ORDER BY created_at DESC
        LIMIT 1`
      ).first<MarketEvent>();

      return row ?? null;
    },

    async countAll(): Promise<number> {
      const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM events").first<{ total: number }>();
      return row?.total ?? 0;
    }
  };
}
