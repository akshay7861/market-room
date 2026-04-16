import type { RoomCoverageState } from "@market-room/shared";
import type { Env } from "../../index";

type RoomCoverageRow = {
  room_id: string;
  theme_counts_json: string;
  catalyst_counts_json: string;
  sector_coverage_json: string;
  undercovered_topics_json: string;
  overcovered_topics_json: string;
  disagreement_map_json: string;
  unresolved_major_themes_json: string;
  post_density_by_sector_json: string;
  latest_refreshed_at: string;
};

function mapRow(row: RoomCoverageRow): RoomCoverageState {
  return {
    roomId: row.room_id,
    themeCounts: JSON.parse(row.theme_counts_json),
    catalystCounts: JSON.parse(row.catalyst_counts_json),
    sectorCoverage: JSON.parse(row.sector_coverage_json),
    undercoveredTopics: JSON.parse(row.undercovered_topics_json),
    overcoveredTopics: JSON.parse(row.overcovered_topics_json),
    disagreementMap: JSON.parse(row.disagreement_map_json),
    unresolvedMajorThemes: JSON.parse(row.unresolved_major_themes_json),
    postDensityBySector: JSON.parse(row.post_density_by_sector_json),
    latestRefreshedAt: row.latest_refreshed_at
  };
}

export function createRoomCoverageRepository(env: Env) {
  return {
    async getByRoomId(roomId: string): Promise<RoomCoverageState | null> {
      const row = await env.DB.prepare(
        "SELECT * FROM room_coverage_state WHERE room_id = ?"
      )
        .bind(roomId)
        .first<RoomCoverageRow>();

      return row ? mapRow(row) : null;
    },

    async upsert(state: RoomCoverageState): Promise<void> {
      await env.DB.prepare(
        `INSERT OR REPLACE INTO room_coverage_state (
          room_id, theme_counts_json, catalyst_counts_json, sector_coverage_json,
          undercovered_topics_json, overcovered_topics_json, disagreement_map_json,
          unresolved_major_themes_json, post_density_by_sector_json, latest_refreshed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          state.roomId,
          JSON.stringify(state.themeCounts),
          JSON.stringify(state.catalystCounts),
          JSON.stringify(state.sectorCoverage),
          JSON.stringify(state.undercoveredTopics),
          JSON.stringify(state.overcoveredTopics),
          JSON.stringify(state.disagreementMap),
          JSON.stringify(state.unresolvedMajorThemes),
          JSON.stringify(state.postDensityBySector),
          state.latestRefreshedAt
        )
        .run();
    }
  };
}
