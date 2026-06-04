const fs = require('fs')
const path = require('path')

// يستعيد قاعدة بيانات أولية مُجمَّعة في المستودع إلى DB_PATH عند الإقلاع الأول
// فقط إذا كان ملف القاعدة غير موجود (أو فارغ). لا يكتب فوق بيانات حقيقية أبداً.
//
// يُحلّل DB_PATH بنفس طريقة التطبيق (config/env.js) دون فتح أي اتصال بالقاعدة،
// كي يعمل قبل migrate() وقبل أي getDatabase().
function restoreIfMissing() {
  const dbPath = process.env.DB_PATH || './data/hamoud.db'
  const target = path.resolve(dbPath)

  try {
    if (fs.existsSync(target) && fs.statSync(target).size > 0) {
      console.log(`ℹ️  database already present at ${target} — skipping restore`)
      return
    }

    const snapshot = path.join(__dirname, '..', '..', 'seed-data', 'initial.db')
    if (!fs.existsSync(snapshot)) {
      console.warn(
        `⚠️  no bundled snapshot at ${snapshot} — booting with empty database`
      )
      return
    }

    const dir = path.dirname(target)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.copyFileSync(snapshot, target)
    console.log(`🌱 restored initial database to ${target}`)
  } catch (err) {
    console.error(`❌ failed to restore initial database to ${target}:`, err)
    throw err
  }
}

module.exports = { restoreIfMissing }
