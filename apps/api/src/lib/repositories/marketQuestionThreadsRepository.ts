import type { MarketQuestionThread } from "@market-room/shared";
import type { Env } from "../../index";

type MarketQuestionThreadRow = MarketQuestionThread;

export function createMarketQuestionThreadsRepository(env: Env) {
  return {
    async create(thread: {
      id: string;
      title: string;
      assignedAgentId: string;
      status: "open" | "closed";
      createdAt: string;
      updatedAt: string;
    }): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO market_question_threads
          (id, title, assigned_agent_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          thread.id,
          thread.title,
          thread.assignedAgentId,
          thread.status,
          thread.createdAt,
          thread.updatedAt
        )
        .run();
    },

    async touch(threadId: string, updatedAt: string): Promise<void> {
      await env.DB.prepare(
        `UPDATE market_question_threads
         SET updated_at = ?
         WHERE id = ?`
      )
        .bind(updatedAt, threadId)
        .run();
    },

    async touchAndAssign(threadId: string, assignedAgentId: string, updatedAt: string): Promise<void> {
      await env.DB.prepare(
        `UPDATE market_question_threads
         SET assigned_agent_id = ?,
             updated_at = ?
         WHERE id = ?`
      )
        .bind(assignedAgentId, updatedAt, threadId)
        .run();
    },

    async getById(threadId: string): Promise<MarketQuestionThreadRow | null> {
      return env.DB.prepare(
        `SELECT
          threads.id,
          threads.title,
          threads.assigned_agent_id AS assignedAgentId,
          agents.name AS assignedAgentName,
          agents.sector AS assignedAgentSector,
          (
            SELECT GROUP_CONCAT(name, ' → ')
            FROM (
              SELECT speaker_agents.name AS name, messages.created_at AS first_seen
              FROM market_question_messages AS messages
              INNER JOIN agents AS speaker_agents ON speaker_agents.id = messages.agent_id
              WHERE messages.thread_id = threads.id
                AND messages.role = 'assistant'
              ORDER BY first_seen ASC
            )
          ) AS participantAgentNames,
          (
            SELECT GROUP_CONCAT(sector, ' → ')
            FROM (
              SELECT speaker_agents.sector AS sector, messages.created_at AS first_seen
              FROM market_question_messages AS messages
              INNER JOIN agents AS speaker_agents ON speaker_agents.id = messages.agent_id
              WHERE messages.thread_id = threads.id
                AND messages.role = 'assistant'
              ORDER BY first_seen ASC
            )
          ) AS participantAgentSectors,
          threads.status,
          threads.created_at AS createdAt,
          threads.updated_at AS updatedAt,
          (
            SELECT content
            FROM market_question_messages
            WHERE thread_id = threads.id
            ORDER BY created_at DESC
            LIMIT 1
          ) AS lastMessagePreview
        FROM market_question_threads AS threads
        INNER JOIN agents ON agents.id = threads.assigned_agent_id
        WHERE threads.id = ?
        LIMIT 1`
      )
        .bind(threadId)
        .first<MarketQuestionThreadRow>();
    },

    async list(limit = 24): Promise<MarketQuestionThreadRow[]> {
      const result = await env.DB.prepare(
        `SELECT
          threads.id,
          threads.title,
          threads.assigned_agent_id AS assignedAgentId,
          agents.name AS assignedAgentName,
          agents.sector AS assignedAgentSector,
          (
            SELECT GROUP_CONCAT(name, ' → ')
            FROM (
              SELECT speaker_agents.name AS name, messages.created_at AS first_seen
              FROM market_question_messages AS messages
              INNER JOIN agents AS speaker_agents ON speaker_agents.id = messages.agent_id
              WHERE messages.thread_id = threads.id
                AND messages.role = 'assistant'
              ORDER BY first_seen ASC
            )
          ) AS participantAgentNames,
          (
            SELECT GROUP_CONCAT(sector, ' → ')
            FROM (
              SELECT speaker_agents.sector AS sector, messages.created_at AS first_seen
              FROM market_question_messages AS messages
              INNER JOIN agents AS speaker_agents ON speaker_agents.id = messages.agent_id
              WHERE messages.thread_id = threads.id
                AND messages.role = 'assistant'
              ORDER BY first_seen ASC
            )
          ) AS participantAgentSectors,
          threads.status,
          threads.created_at AS createdAt,
          threads.updated_at AS updatedAt,
          (
            SELECT content
            FROM market_question_messages
            WHERE thread_id = threads.id
            ORDER BY created_at DESC
            LIMIT 1
          ) AS lastMessagePreview
        FROM market_question_threads AS threads
        INNER JOIN agents ON agents.id = threads.assigned_agent_id
        ORDER BY threads.updated_at DESC
        LIMIT ?`
      )
        .bind(limit)
        .all<MarketQuestionThreadRow>();

      return result.results;
    }
  };
}
