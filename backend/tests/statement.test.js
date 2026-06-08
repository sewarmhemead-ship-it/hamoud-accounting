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

  it('سائق سوري ليس إلزامياً ⇒ تُرحَّل بدونه', () => {
    const r = classifyPostability(completeTruck({ status: 'pending', syrian_driver: null }))
    expect(r.state).toBe(POSTABILITY.POSTABLE)
    expect(r.is_postable).toBe(true)
    expect(r.missing).not.toContain('سائق سوري')
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

  it('سيارة مزدوجة بأقلام cost/price ⇒ قابلة للترحيل بدون legacy', () => {
    const r = classifyPostability({
      status: 'complete',
      cost_tarseem: 2000,
      price_syrian_driver: 400,
      cost_clearance_fee: 30,
    })
    expect(r.is_postable).toBe(true)
    expect(r.missing).toEqual([])
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

  it('سيارة مزدوجة مُرحَّلة — مجموع الكشف = cost_*', () => {
    const stmt = buildBrokerStatement({
      shipments: [
        {
          id: 10,
          status: 'posted',
          entry_date: '2026-03-01',
          goods_name: 'رز',
          cost_tarseem: 2000,
          cost_turkish_driver: 400,
          cost_clearance_fee: 30,
          price_tarseem: 2100,
          price_syrian_driver: 420,
        },
      ],
      payments: [],
      centerType: 'broker',
    })
    expect(stmt.totals.charges_posted).toBe(2430)
    expect(stmt.rows[0].total).toBe(2430)
  })

  it('بند مصروف (category=expense) ⇒ صف منفصل ويخفّض الرصيد', () => {
    const stmt = buildBrokerStatement({
      shipments: [completeTruck({ id: 1, status: 'posted' })], // 8584
      payments: [
        { id: 5, date: '2026-02-12', amount_usd: 1000, notes: 'دفعة', category: 'payment' },
        { id: 6, date: '2026-02-13', amount_usd: 600, notes: 'إيجار المكتب', category: 'expense' },
      ],
      centerType: 'broker',
    })
    const expenseRow = stmt.rows.find((r) => r.kind === 'expense')
    expect(expenseRow).toBeTruthy()
    expect(expenseRow.label).toBe('إيجار المكتب')
    // المصاريف تدخل ضمن الدفعات وتخفّض الرصيد: 8584 - (1000 + 600) = 6984
    expect(stmt.totals.payments_total).toBe(1600)
    expect(stmt.totals.expenses_total).toBe(600)
    expect(stmt.totals.balance).toBe(6984)
  })

  it('بلا بنود مصاريف ⇒ expenses_total = 0', () => {
    const stmt = buildBrokerStatement({
      shipments: [completeTruck({ id: 1, status: 'posted' })],
      payments: [{ id: 5, date: '2026-02-12', amount_usd: 1000, notes: 'دفعة' }],
    })
    expect(stmt.totals.expenses_total).toBe(0)
  })

  it('كشف فارغ تماماً ⇒ أصفار', () => {
    const stmt = buildBrokerStatement({ shipments: [], payments: [] })
    expect(stmt.totals.balance).toBe(0)
    expect(stmt.totals.direction).toBe('متوازن')
    expect(stmt.rows).toEqual([])
    expect(stmt.columns).toEqual([])
  })

  it('سطر السيارة يحمل نوع البضاعة (goods_type) من goods_type_name', () => {
    const stmt = buildBrokerStatement({
      shipments: [
        completeTruck({ id: 1, status: 'posted', goods_name: 'رز هندي', goods_type_name: 'مواد غذائية' }),
      ],
      payments: [],
    })
    expect(stmt.rows[0].goods_type).toBe('مواد غذائية')
    expect(stmt.rows[0].goods_name).toBe('رز هندي')
  })

  it('سطر السيارة يحمل اسم السائق (driver) من driver_name', () => {
    const stmt = buildBrokerStatement({
      shipments: [completeTruck({ id: 1, status: 'posted', driver_name: 'أبو محمد' })],
      payments: [],
    })
    expect(stmt.rows[0].driver).toBe('أبو محمد')
  })

  it('بلا سائق ⇒ driver = null', () => {
    const stmt = buildBrokerStatement({
      shipments: [completeTruck({ id: 1, status: 'posted', driver_name: undefined })],
      payments: [],
    })
    expect(stmt.rows[0].driver).toBeNull()
  })

  it('سطر السيارة يحمل المعبر (border) من border_name', () => {
    const stmt = buildBrokerStatement({
      shipments: [completeTruck({ id: 1, status: 'posted', border_name: 'باب الهوى' })],
      payments: [],
    })
    expect(stmt.rows[0].border).toBe('باب الهوى')
  })

  it('بلا نوع بضاعة ⇒ goods_type = null', () => {
    const stmt = buildBrokerStatement({
      shipments: [completeTruck({ id: 1, status: 'posted', goods_type_name: undefined })],
      payments: [],
    })
    expect(stmt.rows[0].goods_type).toBeNull()
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

  it('سطر السيارة في الكشف المزدوج يحمل نوع البضاعة (goods_type)', () => {
    const stmt = buildDualStatement({
      shipments: [dualTruck({ goods_name: 'رز هندي', goods_type_name: 'مواد غذائية' })],
    })
    const truckRow = stmt.broker_side.rows.find((r) => r.kind === 'truck')
    expect(truckRow.goods_type).toBe('مواد غذائية')
    expect(truckRow.goods_name).toBe('رز هندي')
  })

  it('سطر السيارة في الكشف المزدوج يحمل اسم السائق (driver)', () => {
    const stmt = buildDualStatement({
      shipments: [dualTruck({ driver_name: 'أبو محمد' })],
    })
    const truckRow = stmt.broker_side.rows.find((r) => r.kind === 'truck')
    expect(truckRow.driver).toBe('أبو محمد')
  })

  it('سطر السيارة في الكشف المزدوج يحمل المعبر (border) من border_name', () => {
    const stmt = buildDualStatement({
      shipments: [dualTruck({ border_name: 'باب الهوى' })],
    })
    const truckRow = stmt.broker_side.rows.find((r) => r.kind === 'truck')
    expect(truckRow.border).toBe('باب الهوى')
  })

  it('مدخل غير مصفوفة ⇒ CalculationError', () => {
    expect(() => buildDualStatement({ shipments: 'x' })).toThrow(CalculationError)
  })
})
