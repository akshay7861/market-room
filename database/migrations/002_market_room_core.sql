PRAGMA defer_foreign_keys = on;

DROP TABLE IF EXISTS discussion_messages;
DROP TABLE IF EXISTS discussion_runs;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS memory_updates;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS market_snapshots;
DROP TABLE IF EXISTS agents;

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sector TEXT NOT NULL,
  bio TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  memory_summary TEXT NOT NULL,
  vector_store_id TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS market_snapshots (
  id TEXT PRIMARY KEY,
  snapshot_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  snapshot_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (snapshot_id) REFERENCES market_snapshots(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  event_id TEXT,
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  stance TEXT,
  confidence REAL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS memory_updates (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  old_summary TEXT NOT NULL,
  new_summary TEXT NOT NULL,
  trigger_event_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (trigger_event_id) REFERENCES events(id)
);

CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(active);
CREATE INDEX IF NOT EXISTS idx_messages_room_created_at ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_event_id ON messages(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_events_snapshot_id ON events(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_memory_updates_agent_id ON memory_updates(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_updates_trigger_event_id ON memory_updates(trigger_event_id);
