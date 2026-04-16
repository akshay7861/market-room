CREATE TABLE IF NOT EXISTS agent_state_features (
  agent_id TEXT PRIMARY KEY,
  active_thesis_count INTEGER NOT NULL DEFAULT 0,
  open_topics_json TEXT NOT NULL DEFAULT '[]',
  recent_theme_counts_json TEXT NOT NULL DEFAULT '{}',
  recent_catalyst_counts_json TEXT NOT NULL DEFAULT '{}',
  recent_post_modes_json TEXT NOT NULL DEFAULT '{}',
  recently_overused_frames_json TEXT NOT NULL DEFAULT '[]',
  last_20_hit_rate REAL,
  last_20_low_value_post_rate REAL,
  confidence_bias_score REAL,
  topics_to_deprioritize_json TEXT NOT NULL DEFAULT '[]',
  topics_to_revisit_json TEXT NOT NULL DEFAULT '[]',
  recent_disagreement_targets_json TEXT NOT NULL DEFAULT '[]',
  avg_novelty_score_7d REAL,
  last_updated_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
