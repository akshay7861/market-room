CREATE TABLE IF NOT EXISTS room_coverage_state (
  room_id TEXT PRIMARY KEY,
  theme_counts_json TEXT NOT NULL DEFAULT '{}',
  catalyst_counts_json TEXT NOT NULL DEFAULT '{}',
  sector_coverage_json TEXT NOT NULL DEFAULT '{}',
  undercovered_topics_json TEXT NOT NULL DEFAULT '[]',
  overcovered_topics_json TEXT NOT NULL DEFAULT '[]',
  disagreement_map_json TEXT NOT NULL DEFAULT '{}',
  unresolved_major_themes_json TEXT NOT NULL DEFAULT '[]',
  post_density_by_sector_json TEXT NOT NULL DEFAULT '{}',
  latest_refreshed_at TEXT NOT NULL
);
