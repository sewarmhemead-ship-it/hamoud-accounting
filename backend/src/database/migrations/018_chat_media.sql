CREATE TABLE IF NOT EXISTS chat_media (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id   INTEGER NOT NULL REFERENCES chat_threads(id),
  uploader_id INTEGER NOT NULL REFERENCES users(id),
  kind        TEXT NOT NULL CHECK(kind IN ('image', 'file', 'voice')),
  filename    TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL,
  file_path   TEXT NOT NULL,
  duration_ms INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_media_thread ON chat_media(thread_id);
