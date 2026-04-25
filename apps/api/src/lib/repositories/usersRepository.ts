import type { User } from "@market-room/shared";
import type { Env } from "../../index";

type UserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string;
  email_verified: number;
  email_verification_token: string | null;
  email_verification_expiry: string | null;
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: string;
  created_at: string;
};

type MemberStatusRow = {
  id: string;
  user_id: string;
  membership_status: string;
  joined_at: string | null;
  updated_at: string;
};

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    emailVerified: row.email_verified === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createUsersRepository(env: Env) {
  return {
    async getUserByEmail(email: string): Promise<User | null> {
      const row = await env.DB.prepare(
        `SELECT
          id,
          email,
          first_name,
          last_name,
          password_hash,
          email_verified,
          email_verification_token,
          email_verification_expiry,
          created_at,
          updated_at
        FROM users
        WHERE email = ?
        LIMIT 1`
      )
        .bind(email)
        .first<UserRow>();

      return row ? mapUserRow(row) : null;
    },

    async getUserById(id: string): Promise<User | null> {
      const row = await env.DB.prepare(
        `SELECT
          id,
          email,
          first_name,
          last_name,
          password_hash,
          email_verified,
          email_verification_token,
          email_verification_expiry,
          created_at,
          updated_at
        FROM users
        WHERE id = ?
        LIMIT 1`
      )
        .bind(id)
        .first<UserRow>();

      return row ? mapUserRow(row) : null;
    },

    async createUser(
      data: Omit<User, "id"> & { passwordHash: string }
    ): Promise<User> {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO users
          (id, email, first_name, last_name, password_hash, email_verified,
           email_verification_token, email_verification_expiry, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          data.email,
          data.firstName,
          data.lastName,
          data.passwordHash,
          data.emailVerified ? 1 : 0,
          (data as any).emailVerificationToken || null,
          (data as any).emailVerificationExpiry || null,
          data.createdAt,
          data.updatedAt
        )
        .run();

      return mapUserRow({
        id,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        password_hash: data.passwordHash,
        email_verified: data.emailVerified ? 1 : 0,
        email_verification_token: (data as any).emailVerificationToken || null,
        email_verification_expiry: (data as any).emailVerificationExpiry || null,
        created_at: data.createdAt,
        updated_at: data.updatedAt,
      } as UserRow);
    },

    async updateUser(
      id: string,
      updates: Partial<User> & { emailVerificationToken?: string | null; emailVerificationExpiry?: string | null }
    ): Promise<User> {
      const setClauses: string[] = [];
      const values: unknown[] = [];

      if ("firstName" in updates) {
        setClauses.push("first_name = ?");
        values.push(updates.firstName);
      }
      if ("lastName" in updates) {
        setClauses.push("last_name = ?");
        values.push(updates.lastName);
      }
      if ("emailVerified" in updates) {
        setClauses.push("email_verified = ?");
        values.push(updates.emailVerified ? 1 : 0);
      }
      if ("emailVerificationToken" in updates) {
        setClauses.push("email_verification_token = ?");
        values.push(updates.emailVerificationToken);
      }
      if ("emailVerificationExpiry" in updates) {
        setClauses.push("email_verification_expiry = ?");
        values.push(updates.emailVerificationExpiry);
      }

      setClauses.push("updated_at = ?");
      values.push(new Date().toISOString());
      values.push(id);

      if (setClauses.length > 1) {
        await env.DB.prepare(
          `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`
        )
          .bind(...values)
          .run();
      }

      const user = await this.getUserById(id);
      if (!user) throw new Error("User not found after update");
      return user;
    },

    async getPasswordHash(userId: string): Promise<{ hash: string } | null> {
      const row = await env.DB.prepare(
        `SELECT password_hash FROM users WHERE id = ? LIMIT 1`
      )
        .bind(userId)
        .first<{ password_hash: string }>();

      return row ? { hash: row.password_hash } : null;
    },

    async getVerificationToken(
      email: string
    ): Promise<{ token: string; expiry: string } | null> {
      const row = await env.DB.prepare(
        `SELECT email_verification_token, email_verification_expiry
         FROM users WHERE email = ? LIMIT 1`
      )
        .bind(email)
        .first<{
          email_verification_token: string | null;
          email_verification_expiry: string | null;
        }>();

      if (!row || !row.email_verification_token) {
        return null;
      }

      return {
        token: row.email_verification_token,
        expiry: row.email_verification_expiry || "",
      };
    },

    async createSession(
      userId: string,
      sessionToken: string,
      expiresAt: string
    ): Promise<void> {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO user_sessions
          (id, user_id, session_token, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)`
      )
        .bind(id, userId, sessionToken, expiresAt, new Date().toISOString())
        .run();
    },

    async getSessionByToken(
      sessionToken: string
    ): Promise<{ userId: string; expiresAt: string } | null> {
      const row = await env.DB.prepare(
        `SELECT user_id, expires_at FROM user_sessions
         WHERE session_token = ? LIMIT 1`
      )
        .bind(sessionToken)
        .first<{ user_id: string; expires_at: string }>();

      return row ? { userId: row.user_id, expiresAt: row.expires_at } : null;
    },

    async deleteSession(sessionToken: string): Promise<void> {
      await env.DB.prepare(`DELETE FROM user_sessions WHERE session_token = ?`)
        .bind(sessionToken)
        .run();
    },

    async createMemberStatus(
      userId: string,
      status: "pending" | "active" | "inactive"
    ): Promise<void> {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO user_member_status
          (id, user_id, membership_status, updated_at)
        VALUES (?, ?, ?, ?)`
      )
        .bind(id, userId, status, new Date().toISOString())
        .run();
    },

    async updateMemberStatus(
      userId: string,
      status: "pending" | "active" | "inactive",
      joinedAt: string | null = null
    ): Promise<void> {
      await env.DB.prepare(
        `UPDATE user_member_status
         SET membership_status = ?, joined_at = ?, updated_at = ?
         WHERE user_id = ?`
      )
        .bind(status, status === "active" ? joinedAt || new Date().toISOString() : null, new Date().toISOString(), userId)
        .run();
    },

    async listAllUsers(): Promise<Array<User & { memberStatus: string; joinedAt: string | null }>> {
      const rows = await env.DB.prepare(
        `SELECT
          u.id, u.email, u.first_name, u.last_name,
          u.email_verified, u.created_at, u.updated_at,
          COALESCE(ms.membership_status, 'pending') AS membership_status,
          ms.joined_at
        FROM users u
        LEFT JOIN user_member_status ms ON ms.user_id = u.id
        ORDER BY u.created_at DESC`
      ).all<UserRow & { membership_status: string; joined_at: string | null }>();

      return (rows.results ?? []).map((row) => ({
        ...mapUserRow(row),
        memberStatus: row.membership_status,
        joinedAt: row.joined_at,
      }));
    },

    async deleteUser(userId: string): Promise<void> {
      // Cascades to user_sessions and user_member_status via FK
      await env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(userId).run();
    },
  };
}
