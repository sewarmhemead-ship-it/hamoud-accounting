const { createFullProductDb, destroyFullProductDb } = require('./helpers/fullProductDb')
const ShipmentService = require('../src/services/ShipmentService')
const ProfitService = require('../src/services/ProfitService')

let ctx

beforeEach(async () => {
  ctx = await createFullProductDb()
})

afterEach(() => {
  destroyFullProductDb(ctx?.db)
  ctx = null
})

describe('المربح اليومي — clearance_diff', () => {
  it('إغلاق اليوم يحسب الإجمالي مع فرق التخليص', () => {
    const truck = ShipmentService.createShipment(
      {
        center_id: ctx.traderId,
        clearance_center_id: ctx.brokerId,
        border_id: ctx.borderId,
        goods_name: 'قمح',
        source: 'تركيا',
        destination: 'حلب',
        entry_date: ctx.testDate,
        tarseem: 1000,
        syrian_driver: 400,
        clearance_fee: 50,
        turkish_transport: 200,
        service_fee: 30,
        company_profit: 250,
      },
      ctx.adminId
    )
    ShipmentService.postShipment(truck.id, ctx.adminId)

    const preview = ProfitService.calculateDay(ctx.testDate)
    expect(preview.gross_revenue).toBeGreaterThan(0)
    expect(preview.gross_profit).toBe(250)

    const closed = ProfitService.closeDay(
      ctx.testDate,
      {
        clearance_diff: 50,
        transport_diff: 10,
        workers_diff: 0,
        driver_diff: 0,
        credit_diff: 0,
        office_expenses: 0,
        home_expenses: 0,
      },
      ctx.adminId
    )

    expect(closed.clearance_diff).toBe(50)
    // الأساس = مجموع «مربحنا» (250) + فرق التخليص (50) + فرق النقل (10)
    expect(closed.gross_profit).toBe(250 + 50 + 10)
  })
})
