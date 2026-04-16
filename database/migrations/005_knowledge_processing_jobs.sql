CREATE TABLE IF NOT EXISTS knowledge_processing_jobs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')) DEFAULT 'queued',
  processing_model TEXT NOT NULL,
  total_files INTEGER NOT NULL DEFAULT 0,
  processed_files INTEGER NOT NULL DEFAULT 0,
  completed_files INTEGER NOT NULL DEFAULT 0,
  failed_files INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS knowledge_processing_job_items (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  processed_filename TEXT,
  title TEXT,
  summary TEXT,
  market_case_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES knowledge_processing_jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_processing_jobs_agent_id ON knowledge_processing_jobs(agent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_processing_jobs_status ON knowledge_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_processing_job_items_job_id ON knowledge_processing_job_items(job_id);
