/**
 * يتحقق أن restoreIfMissing ينسخ customer-ready.db ويُبقي العمليات صفراً.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const Database = require('better-sqlite3')

const backendRoot = path.join(__dirname, '..')
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hamoud-smoke-'))
const dbPath = path.join(tmpDir, 'hamoud.db')

process.chdir(backendRoot)
process.env.DB_PATH = dbPath
delete require.cache[require.resolve('../src/database/restore')]

const { restoreIfMissing } = require('../src/database/restore')
restoreIfMissing()

if (!fs.existsSync(dbPath)) {
  console.error('FAIL: hamoud.db not created after restore')
  process.exit(1)
}

const db = new Database(dbPath, { readonly: true })
const expect = {
  centers: (db.prepare('SELECT COUNT(*) AS c FROM centers WHERE is_deleted = 0').get()).c,
  borders: db.prepare('SELECT COUNT(*) AS c FROM borders').get().c,
  goods: db.prepare('SELECT COUNT(*) AS c FROM goods_types').get().c,
  users: db.prepare('SELECT COUNT(*) AS c FROM users WHERE is_deleted = 0').get().c,
  shipments: db.prepare('SELECT COUNT(*) AS c FROM shipments').get().c,
  transactions: db.prepare('SELECT COUNT(*) AS c FROM transactions').get().c,
}
db.close()

const errors = []
if (expect.centers < 1) errors.push(`centers=${expect.centers} expected >= 1`)
if (expect.borders < 1) errors.push(`borders=${expect.borders} expected >= 1`)
if (expect.shipments !== 0) errors.push(`shipments=${expect.shipments} expected 0`)
if (expect.transactions !== 0) errors.push(`transactions=${expect.transactions} expected 0`)
if (expect.users < 1) errors.push(`users=${expect.users} expected >= 1`)

try {
  fs.unlinkSync(dbPath)
  fs.rmdirSync(tmpDir)
} catch {
  /* ignore */
}

if (errors.length) {
  console.error('FAIL smoke-customer-restore:', errors.join('; '))
  console.error(JSON.stringify(expect, null, 2))
  process.exit(1)
}

console.log('OK smoke-customer-restore')
console.log(JSON.stringify(expect, null, 2))
