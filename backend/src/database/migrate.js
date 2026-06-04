const fs = require('fs')
const path = require('path')
const { getDatabase } = require('../config/database')

function migrate() {
  const db = getDatabase()

  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const applied = new Set(
    db.prepare('SELECT name FROM migrations').all().map((r) => r.name)
  )

  const apply = db.transaction((file, sql) => {
    db.exec(sql)
    db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file)
  })

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`⏭  ${file} (already applied)`)
      continue
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    apply(file, sql)
    console.log(`✅ ${file}`)
  }

  console.log('Migrations complete.')
}

if (require.main === module) {
  migrate()
}

module.exports = { migrate }
