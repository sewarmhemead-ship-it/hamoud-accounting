/**
 * اختبار 100% للنسخ الاحتياطي متعدّد الوجهات.
 * يثبت: نسخة قاعدة بيانات كاملة (كل الجداول) تُنسخ لكل وجهة يحددها المستخدم،
 * مع تحقّق سلامة فعلي، وسياسة احتفاظ. لا يلمس قاعدة الإنتاج (يستخدم قاعدة مؤقتة).
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const Database = require('better-sqlite3')

// لازم يُضبط DB_PATH قبل تحميل أي وحدة تقرأه (config/env)
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'hamoud-bk-'))
const DB_FILE = path.join(ROOT, 'data', 'hamoud.db')
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
process.env.DB_PATH = DB_FILE

const { setDatabase, resetDatabase } = require('../src/config/database')
const { applyAllMigrations } = require('./helpers/fullProductDb')
const { seedCurrencies } = require('../src/database/seeds/currencies')
const { seedBorders } = require('../src/database/seeds/borders')
const { seedGoodsTypes } = require('../src/database/seeds/goods_types')
const BackupService = require('../src/services/BackupService')
const SettingsService = require('../src/services/SettingsService')

const TABLES = ['centers', 'shipments', 'transactions', 'daily_profit', 'users']

function counts(dbFile) {
  const db = new Database(dbFile, { readonly: true })
  const out = {}
  for (const t of TABLES) out[t] = db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c
  db.close()
  return out
}

let db
let sourceCounts
const dest1 = path.join(ROOT, 'external')   // يحاكي قرص خارجي
const dest2 = path.join(ROOT, 'cloud')       // يحاكي مجلد OneDrive

beforeAll(() => {
  resetDatabase()
  db = new Database(DB_FILE)
  db.pragma('journal_mode = WAL')
  setDatabase(db)
  applyAllMigrations(db)
  seedCurrencies()
  seedBorders()
  seedGoodsTypes()

  // بيانات حقيقية في كل المسارات (حركات، سيارات، مربح، مراكز، مستخدم)
  db.prepare(`INSERT INTO users (username, password_hash, name, role, permissions) VALUES ('admin','x','مدير','admin','[]')`).run()
  const tr = db.prepare(`INSERT INTO centers (code,name,type,currency) VALUES ('101','تاجر','trader','USD')`).run()
  const br = db.prepare(`INSERT INTO centers (code,name,type,currency) VALUES ('201','مخلص','broker','USD')`).run()
  const bid = db.prepare('SELECT id FROM borders LIMIT 1').get().id
  db.prepare(`INSERT INTO shipments (ref_number,center_id,clearance_center_id,border_id,source,destination,entry_date,total_cost,status,tarseem,clearance_fee,syrian_driver)
              VALUES ('TRK-1',?,?,?,'مرسين','حلب','2026-06-05',1000,'posted',600,200,200)`).run(tr.lastInsertRowid, br.lastInsertRowid, bid)
  db.prepare(`INSERT INTO transactions (ref_number,date,type,center_id,currency,amount,amount_usd,category,is_delivered)
              VALUES ('TX-1','2026-06-05','out',?, 'USD',1000,1000,'clearance',0)`).run(tr.lastInsertRowid)
  db.prepare(`INSERT INTO transactions (ref_number,date,type,center_id,currency,amount,amount_usd,category,is_delivered)
              VALUES ('TX-2','2026-06-05','in',?, 'USD',400,400,'payment',1)`).run(tr.lastInsertRowid)
  db.prepare(`INSERT INTO daily_profit (date,num_trucks,gross_profit,office_expenses,home_expenses,net_profit) VALUES ('2026-06-05',1,1000,50,30,920)`).run()

  sourceCounts = counts(DB_FILE)
})

afterAll(() => {
  try { db.close() } catch { /* */ }
  resetDatabase()
  try { fs.rmSync(ROOT, { recursive: true, force: true }) } catch { /* */ }
})

