CREATE TABLE IF NOT EXISTS ref_counters (
  prefix      TEXT PRIMARY KEY,
  year        TEXT NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
