/**
 * ضغط على المحرك والخدمات — يقيس التحمل دون إيقاف عند أول فشل داخل الحلقة
 */
const { createFullProductDb, destroyFullProductDb } = require('./helpers/fullProductDb')
const ShipmentService = require('../src/services/ShipmentService')
const AccountingService = require('../src/services/AccountingService')
const { calculateShipmentTotal, classifyPostability } = require('../src/engine')
const BackupService = require('../src/services/BackupService')
const { fullBackupWorkbook } = require('../src/services/reports/fullBackupWorkbook')

let ctx
const results = { passed: 0, failed: 0, errors: [] }

function record(name, fn) {
  try {
    fn()
    results.passed += 1
  } catch (e) {
    results.failed += 1
    if (results.errors.length < 20) {
      results.errors.push({ name, message: e.message })
    }
  }
}

beforeAll(async () => {
  ctx = await createFullProductDb()
}, 120_000)

afterAll(() => {
  destroyFullProductDb(ctx?.db)
  ctx = null
}, 30_000)

describe('ضغط المحرك والحمل', { timeout: 300_000 }, () => {
  it('محرك الحساب — 50,000 عملية حساب سيارة', () => {
    const payload = {
      tarseem: 2646,
      workers: 240,
      clearance_fee: 80,
      syrian_driver: 1926,
      service_fee: 120,
    }
    for (let i = 0; i < 50_000; i++) {
      record(`engine-total-${i}`, () => {
        const t = calculateShipmentTotal(payload)
        if (t <= 0) throw new Error('total invalid')
      })
    }
    expect(results.failed).toBe(0)
  })

  it('تخليص متسلسل — 150 سيارة إنشاء+ترحيل', () => {
    const local = { passed: 0, failed: 0 }
    for (let i = 0; i < 150; i++) {
      try {
        const s = ShipmentService.createShipment(
          {
            center_id: ctx.traderId,
            clearance_center_id: ctx.brokerId,
            border_id: ctx.borderId,
            goods_name: `بضاعة ${i}`,
            source: 'تركيا',
            destination: 'سوريا',
            entry_date: ctx.testDate,
            tarseem: 1000 + i,
            workers: 50,
            clearance_fee: 30,
            syrian_driver: 200,
          },
          ctx.adminId
        )
        const postable = classifyPostability(s)
        if (!postable.is_postable) throw new Error('not postable')
        ShipmentService.postShipment(s.id, ctx.adminId)
        local.passed += 1
      } catch (e) {
        local.failed += 1
        if (local.failed <= 5) {
          results.errors.push({ name: `shipment-${i}`, message: e.message })
        }
      }
    }
    expect(local.failed).toBe(0)
    expect(local.passed).toBe(150)

    const stmt = AccountingService.getCenterFullStatement(ctx.traderId)
    expect(stmt.posted_undelivered_value).toBeGreaterThan(150_000)
  })

  it('ذمة متوازية — 500 كشف حساب', () => {
    for (let i = 0; i < 500; i++) {
      record(`statement-${i}`, () => {
        const s = AccountingService.getCenterFullStatement(ctx.traderId)
        if (!Number.isFinite(s.grand_total)) throw new Error('grand_total nan')
      })
    }
    expect(results.failed).toBe(0)
  })

  it('نسخ Excel متكرر — 25 مرة', async () => {
    let ok = 0
    for (let i = 0; i < 25; i++) {
      try {
        const data = BackupService.collectBackupData()
        const workbook = fullBackupWorkbook(data)
        const buf = await workbook.xlsx.writeBuffer()
        if (buf.length < 1000) throw new Error('workbook too small')
        ok += 1
      } catch (e) {
        results.errors.push({ name: `backup-${i}`, message: e.message })
      }
    }
    expect(ok).toBe(25)
  })

  it('ملخص التحمل', () => {
    console.log(
      JSON.stringify({
        stress_passed: results.passed,
        stress_failed: results.failed,
        sample_errors: results.errors.slice(0, 10),
      })
    )
    expect(results.failed).toBe(0)
  })
})
