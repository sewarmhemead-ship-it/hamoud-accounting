-- ربط transactions بـ shipments بعد إنشاء shipments
-- SQLite لا يدعم ADD CONSTRAINT بسهولة، نستخدم trigger للتحقق

CREATE TABLE IF NOT EXISTS shipment_updates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id INTEGER NOT NULL REFERENCES shipments(id),
  field_name  TEXT    NOT NULL,
  old_value   REAL,
  new_value   REAL,
  note        TEXT,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_by  INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_shipment_updates_shipment ON shipment_updates(shipment_id);
