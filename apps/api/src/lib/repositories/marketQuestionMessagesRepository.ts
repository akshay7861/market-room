import type { MarketQuestionMessage } from "@market-room/shared";
import type { Env } from "../../index";

export function createMarketQuestionMessagesRepository(env: Env) {
  return {
    async create(message: {
      id: string;
      threadId: string;
      role: "user" | "assistant";
      agentId: string | null;
      content: string;
      createdAt: string;
    }): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO market_question_messages
          (id, thread_id, role, agent_id, content, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          message.id,
          message.threadId,
          message.role,
          message.agentId,
          message.content,
          message.createdAt
        )
        .run();
    },

    async listByThread(threadId: string): Promise<MarketQuestionMessage[]> {
      const result = await env.DB.prepare(
        `SELECT
          messages.id,
          messages.thread_id AS threadId,
          messages.role,
          messages.agent_id AS agentId,
          agents.name AS agentName,
          agents.sector AS agentSector,
          messages.content,
          messages.created_at AS createdAt
        FROM market_question_messages AS messages
        LEFT JOIN agents ON agents.id = messages.agent_id
        WHERE messages.thread_id = ?
        ORDER BY messages.created_at ASC`
      )
        .bind(threadId)
        .all<MarketQuestionMessage>();

      return result.results;
    }
  };
}
