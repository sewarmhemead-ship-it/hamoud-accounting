const { classifyQuestion } = require('../src/utils/assistantIntents')
const { parseDateFromText } = require('../src/utils/assistantDateParse')
const { createFullProductDb, destroyFullProductDb } = require('./helpers/fullProductDb')
const AssistantService = require('../src/services/AssistantService')
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

describe('assistantIntents', () => {
  it('يكتشف مربح اليوم', () => {
    const p = classifyQuestion('شو الميزانية اليوم؟')
    expect(p.intent).toBe('profit_day')
    expect(p.date).toBeTruthy()
  })

  it('يكتشف ملخص تاريخ', () => {
    const p = classifyQuestion('شو صار بتاريخ 2026-06-05؟')
    expect(p.intent).toBe('day_summary')
    expect(p.date).toBe('2026-06-05')
  })

  it('يكتشف ذمة تاجر', () => {
    const p = classifyQuestion('كم ذمة تاجر 101')
    expect(p.intent).toBe('center_balance')
    expect(p.centerQuery).toBe('101')
  })

  it('parseDateFromText يدعم ISO', () => {
    expect(parseDateFromText('بتاريخ 2026-06-05')).toBe('2026-06-05')
  })
})

describe('AssistantService — قراءة فقط', () => {
  const admin = { id: 1, role: 'admin', permissions: [] }

  it('يرفض سؤالاً فارغاً', () => {
    expect(() => AssistantService.ask(admin, '')).toThrow(/وضوح/)
  })

  it('يجيب عن مربح يوم بعد ترحيل', () => {
    const truck = ShipmentService.createShipment(
      {
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
      },
      ctx.adminId
    )
    ShipmentService.postShipment(truck.id, ctx.adminId)

    const res = AssistantService.ask(admin, `شو المربح بتاريخ ${ctx.testDate}؟`)
    expect(res.intent).toBe('profit_day')
    expect(res.answer).toMatch(/\$/)
    expect(res.facts.num_trucks).toBeGreaterThanOrEqual(1)
  })

  it('ملخص يوم يذكر السيارات', () => {
    ShipmentService.createShipment(
      {
        center_id: ctx.traderId,
        clearance_center_id: ctx.brokerId,
        border_id: ctx.borderId,
        goods_name: 'زيت',
        source: 'أنقرة',
        destination: 'دمشق',
        entry_date: '2026-06-10',
        tarseem: 1000,
        workers: 50,
        clearance_fee: 25,
        syrian_driver: 200,
      },
      ctx.adminId
    )

    const res = AssistantService.ask(admin, 'شو صار بتاريخ 2026-06-10؟')
    expect(res.intent).toBe('day_summary')
    expect(res.answer).toMatch(/السيارات/)
  })

  it('ذمة مركز حقيقية', () => {
    const res = AssistantService.ask(admin, 'ذمة تاجر 101')
    expect(res.intent).toBe('center_balance')
    expect(res.answer).toMatch(/تاجر تجريبي/)
    expect(res.links[0].path).toContain('/centers/')
  })

  it('إغلاق يوم يظهر في المربح', () => {
    ShipmentService.createShipment(
      {
        center_id: ctx.traderId,
        clearance_center_id: ctx.brokerId,
        border_id: ctx.borderId,
        goods_name: 'قمح',
        source: 'تركيا',
        destination: 'حلب',
        entry_date: ctx.testDate,
        tarseem: 1500,
        workers: 80,
        clearance_fee: 40,
        syrian_driver: 300,
      },
      ctx.adminId
    )
    const truck2 = ShipmentService.createShipment(
      {
        center_id: ctx.traderId,
        clearance_center_id: ctx.brokerId,
        border_id: ctx.borderId,
        goods_name: 'قمح2',
        source: 'تركيا',
        destination: 'حلب',
        entry_date: ctx.testDate,
        tarseem: 1500,
        workers: 80,
        clearance_fee: 40,
        syrian_driver: 300,
      },
      ctx.adminId
    )
    ShipmentService.postShipment(truck2.id, ctx.adminId)

    ProfitService.closeDay(
      ctx.testDate,
      { office_expenses: 10, home_expenses: 5 },
      ctx.adminId
    )

    const res = AssistantService.ask(admin, `مربح ${ctx.testDate}`)
    expect(res.answer).toMatch(/مُغلق/)
    expect(res.facts.net_profit).toBeDefined()
  })
})
