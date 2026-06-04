CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date         TEXT    NOT NULL,
  label                 TEXT,
  center_id             INTEGER NOT NULL REFERENCES centers(id),
  balance               REAL    NOT NULL DEFAULT 0,
  posted_undelivered    REAL    NOT NULL DEFAULT 0,
  wip_value             REAL    NOT NULL DEFAULT 0,
  total                 REAL    NOT NULL DEFAULT 0,
  category              TEXT,
  notes                 TEXT,
  is_deleted            INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  created_by            INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_date ON inventory_snapshots(snapshot_date);
