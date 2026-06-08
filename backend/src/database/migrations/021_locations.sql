-- خيارات المصدر والوجهة (تُدار من لوحة الإدارة، تظهر كقوائم في صفحة التسجيل)
CREATE TABLE IF NOT EXISTS sources (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL UNIQUE,
  name_en   TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT   NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS destinations (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL UNIQUE,
  name_en   TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT   NOT NULL DEFAULT (datetime('now'))
);
