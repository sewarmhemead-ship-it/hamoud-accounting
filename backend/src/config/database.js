const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')
const { DB_PATH, NODE_ENV } = require('./env')

let db = null

function setDatabase(instance) {
  if (db && db !== instance) {
    try { db.close() } catch { /* ignore */ }
  }
  db = instance
}

function resetDatabase() {
  if (db) {
    try { db.close() } catch { /* ignore */ }
    db = null
  }
}

function getDatabase() {
  if (!db) {
    const resolved = path.resolve(DB_PATH)
    const dir = path.dirname(resolved)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    db = new Database(resolved, {
      verbose: NODE_ENV === 'development' ? console.log : null,
    })

    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.pragma('busy_timeout = 5000')
    db.pragma('synchronous = NORMAL')
  }
  return db
}

module.exports = { getDatabase, setDatabase, resetDatabase }
