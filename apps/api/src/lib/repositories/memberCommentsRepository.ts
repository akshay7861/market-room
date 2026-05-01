import type { MemberComment } from "@market-room/shared";
import type { Env } from "../../index";

type MemberCommentRow = {
  id: string;
  thread_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  content: string;
  created_at: string;
};

function mapRow(row: MemberCommentRow): MemberComment {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    userFirstName: row.first_name,
    userLastName: row.last_name,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function createMemberCommentsRepository(env: Env) {
  return {
    async listByThread(threadId: string): Promise<MemberComment[]> {
      const result = await env.DB.prepare(
        `SELECT
          mc.id, mc.thread_id, mc.user_id, mc.content, mc.created_at,
          u.first_name, u.last_name
        FROM member_comments mc
        INNER JOIN users u ON u.id = mc.user_id
        WHERE mc.thread_id = ?
        ORDER BY mc.created_at ASC`
      )
        .bind(threadId)
        .all<MemberCommentRow>();

      return (result.results ?? []).map(mapRow);
    },

    async create(threadId: string, userId: string, content: string): Promise<MemberComment> {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      await env.DB.prepare(
        `INSERT INTO member_comments (id, thread_id, user_id, content, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(id, threadId, userId, content, createdAt)
        .run();

      const row = await env.DB.prepare(
        `SELECT mc.id, mc.thread_id, mc.user_id, mc.content, mc.created_at,
                u.first_name, u.last_name
         FROM member_comments mc
         INNER JOIN users u ON u.id = mc.user_id
         WHERE mc.id = ?`
      )
        .bind(id)
        .first<MemberCommentRow>();

      if (!row) throw new Error("Failed to retrieve created comment");
      return mapRow(row);
    },
  };
}
