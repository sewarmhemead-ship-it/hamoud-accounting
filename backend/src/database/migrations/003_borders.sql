CREATE TABLE IF NOT EXISTS borders (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL UNIQUE,
  name_en   TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT   NOT NULL DEFAULT (datetime('now'))
);
