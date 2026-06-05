const { getDatabase } = require('../config/database')

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_app_settings_updated ON app_settings(updated_at);
`

class SettingsModel {
  get db() {
    return getDatabase()
  }

  ensureTable() {
    this.db.exec(CREATE_SQL)
  }

  getAll() {
    this.ensureTable()
    const rows = this.db.prepare('SELECT key, value FROM app_settings').all()
    const map = {}
    for (const r of rows) {
      try {
        map[r.key] = JSON.parse(r.value)
      } catch {
        map[r.key] = r.value
      }
    }
    return map
  }

  setMany(pairs, userId) {
    this.ensureTable()
    const stmt = this.db.prepare(`
      INSERT INTO app_settings (key, value, updated_at, updated_by)
      VALUES (?, ?, datetime('now'), ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `)
    const run = this.db.transaction((entries) => {
      for (const [key, val] of entries) {
        stmt.run(key, JSON.stringify(val), userId ?? null)
      }
    })
    run(Object.entries(pairs))
  }
}

module.exports = new SettingsModel()
