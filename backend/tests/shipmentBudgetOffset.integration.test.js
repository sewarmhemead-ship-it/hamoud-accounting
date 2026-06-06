const { createFullProductDb, destroyFullProductDb } = require('./helpers/fullProductDb')
const ShipmentService = require('../src/services/ShipmentService')
const AccountingService = require('../src/services/AccountingService')
const TraderReportService = require('../src/services/TraderReportService')
const BrokerStatementService = require('../src/services/BrokerStatementService')
const ProfitService = require('../src/services/ProfitService')
const TransactionModel = require('../src/models/TransactionModel')
const { generateRef } = require('../src/utils/refGenerator')
const { REF_PREFIX, TX_CATEGORY } = require('../src/config/constants')
const { calculateGrandTotal } = require('../src/engine/balance')
const { calculateCenterBalance } = require('../src/engine/balance')

let ctx

function dualShipment(over = {}) {
  return {
    center_id: ctx.traderId,
    clearance_center_id: ctx.brokerId,
    border_id: ctx.borderId,
    goods_name: 'رز',
    source: 'تركيا',
    destination: 'حلب',
    entry_date: ctx.testDate,
    cost_tarseem: 2000,
    cost_turkish_driver: 400,
    cost_clearance_fee: 30,
    price_tarseem: 2100,
    price_syrian_driver: 420,
    price_service_fee: 40,
    ...over,
  }
}

beforeEach(async () => {
  ctx = await createFullProductDb()
  const trader2 = ctx.db
    .prepare(`INSERT INTO centers (code, name, type, currency) VALUES ('102', 'تاجر ثاني', 'trader', 'USD')`)
    .run()
  ctx.trader2Id = trader2.lastInsertRowid
})

afterEach(() => {
  destroyFullProductDb(ctx?.db)
  ctx = null
})

describe('ربط السيارات بالميزانية والكشوف', () => {
  it('إنشاء سيارة WIP يزيد wip_value دون التأثير على الرصيد المُسلَّم', () => {
    const before = AccountingService.getCenterFullStatement(ctx.traderId)
    expect(before.wip_value).toBe(0)
    expect(before.posted_undelivered_value).toBe(0)

    ShipmentService.createShipment(dualShipment({ goods_name: 'بطاطا' }), ctx.adminId)

    const after = AccountingService.getCenterFullStatement(ctx.traderId)
    expect(after.wip_count).toBe(1)
    expect(after.wip_value).toBe(2560)
    expect(after.balance).toBe(before.balance)
    expect(after.posted_undelivered_value).toBe(0)
  })

  it('ترحيل سيارة يربط posted_undelivered بالقيد وكشف التاجر', () => {
    const truck = ShipmentService.createShipment(dualShipment(), ctx.adminId)
    const posted = ShipmentService.postShipment(truck.id, ctx.adminId)

    const acct = AccountingService.getCenterFullStatement(ctx.traderId)
    expect(acct.posted_undelivered_value).toBe(2560)
    expect(acct.wip_value).toBe(0)
    expect(acct.grand_total).toBe(calculateGrandTotal(acct.balance, acct.posted_undelivered_value))

    const report = TraderReportService.build(ctx.traderId, { from: ctx.testDate, to: ctx.testDate })
    expect(report.totals.charges_posted).toBe(2560)
    expect(posted.trader_tx.amount_usd).toBe(2560)

    const broker = AccountingService.getCenterFullStatement(ctx.brokerId)
    expect(broker.posted_undelivered_value).toBe(2430)
  })

  it('حذف سيارة WIP يُنقص wip_value', () => {
    const truck = ShipmentService.createShipment(dualShipment(), ctx.adminId)
    expect(AccountingService.getCenterFullStatement(ctx.traderId).wip_value).toBe(2560)

    ShipmentService.removeShipment(truck.id, ctx.adminId)

    const after = AccountingService.getCenterFullStatement(ctx.traderId)
    expect(after.wip_count).toBe(0)
    expect(after.wip_value).toBe(0)
  })

  it('حذف سيارة مُرحَّلة يعكس القيود ويُصفّر posted_undelivered', () => {
    const truck = ShipmentService.createShipment(dualShipment(), ctx.adminId)
    ShipmentService.postShipment(truck.id, ctx.adminId)

    expect(AccountingService.getCenterFullStatement(ctx.traderId).posted_undelivered_value).toBe(2560)
    expect(TransactionModel.findByShipment(truck.id).length).toBe(2)

    ShipmentService.removeShipment(truck.id, ctx.adminId)

    expect(TransactionModel.findByShipment(truck.id).length).toBe(0)
    const acct = AccountingService.getCenterFullStatement(ctx.traderId)
    expect(acct.posted_undelivered_value).toBe(0)
    expect(acct.grand_total).toBe(acct.balance)
  })

  it('حذف سيارة مُسلَّمة يعكس الرصيد المُسلَّم', () => {
    const truck = ShipmentService.createShipment(dualShipment(), ctx.adminId)
    ShipmentService.postShipment(truck.id, ctx.adminId)
    ShipmentService.markDelivered(truck.id, ctx.adminId)

    const before = AccountingService.getCenterBalance(ctx.traderId)
    expect(before.balance).toBe(2560)

    ShipmentService.removeShipment(truck.id, ctx.adminId)

    const after = AccountingService.getCenterBalance(ctx.traderId)
    expect(after.balance).toBe(0)
    expect(AccountingService.getCenterFullStatement(ctx.traderId).posted_undelivered_value).toBe(0)
  })
})

