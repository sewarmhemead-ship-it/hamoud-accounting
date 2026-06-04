CREATE TABLE IF NOT EXISTS shipments (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_number          TEXT    NOT NULL UNIQUE,

  center_id           INTEGER NOT NULL REFERENCES centers(id),
  clearance_center_id INTEGER REFERENCES centers(id),
  border_id           INTEGER NOT NULL REFERENCES borders(id),
  goods_type_id       INTEGER REFERENCES goods_types(id),
  goods_name          TEXT,
  weight              REAL,
  quantity            INTEGER,
  source              TEXT    NOT NULL,
  destination         TEXT    NOT NULL,
  driver_name         TEXT,
  entry_date          TEXT    NOT NULL,

  tarseem             REAL,
  tax_2pct            REAL,
  service_fee         REAL,
  workers             REAL,
  clearance_fee       REAL,
  syrian_driver       REAL,
  turkish_transport   REAL,
  internal_transport  REAL,
  door_receipt        REAL,
  other_expenses      REAL,
  total_cost          REAL,

  status              TEXT    NOT NULL DEFAULT 'pending'
                        CHECK(status IN ('pending', 'complete', 'posted', 'delivered')),
  completed_at        TEXT,
  posted_at           TEXT,
  delivered_at        TEXT,
  transaction_id      INTEGER REFERENCES transactions(id),

  notes               TEXT,
  is_deleted          INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  created_by          INTEGER REFERENCES users(id),
  updated_by          INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_shipments_center ON shipments(center_id);
CREATE INDEX IF NOT EXISTS idx_shipments_broker ON shipments(clearance_center_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_entry_date ON shipments(entry_date);
