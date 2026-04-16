ALTER TABLE knowledge_processing_job_items ADD COLUMN distilled_markdown TEXT;
ALTER TABLE knowledge_processing_job_items ADD COLUMN market_cases_json TEXT;
ALTER TABLE knowledge_processing_job_items ADD COLUMN review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE knowledge_processing_job_items ADD COLUMN review_notes TEXT;
ALTER TABLE knowledge_processing_job_items ADD COLUMN reviewed_at TEXT;
ALTER TABLE knowledge_processing_job_items ADD COLUMN persisted_at TEXT;
