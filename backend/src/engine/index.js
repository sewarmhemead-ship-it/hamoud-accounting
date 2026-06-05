/**
 * محرك الحسابات المالية — نقطة الدخول الموحّدة.
 *
 * كل المنطق المالي الحساس (الترسيم، الضريبة، الرسوم الجمركية، تحويل العملات،
 * الذمم، المربح، الطحين، هامش المخلص) معزول هنا كدوال نقيّة (pure)
 * بلا أي اعتماد على قاعدة البيانات أو الشبكة، ليكون قابلاً للاختبار بالكامل.
 *
 * الاختبارات في: backend/tests/*.test.js
 */
const { CalculationError } = require('./errors')
const { toFiniteNumber, round2 } = require('./numbers')
const {
  CLEARANCE_COST_FIELDS,
  CUSTOMS_RATE_PER_KG,
  DEFAULT_CUSTOMS_RATE_PER_KG,
  COST_FIELDS,
  PRICE_FIELDS,
  COST_FIELD_LABELS,
  PRICE_FIELD_LABELS,
  calculateShipmentTotal,
  calculateTax2Pct,
  calculateCustomsFee,
  calculateCostTotal,
  calculatePriceTotal,
  calculateShipmentProfit,
  resolveTotalCost,
} = require('./clearance')
const {
  VALIDATED_FINANCIAL_FIELDS,
  validateShipmentFinancials,
} = require('./validation')
const { convertToUsd } = require('./currency')
const { calculateCenterBalance, calculateGrandTotal } = require('./balance')
const {
  calculateDailyGrossProfit,
  calculateNetProfit,
} = require('./dailyProfit')
const { calculateFlourTraderLine } = require('./flour')
const { calculateBrokerMarginFromLines } = require('./broker')
const {
  CLEARANCE_FIELD_ORDER,
  POSTABILITY,
  POSTABILITY_LABEL,
  classifyPostability,
  detectCostColumns,
  buildBrokerStatement,
  buildDualStatement,
} = require('./statement')

module.exports = {
  CalculationError,
  // helpers
  toFiniteNumber,
  round2,
  // metadata
  CLEARANCE_COST_FIELDS,
  VALIDATED_FINANCIAL_FIELDS,
  CUSTOMS_RATE_PER_KG,
  DEFAULT_CUSTOMS_RATE_PER_KG,
  // clearance
  COST_FIELDS,
  PRICE_FIELDS,
  COST_FIELD_LABELS,
  PRICE_FIELD_LABELS,
  calculateShipmentTotal,
  calculateTax2Pct,
  calculateCustomsFee,
  calculateCostTotal,
  calculatePriceTotal,
  calculateShipmentProfit,
  resolveTotalCost,
  // validation
  validateShipmentFinancials,
  // currency
  convertToUsd,
  // balance / receivables
  calculateCenterBalance,
  calculateGrandTotal,
  // daily profit
  calculateDailyGrossProfit,
  calculateNetProfit,
  // flour / broker
  calculateFlourTraderLine,
  calculateBrokerMarginFromLines,
  // broker clearance statement (كشف المخلص)
  CLEARANCE_FIELD_ORDER,
  POSTABILITY,
  POSTABILITY_LABEL,
  classifyPostability,
  detectCostColumns,
  buildBrokerStatement,
  buildDualStatement,
}
