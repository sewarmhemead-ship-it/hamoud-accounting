const {
  classifyPostability,
  detectCostColumns,
  buildBrokerStatement,
  buildDualStatement,
  POSTABILITY,
  CalculationError,
} = require('../src/engine')

// سيارة مكتملة (الأقلام الإلزامية: tarseem, syrian_driver, clearance_fee)
const completeTruck = (over = {}) => ({
  id: 1,
  ref_number: 'TRK-1',
  entry_date: '2026-02-11',
  goods_name: 'رز',
  status: 'complete',
  tarseem: 2818,
  workers: 240,
  service_fee: 120,
  clearance_fee: 80,
  syrian_driver: 1926,
  turkish_transport: 3400,
  ...over,
})

describe('classifyPostability — حالة الترحيل', () => {
  it('سيارة مكتملة ⇒ قابلة للترحيل', () => {
    const r = classifyPostability(completeTruck())
    expect(r.state).toBe(POSTABILITY.POSTABLE)
    expect(r.is_postable).toBe(true)
    expect(r.missing).toEqual([])
  })

  it('سيارة ينقصها قلم إلزامي ⇒ غير مكتملة + يذكر الناقص', () => {
    const r = classifyPostability(completeTruck({ status: 'pending', clearance_fee: null }))
    expect(r.state).toBe(POSTABILITY.INCOMPLETE)
    expect(r.is_postable).toBe(false)
    expect(r.missing).toContain('اتعاب')
  })

  it('سيارة مُرحَّلة تبقى مُرحَّلة', () => {
    expect(classifyPostability(completeTruck({ status: 'posted' })).state).toBe(
      POSTABILITY.POSTED
    )
  })

  it('سيارة مُسلَّمة', () => {
    expect(classifyPostability(completeTruck({ status: 'delivered' })).state).toBe(
      POSTABILITY.DELIVERED
    )
  })

  it('مدخل غير صالح ⇒ CalculationError', () => {
    expect(() => classifyPostability(null)).toThrow(CalculationError)
  })
})

describe('detectCostColumns — كشف الأعمدة المستخدمة بنفس الترتيبة', () => {
  it('يعيد فقط الأعمدة ذات القيم بالترتيب القياسي', () => {
    // نمط الراعي: ترسيم، عمال، مكتب دور، تخليص
    const cols = detectCostColumns([
      { tarseem: 2630, workers: 35, door_receipt: 10, clearance_fee: 15 },
    ])
    expect(cols.map((c) => c.key)).toEqual([
      'tarseem',
      'workers',
      'door_receipt',
      'clearance_fee',
    ])
  })

  it('يتجاهل الأعمدة الصفرية والفارغة', () => {
    const cols = detectCostColumns([{ tarseem: 100, workers: 0, clearance_fee: null }])
    expect(cols.map((c) => c.key)).toEqual(['tarseem'])
  })

  it('نمط باب الهوى: ترسيم، تخليص، سائق', () => {
    const cols = detectCostColumns([
      { tarseem: 2646, clearance_fee: 30, syrian_driver: 400 },
    ])
    expect(cols.map((c) => c.key)).toEqual(['tarseem', 'clearance_fee', 'syrian_driver'])
  })

  it('قائمة فارغة ⇒ لا أعمدة', () => {
    expect(detectCostColumns([])).toEqual([])
  })
})

