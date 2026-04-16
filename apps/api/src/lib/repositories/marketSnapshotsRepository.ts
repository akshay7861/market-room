import type { MarketSnapshot } from "@market-room/shared";
import type { Env } from "../../index";

export function createMarketSnapshotsRepository(env: Env) {
  return {
    async create(snapshot: MarketSnapshot): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO market_snapshots (id, snapshot_type, payload_json, created_at)
         VALUES (?, ?, ?, ?)`
      )
        .bind(snapshot.id, snapshot.snapshotType, snapshot.payloadJson, snapshot.createdAt)
        .run();
    },

    async getLatest(): Promise<MarketSnapshot | null> {
      const row = await env.DB.prepare(
        `SELECT
          id,
          snapshot_type AS snapshotType,
          payload_json AS payloadJson,
          created_at AS createdAt
        FROM market_snapshots
        ORDER BY created_at DESC
        LIMIT 1`
      ).first<MarketSnapshot>();

      return row ?? null;
    },

    async getById(snapshotId: string): Promise<MarketSnapshot | null> {
      const row = await env.DB.prepare(
        `SELECT
          id,
          snapshot_type AS snapshotType,
          payload_json AS payloadJson,
          created_at AS createdAt
        FROM market_snapshots
        WHERE id = ?
        LIMIT 1`
      )
        .bind(snapshotId)
        .first<MarketSnapshot>();

      return row ?? null;
    },

    async countAll(): Promise<number> {
      const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM market_snapshots").first<{
        total: number;
      }>();

      return row?.total ?? 0;
    }
  };
}
