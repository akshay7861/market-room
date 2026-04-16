CREATE TABLE IF NOT EXISTS theses (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  owner_agent_id TEXT NOT NULL,
  sector TEXT NOT NULL,
  canonical_claim TEXT NOT NULL,
  title TEXT NOT NULL,
  topic_primary TEXT NOT NULL,
  topic_secondary TEXT,
  status TEXT NOT NULL CHECK (
    status IN ('open', 'developing', 'waiting_for_data', 'confirmed', 'invalidated', 'stale', 'reopened')
  ),
  confidence_current REAL,
  root_message_id TEXT,
  latest_message_id TEXT,
  created_snapshot_id TEXT,
  latest_snapshot_id TEXT,
  created_event_id TEXT,
  latest_event_id TEXT,
  created_at TEXT NOT NULL,
  last_updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_agent_id) REFERENCES agents(id),
  FOREIGN KEY (root_message_id) REFERENCES messages(id),
  FOREIGN KEY (latest_message_id) REFERENCES messages(id),
  FOREIGN KEY (created_snapshot_id) REFERENCES market_snapshots(id),
  FOREIGN KEY (latest_snapshot_id) REFERENCES market_snapshots(id),
  FOREIGN KEY (created_event_id) REFERENCES events(id),
  FOREIGN KEY (latest_event_id) REFERENCES events(id)
);

CREATE TABLE IF NOT EXISTS thesis_updates (
  id TEXT PRIMARY KEY,
  thesis_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  event_id TEXT,
  snapshot_id TEXT,
  message_id TEXT,
  update_type TEXT NOT NULL CHECK (
    update_type IN ('create', 'update', 'comment', 'status_change', 'reopen')
  ),
  status_before TEXT CHECK (
    status_before IN ('open', 'developing', 'waiting_for_data', 'confirmed', 'invalidated', 'stale', 'reopened')
  ),
  status_after TEXT CHECK (
    status_after IN ('open', 'developing', 'waiting_for_data', 'confirmed', 'invalidated', 'stale', 'reopened')
  ),
  confidence_before REAL,
  confidence_after REAL,
  summary TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (thesis_id) REFERENCES theses(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (snapshot_id) REFERENCES market_snapshots(id),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

ALTER TABLE messages ADD COLUMN thesis_id TEXT;
ALTER TABLE messages ADD COLUMN thesis_update_id TEXT;

CREATE INDEX IF NOT EXISTS idx_theses_room_updated_at
  ON theses(room_id, last_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_theses_owner_status_updated_at
  ON theses(owner_agent_id, status, last_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_theses_topic_primary
  ON theses(topic_primary);

CREATE INDEX IF NOT EXISTS idx_theses_root_message_id
  ON theses(root_message_id);

CREATE INDEX IF NOT EXISTS idx_thesis_updates_thesis_created_at
  ON thesis_updates(thesis_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_thesis_id
  ON messages(thesis_id, created_at DESC);
