import type { AgentMessage, NoveltyAssessment, PostingDecision } from "@market-room/shared";
import type { Env } from "../../index";

export function createMessagesRepository(env: Env) {
  function selectColumns(clientId: string | null): string {
    const safeClientId = clientId ? `'${clientId.replace(/'/g, "''")}'` : "NULL";

    return `SELECT
        messages.id,
        messages.room_id AS roomId,
        messages.event_id AS eventId,
        messages.agent_id AS agentId,
        agents.name AS agentName,
        agents.sector AS sector,
        messages.role,
        messages.message_type AS messageType,
        messages.parent_message_id AS parentMessageId,
        messages.title,
        messages.catalyst,
        messages.thesis_id AS thesisId,
        messages.thesis_update_id AS thesisUpdateId,
        theses.status AS thesisStatus,
        theses.topic_primary AS thesisTopicPrimary,
        theses.topic_secondary AS thesisTopicSecondary,
        messages.content,
        messages.stance,
        messages.confidence,
        COALESCE((
          SELECT COUNT(*)
          FROM message_reactions
          WHERE message_id = messages.id
            AND reaction = 'like'
        ), 0) AS likeCount,
        COALESCE((
          SELECT COUNT(*)
          FROM message_reactions
          WHERE message_id = messages.id
            AND reaction = 'dislike'
        ), 0) AS dislikeCount,
        (
          SELECT reaction
          FROM message_reactions
          WHERE message_id = messages.id
            AND client_id = ${safeClientId}
          LIMIT 1
        ) AS viewerReaction,
        messages.created_at AS createdAt`;
  }

  async function selectMessageByClause(
    clause: string,
    bindValues: Array<string | number>,
    clientId: string | null = null
  ): Promise<AgentMessage | null> {
    const statement = env.DB.prepare(
      `${selectColumns(clientId)}
      FROM messages
      INNER JOIN agents ON agents.id = messages.agent_id
      LEFT JOIN theses ON theses.id = messages.thesis_id
      ${clause}
      LIMIT 1`
    );
    const row = await statement.bind(...bindValues).first<AgentMessage>();
    return row ?? null;
  }

  return {
    async create(message: AgentMessage): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO messages
          (
            id,
            room_id,
            event_id,
            agent_id,
            role,
            message_type,
            parent_message_id,
            title,
            catalyst,
            thesis_id,
            thesis_update_id,
            content,
            stance,
            confidence,
            novelty_assessment_json,
            posting_decision_json,
            created_at
          )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          message.id,
          message.roomId,
          message.eventId,
          message.agentId,
          message.role,
          message.messageType,
          message.parentMessageId,
          message.title,
          message.catalyst,
          message.thesisId,
          message.thesisUpdateId,
          message.content,
          message.stance,
          message.confidence,
          message.noveltyAssessment ? JSON.stringify(message.noveltyAssessment) : null,
          message.postingDecision ? JSON.stringify(message.postingDecision) : null,
          message.createdAt
        )
        .run();
    },

    async listByRoom(roomId: string, limit = 30, clientId: string | null = null): Promise<AgentMessage[]> {
      const result = await env.DB.prepare(
        `${selectColumns(clientId)}
        FROM messages
        INNER JOIN agents ON agents.id = messages.agent_id
        LEFT JOIN theses ON theses.id = messages.thesis_id
        WHERE messages.room_id = ?
        ORDER BY messages.created_at DESC
        LIMIT ?`
      )
        .bind(roomId, limit)
        .all<AgentMessage>();

      return [...result.results].reverse();
    },

    async listByEvent(eventId: string, clientId: string | null = null): Promise<AgentMessage[]> {
      const result = await env.DB.prepare(
        `${selectColumns(clientId)}
        FROM messages
        INNER JOIN agents ON agents.id = messages.agent_id
        LEFT JOIN theses ON theses.id = messages.thesis_id
        WHERE messages.event_id = ?
        ORDER BY messages.created_at ASC`
      )
        .bind(eventId)
        .all<AgentMessage>();

      return result.results;
    },

    async listRecentByAgent(agentId: string, limit = 6, clientId: string | null = null): Promise<AgentMessage[]> {
      const result = await env.DB.prepare(
        `${selectColumns(clientId)}
        FROM messages
        INNER JOIN agents ON agents.id = messages.agent_id
        LEFT JOIN theses ON theses.id = messages.thesis_id
        WHERE messages.agent_id = ?
          AND messages.parent_message_id IS NULL
        ORDER BY messages.created_at DESC
        LIMIT ?`
      )
        .bind(agentId, limit)
        .all<AgentMessage>();

      return result.results;
    },

    async getById(messageId: string, clientId: string | null = null): Promise<AgentMessage | null> {
      return selectMessageByClause("WHERE messages.id = ?", [messageId], clientId);
    },

    async listThreadsByRoom(
      roomId: string,
      limitPosts = 18,
      limitCommentsPerPost = 6,
      clientId: string | null = null,
      offsetPosts = 0
    ): Promise<{
      posts: AgentMessage[];
      comments: AgentMessage[];
    }> {
      const postResult = await env.DB.prepare(
        `${selectColumns(clientId).replaceAll("messages.", "parent.")}
        FROM messages AS parent
        INNER JOIN agents ON agents.id = parent.agent_id
        LEFT JOIN theses ON theses.id = parent.thesis_id
        LEFT JOIN messages AS child ON child.parent_message_id = parent.id
        WHERE parent.room_id = ?
          AND parent.parent_message_id IS NULL
        GROUP BY
          parent.id,
          parent.room_id,
          parent.event_id,
          parent.agent_id,
          agents.name,
          agents.sector,
          parent.role,
          parent.message_type,
          parent.parent_message_id,
          parent.title,
          parent.catalyst,
          parent.thesis_id,
          parent.thesis_update_id,
          theses.status,
          theses.topic_primary,
          theses.topic_secondary,
          parent.content,
          parent.stance,
          parent.confidence,
          parent.created_at
        ORDER BY parent.created_at DESC
        LIMIT ?
        OFFSET ?`
      )
        .bind(roomId, limitPosts, offsetPosts)
        .all<AgentMessage>();

      const posts = postResult.results;

      if (posts.length === 0) {
        return {
          posts: [],
          comments: []
        };
      }

      const placeholders = posts.map(() => "?").join(", ");
      const commentRows = await env.DB.prepare(
        `${selectColumns(clientId)}
        FROM messages
        INNER JOIN agents ON agents.id = messages.agent_id
        LEFT JOIN theses ON theses.id = messages.thesis_id
        WHERE messages.parent_message_id IN (${placeholders})
        ORDER BY messages.created_at ASC`
      )
        .bind(...posts.map((post) => post.id))
        .all<AgentMessage>();

      const commentCounts = new Map<string, number>();
      const comments = commentRows.results.filter((comment) => {
        const key = comment.parentMessageId || "";
        const nextCount = (commentCounts.get(key) || 0) + 1;
        commentCounts.set(key, nextCount);
        return nextCount <= limitCommentsPerPost;
      });

      return {
        posts,
        comments
      };
    },

    async countAll(): Promise<number> {
      const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM messages").first<{ total: number }>();
      return row?.total ?? 0;
    },

    async getNoveltyAssessment(messageId: string): Promise<NoveltyAssessment | null> {
      const row = await env.DB.prepare(
        "SELECT novelty_assessment_json FROM messages WHERE id = ?"
      )
        .bind(messageId)
        .first<{ novelty_assessment_json: string | null }>();

      if (!row?.novelty_assessment_json) return null;
      return JSON.parse(row.novelty_assessment_json) as NoveltyAssessment;
    },

    async getPostingDecision(messageId: string): Promise<PostingDecision | null> {
      const row = await env.DB.prepare(
        "SELECT posting_decision_json FROM messages WHERE id = ?"
      )
        .bind(messageId)
        .first<{ posting_decision_json: string | null }>();

      if (!row?.posting_decision_json) return null;
      return JSON.parse(row.posting_decision_json) as PostingDecision;
    },

    async listRecentDecisions(
      roomId: string,
      limit = 20
    ): Promise<Array<{ messageId: string; agentId: string; createdAt: string; postingDecision: PostingDecision }>> {
      const result = await env.DB.prepare(
        `SELECT id, agent_id AS agentId, created_at AS createdAt, posting_decision_json
         FROM messages
         WHERE room_id = ? AND posting_decision_json IS NOT NULL
         ORDER BY created_at DESC
         LIMIT ?`
      )
        .bind(roomId, limit)
        .all<{ id: string; agentId: string; createdAt: string; posting_decision_json: string }>();

      return result.results.map((row) => ({
        messageId: row.id,
        agentId: row.agentId,
        createdAt: row.createdAt,
        postingDecision: JSON.parse(row.posting_decision_json)
      }));
    },

    async listRecentNoveltyScores(
      roomId: string,
      limit = 20
    ): Promise<Array<{ messageId: string; agentId: string; createdAt: string; noveltyAssessment: NoveltyAssessment }>> {
      const result = await env.DB.prepare(
        `SELECT id, agent_id AS agentId, created_at AS createdAt, novelty_assessment_json
         FROM messages
         WHERE room_id = ? AND novelty_assessment_json IS NOT NULL
         ORDER BY created_at DESC
         LIMIT ?`
      )
        .bind(roomId, limit)
        .all<{ id: string; agentId: string; createdAt: string; novelty_assessment_json: string }>();

      return result.results.map((row) => ({
        messageId: row.id,
        agentId: row.agentId,
        createdAt: row.createdAt,
        noveltyAssessment: JSON.parse(row.novelty_assessment_json)
      }));
    }
  };
}
