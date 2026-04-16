import type { MemoryUpdate } from "@market-room/shared";
import type { Env } from "../../index";

export function createMemoryUpdatesRepository(env: Env) {
  return {
    async create(update: MemoryUpdate): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO memory_updates
          (id, agent_id, old_summary, new_summary, trigger_event_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          update.id,
          update.agentId,
          update.oldSummary,
          update.newSummary,
          update.triggerEventId,
          update.createdAt
        )
        .run();
    },

    async countAll(): Promise<number> {
      const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM memory_updates").first<{
        total: number;
      }>();

      return row?.total ?? 0;
    }
  };
}

