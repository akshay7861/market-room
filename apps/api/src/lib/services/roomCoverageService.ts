import type { RoomCoverageState } from "@market-room/shared";
import type { Env } from "../../index";
import { createRepositories } from "../repositories";

const OVERUSE_THRESHOLD = 4;
const UNRESOLVED_AGE_DAYS = 3;

export async function refreshRoomCoverageState(
  env: Env,
  roomId: string
): Promise<void> {
  const repositories = createRepositories(env);

  const [
    recentTheses,
    recentPosts,
    activeTheses,
    unresolvedTheses,
    disagreements
  ] = await Promise.all([
    fetchRecentThemesByRoom(env, roomId, 30),
    fetchRecentPostsByRoom(env, roomId, 30),
    fetchActiveThesisTopics(env, roomId),
    fetchUnresolvedMajorThemes(env, roomId),
    fetchDisagreementsByRoom(env, roomId)
  ]);

  // Theme counts from recent theses
  const themeCounts: Record<string, number> = {};
  for (const t of recentTheses) {
    themeCounts[t.topicPrimary] = (themeCounts[t.topicPrimary] || 0) + 1;
  }

  // Catalyst counts from recent posts
  const catalystCounts: Record<string, number> = {};
  for (const p of recentPosts) {
    if (p.catalyst) {
      catalystCounts[p.catalyst] = (catalystCounts[p.catalyst] || 0) + 1;
    }
  }

  // Sector coverage from recent posts (last 20)
  const sectorCoverage: Record<string, number> = {};
  const postsForSector = recentPosts.slice(0, 20);
  for (const p of postsForSector) {
    sectorCoverage[p.sector] = (sectorCoverage[p.sector] || 0) + 1;
  }

  // Post density by sector (ratios)
  const totalPosts = postsForSector.length || 1;
  const postDensityBySector: Record<string, number> = {};
  for (const [sector, count] of Object.entries(sectorCoverage)) {
    postDensityBySector[sector] = Math.round((count / totalPosts) * 100) / 100;
  }

  // Overcovered topics
  const overcoveredTopics = Object.entries(themeCounts)
    .filter(([, count]) => count >= OVERUSE_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme);

  // Undercovered topics: active thesis topics absent from recent theme counts
  const recentThemeSet = new Set(Object.keys(themeCounts));
  const undercoveredTopics = activeTheses
    .filter((topic) => !recentThemeSet.has(topic))
    .slice(0, 8);

  // Disagreement map
  const disagreementMap: Record<string, string[]> = {};
  for (const d of disagreements) {
    if (!disagreementMap[d.theme]) {
      disagreementMap[d.theme] = [];
    }
    const pairLabel = `${d.commenterName} vs ${d.authorName}`;
    if (!disagreementMap[d.theme].includes(pairLabel)) {
      disagreementMap[d.theme].push(pairLabel);
    }
  }

  const state: RoomCoverageState = {
    roomId,
    themeCounts,
    catalystCounts,
    sectorCoverage,
    undercoveredTopics,
    overcoveredTopics,
    disagreementMap,
    unresolvedMajorThemes: unresolvedTheses,
    postDensityBySector,
    latestRefreshedAt: new Date().toISOString()
  };

  await repositories.roomCoverage.upsert(state);
}

