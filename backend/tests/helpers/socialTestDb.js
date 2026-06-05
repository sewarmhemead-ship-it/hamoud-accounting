const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')
const { setDatabase, resetDatabase } = require('../../src/config/database')

function readSql(name) {
  return fs.readFileSync(
    path.join(__dirname, '../../src/database/migrations', name),
    'utf8'
  )
}

function createSocialTestDb() {
  resetDatabase()
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  setDatabase(db)

  db.exec(readSql('001_users.sql'))
  db.exec('ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT NULL;')
  db.exec(readSql('017_social.sql'))
  db.exec(readSql('018_chat_media.sql'))
  db.exec(readSql('019_chat_message_media_types.sql'))

  const insertUser = db.prepare(
    `INSERT INTO users (username, password_hash, name, role, permissions)
     VALUES (?, ?, ?, ?, ?)`
  )
  insertUser.run('acc1', 'hash1', 'محاسب أول', 'user', '[]')
  insertUser.run('acc2', 'hash2', 'محاسب ثاني', 'user', '[]')
  insertUser.run('admin1', 'hash3', 'مدير', 'admin', '[]')

  return db
}

function destroySocialTestDb(db) {
  if (db) {
    try { db.close() } catch { /* ignore */ }
  }
  resetDatabase()
}

module.exports = { createSocialTestDb, destroySocialTestDb }
