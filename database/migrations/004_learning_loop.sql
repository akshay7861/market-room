CREATE TABLE IF NOT EXISTS agent_forecasts (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  message_id TEXT NOT NULL UNIQUE,
  snapshot_id TEXT NOT NULL,
  target_instrument_key TEXT NOT NULL,
  target_instrument_label TEXT NOT NULL,
  horizon TEXT NOT NULL,
  signal TEXT NOT NULL CHECK (signal IN ('up', 'down', 'flat')),
  confidence REAL NOT NULL,
  thesis TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'resolved')) DEFAULT 'pending',
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (message_id) REFERENCES messages(id),
  FOREIGN KEY (snapshot_id) REFERENCES market_snapshots(id)
);

CREATE TABLE IF NOT EXISTS forecast_outcomes (
  id TEXT PRIMARY KEY,
  forecast_id TEXT NOT NULL UNIQUE,
  evaluation_snapshot_id TEXT NOT NULL,
  actual_direction TEXT NOT NULL CHECK (actual_direction IN ('up', 'down', 'flat')),
  actual_move TEXT NOT NULL,
  score REAL NOT NULL,
  label TEXT NOT NULL CHECK (label IN ('correct', 'partial', 'incorrect')),
  notes TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (forecast_id) REFERENCES agent_forecasts(id),
  FOREIGN KEY (evaluation_snapshot_id) REFERENCES market_snapshots(id)
);

CREATE TABLE IF NOT EXISTS agent_evaluations (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  message_id TEXT NOT NULL UNIQUE,
  clarity_score REAL NOT NULL,
  specificity_score REAL NOT NULL,
  actionability_score REAL NOT NULL,
  distinctiveness_score REAL NOT NULL,
  overall_score REAL NOT NULL,
  strengths TEXT NOT NULL,
  weaknesses TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

CREATE TABLE IF NOT EXISTS training_examples (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  forecast_id TEXT NOT NULL UNIQUE,
  evaluation_id TEXT NOT NULL,
  outcome_id TEXT NOT NULL,
  label TEXT NOT NULL CHECK (label IN ('good', 'bad')),
  input_context_json TEXT NOT NULL,
  response_text TEXT NOT NULL,
  feedback_summary TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (forecast_id) REFERENCES agent_forecasts(id),
  FOREIGN KEY (evaluation_id) REFERENCES agent_evaluations(id),
  FOREIGN KEY (outcome_id) REFERENCES forecast_outcomes(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_forecasts_agent_id ON agent_forecasts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_forecasts_status ON agent_forecasts(status);
CREATE INDEX IF NOT EXISTS idx_forecast_outcomes_forecast_id ON forecast_outcomes(forecast_id);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_agent_id ON agent_evaluations(agent_id);
CREATE INDEX IF NOT EXISTS idx_training_examples_agent_id ON training_examples(agent_id);
