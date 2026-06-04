const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

// يفحص ما إذا كانت قاعدة الـ volume تحتوي بيانات حقيقية، دون أي أثر جانبي.
// لا ينشئ الملف ولا يعدّله أبداً (readonly:true).
// يُعيد عدد المراكز (centers): 0 يعني فارغة/غير صالحة (مؤهّلة للاستعادة)،
// N>0 يعني بيانات حقيقية يجب حمايتها.
function countCenters(target) {
  if (!fs.existsSync(target) || fs.statSync(target).size === 0) {
    return 0
  }

  let db
  try {
    db = new Database(target, { readonly: true, fileMustExist: true })
    const row = db.prepare('SELECT count(*) AS c FROM centers').get()
    return row && typeof row.c === 'number' ? row.c : 0
  } catch (err) {
    // لا جدول centers / ليست قاعدة صالحة مأهولة -> نعاملها كفارغة
    return 0
  } finally {
    if (db) {
      try {
        db.close()
      } catch (_) {
        /* ignore */
      }
    }
  }
}

// يستعيد قاعدة بيانات أولية مُجمَّعة في المستودع إلى DB_PATH عند الإقلاع الأول
// فقط إذا كانت قاعدة الـ volume فارغة/غير مأهولة. يحمي بيانات العميل الحقيقية:
// لا يكتب فوق قاعدة تحتوي مراكز (centers > 0) أبداً.
//
// يُحلّل DB_PATH بنفس طريقة التطبيق (config/env.js)، ويفحص المحتوى readonly فقط،
// كي يعمل قبل migrate() وقبل أي getDatabase() يُنشئ/يفتح القاعدة فعلياً.
function restoreIfMissing() {
  const dbPath = process.env.DB_PATH || './data/hamoud.db'
  const target = path.resolve(dbPath)

  try {
    const centers = countCenters(target)

    if (centers > 0) {
      console.log(`✅ Volume DB found with ${centers} centers — skipping restore`)
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

    console.log('🌱 Volume DB empty — restoring seed (7 shipments, 15 centers)')
    fs.copyFileSync(snapshot, target)
  } catch (err) {
    console.error(`❌ failed to restore initial database to ${target}:`, err)
    throw err
  }
}

module.exports = { restoreIfMissing }
