-- توسيع أنواع الرسائل: صور، ملفات، صوت

CREATE TABLE IF NOT EXISTS chat_messages_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id     INTEGER NOT NULL REFERENCES chat_threads(id),
  sender_id     INTEGER NOT NULL REFERENCES users(id),
  body          TEXT    NOT NULL DEFAULT '',
  message_type  TEXT    NOT NULL DEFAULT 'text'
                CHECK(message_type IN (
                  'text', 'transaction', 'report', 'shipment',
                  'image', 'file', 'voice'
                )),
  payload       TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  is_deleted    INTEGER NOT NULL DEFAULT 0
);

INSERT INTO chat_messages_new
  SELECT * FROM chat_messages;

DROP TABLE chat_messages;

ALTER TABLE chat_messages_new RENAME TO chat_messages;

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at);
