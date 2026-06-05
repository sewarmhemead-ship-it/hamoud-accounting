const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')
const bcrypt = require('bcrypt')
const { setDatabase, resetDatabase } = require('../../src/config/database')
const { PERM_TEMPLATES } = require('../../src/config/permissions')

function readSql(name) {
  return fs.readFileSync(
    path.join(__dirname, '../../src/database/migrations', name),
    'utf8'
  )
}

async function createAuthTestDb() {
  resetDatabase()
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  setDatabase(db)

  db.exec(readSql('001_users.sql'))
  db.exec('ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT NULL;')

  const hash = await bcrypt.hash('secret123', 4)
  const insert = db.prepare(
    `INSERT INTO users (username, password_hash, name, role, permissions)
     VALUES (?, ?, ?, ?, ?)`
  )

  const accountantPerms = JSON.stringify(
    PERM_TEMPLATES.find((t) => t.id === 'accountant').perms
  )
  const viewerPerms = JSON.stringify(
    PERM_TEMPLATES.find((t) => t.id === 'viewer').perms
  )

  insert.run('admin', hash, 'مدير النظام', 'admin', '[]')
  insert.run('acc', hash, 'محاسب تجريبي', 'user', accountantPerms)
  insert.run('view', hash, 'مستعرض', 'user', viewerPerms)

  return { db, password: 'secret123' }
}

function destroyAuthTestDb(db) {
  if (db) {
    try {
      db.close()
    } catch {
      /* ignore */
    }
  }
  resetDatabase()
}

module.exports = { createAuthTestDb, destroyAuthTestDb }
