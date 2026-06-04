const { validateShipmentFinancials, CalculationError } = require('../src/engine')

describe('validateShipmentFinancials — التحقق من أقلام السيارة المالية', () => {
  describe('مدخلات صحيحة', () => {
    it('يقبل أقلاماً موجبة', () => {
      expect(
        validateShipmentFinancials({ tarseem: 100, clearance_fee: 50, workers: 0 })
      ).toBe(true)
    })

    it('يقبل كائناً فارغاً (سيارة قيد الإكمال)', () => {
      expect(validateShipmentFinancials({})).toBe(true)
    })

    it('يتجاهل الأقلام الفارغة (null/undefined)', () => {
      expect(
        validateShipmentFinancials({ tarseem: 100, workers: null, service_fee: undefined })
      ).toBe(true)
    })

    it('يتجاهل الحقول غير المالية', () => {
      expect(
        validateShipmentFinancials({ goods_name: 'خضار', source: 'حلب', tarseem: 10 })
      ).toBe(true)
    })

    it('يقبل صفراً صريحاً', () => {
      expect(validateShipmentFinancials({ tarseem: 0 })).toBe(true)
    })
  })

  describe('مدخلات خاطئة', () => {
    it('قيمة سالبة ⇒ CalculationError', () => {
      expect(() => validateShipmentFinancials({ tarseem: -1 })).toThrow(CalculationError)
    })

    it('قيمة نصّية ⇒ CalculationError', () => {
      expect(() => validateShipmentFinancials({ clearance_fee: 'خمسين' })).toThrow(
        CalculationError
      )
    })

    it('NaN ⇒ CalculationError', () => {
      expect(() => validateShipmentFinancials({ workers: NaN })).toThrow(CalculationError)
    })

    it('قيمة منطقية (boolean) ⇒ CalculationError', () => {
      expect(() => validateShipmentFinancials({ tarseem: true })).toThrow(CalculationError)
    })

    it('مدخل ليس كائناً ⇒ CalculationError', () => {
      expect(() => validateShipmentFinancials(null)).toThrow(CalculationError)
    })

    it('رسالة الخطأ تذكر اسم الحقل العربي', () => {
      expect(() => validateShipmentFinancials({ syrian_driver: -5 })).toThrow(/سائق سوري/)
    })
  })
})
