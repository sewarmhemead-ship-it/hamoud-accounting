const { createFullProductDb, destroyFullProductDb } = require('./helpers/fullProductDb')
const AccountingService = require('../src/services/AccountingService')
const TraderReportService = require('../src/services/TraderReportService')
const { generateRef } = require('../src/utils/refGenerator')
const { REF_PREFIX } = require('../src/config/constants')

let ctx

beforeEach(async () => {
  ctx = await createFullProductDb()
})

afterEach(() => {
  destroyFullProductDb(ctx?.db)
  ctx = null
})

describe('تقرير التاجر — مقاصة ودفعات', () => {
  it('الكشف الخارجي يعرض offset_charges وصفوف المقاصة', () => {
    AccountingService.offsetCenters(
      ctx.brokerId,
      ctx.traderId,
      200,
      ctx.adminId,
      'مقاصة اختبار',
      generateRef(REF_PREFIX.TRANSACTION),
      generateRef(REF_PREFIX.TRANSACTION)
    )

    const external = TraderReportService.buildTraderStatement(ctx.traderId, {})
    expect(external.totals.offset_charges).toBe(200)
    expect(external.payments.some((p) => p.kind === 'offset_debit')).toBe(true)
    expect(external.payments.find((p) => p.kind === 'offset_debit').amount).toBe(200)
  })

  it('تاريخ المقاصة المُدخَل يُسجَّل على قيدَي المقاصة (وارد وصادر)', () => {
    const offsetDate = '2026-03-15'
    const result = AccountingService.offsetCenters(
      ctx.brokerId,
      ctx.traderId,
      150,
      ctx.adminId,
      'مقاصة بتاريخ محدّد',
      generateRef(REF_PREFIX.TRANSACTION),
      generateRef(REF_PREFIX.TRANSACTION),
      offsetDate
    )

    expect(result.credit.date).toBe(offsetDate)
    expect(result.debit.date).toBe(offsetDate)

    // والتاريخ ينعكس في حركات المركزين
    const traderTx = ctx.db
      .prepare(`SELECT date FROM transactions WHERE center_id = ? AND category = 'offset'`)
      .get(ctx.traderId)
    expect(String(traderTx.date)).toBe(offsetDate)
  })

  it('بلا تاريخ ⇒ يستخدم لحظة التنفيذ (متوافق مع القديم)', () => {
    const result = AccountingService.offsetCenters(
      ctx.brokerId,
      ctx.traderId,
      50,
      ctx.adminId,
      'بلا تاريخ',
      generateRef(REF_PREFIX.TRANSACTION),
      generateRef(REF_PREFIX.TRANSACTION)
    )
    expect(result.credit.date).toBeTruthy()
    expect(result.debit.date).toBe(result.credit.date)
  })
})
