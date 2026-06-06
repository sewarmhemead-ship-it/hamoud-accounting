const {
  calculateShipmentTotal,
  calculateTax2Pct,
  calculateCostTotal,
  calculatePriceTotal,
  calculateShipmentProfit,
  resolveTotalCost,
  CalculationError,
} = require('../src/engine')

describe('calculateShipmentTotal — مجموع تكلفة تخليص السيارة', () => {
  it('يجمع كل الأقلام المالية', () => {
    const total = calculateShipmentTotal({
      tarseem: 100,
      tax_2pct: 2,
      service_fee: 30,
      workers: 20,
      clearance_fee: 50,
      syrian_driver: 200,
      turkish_transport: 300,
      internal_transport: 10,
      door_receipt: 5,
      other_expenses: 8,
    })
    expect(total).toBe(725)
  })

  it('يعامل الأقلام الفارغة كصفر', () => {
    expect(calculateShipmentTotal({ tarseem: 100, clearance_fee: 50 })).toBe(150)
  })

  it('كائن فارغ ⇒ صفر', () => {
    expect(calculateShipmentTotal({})).toBe(0)
  })

  it('يتجاهل الحقول غير المالية', () => {
    expect(
      calculateShipmentTotal({ tarseem: 100, goods_name: 'خضار', center_id: 5 })
    ).toBe(100)
  })

  it('يقرّب نواتج الفاصلة العائمة', () => {
    expect(calculateShipmentTotal({ tarseem: 0.1, workers: 0.2 })).toBe(0.3)
  })

  it('لا يضيف ضريبة 2% تلقائياً — الترسيم شامل الضريبة (باب الهوى سيارة 1)', () => {
    // المخلص يكتب ترسيم=2646 شاملاً الضريبة. المجموع = 2646 + 400 + 30 = 3076
    // وليس 2646×1.02 + 430 = 3129
    const truck1 = { tarseem: 2646, syrian_driver: 400, clearance_fee: 30 }
    expect(calculateShipmentTotal(truck1)).toBe(3076)
    expect(calculateShipmentTotal(truck1)).not.toBe(3129)
  })

  it('قيمة سالبة في قلم ⇒ CalculationError', () => {
    expect(() => calculateShipmentTotal({ tarseem: -10 })).toThrow(CalculationError)
  })

  it('قيمة نصّية ⇒ CalculationError', () => {
    expect(() => calculateShipmentTotal({ tarseem: 'كثير' })).toThrow(CalculationError)
  })

  it('مدخل ليس كائناً ⇒ CalculationError', () => {
    expect(() => calculateShipmentTotal(null)).toThrow(CalculationError)
    expect(() => calculateShipmentTotal(42)).toThrow(CalculationError)
  })
})

describe('calculateTax2Pct — ضريبة 2% على الترسيم', () => {
  it('يحسب 2% من الترسيم', () => {
    expect(calculateTax2Pct(1000)).toBe(20)
  })

  it('ترسيم صفر ⇒ ضريبة صفر', () => {
    expect(calculateTax2Pct(0)).toBe(0)
  })

  it('ترسيم مفقود ⇒ صفر', () => {
    expect(calculateTax2Pct(null)).toBe(0)
    expect(calculateTax2Pct(undefined)).toBe(0)
  })

  it('يقرّب لمنزلتين', () => {
    expect(calculateTax2Pct(333.33)).toBe(6.67)
  })

  it('قيمة override صريحة تُستخدم بدل الحساب', () => {
    expect(calculateTax2Pct(1000, 15)).toBe(15)
  })

  it('override = 0 يُحترم (لا يُعامل كمفقود)', () => {
    expect(calculateTax2Pct(1000, 0)).toBe(0)
  })

  it('ترسيم سالب ⇒ CalculationError', () => {
    expect(() => calculateTax2Pct(-100)).toThrow(CalculationError)
  })

  it('override سالب ⇒ CalculationError', () => {
    expect(() => calculateTax2Pct(1000, -5)).toThrow(CalculationError)
  })
})

