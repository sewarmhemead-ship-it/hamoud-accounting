const { getDatabase } = require('../../config/database')

function seedLocations() {
  const db = getDatabase()

  const sources = [
    { name: 'مرسين', name_en: 'Mersin' },
    { name: 'إسطنبول', name_en: 'Istanbul' },
    { name: 'غازي عنتاب', name_en: 'Gaziantep' },
    { name: 'أضنة', name_en: 'Adana' },
    { name: 'هاتاي', name_en: 'Hatay' },
  ]
  const destinations = [
    { name: 'حلب', name_en: 'Aleppo' },
    { name: 'إدلب', name_en: 'Idlib' },
    { name: 'دمشق', name_en: 'Damascus' },
    { name: 'اللاذقية', name_en: 'Latakia' },
    { name: 'حمص', name_en: 'Homs' },
  ]

  const insSrc = db.prepare('INSERT OR IGNORE INTO sources (name, name_en) VALUES (@name, @name_en)')
  const insDst = db.prepare('INSERT OR IGNORE INTO destinations (name, name_en) VALUES (@name, @name_en)')

  for (const s of sources) insSrc.run(s)
  for (const d of destinations) insDst.run(d)
  console.log('✅ sources & destinations seeded')
}

module.exports = { seedLocations }
