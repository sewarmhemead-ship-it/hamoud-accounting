const { calculateJuiceProfit, CalculationError } = require('../src/engine')

describe('calculateJuiceProfit — مربح شحنة طازج', () => {
  describe('الحالات العادية', () => {
    it('يحسب التكلفة والمربح بشكل صحيح', () => {
      const r = calculateJuiceProfit({
        units_sent: 100,
        units_lost: 0,
        capital: 800,
        turkish_transport: 100,
        tarseem: 50,
        workers: 30,
        clearance_fee: 20,
        driver_cost: 0,
        sale_price: 15,
      })
      // التكلفة الكلية = 1000، المستلمة = 100، تكلفة الوحدة = 10
      expect(r.units_received).toBe(100)
      expect(r.total_cost).toBe(1000)
      expect(r.cost_per_unit).toBe(10)
      expect(r.profit_per_unit).toBe(5)
      expect(r.total_profit).toBe(500)
    })

    it('يخصم الهالك من المستلمة', () => {
      const r = calculateJuiceProfit({
        units_sent: 120,
        units_lost: 20,
        capital: 1000,
        sale_price: 20,
      })
      expect(r.units_received).toBe(100)
      expect(r.cost_per_unit).toBe(10)
      expect(r.total_profit).toBe(1000)
    })

    it('يتعامل مع الأقلام الاختيارية الغائبة كصفر', () => {
      const r = calculateJuiceProfit({ units_sent: 10, capital: 100, sale_price: 20 })
      expect(r.cost_per_unit).toBe(10)
      expect(r.total_profit).toBe(100)
    })

    it('مربح سالب عند البيع بأقل من التكلفة', () => {
      const r = calculateJuiceProfit({ units_sent: 10, capital: 200, sale_price: 15 })
      expect(r.cost_per_unit).toBe(20)
      expect(r.profit_per_unit).toBe(-5)
      expect(r.total_profit).toBe(-50)
    })
  })

  describe('الحالات القصوى والمدخلات الخاطئة', () => {
    it('عدد مرسل صفر ⇒ CalculationError', () => {
      expect(() => calculateJuiceProfit({ units_sent: 0, sale_price: 10 })).toThrow(
        CalculationError
      )
    })

    it('الهالك = المرسل (لا مستلم) ⇒ CalculationError', () => {
      expect(() =>
        calculateJuiceProfit({ units_sent: 50, units_lost: 50, sale_price: 10 })
      ).toThrow(CalculationError)
    })

    it('الهالك أكبر من المرسل ⇒ CalculationError', () => {
      expect(() =>
        calculateJuiceProfit({ units_sent: 50, units_lost: 60, sale_price: 10 })
      ).toThrow(CalculationError)
    })

    it('عدد مرسل سالب ⇒ CalculationError', () => {
      expect(() => calculateJuiceProfit({ units_sent: -5, sale_price: 10 })).toThrow(
        CalculationError
      )
    })

    it('سعر بيع نصّي ⇒ CalculationError', () => {
      expect(() =>
        calculateJuiceProfit({ units_sent: 10, capital: 100, sale_price: 'غالي' })
      ).toThrow(CalculationError)
    })

    it('مدخل ليس كائناً ⇒ CalculationError', () => {
      expect(() => calculateJuiceProfit(null)).toThrow(CalculationError)
    })
  })
})
