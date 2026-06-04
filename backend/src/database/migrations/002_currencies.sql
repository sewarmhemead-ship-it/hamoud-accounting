CREATE TABLE IF NOT EXISTS currencies (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  code      TEXT    NOT NULL UNIQUE,
  name_ar   TEXT    NOT NULL,
  name_en   TEXT    NOT NULL,
  symbol    TEXT    NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT   NOT NULL DEFAULT (datetime('now'))
);
