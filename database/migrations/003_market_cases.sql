CREATE TABLE IF NOT EXISTS market_cases (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date_label TEXT NOT NULL,
  regime_tags_json TEXT NOT NULL,
  market_context TEXT NOT NULL,
  pattern_summary TEXT NOT NULL,
  implication_note TEXT NOT NULL,
  outcome_note TEXT NOT NULL,
  source_label TEXT,
  source_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_market_cases_agent_id ON market_cases(agent_id);
CREATE INDEX IF NOT EXISTS idx_market_cases_created_at ON market_cases(created_at DESC);
