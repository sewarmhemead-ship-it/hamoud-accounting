const fs = require('fs')
const path = require('path')
const { getDatabase } = require('../../config/database')

/**
 * مراكز المخلصين والتجار — بيانات أساسية للزبون (بدون حركات أو سيارات).
 */
function seedCenters() {
  const jsonPath = path.join(__dirname, '..', '..', '..', 'seed-data', 'centers-master.json')
  if (!fs.existsSync(jsonPath)) {
    console.warn('⚠️  centers-master.json missing — skip centers seed')
    return 0
  }

  const db = getDatabase()
  const existing = db.prepare('SELECT COUNT(*) AS c FROM centers WHERE is_deleted = 0').get()
  if (existing.c > 0) {
    console.log(`⏭  centers already present (${existing.c})`)
    return existing.c
  }

  const rows = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const insert = db.prepare(`
    INSERT INTO centers (code, name, type, currency, notes, is_deleted)
    VALUES (?, ?, ?, ?, ?, 0)
  `)

  const run = db.transaction((list) => {
    for (const r of list) {
      insert.run(r.code, r.name, r.type, r.currency || 'USD', r.notes || null)
    }
  })
  run(rows)
  console.log(`✅ centers seeded (${rows.length} — traders & brokers)`)
  return rows.length
}

module.exports = { seedCenters }
