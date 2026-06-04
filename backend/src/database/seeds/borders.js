const { getDatabase } = require('../../config/database')

function seedBorders() {
  const db = getDatabase()
  const borders = [
    { name: 'باب الهawa', name_en: 'Bab Al-Hawa' },
    { name: 'كسب', name_en: 'Kasab' },
    { name: 'جرابلس', name_en: 'Jarablus' },
    { name: 'رأس العين', name_en: 'Ras Al-Ain' },
  ]

  const insert = db.prepare(`
    INSERT OR IGNORE INTO borders (name, name_en) VALUES (@name, @name_en)
  `)

  for (const b of borders) insert.run(b)
  console.log('✅ borders seeded')
}

module.exports = { seedBorders }
