const { migrate } = require('../migrate')
const { seedCurrencies } = require('./currencies')
const { seedBorders } = require('./borders')
const { seedGoodsTypes } = require('./goods_types')
const { seedCenters } = require('./centers')
const { seedUsers } = require('./users')

async function runSeeds() {
  migrate()
  seedCurrencies()
  seedBorders()
  seedGoodsTypes()
  seedCenters()
  await seedUsers()
  console.log('All seeds complete.')
}

if (require.main === module) {
  runSeeds().catch(console.error)
}

module.exports = { runSeeds }
