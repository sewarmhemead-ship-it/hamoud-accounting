require('dotenv').config()

const app = require('./src/app')
const { migrate } = require('./src/database/migrate')
const { runSeeds } = require('./src/database/seeds/index')
const { PORT, NODE_ENV } = require('./src/config/env')

async function start() {
  migrate()

  // البذور idempotent (تتخطّى الموجود): نشغّلها في كل البيئات كي يحصل أي نشر
  // جديد على البيانات الأساسية (عملات/معابر/أنواع بضائع) وحساب مدير للدخول.
  await runSeeds()

  app.listen(PORT, () => {
    console.log(`🚀 hamoud-accounting API running on http://localhost:${PORT}`)
    console.log(`   Environment: ${NODE_ENV}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
