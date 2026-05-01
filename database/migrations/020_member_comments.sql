CREATE TABLE IF NOT EXISTS member_comments (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_comments_thread_id ON member_comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_member_comments_user_id ON member_comments(user_id);
