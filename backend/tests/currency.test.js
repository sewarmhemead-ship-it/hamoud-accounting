const { convertToUsd, CalculationError } = require('../src/engine')

describe('convertToUsd — تحويل العملات إلى دولار', () => {
  describe('الدولار (USD)', () => {
    it('يعيد المبلغ نفسه بسعر صرف 1', () => {
      const r = convertToUsd(500, 'USD')
      expect(r.amount_usd).toBe(500)
      expect(r.exchange_rate).toBe(1)
      expect(r.currency).toBe('USD')
    })

    it('يفترض USD عند غياب العملة', () => {
      expect(convertToUsd(100).amount_usd).toBe(100)
    })

    it('لا يحتاج سعر صرف للدولار', () => {
      expect(() => convertToUsd(100, 'usd')).not.toThrow()
    })
  })

  describe('العملات الأخرى (سعر الصرف = وحدات لكل دولار)', () => {
    it('يحوّل الليرة السورية (1$ = 14000 ل.س)', () => {
      const r = convertToUsd(140000, 'SYP', 14000)
      expect(r.amount_usd).toBe(10)
      expect(r.currency).toBe('SYP')
      expect(r.exchange_rate).toBe(14000)
    })

    it('يحوّل الليرة التركية (1$ = 40 ₺)', () => {
      expect(convertToUsd(400, 'TRY', 40).amount_usd).toBe(10)
    })

    it('يقرّب الناتج لمنزلتين', () => {
      expect(convertToUsd(100, 'TRY', 3).amount_usd).toBe(33.33)
    })

    it('رمز العملة بأحرف صغيرة يُطبَّع لأحرف كبيرة', () => {
      expect(convertToUsd(400, 'try', 40).currency).toBe('TRY')
    })
  })

  describe('الحالات القصوى والمدخلات الخاطئة', () => {
    it('مبلغ صفر ⇒ صفر دولار', () => {
      expect(convertToUsd(0, 'SYP', 14000).amount_usd).toBe(0)
    })

    it('عملة غير دولار بلا سعر صرف ⇒ CalculationError', () => {
      expect(() => convertToUsd(100, 'SYP')).toThrow(CalculationError)
    })

    it('سعر صرف صفر ⇒ CalculationError (تفادي القسمة على صفر)', () => {
      expect(() => convertToUsd(100, 'SYP', 0)).toThrow(CalculationError)
    })

    it('سعر صرف سالب ⇒ CalculationError', () => {
      expect(() => convertToUsd(100, 'SYP', -14000)).toThrow(CalculationError)
    })

    it('مبلغ سالب ⇒ CalculationError', () => {
      expect(() => convertToUsd(-100, 'USD')).toThrow(CalculationError)
    })

    it('مبلغ غير رقمي ⇒ CalculationError', () => {
      expect(() => convertToUsd('مية', 'USD')).toThrow(CalculationError)
    })

    it('سعر صرف نصّي ⇒ CalculationError', () => {
      expect(() => convertToUsd(100, 'SYP', 'كثير')).toThrow(CalculationError)
    })
  })
})
