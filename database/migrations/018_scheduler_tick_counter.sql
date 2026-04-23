CREATE TABLE IF NOT EXISTS scheduler_tick_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total_ticks INTEGER NOT NULL DEFAULT 0,
  last_tick_at TEXT,
  last_synthesis_at TEXT
);

INSERT OR IGNORE INTO scheduler_tick_state (id, total_ticks) VALUES (1, 0);
