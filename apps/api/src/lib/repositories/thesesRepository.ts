import type { Thesis, ThesisStatus, ThesisUpdate } from "@market-room/shared";
import type { Env } from "../../index";

export function createThesesRepository(env: Env) {
  return {
    async create(thesis: Thesis): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO theses
          (
            id,
            room_id,
            owner_agent_id,
            sector,
            canonical_claim,
            title,
            topic_primary,
            topic_secondary,
            status,
            confidence_current,
            root_message_id,
            latest_message_id,
            created_snapshot_id,
            latest_snapshot_id,
            created_event_id,
            latest_event_id,
            created_at,
            last_updated_at
          )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          thesis.id,
          thesis.roomId,
          thesis.ownerAgentId,
          thesis.sector,
          thesis.canonicalClaim,
          thesis.title,
          thesis.topicPrimary,
          thesis.topicSecondary,
          thesis.status,
          thesis.confidenceCurrent,
          thesis.rootMessageId,
          thesis.latestMessageId,
          thesis.createdSnapshotId,
          thesis.latestSnapshotId,
          thesis.createdEventId,
          thesis.latestEventId,
          thesis.createdAt,
          thesis.lastUpdatedAt
        )
        .run();
    },

    async getById(thesisId: string): Promise<Thesis | null> {
      const row = await env.DB.prepare(
        `${selectColumns()}
         WHERE theses.id = ?
         LIMIT 1`
      )
        .bind(thesisId)
        .first<Thesis>();

      return row ?? null;
    },

    async listRecentByRoom(roomId: string, limit = 24): Promise<Thesis[]> {
      const result = await env.DB.prepare(
        `${selectColumns()}
         WHERE theses.room_id = ?
         ORDER BY theses.last_updated_at DESC
         LIMIT ?`
      )
        .bind(roomId, limit)
        .all<Thesis>();

      return result.results;
    },

    async listRecentByOwner(ownerAgentId: string, limit = 12): Promise<Thesis[]> {
      const result = await env.DB.prepare(
        `${selectColumns()}
         WHERE theses.owner_agent_id = ?
         ORDER BY theses.last_updated_at DESC
         LIMIT ?`
      )
        .bind(ownerAgentId, limit)
        .all<Thesis>();

      return result.results;
    },

    async listActiveByOwner(ownerAgentId: string): Promise<Thesis[]> {
      const result = await env.DB.prepare(
        `${selectColumns()}
         WHERE theses.owner_agent_id = ?
           AND theses.status IN ('open', 'developing', 'waiting_for_data', 'reopened')
         ORDER BY theses.last_updated_at DESC`
      )
        .bind(ownerAgentId)
        .all<Thesis>();

      return result.results;
    },

    async markStaleBefore(roomId: string, olderThanIso: string, _updatedAt: string): Promise<void> {
      await env.DB.prepare(
        `UPDATE theses
         SET status = 'stale'
         WHERE room_id = ?
           AND status IN ('open', 'developing', 'waiting_for_data', 'confirmed', 'reopened')
           AND last_updated_at < ?`
      )
        .bind(roomId, olderThanIso)
        .run();
    },

    async applyUpdate(
      thesisId: string,
      input: {
        status: ThesisStatus;
        confidenceCurrent: number | null;
        latestMessageId: string | null;
        latestSnapshotId: string | null;
        latestEventId: string | null;
        canonicalClaim?: string | null;
        title?: string | null;
        topicPrimary?: string | null;
        topicSecondary?: string | null;
        lastUpdatedAt: string;
      }
    ): Promise<void> {
      await env.DB.prepare(
        `UPDATE theses
         SET status = ?,
             confidence_current = ?,
             latest_message_id = ?,
             latest_snapshot_id = ?,
             latest_event_id = ?,
             canonical_claim = COALESCE(?, canonical_claim),
             title = COALESCE(?, title),
             topic_primary = COALESCE(?, topic_primary),
             topic_secondary = CASE
               WHEN ? IS NOT NULL THEN ?
               ELSE topic_secondary
             END,
             last_updated_at = ?
         WHERE id = ?`
      )
        .bind(
          input.status,
          input.confidenceCurrent,
          input.latestMessageId,
          input.latestSnapshotId,
          input.latestEventId,
          input.canonicalClaim ?? null,
          input.title ?? null,
          input.topicPrimary ?? null,
          input.topicSecondary ?? null,
          input.topicSecondary ?? null,
          input.lastUpdatedAt,
          thesisId
        )
        .run();
    },

    async createUpdate(update: ThesisUpdate): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO thesis_updates
          (
            id,
            thesis_id,
            agent_id,
            event_id,
            snapshot_id,
            message_id,
            update_type,
            status_before,
            status_after,
            confidence_before,
            confidence_after,
            summary,
            created_at
          )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          update.id,
          update.thesisId,
          update.agentId,
          update.eventId,
          update.snapshotId,
          update.messageId,
          update.updateType,
          update.statusBefore,
          update.statusAfter,
          update.confidenceBefore,
          update.confidenceAfter,
          update.summary,
          update.createdAt
        )
        .run();
    }
  };
}

function selectColumns(): string {
  return `SELECT
      theses.id,
      theses.room_id AS roomId,
      theses.owner_agent_id AS ownerAgentId,
      agents.name AS ownerAgentName,
      theses.sector,
      theses.canonical_claim AS canonicalClaim,
      theses.title,
      theses.topic_primary AS topicPrimary,
      theses.topic_secondary AS topicSecondary,
      theses.status,
      theses.confidence_current AS confidenceCurrent,
      theses.root_message_id AS rootMessageId,
      theses.latest_message_id AS latestMessageId,
      theses.created_snapshot_id AS createdSnapshotId,
      theses.latest_snapshot_id AS latestSnapshotId,
      theses.created_event_id AS createdEventId,
      theses.latest_event_id AS latestEventId,
      theses.created_at AS createdAt,
      theses.last_updated_at AS lastUpdatedAt
    FROM theses
    LEFT JOIN agents ON agents.id = theses.owner_agent_id`;
}
