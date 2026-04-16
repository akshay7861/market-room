import type { Agent, UpdateAgentInput } from "@market-room/shared";
import type { Env } from "../../index";

type AgentRow = {
  id: string;
  name: string;
  slug: string;
  sector: string;
  bio: string;
  avatarUrl: string;
  systemPrompt: string;
  memorySummary: string;
  vectorStoreId: string | null;
  active: number;
  createdAt: string;
  updatedAt: string;
};

export function createAgentsRepository(env: Env) {
  async function getById(agentId: string): Promise<Agent | null> {
    const row = await env.DB.prepare(
      `SELECT
        id,
        name,
        slug,
        sector,
        bio,
        avatar_url AS avatarUrl,
        system_prompt AS systemPrompt,
        memory_summary AS memorySummary,
        vector_store_id AS vectorStoreId,
        active,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM agents
      WHERE id = ?
      LIMIT 1`
    )
      .bind(agentId)
      .first<AgentRow>();

    return row ? mapAgentRow(row) : null;
  }

  return {
    async list(): Promise<Agent[]> {
      const result = await env.DB.prepare(
        `SELECT
          id,
          name,
          slug,
          sector,
          bio,
          avatar_url AS avatarUrl,
          system_prompt AS systemPrompt,
          memory_summary AS memorySummary,
          vector_store_id AS vectorStoreId,
          active,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM agents
        ORDER BY created_at ASC, name ASC`
      ).all<AgentRow>();

      return result.results.map(mapAgentRow);
    },

    async listActive(): Promise<Agent[]> {
      const result = await env.DB.prepare(
        `SELECT
          id,
          name,
          slug,
          sector,
          bio,
          avatar_url AS avatarUrl,
          system_prompt AS systemPrompt,
          memory_summary AS memorySummary,
          vector_store_id AS vectorStoreId,
          active,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM agents
        WHERE active = 1
        ORDER BY created_at ASC, name ASC`
      ).all<AgentRow>();

      return result.results.map(mapAgentRow);
    },

    async countAll(): Promise<number> {
      const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM agents").first<{ total: number }>();
      return row?.total ?? 0;
    },

    async countActive(): Promise<number> {
      const row = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM agents WHERE active = 1"
      ).first<{ total: number }>();

      return row?.total ?? 0;
    },

    async updateMemorySummary(agentId: string, newSummary: string, updatedAt: string): Promise<void> {
      await env.DB.prepare(
        "UPDATE agents SET memory_summary = ?, updated_at = ? WHERE id = ?"
      )
        .bind(newSummary, updatedAt, agentId)
        .run();
    },

    async updateVectorStoreId(agentId: string, vectorStoreId: string, updatedAt: string): Promise<void> {
      await env.DB.prepare(
        "UPDATE agents SET vector_store_id = ?, updated_at = ? WHERE id = ?"
      )
        .bind(vectorStoreId, updatedAt, agentId)
        .run();
    },

    async getById(agentId: string): Promise<Agent | null> {
      return getById(agentId);
    },

    async update(agentId: string, input: UpdateAgentInput): Promise<Agent | null> {
      const updatedAt = new Date().toISOString();

      await env.DB.prepare(
        `UPDATE agents
         SET name = ?, bio = ?, system_prompt = ?, memory_summary = ?, active = ?, updated_at = ?
         WHERE id = ?`
      )
        .bind(
          input.name,
          input.bio,
          input.systemPrompt,
          input.memorySummary,
          input.active ? 1 : 0,
          updatedAt,
          agentId
        )
        .run();

      return getById(agentId);
    }
  };
}

function mapAgentRow(row: AgentRow): Agent {
  return {
    ...row,
    active: Boolean(row.active)
  };
}
