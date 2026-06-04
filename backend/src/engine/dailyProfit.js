const { toFiniteNumber, round2 } = require('./numbers')

/**
 * المربح اليومي الإجمالي = أساس تخليص الشركة + الفروقات الخمسة.
 * (راجع «مربح يومي.xlsx» — الفروقات قد تكون سالبة مثل فرق الاعتماد −41).
 *
 * @param {object} params
 * @param {number} [params.baseClearance=0] تخليص الشركة الأساسي لليوم
 * @param {number} [params.transport_diff=0] فرق النقل التركي
 * @param {number} [params.workers_diff=0] فرق العمال
 * @param {number} [params.driver_diff=0] فرق أجار السائق السوري
 * @param {number} [params.credit_diff=0] فرق الاعتماد (قد يكون سالباً)
 * @returns {number} المربح الإجمالي مقرّباً لمنزلتين
 */
function calculateDailyGrossProfit(params = {}) {
  const base = toFiniteNumber(params.baseClearance, 'تخليص الشركة', {
    allowNegative: true,
  })
  const transport = toFiniteNumber(params.transport_diff, 'فرق النقل', {
    allowNegative: true,
  })
  const workers = toFiniteNumber(params.workers_diff, 'فرق العمال', {
    allowNegative: true,
  })
  const driver = toFiniteNumber(params.driver_diff, 'فرق السائق', {
    allowNegative: true,
  })
  const credit = toFiniteNumber(params.credit_diff, 'فرق الاعتماد', {
    allowNegative: true,
  })

  return round2(base + transport + workers + driver + credit)
}

/**
 * صافي المربح = المربح الإجمالي − مصاريف المكتب − مصاريف المنزل.
 *
 * @param {number} gross المربح الإجمالي
 * @param {number} [officeExpenses=0] مصاريف المكتب
 * @param {number} [homeExpenses=0] مصاريف المنزل
 * @returns {number} الصافي مقرّباً لمنزلتين (قد يكون سالباً)
 */
function calculateNetProfit(gross, officeExpenses = 0, homeExpenses = 0) {
  const g = toFiniteNumber(gross, 'المربح الإجمالي', { allowNegative: true })
  const office = toFiniteNumber(officeExpenses, 'مصاريف المكتب')
  const home = toFiniteNumber(homeExpenses, 'مصاريف المنزل')
  return round2(g - office - home)
}

module.exports = { calculateDailyGrossProfit, calculateNetProfit }
