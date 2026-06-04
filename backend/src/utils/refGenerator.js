const { getDatabase } = require('../config/database')
const { REF_PAD } = require('../config/constants')

function generateRef(prefix = 'OP-REC') {
  const db = getDatabase()
  const year = new Date().getFullYear().toString().slice(-2)

  const generate = db.transaction(() => {
    const existing = db
      .prepare('SELECT year, last_number FROM ref_counters WHERE prefix = ?')
      .get(prefix)

    let nextNum = 1
    if (existing) {
      if (existing.year === year) {
        nextNum = existing.last_number + 1
        db.prepare(
          'UPDATE ref_counters SET last_number = ?, updated_at = datetime(\'now\') WHERE prefix = ?'
        ).run(nextNum, prefix)
      } else {
        db.prepare(
          'UPDATE ref_counters SET year = ?, last_number = 1, updated_at = datetime(\'now\') WHERE prefix = ?'
        ).run(year, prefix)
      }
    } else {
      db.prepare(
        'INSERT INTO ref_counters (prefix, year, last_number) VALUES (?, ?, 1)'
      ).run(prefix, year)
    }

    const padded = String(nextNum).padStart(REF_PAD, '0')
    return `${prefix}-${year}${padded}`
  })

  return generate()
}

module.exports = { generateRef }
