-- محاسبون: ملفات شخصية، حضور، ومحادثات (معزول عن محرك الحساب)

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id),
  display_name  TEXT,
  bio           TEXT,
  avatar_path   TEXT,
  show_online   INTEGER NOT NULL DEFAULT 1,
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_presence (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id),
  last_seen_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  is_online     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chat_threads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  type          TEXT    NOT NULL DEFAULT 'direct' CHECK(type IN ('direct')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_participants (
  thread_id     INTEGER NOT NULL REFERENCES chat_threads(id),
  user_id       INTEGER NOT NULL REFERENCES users(id),
  last_read_at  TEXT,
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id     INTEGER NOT NULL REFERENCES chat_threads(id),
  sender_id     INTEGER NOT NULL REFERENCES users(id),
  body          TEXT    NOT NULL DEFAULT '',
  message_type  TEXT    NOT NULL DEFAULT 'text'
                CHECK(message_type IN ('text', 'transaction', 'report', 'shipment')),
  payload       TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  is_deleted    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
