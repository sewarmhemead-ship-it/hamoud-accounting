const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')
const bcrypt = require('bcrypt')
const { setDatabase, resetDatabase } = require('../../src/config/database')
const { seedCurrencies } = require('../../src/database/seeds/currencies')
const { seedBorders } = require('../../src/database/seeds/borders')
const { seedGoodsTypes } = require('../../src/database/seeds/goods_types')

function applyAllMigrations(db) {
  const dir = path.join(__dirname, '../../src/database/migrations')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    try {
      db.exec(sql)
    } catch (e) {
      if (file === '019_chat_message_media_types.sql' && /already exists/i.test(e.message)) {
        continue
      }
      throw e
    }
  }
}

async function createFullProductDb() {
  resetDatabase()
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = MEMORY')
  setDatabase(db)

  applyAllMigrations(db)
  seedCurrencies()
  seedBorders()
  seedGoodsTypes()

  const hash = await bcrypt.hash('testpass', 4)
  db.prepare(
    `INSERT INTO users (username, password_hash, name, role, permissions)
     VALUES ('admin', ?, 'مدير الاختبار', 'admin', '[]')`
  ).run(hash)
  db.prepare(
    `INSERT INTO users (username, password_hash, name, role, permissions)
     VALUES ('acc', ?, 'محاسب', 'user', ?)`
  ).run(
    hash,
    JSON.stringify([
      'shipments_view', 'shipments_create', 'shipments_edit', 'shipments_post', 'shipments_deliver',
      'centers_view', 'payments_create', 'profit_view', 'profit_close', 'reports_view',
    ])
  )

  const trader = db
    .prepare(
      `INSERT INTO centers (code, name, type, currency) VALUES ('101', 'تاجر تجريبي', 'trader', 'USD')`
    )
    .run()
  const broker = db
    .prepare(
      `INSERT INTO centers (code, name, type, currency) VALUES ('201', 'مخلص تجريبي', 'broker', 'USD')`
    )
    .run()

  const borderId = db.prepare('SELECT id FROM borders LIMIT 1').get().id

  db.prepare(
    `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('backup_include_db', ?)`
  ).run(JSON.stringify(false))

  return {
    db,
    adminId: 1,
    accId: 2,
    traderId: trader.lastInsertRowid,
    brokerId: broker.lastInsertRowid,
    borderId,
    testDate: '2026-06-05',
  }
}

function destroyFullProductDb(db) {
  if (db) {
    try {
      db.close()
    } catch {
      /* ignore */
    }
  }
  resetDatabase()
}

module.exports = { createFullProductDb, destroyFullProductDb, applyAllMigrations }