describe('buildBrokerStatement — الكشف الموحّد', () => {
  it('يجمع السيارات المُرحَّلة والدفعات ويحسب الرصيد', () => {
    const stmt = buildBrokerStatement({
      shipments: [
        completeTruck({ id: 1, status: 'posted', entry_date: '2026-02-11' }),
        completeTruck({ id: 2, status: 'posted', entry_date: '2026-02-12' }),
      ],
      payments: [{ id: 9, date: '2026-02-13', amount_usd: 5000, notes: 'لنا دفعة' }],
      centerType: 'broker',
    })
    // كل سيارة = 8584 → مجموع 17168 ، دفعات 5000 ، رصيد 12168 علينا
    expect(stmt.totals.charges_posted).toBe(17168)
    expect(stmt.totals.payments_total).toBe(5000)
    expect(stmt.totals.balance).toBe(12168)
    expect(stmt.totals.direction).toBe('علينا')
    expect(stmt.totals.we_owe).toBe(true)
    expect(stmt.rows).toHaveLength(3)
  })

  it('يرتّب السطور حسب التاريخ تصاعدياً', () => {
    const stmt = buildBrokerStatement({
      shipments: [completeTruck({ id: 2, status: 'posted', entry_date: '2026-02-20' })],
      payments: [{ id: 1, date: '2026-02-05', amount_usd: 100, notes: 'دفعة' }],
    })
    expect(stmt.rows[0].kind).toBe('payment')
    expect(stmt.rows[1].kind).toBe('truck')
  })

  it('يفصل السيارات غير المُرحَّلة: قابلة للترحيل vs غير مكتملة', () => {
    const stmt = buildBrokerStatement({
      shipments: [
        completeTruck({ id: 1, status: 'complete' }), // postable
        completeTruck({ id: 2, status: 'pending', clearance_fee: null }), // incomplete
      ],
      payments: [],
    })
    expect(stmt.wip.postable.count).toBe(1)
    expect(stmt.wip.postable.ids).toEqual([1])
    expect(stmt.wip.incomplete.count).toBe(1)
    // غير المُرحَّلة لا تدخل الرصيد
    expect(stmt.totals.charges_posted).toBe(0)
  })

  it('رصيد سالب ⇒ لنا (المخلص مدين لنا)', () => {
    const stmt = buildBrokerStatement({
      shipments: [completeTruck({ id: 1, status: 'posted' })], // 8584
      payments: [{ id: 1, date: '2026-02-01', amount_usd: 10000, notes: 'دفعة' }],
      centerType: 'broker',
    })
    expect(stmt.totals.balance).toBe(-1416)
    expect(stmt.totals.direction).toBe('لنا')
    expect(stmt.totals.we_owe).toBe(false)
  })

  it('إشارة التاجر معكوسة عن المخلص', () => {
    const stmt = buildBrokerStatement({
      shipments: [completeTruck({ id: 1, status: 'posted' })],
      payments: [],
      centerType: 'trader',
    })
    // موجب وللتاجر يعني «لنا»
    expect(stmt.totals.direction).toBe('لنا')
  })

  it('كشف فارغ تماماً ⇒ أصفار', () => {
    const stmt = buildBrokerStatement({ shipments: [], payments: [] })
    expect(stmt.totals.balance).toBe(0)
    expect(stmt.totals.direction).toBe('متوازن')
    expect(stmt.rows).toEqual([])
    expect(stmt.columns).toEqual([])
  })

  it('مدخل غير مصفوفة ⇒ CalculationError', () => {
    expect(() => buildBrokerStatement({ shipments: 'x', payments: [] })).toThrow(
      CalculationError
    )
  })
})

describe('buildDualStatement — الكشف المزدوج (مخلص + تاجر)', () => {
  // باب الهوى — السيارة رقم 1 (مُرحَّلة)
  const dualTruck = (over = {}) => ({
    id: 1,
    ref_number: 'TRK-1',
    entry_date: '2026-02-11',
    status: 'posted',
    cost_tarseem: 2646,
    cost_turkish_driver: 400,
    cost_clearance_fee: 30,
    price_tarseem: 2646,
    price_syrian_driver: 420,
    price_service_fee: 40,
    ...over,
  })

  it('جانب المخلص = 3076 وجانب التاجر = 3106 والمربح = 30', () => {
    const stmt = buildDualStatement({ shipments: [dualTruck()] })
    expect(stmt.broker_side.total_charges).toBe(3076)
    expect(stmt.trader_side.total_charges).toBe(3106)
    expect(stmt.company_profit.total).toBe(30)
    expect(stmt.company_profit.truck_count).toBe(1)
    expect(stmt.company_profit.per_truck_avg).toBe(30)
  })

  it('الدفعات تُخصم من كل جانب وتُحسب الإشارة', () => {
    const stmt = buildDualStatement({
      shipments: [dualTruck()],
      brokerPayments: [{ id: 9, date: '2026-02-01', amount_usd: 3000, notes: 'دفعة للمخلص' }],
      traderPayments: [{ id: 8, date: '2026-02-01', amount_usd: 3106, notes: 'تسديد التاجر' }],
    })
    expect(stmt.broker_side.balance).toBe(76) // 3076 - 3000
    expect(stmt.broker_side.direction).toBe('علينا')
    expect(stmt.trader_side.balance).toBe(0) // 3106 - 3106
    expect(stmt.trader_side.direction).toBe('متوازن')
  })

  it('السيارات غير المُرحَّلة لا تدخل المجاميع', () => {
    const stmt = buildDualStatement({
      shipments: [dualTruck({ id: 1, status: 'posted' }), dualTruck({ id: 2, status: 'pending' })],
    })
    expect(stmt.company_profit.truck_count).toBe(1)
    expect(stmt.broker_side.total_charges).toBe(3076)
  })

  it('إجمالي باب الهوى ⇒ مربح 2310 (237675 − 235365)', () => {
    // سيارة تجميعية تمثّل المجاميع الكلّية للكشف
    const stmt = buildDualStatement({
      shipments: [
        {
          id: 1,
          status: 'posted',
          entry_date: '2026-02-11',
          cost_tarseem: 235365,
          price_tarseem: 237675,
        },
      ],
    })
    expect(stmt.broker_side.total_charges).toBe(235365)
    expect(stmt.trader_side.total_charges).toBe(237675)
    expect(stmt.company_profit.total).toBe(2310)
  })

  it('كشف فارغ ⇒ أصفار وبلا قسمة على صفر', () => {
    const stmt = buildDualStatement({ shipments: [] })
    expect(stmt.company_profit.total).toBe(0)
    expect(stmt.company_profit.per_truck_avg).toBe(0)
    expect(stmt.broker_side.direction).toBe('متوازن')
  })

  it('مدخل غير مصفوفة ⇒ CalculationError', () => {
    expect(() => buildDualStatement({ shipments: 'x' })).toThrow(CalculationError)
  })
})
