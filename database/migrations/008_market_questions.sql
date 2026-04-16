CREATE TABLE IF NOT EXISTS market_question_threads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  assigned_agent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (assigned_agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_market_question_threads_updated_at
  ON market_question_threads(updated_at DESC);

CREATE TABLE IF NOT EXISTS market_question_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  agent_id TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES market_question_threads(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_market_question_messages_thread_id
  ON market_question_messages(thread_id, created_at ASC);
