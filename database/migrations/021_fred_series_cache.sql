-- fred_series_cache: stores live FRED series observations fetched at runtime.
-- Rows are keyed by our internal series ID (e.g. "fred_nonfarm_payrolls").
-- payload_json: full normalized HistoricalSeries JSON (same schema as embedded JSON files).
-- fetched_at:   ISO 8601 UTC timestamp of the last successful FRED API fetch.
--
-- The Worker refreshes any row older than 18 hours on each hourly cron tick.
-- Falls back to the embedded static JSON when the table is empty (first deploy).

CREATE TABLE IF NOT EXISTS fred_series_cache (
  series_id    TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  fetched_at   TEXT NOT NULL
);
