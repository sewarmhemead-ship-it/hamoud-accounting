const { migrate } = require('../migrate')
const { seedCurrencies } = require('./currencies')
const { seedBorders } = require('./borders')
const { seedGoodsTypes } = require('./goods_types')
const { seedUsers } = require('./users')

async function runSeeds() {
  migrate()
  seedCurrencies()
  seedBorders()
  seedGoodsTypes()
  await seedUsers()
  console.log('All seeds complete.')
}

if (require.main === module) {
  runSeeds().catch(console.error)
}

module.exports = { runSeeds }