export function buildRoomCoveragePromptBlock(state: RoomCoverageState): string {
  const lines: string[] = ["## Room Coverage State"];

  // Top themes
  const topThemes = Object.entries(state.themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (topThemes.length > 0) {
    lines.push(
      `- Most discussed: ${topThemes.map(([t, c]) => `${humanize(t)} (${c}x)`).join(", ")}`
    );
  }

  // Overcovered
  if (state.overcoveredTopics.length > 0) {
    lines.push(
      `- Overcovered (steer away): ${state.overcoveredTopics.slice(0, 4).map(humanize).join(", ")}`
    );
  }

  // Undercovered
  if (state.undercoveredTopics.length > 0) {
    lines.push(
      `- Undercovered (opportunity): ${state.undercoveredTopics.slice(0, 4).map(humanize).join(", ")}`
    );
  }

  // Unresolved theses
  if (state.unresolvedMajorThemes.length > 0) {
    const items = state.unresolvedMajorThemes.slice(0, 4).map(
      (t) => `"${t.thesisTitle}" (${t.ageDays}d, ${t.status})`
    );
    lines.push(`- Unresolved theses needing updates: ${items.join(", ")}`);
  }

  // Sector imbalance
  const densityEntries = Object.entries(state.postDensityBySector);
  if (densityEntries.length > 0) {
    const densityStr = densityEntries
      .sort((a, b) => b[1] - a[1])
      .map(([sector, ratio]) => `${sector} ${Math.round(ratio * 100)}%`)
      .join(", ");
    const underrepresented = densityEntries
      .filter(([, ratio]) => ratio < 0.1)
      .map(([sector]) => sector);
    const imbalanceNote = underrepresented.length > 0
      ? ` — ${underrepresented.join(" and ")} need${underrepresented.length === 1 ? "s" : ""} more coverage`
      : "";
    lines.push(`- Sector balance: ${densityStr}${imbalanceNote}`);
  }

  // Disagreements
  const disagreementEntries = Object.entries(state.disagreementMap);
  if (disagreementEntries.length > 0) {
    const items = disagreementEntries.slice(0, 3).map(
      ([theme, pairs]) => `${humanize(theme)} (${pairs.slice(0, 2).join("; ")})`
    );
    lines.push(`- Active disagreements: ${items.join(", ")}`);
  }

  return lines.join("\n");
}

// --- Data fetching helpers ---

type RecentThesis = { topicPrimary: string };

async function fetchRecentThemesByRoom(
  env: Env,
  roomId: string,
  limit: number
): Promise<RecentThesis[]> {
  const result = await env.DB.prepare(
    `SELECT topic_primary AS topicPrimary
     FROM theses
     WHERE room_id = ?
     ORDER BY last_updated_at DESC
     LIMIT ?`
  )
    .bind(roomId, limit)
    .all<RecentThesis>();

  return result.results;
}

type RecentPost = { catalyst: string | null; sector: string };

async function fetchRecentPostsByRoom(
  env: Env,
  roomId: string,
  limit: number
): Promise<RecentPost[]> {
  const result = await env.DB.prepare(
    `SELECT m.catalyst, a.sector
     FROM messages m
     INNER JOIN agents a ON a.id = m.agent_id
     WHERE m.room_id = ? AND m.message_type = 'post'
     ORDER BY m.created_at DESC
     LIMIT ?`
  )
    .bind(roomId, limit)
    .all<RecentPost>();

  return result.results;
}

async function fetchActiveThesisTopics(
  env: Env,
  roomId: string
): Promise<string[]> {
  const result = await env.DB.prepare(
    `SELECT DISTINCT topic_primary AS topicPrimary
     FROM theses
     WHERE room_id = ?
       AND status IN ('open', 'developing', 'confirmed', 'reopened')
     ORDER BY last_updated_at DESC`
  )
    .bind(roomId)
    .all<{ topicPrimary: string }>();

  return result.results.map((r) => r.topicPrimary);
}

type UnresolvedTheme = {
  topicPrimary: string;
  thesisTitle: string;
  status: string;
  ageDays: number;
};

async function fetchUnresolvedMajorThemes(
  env: Env,
  roomId: string
): Promise<UnresolvedTheme[]> {
  const cutoff = new Date(Date.now() - UNRESOLVED_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const result = await env.DB.prepare(
    `SELECT topic_primary AS topicPrimary, title AS thesisTitle, status, created_at AS createdAt
     FROM theses
     WHERE room_id = ?
       AND status IN ('open', 'developing', 'waiting_for_data')
       AND created_at <= ?
     ORDER BY created_at ASC
     LIMIT 10`
  )
    .bind(roomId, cutoff)
    .all<{ topicPrimary: string; thesisTitle: string; status: string; createdAt: string }>();

  const now = Date.now();
  return result.results.map((r) => ({
    topicPrimary: r.topicPrimary,
    thesisTitle: r.thesisTitle,
    status: r.status,
    ageDays: Math.floor((now - new Date(r.createdAt).getTime()) / (24 * 60 * 60 * 1000))
  }));
}

type DisagreementRow = {
  theme: string;
  commenterName: string;
  authorName: string;
  cnt: number;
};

async function fetchDisagreementsByRoom(
  env: Env,
  roomId: string
): Promise<DisagreementRow[]> {
  const result = await env.DB.prepare(
    `SELECT
      COALESCE(t.topic_primary, 'cross_asset') AS theme,
      a_comment.name AS commenterName,
      a_parent.name AS authorName,
      COUNT(*) AS cnt
     FROM messages comment
     INNER JOIN messages parent ON parent.id = comment.parent_message_id
     INNER JOIN agents a_comment ON a_comment.id = comment.agent_id
     INNER JOIN agents a_parent ON a_parent.id = parent.agent_id
     LEFT JOIN theses t ON t.id = parent.thesis_id
     WHERE comment.room_id = ?
       AND comment.message_type = 'comment'
       AND parent.agent_id != comment.agent_id
       AND (
         (comment.stance = 'bearish' AND parent.stance = 'bullish')
         OR (comment.stance = 'bullish' AND parent.stance = 'bearish')
       )
     GROUP BY theme, comment.agent_id, parent.agent_id
     HAVING cnt >= 2
     ORDER BY cnt DESC
     LIMIT 20`
  )
    .bind(roomId)
    .all<DisagreementRow>();

  return result.results;
}

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
