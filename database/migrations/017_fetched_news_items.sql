-- Migration 017: fetched_news_items
-- Tracks every article seen during a Marketaux (or other) news fetch per run,
-- including those rejected before routing. Enables debug inspection of what
-- the system saw, scored, and decided to route or discard.

CREATE TABLE IF NOT EXISTS fetched_news_items (
  id                    TEXT PRIMARY KEY,
  event_id              TEXT NOT NULL REFERENCES events(id),
  article_uuid          TEXT NOT NULL,        -- stable provider UUID (or djb2 hash for non-UUID sources)
  provider              TEXT NOT NULL,        -- 'marketaux' | 'yahoo' | 'fred' | 'fed_rss'
  title                 TEXT NOT NULL,
  source                TEXT NOT NULL,
  url                   TEXT,
  published_at          TEXT,
  description           TEXT,                 -- article snippet / summary
  entities_json         TEXT,                 -- JSON array of entity name strings
  selection_score       INTEGER,              -- 0-100 scoring result
  selection_outcome     TEXT NOT NULL,        -- 'selected' | 'rejected_duplicate' | 'rejected_stale' | 'rejected_noise' | 'rejected_seen' | 'rejected_no_description'
  routed_agent_ids_json TEXT,                 -- JSON array of agent IDs this article was routed to
  fetched_at            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fetched_news_event    ON fetched_news_items(event_id);
CREATE INDEX IF NOT EXISTS idx_fetched_news_uuid     ON fetched_news_items(article_uuid);
CREATE INDEX IF NOT EXISTS idx_fetched_news_provider ON fetched_news_items(provider);
CREATE INDEX IF NOT EXISTS idx_fetched_news_fetched  ON fetched_news_items(fetched_at);
