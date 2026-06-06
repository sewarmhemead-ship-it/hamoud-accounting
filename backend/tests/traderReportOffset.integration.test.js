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
})
