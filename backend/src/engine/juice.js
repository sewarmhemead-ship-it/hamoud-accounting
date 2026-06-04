const { CalculationError } = require('./errors')
const { toFiniteNumber, round2 } = require('./numbers')

/**
 * حساب مربح شحنة طازج (وكالة عصير) — راجع «وكالة عصير طازج.xlsx».
 *
 * الصيغ:
 *   الوحدات المستلمة = المرسلة − الهالك
 *   تكلفة الوحدة = (رأس المال + النقل التركي + الترسيم + العمال + الاتعاب + السائق) ÷ المستلمة
 *   مربح الوحدة = سعر البيع − تكلفة الوحدة
 *   إجمالي المربح = مربح الوحدة × المستلمة
 *
 * @param {object} data
 * @param {number} data.units_sent عدد الوحدات المرسلة (> 0)
 * @param {number} [data.units_lost=0] الهالك/النقص (≥ 0 و ≤ المرسلة)
 * @param {number} [data.capital=0] رأس المال
 * @param {number} [data.turkish_transport=0] النقل التركي
 * @param {number} [data.tarseem=0] الترسيم
 * @param {number} [data.workers=0] العمال
 * @param {number} [data.clearance_fee=0] الاتعاب
 * @param {number} [data.driver_cost=0] أجار السائق
 * @param {number} data.sale_price سعر بيع الوحدة (≥ 0)
 * @returns {{ units_received:number, total_cost:number, cost_per_unit:number, profit_per_unit:number, total_profit:number }}
 */
function calculateJuiceProfit(data = {}) {
  if (data === null || typeof data !== 'object') {
    throw new CalculationError('بيانات شحنة الطازج غير صالحة')
  }

  const sent = toFiniteNumber(data.units_sent, 'العدد المرسل')
  const lost = toFiniteNumber(data.units_lost, 'الهالك')

  if (sent <= 0) {
    throw new CalculationError('العدد المرسل يجب أن يكون أكبر من صفر', {
      units_sent: sent,
    })
  }
  if (lost > sent) {
    throw new CalculationError('الهالك لا يمكن أن يتجاوز العدد المرسل', {
      units_sent: sent,
      units_lost: lost,
    })
  }

  const unitsReceived = sent - lost
  if (unitsReceived <= 0) {
    throw new CalculationError('لا توجد وحدات مستلمة لاحتساب التكلفة', {
      units_received: unitsReceived,
    })
  }

  const totalCost =
    toFiniteNumber(data.capital, 'رأس المال') +
    toFiniteNumber(data.turkish_transport, 'النقل التركي') +
    toFiniteNumber(data.tarseem, 'الترسيم') +
    toFiniteNumber(data.workers, 'العمال') +
    toFiniteNumber(data.clearance_fee, 'الاتعاب') +
    toFiniteNumber(data.driver_cost, 'أجار السائق')

  const salePrice = toFiniteNumber(data.sale_price, 'سعر البيع')

  const costPerUnit = totalCost / unitsReceived
  const profitPerUnit = salePrice - costPerUnit
  const totalProfit = profitPerUnit * unitsReceived

  return {
    units_received: unitsReceived,
    total_cost: round2(totalCost),
    cost_per_unit: round2(costPerUnit),
    profit_per_unit: round2(profitPerUnit),
    total_profit: round2(totalProfit),
  }
}

module.exports = { calculateJuiceProfit }
