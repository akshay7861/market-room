CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  bio TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  memory_summary TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused'))
);

CREATE TABLE IF NOT EXISTS discussion_runs (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS discussion_messages (
  id TEXT PRIMARY KEY,
  discussion_run_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (discussion_run_id) REFERENCES discussion_runs(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
