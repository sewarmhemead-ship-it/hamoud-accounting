const { createFullProductDb, destroyFullProductDb } = require('./helpers/fullProductDb')
const ShipmentService = require('../src/services/ShipmentService')
const AccountingService = require('../src/services/AccountingService')
const { buildBrokerStatement, classifyPostability } = require('../src/engine/statement')
const { calculateGrandTotal } = require('../src/engine/balance')

let ctx

beforeEach(async () => {
  ctx = await createFullProductDb()
})

afterEach(() => {
  destroyFullProductDb(ctx?.db)
  ctx = null
})

describe('ربط السيارات والترحيل — تكامل', () => {
  it('سيارة مزدوجة: كشف المخلص = قيد الترحيل = ذمة المخلص', () => {
    const truck = ShipmentService.createShipment(
      {
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
      },
      ctx.adminId
    )
    expect(truck.status).toBe('pending')
    expect(classifyPostability(truck).is_postable).toBe(true)

    const posted = ShipmentService.postShipment(truck.id, ctx.adminId)
    expect(posted.clearance_tx.amount_usd).toBe(2430)
    expect(posted.trader_tx.amount_usd).toBe(2560)

    const stmt = buildBrokerStatement({
      shipments: [posted.shipment],
      payments: [],
      centerType: 'broker',
    })
    expect(stmt.totals.charges_posted).toBe(2430)

    const brokerAcct = AccountingService.getCenterFullStatement(ctx.brokerId)
    expect(brokerAcct.posted_undelivered_value).toBe(2430)
    expect(brokerAcct.grand_total).toBe(
      calculateGrandTotal(brokerAcct.balance, brokerAcct.posted_undelivered_value)
    )

    const traderAcct = AccountingService.getCenterFullStatement(ctx.traderId)
    expect(traderAcct.posted_undelivered_value).toBe(2560)
  })

  it('سيارة مزدوجة بلا أعمدة legacy تُصلَح عند الفتح وتصبح قابلة للترحيل', () => {
    const truck = ShipmentService.createShipment(
      {
        center_id: ctx.traderId,
        clearance_center_id: ctx.brokerId,
        border_id: ctx.borderId,
        goods_name: 'فول',
        source: 'تركيا',
        destination: 'حلب',
        entry_date: ctx.testDate,
        cost_tarseem: 500,
        cost_clearance_fee: 50,
        price_syrian_driver: 400,
        price_tarseem: 550,
      },
      ctx.adminId
    )
    ctx.db
      .prepare(
        `UPDATE shipments SET tarseem = NULL, syrian_driver = NULL, clearance_fee = NULL WHERE id = ?`
      )
      .run(truck.id)

    const detail = ShipmentService.getById(truck.id)
    expect(detail.progress.is_complete).toBe(true)
    expect(detail.tarseem).toBe(500)
  })

  it('قائمة WIP تُرجع progress.missing', () => {
    ShipmentService.createShipment(
      {
        center_id: ctx.traderId,
        clearance_center_id: ctx.brokerId,
        border_id: ctx.borderId,
        goods_name: 'بطاطا',
        source: 'أ',
        destination: 'ب',
        entry_date: ctx.testDate,
        cost_tarseem: 100,
      },
      ctx.adminId
    )
    const { rows } = ShipmentService.list({ status: 'pending' })
    const row = rows.find((r) => r.goods_name === 'بطاطا')
    expect(row?.progress?.missing?.length).toBeGreaterThan(0)
  })
})
