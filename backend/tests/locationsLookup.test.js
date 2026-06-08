const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')
const { setDatabase, resetDatabase } = require('../src/config/database')
const AdminModel = require('../src/models/AdminModel')
const LookupModel = require('../src/models/LookupModel')

function readSql(name) {
  return fs.readFileSync(path.join(__dirname, '../src/database/migrations', name), 'utf8')
}

describe('المصادر والوجهات — lookups قابلة للإدارة', () => {
  let db

  beforeEach(() => {
    resetDatabase()
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    setDatabase(db)
    db.exec(readSql('021_locations.sql'))
  })

  afterEach(() => {
    if (db) db.close()
    resetDatabase()
  })

  it('إنشاء مصدر ووجهة ثم سردهما', () => {
    AdminModel.createSource({ name: 'مرسين', name_en: 'Mersin' })
    AdminModel.createDestination({ name: 'حلب', name_en: 'Aleppo' })

    const sources = AdminModel.getSources()
    const destinations = AdminModel.getDestinations()
    expect(sources).toHaveLength(1)
    expect(sources[0].name).toBe('مرسين')
    expect(destinations[0].name).toBe('حلب')
  })

  it('تعطيل مصدر يُخفيه من الـ lookups النشطة', () => {
    const src = AdminModel.createSource({ name: 'أضنة' })
    AdminModel.createSource({ name: 'إسطنبول' })

    AdminModel.updateSource(src.id, { is_active: false })

    // الإدارة ترى الكل (نشط + معطّل)
    expect(AdminModel.getSources()).toHaveLength(2)
    // الـ lookups (صفحة التسجيل) ترى النشط فقط
    const active = LookupModel.getSources()
    expect(active).toHaveLength(1)
    expect(active[0].name).toBe('إسطنبول')
  })

  it('تحديث اسم وجهة', () => {
    const dst = AdminModel.createDestination({ name: 'حمسص' })
    const updated = AdminModel.updateDestination(dst.id, { name: 'حمص' })
    expect(updated.name).toBe('حمص')
  })

  it('lookups تعيد المصادر والوجهات مرتّبة بالاسم', () => {
    AdminModel.createSource({ name: 'مرسين' })
    AdminModel.createSource({ name: 'أضنة' })
    const active = LookupModel.getSources()
    expect(active.map((s) => s.name)).toEqual(['أضنة', 'مرسين'])
  })
})
