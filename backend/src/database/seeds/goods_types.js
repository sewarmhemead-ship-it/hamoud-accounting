const { getDatabase } = require('../../config/database')

function seedGoodsTypes() {
  const db = getDatabase()
  const types = [
    { name: 'خضار', name_en: 'Vegetables' },
    { name: 'فواكه', name_en: 'Fruits' },
    { name: 'طازج', name_en: 'Fresh produce' },
    { name: 'مواد غذائية', name_en: 'Foodstuff' },
    { name: 'مواد بناء', name_en: 'Building materials' },
    { name: 'أخرى', name_en: 'Other' },
  ]

  const insert = db.prepare(`
    INSERT OR IGNORE INTO goods_types (name, name_en) VALUES (@name, @name_en)
  `)

  for (const t of types) insert.run(t)
  console.log('✅ goods_types seeded')
}

module.exports = { seedGoodsTypes }