describe('الكشف المزدوج — تكلفة/سعر/مربح (أرقام باب الهوى الحقيقية)', () => {
  // باب الهوى — السيارة رقم 1
  const truck1 = {
    cost_tarseem: 2646,
    cost_turkish_driver: 400,
    cost_clearance_fee: 30,
    price_tarseem: 2646,
    price_syrian_driver: 420,
    price_service_fee: 40,
  }

  it('تكلفة المخلص = 3076', () => {
    expect(calculateCostTotal(truck1)).toBe(3076)
  })

  it('فاتورة التاجر = 3106', () => {
    expect(calculatePriceTotal(truck1)).toBe(3106)
  })

  it('مربح السيارة = 30', () => {
    expect(calculateShipmentProfit(truck1)).toBe(30)
  })

  it('سيارة بلا أعمدة مزدوجة ⇒ أصفار', () => {
    expect(calculateCostTotal({})).toBe(0)
    expect(calculatePriceTotal({})).toBe(0)
    expect(calculateShipmentProfit({})).toBe(0)
  })

  it('مربح سالب عند البيع بأقل من التكلفة', () => {
    expect(
      calculateShipmentProfit({ cost_tarseem: 100, price_tarseem: 80 })
    ).toBe(-20)
  })

  // إجمالي باب الهوى — مربح الشركة من فرق الرسوم (مجموع تاجر − مجموع مخلص)
  // المرجع الموثّق: مجموع التاجر 237675 − مجموع المخلص 235365 = 2310
  it('مربح الإجمالي = فرق المجاميع (237675 − 235365 = 2310)', () => {
    const aggregate = { price_tarseem: 237675, cost_tarseem: 235365 }
    expect(calculateShipmentProfit(aggregate)).toBe(2310)
  })

  it('قيمة غير رقمية في قلم ⇒ CalculationError', () => {
    expect(() => calculateCostTotal({ cost_tarseem: 'كثير' })).toThrow(CalculationError)
  })

  it('قيمة سالبة في قلم ⇒ CalculationError', () => {
    expect(() => calculatePriceTotal({ price_tarseem: -5 })).toThrow(CalculationError)
  })
})

describe('resolveTotalCost — مصدر الحقيقة لمجموع السيارة', () => {
  it('سيارة مزدوجة → traderAmount = price، clearanceAmount = cost، isDual = true', () => {
    const r = resolveTotalCost({ cost_tarseem: 3076, price_tarseem: 3106 })
    expect(r.isDual).toBe(true)
    expect(r.traderAmount).toBe(3106)
    expect(r.clearanceAmount).toBe(3076)
  })

  it('سيارة كلاسيكية → traderAmount = clearanceAmount = مجموع الأقلام', () => {
    const r = resolveTotalCost({ tarseem: 2646, syrian_driver: 400, clearance_fee: 30 })
    expect(r.isDual).toBe(false)
    expect(r.traderAmount).toBe(3076)
    expect(r.clearanceAmount).toBe(3076)
  })

  it('سيارة فارغة → كلاسيكي بمجموع صفر', () => {
    const r = resolveTotalCost({})
    expect(r.isDual).toBe(false)
    expect(r.traderAmount).toBe(0)
    expect(r.clearanceAmount).toBe(0)
  })

  it('price_tarseem فقط → isDual true، clearanceAmount = legacy إن وُجد', () => {
    const r = resolveTotalCost({ price_tarseem: 500 })
    expect(r.isDual).toBe(true)
    expect(r.traderAmount).toBe(500)
    expect(r.clearanceAmount).toBe(0)
  })

  it('price_other فقط على سيارة كلاسيكية → يبقى كلاسيكي', () => {
    const r = resolveTotalCost({
      tarseem: 2646,
      syrian_driver: 400,
      clearance_fee: 30,
      price_other: 5,
    })
    expect(r.isDual).toBe(false)
    expect(r.traderAmount).toBe(3076)
  })

  it('مربح الشركة = traderAmount − clearanceAmount', () => {
    const r = resolveTotalCost({ cost_tarseem: 235365, price_tarseem: 237675 })
    expect(r.traderAmount - r.clearanceAmount).toBe(2310)
  })
})
