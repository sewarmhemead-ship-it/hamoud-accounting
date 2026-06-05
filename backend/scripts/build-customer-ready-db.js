/**
 * يبني قاعدة جاهزة للزبون:
 * - معابر، عملات، أنواع بضائع، مراكز (تجار/مخلصين)
 * - مستخدم admin فقط
 * - بدون سيارات، حركات، مربح، جرد، محادثات
 */
const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')
const { setDatabase, resetDatabase } = require('../src/config/database')

const OUT_DIR = path.join(__dirname, '..', 'seed-data')
const OUT_FILE = path.join(OUT_DIR, 'customer-ready.db')

function applyAllMigrations(db) {
  const dir = path.join(__dirname, '..', 'src', 'database', 'migrations')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  const applied = new Set(
    db.prepare('SELECT name FROM migrations').all().map((r) => r.name)
  )
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    db.exec(sql)
    db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file)
  }
}

function assertEmptyTransactional(db) {
  const checks = [
    ['shipments', 'SELECT COUNT(*) AS c FROM shipments'],
    ['transactions', 'SELECT COUNT(*) AS c FROM transactions'],
    ['daily_profit', 'SELECT COUNT(*) AS c FROM daily_profit'],
    ['inventory_snapshots', 'SELECT COUNT(*) AS c FROM inventory_snapshots'],
    ['chat_messages', 'SELECT COUNT(*) AS c FROM chat_messages'],
  ]
  for (const [name, sql] of checks) {
    try {
      const c = db.prepare(sql).get().c
      if (c > 0) throw new Error(`${name} has ${c} rows — expected 0`)
    } catch (e) {
      if (e.message.includes('no such table')) continue
      throw e
    }
  }
}

function main() {
  if (fs.existsSync(OUT_FILE)) fs.unlinkSync(OUT_FILE)
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  resetDatabase()
  const db = new Database(OUT_FILE)
  db.pragma('journal_mode = DELETE')
  db.pragma('foreign_keys = ON')
  setDatabase(db)

  applyAllMigrations(db)

  const { seedCurrencies } = require('../src/database/seeds/currencies')
  const { seedBorders } = require('../src/database/seeds/borders')
  const { seedGoodsTypes } = require('../src/database/seeds/goods_types')
  const { seedCenters } = require('../src/database/seeds/centers')

  seedCurrencies()
  seedBorders()
  seedGoodsTypes()
  seedCenters()

  const bcrypt = require('bcrypt')
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10)
  db.prepare(
    `INSERT INTO users (username, password_hash, name, role, permissions)
     VALUES ('admin', ?, 'مدير النظام', 'admin', '[]')`
  ).run(hash)

  const stats = {
    centers: db.prepare('SELECT COUNT(*) AS c FROM centers WHERE is_deleted = 0').get().c,
    borders: db.prepare('SELECT COUNT(*) AS c FROM borders').get().c,
    goods: db.prepare('SELECT COUNT(*) AS c FROM goods_types').get().c,
    users: db.prepare('SELECT COUNT(*) AS c FROM users WHERE is_deleted = 0').get().c,
  }

  assertEmptyTransactional(db)
  db.close()
  resetDatabase()

  console.log('✅ customer-ready.db')
  console.log(JSON.stringify(stats, null, 2))
  console.log(`   → ${OUT_FILE}`)
  console.log('   Login: admin / admin123 (or ADMIN_PASSWORD env)')
}

main()
