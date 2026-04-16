import type { Env } from "../../index";

export function createMessageReactionsRepository(env: Env) {
  return {
    async setReaction(
      messageId: string,
      clientId: string,
      reaction: "like" | "dislike" | null,
      now: string
    ): Promise<void> {
      if (!reaction) {
        await env.DB.prepare(
          `DELETE FROM message_reactions
           WHERE message_id = ?
             AND client_id = ?`
        )
          .bind(messageId, clientId)
          .run();
        return;
      }

      await env.DB.prepare(
        `INSERT INTO message_reactions
          (message_id, client_id, reaction, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(message_id, client_id) DO UPDATE SET
           reaction = excluded.reaction,
           updated_at = excluded.updated_at`
      )
        .bind(messageId, clientId, reaction, now, now)
        .run();
    }
  };
}
