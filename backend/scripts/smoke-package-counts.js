const Database = require('better-sqlite3')
const dbPath = process.env.SMOKE_DB
if (!dbPath) {
  console.error('SMOKE_DB required')
  process.exit(1)
}
const db = new Database(dbPath, { readonly: true })
const centers = db.prepare('SELECT count(*) AS c FROM centers WHERE is_deleted=0').get().c
let shipments = 0
try {
  shipments = db.prepare('SELECT count(*) AS c FROM shipments').get().c
} catch (_) {}
db.close()
console.log(JSON.stringify({ centers, shipments }))
