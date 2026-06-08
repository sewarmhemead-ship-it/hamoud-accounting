/**
 * ربط المربح اليومي end-to-end: ترحيل → معاينة → دفعات → إغلاق
 */
const { createFullProductDb, destroyFullProductDb } = require('./helpers/fullProductDb')
const ShipmentService = require('../src/services/ShipmentService')
const AccountingService = require('../src/services/AccountingService')
const ProfitService = require('../src/services/ProfitService')
const { DailyProfitReportService } = require('../src/services/DailyProfitReportService')
const { generateRef } = require('../src/utils/refGenerator')
const { REF_PREFIX } = require('../src/config/constants')
const { classifyPostability } = require('../src/engine/statement')

let ctx

function fullShipment(over = {}) {
  return {
    center_id: ctx.traderId,
    clearance_center_id: ctx.brokerId,
    border_id: ctx.borderId,
    goods_name: 'رز',
    source: 'تركيا',
    destination: 'حلب',
    entry_date: ctx.testDate,
    tarseem: 2000,
    workers: 100,
    clearance_fee: 50,
    syrian_driver: 400,
    service_fee: 30,
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

describe('المربح اليومي — ربط end-to-end', () => {
  it('ترحيل على entry_date يظهر في معاينة اليوم وgetDayDetail', () => {
    const truck = ShipmentService.createShipment(fullShipment(), ctx.adminId)
    expect(truck.status).toBe('pending')
    expect(classifyPostability(truck).is_postable).toBe(true)

    const posted = ShipmentService.postShipment(truck.id, ctx.adminId)
    expect(posted.shipment.posted_at).toContain(ctx.testDate)

    const preview = ProfitService.calculateDay(ctx.testDate)
    expect(preview.num_trucks).toBe(1)
    expect(preview.gross_revenue).toBe(2580)

    const detail = ProfitService.getDayDetail(ctx.testDate)
    expect(detail.movements).toHaveLength(1)
    expect(detail.movements[0].clearance_amount).toBe(2580)
    expect(detail.movements_total).toBe(2580)
    expect(detail.preview.gross_revenue).toBe(detail.movements_total)
    expect(detail.payments).toHaveLength(0)
    expect(detail.payments_total).toBe(0)
  })

  it('دفعة نقدية في التاريخ تُحسب في payments_received', () => {
    const truck = ShipmentService.createShipment(fullShipment({ goods_name: 'قمح' }), ctx.adminId)
    ShipmentService.postShipment(truck.id, ctx.adminId)

    AccountingService.createPayment(
      {
        ref_number: generateRef(REF_PREFIX.TRANSACTION),
        center_id: ctx.traderId,
        amount: 750,
        currency: 'USD',
        date: `${ctx.testDate}T15:00:00.000Z`,
        notes: 'دفعة نقدية',
      },
      ctx.adminId
    )

    const day = ProfitService.calculateDay(ctx.testDate)
    expect(day.payments_received).toBe(750)

    const detail = ProfitService.getDayDetail(ctx.testDate)
    expect(detail.payments).toHaveLength(1)
    expect(detail.payments[0].amount_usd).toBe(750)
    expect(detail.payments[0].category).toBe('payment')
    expect(detail.preview.payments_received).toBe(750)
  })

  it('إغلاق اليوم يحفظ نفس حسابات المعاينة + الفروقات والمصاريف', () => {
    const truck = ShipmentService.createShipment(fullShipment({ company_profit: 300 }), ctx.adminId)
    ShipmentService.postShipment(truck.id, ctx.adminId)

    AccountingService.createPayment(
      {
        ref_number: generateRef(REF_PREFIX.TRANSACTION),
        center_id: ctx.traderId,
        amount: 500,
        currency: 'USD',
        date: `${ctx.testDate}T12:00:00.000Z`,
        notes: 'دفعة',
      },
      ctx.adminId
    )

    const preview = ProfitService.calculateDay(ctx.testDate)
    const closed = ProfitService.closeDay(
      ctx.testDate,
      {
        transport_diff: 10,
        workers_diff: 5,
        office_expenses: 20,
        home_expenses: 15,
        notes: 'يوم اختبار',
      },
      ctx.adminId
    )

    expect(closed.num_trucks).toBe(preview.num_trucks)
    // الأساس الآن = مجموع «مربحنا» (300) لا إجمالي التخليص + فروقات (10+5)
    expect(preview.gross_profit).toBe(300)
    expect(closed.gross_profit).toBe(300 + 15)
    expect(closed.net_profit).toBe(closed.gross_profit - 35)

    const stored = ProfitService.getByDate(ctx.testDate)
    expect(stored.id).toBe(closed.id)

    const detail = ProfitService.getDayDetail(ctx.testDate)
    expect(detail.is_closed).toBe(true)
    expect(detail.closed.id).toBe(closed.id)
  })

  it('المقاصة لا تُحسب ضمن دفعات اليوم', () => {
    const truck = ShipmentService.createShipment(
      fullShipment({ tarseem: 998, syrian_driver: 1, clearance_fee: 1, workers: 0, service_fee: 0 }),
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

    expect(ProfitService.calculateDay(ctx.testDate).payments_received).toBe(200)
  })

  it('تقرير اليوم يستخدم نفس getDayDetail', () => {
    const truck = ShipmentService.createShipment(fullShipment({ company_profit: 400 }), ctx.adminId)
    ShipmentService.postShipment(truck.id, ctx.adminId)

    const report = DailyProfitReportService.buildDay(ctx.testDate)
    expect(report.preview.gross_revenue).toBe(2580) // إجمالي فاتورة التخليص (للمطابقة)
    expect(report.movements).toHaveLength(1)
    expect(report.waterfall.base_clearance).toBe(400) // الأساس = مجموع مربحنا
  })

  it('مجموع «مربحنا» للسيارات المُرحَّلة = مربح اليوم ويظهر في التفاصيل', () => {
    const t1 = ShipmentService.createShipment(fullShipment({ goods_name: 'رز', company_profit: 300 }), ctx.adminId)
    const t2 = ShipmentService.createShipment(fullShipment({ goods_name: 'سكر', company_profit: 200 }), ctx.adminId)
    ShipmentService.postShipment(t1.id, ctx.adminId)
    ShipmentService.postShipment(t2.id, ctx.adminId)

    const day = ProfitService.calculateDay(ctx.testDate)
    expect(day.num_trucks).toBe(2)
    expect(day.gross_profit).toBe(500) // 300 + 200

    const detail = ProfitService.getDayDetail(ctx.testDate)
    const profits = detail.movements.map((m) => m.company_profit).sort()
    expect(profits).toEqual([200, 300])
  })

  it('سيارة بلا «مربحنا» تساهم بصفر في مربح اليوم', () => {
    const truck = ShipmentService.createShipment(fullShipment(), ctx.adminId)
    ShipmentService.postShipment(truck.id, ctx.adminId)

    const day = ProfitService.calculateDay(ctx.testDate)
    expect(day.num_trucks).toBe(1)
    expect(day.gross_profit).toBe(0)
    expect(day.gross_revenue).toBe(2580) // التخليص ما زال محسوباً للمطابقة
  })

  it('سيارة بتاريخ مختلف لا تدخل يوم entry_date', () => {
    const otherDate = '2026-06-01'
    const truck = ShipmentService.createShipment(fullShipment({ entry_date: otherDate }), ctx.adminId)
    ShipmentService.postShipment(truck.id, ctx.adminId)

    const day = ProfitService.calculateDay(ctx.testDate)
    expect(day.num_trucks).toBe(0)
    expect(day.gross_revenue).toBe(0)

    const other = ProfitService.calculateDay(otherDate)
    expect(other.num_trucks).toBe(1)
    expect(other.gross_revenue).toBe(2580)
  })
})

describe('تبسيط مراحل السيارة — Option B', () => {
  it('سيارة مكتملة تبقى pending وتُرحَّل مباشرة', () => {
    const truck = ShipmentService.createShipment(fullShipment(), ctx.adminId)
    expect(truck.status).toBe('pending')
    expect(classifyPostability(truck).is_postable).toBe(true)

    const posted = ShipmentService.postShipment(truck.id, ctx.adminId)
    expect(posted.shipment.status).toBe('posted')
  })

  it('getReadyToPost يُرجع pending القابلة للترحيل فقط', () => {
    ShipmentService.createShipment(fullShipment(), ctx.adminId)
    ShipmentService.createShipment(
      {
        center_id: ctx.traderId,
        clearance_center_id: ctx.brokerId,
        border_id: ctx.borderId,
        goods_name: 'ناقصة',
        source: 'أ',
        destination: 'ب',
        entry_date: ctx.testDate,
        tarseem: 100,
      },
      ctx.adminId
    )

    const ready = ShipmentService.getReadyToPost()
    expect(ready.total).toBe(1)
    expect(ready.rows[0].status).toBe('pending')
  })

  it('سيارة legacy complete ما زالت قابلة للترحيل', () => {
    const truck = ShipmentService.createShipment(fullShipment(), ctx.adminId)
    ctx.db.prepare(`UPDATE shipments SET status = 'complete' WHERE id = ?`).run(truck.id)

    const posted = ShipmentService.postShipment(truck.id, ctx.adminId)
    expect(posted.shipment.status).toBe('posted')
  })
})