describe('مقاصة بين تجّار — ذمة وتقارير', () => {
  it('المقاصة تحافظ على مجموع الذمم وتظهر تفصيل الخصم', () => {
    // تاجر 1: فاتورة 1000
    const t1 = ShipmentService.createShipment(
      {
        center_id: ctx.traderId,
        clearance_center_id: ctx.brokerId,
        border_id: ctx.borderId,
        goods_name: 'رز',
        source: 'تركيا',
        destination: 'حلب',
        entry_date: ctx.testDate,
        tarseem: 998,
        syrian_driver: 1,
        clearance_fee: 1,
      },
      ctx.adminId
    )
    ShipmentService.postShipment(t1.id, ctx.adminId)
    ShipmentService.markDelivered(t1.id, ctx.adminId)

    // تاجر 2: فاتورة 600
    const t2 = ShipmentService.createShipment(
      {
        center_id: ctx.trader2Id,
        clearance_center_id: ctx.brokerId,
        border_id: ctx.borderId,
        goods_name: 'قمح',
        source: 'تركيا',
        destination: 'حلب',
        entry_date: ctx.testDate,
        tarseem: 598,
        syrian_driver: 1,
        clearance_fee: 1,
      },
      ctx.adminId
    )
    ShipmentService.postShipment(t2.id, ctx.adminId)
    ShipmentService.markDelivered(t2.id, ctx.adminId)

    const before1 = AccountingService.getCenterBalance(ctx.traderId)
    const before2 = AccountingService.getCenterBalance(ctx.trader2Id)
    const netBefore = calculateCenterBalance(
      before1.total_out + before2.total_out,
      before1.total_in + before2.total_in
    )

    const offset = AccountingService.offsetCenters(
      ctx.traderId,
      ctx.trader2Id,
      300,
      ctx.adminId,
      'تسوية بين التاجرين',
      generateRef(REF_PREFIX.TRANSACTION),
      generateRef(REF_PREFIX.TRANSACTION)
    )

    expect(offset.notes).toContain('خصمنا 300$')
    expect(offset.notes).toContain('تاجر تجريبي')
    expect(offset.notes).toContain('تاجر ثاني')

    const after1 = AccountingService.getCenterBalance(ctx.traderId)
    const after2 = AccountingService.getCenterBalance(ctx.trader2Id)
    expect(after1.balance).toBe(700)
    expect(after2.balance).toBe(900)

    const netAfter = calculateCenterBalance(
      after1.total_out + after2.total_out,
      after1.total_in + after2.total_in
    )
    expect(netAfter).toBe(netBefore)

    const stmt1 = AccountingService.getCenterStatement(ctx.traderId, { limit: 20 })
    const offsetTx1 = stmt1.transactions.find((t) => t.category === TX_CATEGORY.OFFSET)
    expect(offsetTx1).toBeTruthy()
    expect(offsetTx1.notes).toContain('خصمنا 300$')

    const report2 = TraderReportService.buildTraderStatement(ctx.trader2Id)
    const offsetRow = report2.payments.find((p) => p.kind === 'offset_debit')
    expect(offsetRow).toBeTruthy()
    expect(offsetRow.notes).toContain('خصمنا 300$')
    expect(offsetRow.amount).toBe(300)
  })

  it('المقاصة لا تُحسب ضمن «دفعات اليوم» في المربح', () => {
    const truck = ShipmentService.createShipment(
      {
        center_id: ctx.traderId,
        clearance_center_id: ctx.brokerId,
        border_id: ctx.borderId,
        goods_name: 'رز',
        source: 'تركيا',
        destination: 'حلب',
        entry_date: ctx.testDate,
        tarseem: 998,
        syrian_driver: 1,
        clearance_fee: 1,
      },
      ctx.adminId
    )
    ShipmentService.postShipment(truck.id, ctx.adminId)

    AccountingService.createPayment(
      {
        ref_number: generateRef(REF_PREFIX.TRANSACTION),
        center_id: ctx.traderId,
        amount: 200,
        currency: 'USD',
        date: `${ctx.testDate}T12:00:00.000Z`,
        notes: 'دفعة نقدية',
      },
      ctx.adminId
    )

    AccountingService.offsetCenters(
      ctx.traderId,
      ctx.trader2Id,
      100,
      ctx.adminId,
      null,
      generateRef(REF_PREFIX.TRANSACTION),
      generateRef(REF_PREFIX.TRANSACTION)
    )

    const day = ProfitService.calculateDay(ctx.testDate)
    expect(day.payments_received).toBe(200)
    expect(day.gross_revenue).toBe(1000)
  })

  it('كشف المخلص يضمّ leg المقاصة out', () => {
    AccountingService.offsetCenters(
      ctx.brokerId,
      ctx.traderId,
      150,
      ctx.adminId,
      'مقاصة مخلص→تاجر',
      generateRef(REF_PREFIX.TRANSACTION),
      generateRef(REF_PREFIX.TRANSACTION)
    )

    const stmt = BrokerStatementService.getStatement(ctx.traderId)
    const offsetCharge = stmt.rows.find((r) => r.kind === 'offset_charge')
    expect(offsetCharge).toBeTruthy()
    expect(offsetCharge.amount).toBe(150)
    expect(offsetCharge.label).toContain('خصمنا 150$')
  })
})
