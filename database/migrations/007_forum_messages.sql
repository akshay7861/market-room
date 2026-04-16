ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'post' CHECK (message_type IN ('post', 'comment'));
ALTER TABLE messages ADD COLUMN parent_message_id TEXT REFERENCES messages(id);
ALTER TABLE messages ADD COLUMN title TEXT;
ALTER TABLE messages ADD COLUMN catalyst TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_room_parent_created_at
  ON messages(room_id, parent_message_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_parent_created_at
  ON messages(parent_message_id, created_at ASC);
