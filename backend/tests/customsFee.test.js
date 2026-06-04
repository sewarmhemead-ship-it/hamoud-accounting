const { calculateCustomsFee, CalculationError } = require('../src/engine')

describe('calculateCustomsFee — الرسوم الجمركية حسب النوع والوزن', () => {
  describe('الحالات العادية', () => {
    it('يحسب الرسوم لنوع معروف (خضار 0.05/كغ)', () => {
      const r = calculateCustomsFee({ goodsType: 'خضار', weight: 1000 })
      expect(r.fee).toBe(50)
      expect(r.ratePerKg).toBe(0.05)
      expect(r.weight).toBe(1000)
      expect(r.goodsType).toBe('خضار')
    })

    it('يحسب الرسوم لنوع آخر (فواكه 0.07/كغ)', () => {
      expect(calculateCustomsFee({ goodsType: 'فواكه', weight: 250 }).fee).toBe(17.5)
    })

    it('يتعامل مع المسافات الزائدة في اسم النوع', () => {
      expect(calculateCustomsFee({ goodsType: '  خضار  ', weight: 100 }).fee).toBe(5)
    })

    it('يستخدم المعدل الافتراضي لنوع غير معروف', () => {
      const r = calculateCustomsFee({ goodsType: 'بضاعة غريبة', weight: 100 })
      expect(r.ratePerKg).toBe(0.1)
      expect(r.fee).toBe(10)
    })

    it('يستخدم المعدل الافتراضي عند غياب النوع', () => {
      expect(calculateCustomsFee({ weight: 100 }).fee).toBe(10)
    })

    it('يسمح بتجاوز المعدل عبر ratePerKg', () => {
      const r = calculateCustomsFee({ goodsType: 'خضار', weight: 200, ratePerKg: 0.25 })
      expect(r.ratePerKg).toBe(0.25)
      expect(r.fee).toBe(50)
    })

    it('يقرّب الناتج لمنزلتين عشريتين', () => {
      const r = calculateCustomsFee({ weight: 33.333, ratePerKg: 0.1 })
      expect(r.fee).toBe(3.33)
    })
  })

  describe('الحالات القصوى', () => {
    it('وزن صفر ⇒ رسوم صفر (حالة صحيحة)', () => {
      expect(calculateCustomsFee({ goodsType: 'خضار', weight: 0 }).fee).toBe(0)
    })

    it('معدل تجاوز صفر ⇒ رسوم صفر', () => {
      expect(calculateCustomsFee({ weight: 1000, ratePerKg: 0 }).fee).toBe(0)
    })

    it('أوزان كبيرة جداً تُحسب بدقة', () => {
      expect(calculateCustomsFee({ weight: 1_000_000, ratePerKg: 0.1 }).fee).toBe(100000)
    })
  })

  describe('المدخلات الخاطئة', () => {
    it('وزن سالب ⇒ CalculationError', () => {
      expect(() => calculateCustomsFee({ goodsType: 'خضار', weight: -5 })).toThrow(
        CalculationError
      )
    })

    it('وزن نصّي غير رقمي ⇒ CalculationError', () => {
      expect(() => calculateCustomsFee({ weight: 'ثقيل' })).toThrow(CalculationError)
    })

    it('وزن مفقود (undefined) ⇒ رسوم صفر (يُعامل كصفر)', () => {
      expect(calculateCustomsFee({ goodsType: 'خضار' }).fee).toBe(0)
    })

    it('وزن NaN ⇒ CalculationError', () => {
      expect(() => calculateCustomsFee({ weight: NaN })).toThrow(CalculationError)
    })

    it('وزن Infinity ⇒ CalculationError', () => {
      expect(() => calculateCustomsFee({ weight: Infinity })).toThrow(CalculationError)
    })

    it('معدل تجاوز سالب ⇒ CalculationError', () => {
      expect(() => calculateCustomsFee({ weight: 100, ratePerKg: -1 })).toThrow(
        CalculationError
      )
    })

    it('مدخل غير كائن ⇒ CalculationError', () => {
      expect(() => calculateCustomsFee(null)).toThrow(CalculationError)
    })
  })
})
