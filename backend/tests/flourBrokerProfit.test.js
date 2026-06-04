const {
  calculateFlourTraderLine,
  calculateBrokerMarginFromLines,
  calculateDailyGrossProfit,
  calculateNetProfit,
  calculateCenterBalance,
  calculateGrandTotal,
  CalculationError,
} = require('../src/engine')

describe('calculateFlourTraderLine — بيع طحين بالوزن', () => {
  it('يحسب المربح = (بيع − شراء) × وزن − أجار', () => {
    const r = calculateFlourTraderLine({
      sale_price: 5,
      purchase_price: 4,
      weight: 1000,
      truck_rent: 200,
    })
    expect(r.margin_per_kg).toBe(1)
    expect(r.revenue).toBe(5000)
    expect(r.cost).toBe(4000)
    expect(r.profit).toBe(800)
  })

  it('بدون أجار تراك', () => {
    expect(
      calculateFlourTraderLine({ sale_price: 5, purchase_price: 4, weight: 100 }).profit
    ).toBe(100)
  })

  it('مربح سالب عند البيع بخسارة', () => {
    expect(
      calculateFlourTraderLine({ sale_price: 3, purchase_price: 4, weight: 100 }).profit
    ).toBe(-100)
  })

  it('وزن صفر ⇒ CalculationError', () => {
    expect(() =>
      calculateFlourTraderLine({ sale_price: 5, purchase_price: 4, weight: 0 })
    ).toThrow(CalculationError)
  })

  it('وزن سالب ⇒ CalculationError', () => {
    expect(() =>
      calculateFlourTraderLine({ sale_price: 5, purchase_price: 4, weight: -10 })
    ).toThrow(CalculationError)
  })

  it('سعر سالب ⇒ CalculationError', () => {
    expect(() =>
      calculateFlourTraderLine({ sale_price: -5, purchase_price: 4, weight: 100 })
    ).toThrow(CalculationError)
  })
})

describe('calculateBrokerMarginFromLines — هامش المخلص/التاجر', () => {
  it('الهامش = فاتورة التاجر − تكلفة المخلص', () => {
    const r = calculateBrokerMarginFromLines(
      { tarseem: 100, clearance_fee: 30 },
      { tarseem: 100, clearance_fee: 50, service_fee: 40 }
    )
    expect(r.broker_total).toBe(130)
    expect(r.trader_total).toBe(190)
    expect(r.margin).toBe(60)
  })

  it('كشفان فارغان ⇒ هامش صفر', () => {
    expect(calculateBrokerMarginFromLines({}, {}).margin).toBe(0)
  })

  it('هامش سالب ممكن (دُفع للمخلص أكثر)', () => {
    const r = calculateBrokerMarginFromLines({ tarseem: 200 }, { tarseem: 100 })
    expect(r.margin).toBe(-100)
  })

  it('قيمة خاطئة في أحد الكشفين ⇒ CalculationError', () => {
    expect(() =>
      calculateBrokerMarginFromLines({ tarseem: -1 }, { tarseem: 100 })
    ).toThrow(CalculationError)
  })
})

describe('calculateDailyGrossProfit / calculateNetProfit — المربح اليومي', () => {
  it('الإجمالي = الأساس + الفروقات الخمسة', () => {
    expect(
      calculateDailyGrossProfit({
        baseClearance: 580,
        transport_diff: 40,
        workers_diff: 60,
        driver_diff: 125,
        credit_diff: -41,
      })
    ).toBe(764)
  })

  it('يتعامل مع الفروقات الغائبة كصفر', () => {
    expect(calculateDailyGrossProfit({ baseClearance: 500 })).toBe(500)
  })

  it('يقبل فروقات سالبة', () => {
    expect(calculateDailyGrossProfit({ baseClearance: 100, credit_diff: -150 })).toBe(-50)
  })

  it('الصافي = الإجمالي − مكتب − منزل', () => {
    expect(calculateNetProfit(25461, 6354, 0)).toBe(19107)
  })

  it('صافي سالب ممكن', () => {
    expect(calculateNetProfit(100, 80, 50)).toBe(-30)
  })

  it('مصروف سالب ⇒ CalculationError', () => {
    expect(() => calculateNetProfit(100, -10, 0)).toThrow(CalculationError)
  })
})

describe('calculateCenterBalance / calculateGrandTotal — الذمم', () => {
  it('الرصيد = استحقاقات − دفعات', () => {
    expect(calculateCenterBalance(46612, 46754)).toBe(-142)
  })

  it('رصيد موجب (لنا)', () => {
    expect(calculateCenterBalance(235365, 234680)).toBe(685)
  })

  it('الإجمالي = الرصيد + المُرحَّل غير المُسلَّم', () => {
    expect(calculateGrandTotal(685, 5000)).toBe(5685)
  })

  it('يتعامل مع القيم الفارغة كصفر', () => {
    expect(calculateCenterBalance(null, null)).toBe(0)
  })

  it('قيمة نصّية ⇒ CalculationError', () => {
    expect(() => calculateCenterBalance('كثير', 0)).toThrow(CalculationError)
  })
})
