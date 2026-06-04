const { calculateShipmentTotal } = require('./clearance')
const { round2 } = require('./numbers')

/**
 * هامش الشركة بين كشف المخلص وكشف التاجر لنفس الخدمة.
 * (راجع «مخلص باب الهوى.xlsx» — ورقتان: ما يُدفع للمخلص مقابل ما يؤخذ من التاجر)
 *
 *   تكلفة المخلص = مجموع أقلام كشف المخلص
 *   فاتورة التاجر = مجموع أقلام كشف التاجر
 *   الهامش = فاتورة التاجر − تكلفة المخلص  (ربح الشركة على الخدمات)
 *
 * @param {object} brokerLine أقلام كشف المخلص (نفس حقول السيارة المالية)
 * @param {object} traderLine أقلام كشف التاجر
 * @returns {{ broker_total:number, trader_total:number, margin:number }}
 */
function calculateBrokerMarginFromLines(brokerLine = {}, traderLine = {}) {
  const brokerTotal = calculateShipmentTotal(brokerLine)
  const traderTotal = calculateShipmentTotal(traderLine)

  return {
    broker_total: brokerTotal,
    trader_total: traderTotal,
    margin: round2(traderTotal - brokerTotal),
  }
}

module.exports = { calculateBrokerMarginFromLines }
