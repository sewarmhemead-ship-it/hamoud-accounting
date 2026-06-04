const bcrypt = require('bcrypt')
const { getDatabase } = require('../../config/database')

function seedCurrencies() {
  const db = getDatabase()
  const currencies = [
    { code: 'USD', name_ar: 'دولار أمريكي', name_en: 'US Dollar', symbol: '$' },
    { code: 'SYP', name_ar: 'ليرة سورية', name_en: 'Syrian Pound', symbol: 'ل.س' },
    { code: 'TRY', name_ar: 'ليرة تركية', name_en: 'Turkish Lira', symbol: '₺' },
  ]

  const insert = db.prepare(`
    INSERT OR IGNORE INTO currencies (code, name_ar, name_en, symbol)
    VALUES (@code, @name_ar, @name_en, @symbol)
  `)

  for (const c of currencies) insert.run(c)
  console.log('✅ currencies seeded')
}

module.exports = { seedCurrencies }
