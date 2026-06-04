CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_number    TEXT    NOT NULL UNIQUE,
  date          TEXT    NOT NULL,
  type          TEXT    NOT NULL CHECK(type IN ('out', 'in')),
  center_id     INTEGER NOT NULL REFERENCES centers(id),
  currency      TEXT    NOT NULL DEFAULT 'USD' CHECK(currency IN ('USD', 'SYP', 'TRY')),
  amount        REAL    NOT NULL,
  amount_usd    REAL    NOT NULL,
  exchange_rate REAL    NOT NULL DEFAULT 1.0,
  category      TEXT    CHECK(category IN ('clearance', 'payment', 'offset', 'adjustment', 'expense', 'direct_sale')),
  shipment_id   INTEGER,
  is_delivered  INTEGER NOT NULL DEFAULT 1,
  notes         TEXT,
  is_deleted    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  created_by    INTEGER REFERENCES users(id),
  updated_by    INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_center ON transactions(center_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_shipment ON transactions(shipment_id);
