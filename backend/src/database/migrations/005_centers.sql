CREATE TABLE IF NOT EXISTS centers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL CHECK(type IN ('trader', 'broker', 'supplier', 'partner', 'fund', 'internal')),
  currency    TEXT    NOT NULL DEFAULT 'USD' CHECK(currency IN ('USD', 'SYP', 'TRY')),
  notes       TEXT,
  is_deleted  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  created_by  INTEGER REFERENCES users(id),
  updated_by  INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_centers_type ON centers(type);
CREATE INDEX IF NOT EXISTS idx_centers_code ON centers(code);