describe('النسخ الاحتياطي متعدّد الوجهات — اختبار شامل', () => {
  it('ينسخ قاعدة كاملة لكل وجهة يحددها المستخدم + المجلد المحلي', async () => {
    SettingsService.update(
      { backup_include_db: true, backup_destinations: [dest1, dest2], backup_keep_copies: 5 },
      1
    )

    const res = await BackupService.runBackup({ userId: 1, reason: 'test' })
    expect(res.ok).toBe(true)

    // 3 وجهات: المجلد المحلي backups + قرص خارجي + سحابة
    expect(res.destinations.length).toBe(3)
    expect(res.destinations.every((d) => d.ok)).toBe(true)
    expect(res.destinations.some((d) => d.path === path.resolve(dest1))).toBe(true)
    expect(res.destinations.some((d) => d.path === path.resolve(dest2))).toBe(true)
  })

  it('كل نسخة في كل وجهة = نسخة كاملة مطابقة (كل الجداول والصفوف)', () => {
    for (const dir of [dest1, dest2]) {
      const files = fs.readdirSync(dir).filter((f) => /^hamoud_.*\.db$/.test(f))
      expect(files.length).toBeGreaterThan(0)
      const copyCounts = counts(path.join(dir, files[0]))
      // كل جدول في النسخة = نفس عدد صفوف المصدر (سيارات، حركات، مربح، مراكز، مستخدمون)
      expect(copyCounts).toEqual(sourceCounts)
      // تأكيد محتوى فعلي
      const cdb = new Database(path.join(dir, files[0]), { readonly: true })
      expect(cdb.prepare(`SELECT ref_number FROM shipments`).get().ref_number).toBe('TRK-1')
      expect(cdb.prepare(`SELECT COUNT(*) c FROM transactions`).get().c).toBe(2)
      cdb.close()
    }
  })

  it('كل نسخة تجتاز فحص السلامة (PRAGMA integrity_check)', () => {
    for (const dir of [dest1, dest2]) {
      const file = fs.readdirSync(dir).find((f) => /^hamoud_.*\.db$/.test(f))
      const cdb = new Database(path.join(dir, file), { readonly: true })
      const r = cdb.prepare('PRAGMA integrity_check').get()
      cdb.close()
      expect(r.integrity_check).toBe('ok')
    }
  })

  it('تحقّق السلامة يرفض نسخة تالفة', () => {
    const bad = path.join(ROOT, 'corrupt.db')
    fs.writeFileSync(bad, 'this is not a database')
    expect(() => BackupService._verifyDbCopy(bad)).toThrow()
  })

  it('سياسة الاحتفاظ تُبقي آخر N نسخة فقط', () => {
    const dir = path.join(ROOT, 'retention')
    fs.mkdirSync(dir, { recursive: true })
    // 7 نسخ مؤرّخة بأوقات متصاعدة
    for (let i = 1; i <= 7; i++) {
      const f = path.join(dir, `hamoud_2026-06-0${i}_120000.db`)
      fs.writeFileSync(f, 'x')
      fs.utimesSync(f, new Date(2026, 5, i), new Date(2026, 5, i))
    }
    BackupService._applyRetention(dir, 3)
    const left = fs.readdirSync(dir).filter((f) => /^hamoud_.*\.db$/.test(f))
    expect(left.length).toBe(3)
    // المتبقي هو الأحدث (5,6,7)
    expect(left.sort()).toEqual([
      'hamoud_2026-06-05_120000.db',
      'hamoud_2026-06-06_120000.db',
      'hamoud_2026-06-07_120000.db',
    ])
  })

  it('فشل وجهة واحدة لا يوقف الباقي', () => {
    const okDir = path.join(ROOT, 'ok-dir')
    // مسار غير صالح (ملف بدل مجلد) ليفشل
    const badParent = path.join(ROOT, 'afile')
    fs.writeFileSync(badParent, 'x')
    const badDir = path.join(badParent, 'sub') // لا يمكن إنشاؤه (الأب ملف)
    const out = BackupService._fanout(DB_FILE, [okDir, badDir], 'hamoud_2026-06-09_120000.db', 5)
    const okRes = out.find((r) => r.path === path.resolve(okDir))
    const badRes = out.find((r) => r.path === path.resolve(badDir))
    expect(okRes.ok).toBe(true)
    expect(badRes.ok).toBe(false)
    expect(badRes.error).toBeTruthy()
  })
})
