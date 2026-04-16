CREATE TABLE IF NOT EXISTS decision_event_log (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  action_type TEXT NOT NULL,           -- new_post | update_existing | comment_only | stay_silent
  reason_codes_json TEXT NOT NULL,     -- JSON array of PostingReasonCode strings
  novelty_score REAL,
  candidate_theme_key TEXT,
  target_thesis_id TEXT,
  message_id TEXT,                     -- NULL when action_type is stay_silent or comment_only
  decided_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_decision_log_agent_room
  ON decision_event_log (agent_id, room_id, decided_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_log_room
  ON decision_event_log (room_id, decided_at DESC);
