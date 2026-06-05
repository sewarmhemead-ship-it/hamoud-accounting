const { SHIPMENT_FIELD_LABELS } = require('../config/constants')
const { COST_FIELD_LABELS, PRICE_FIELD_LABELS, COST_FIELDS, PRICE_FIELDS } = require('./clearance')
const { CalculationError } = require('./errors')
const { toFiniteNumber } = require('./numbers')

const VALIDATED_FINANCIAL_FIELDS = [
  'tarseem',
  'tax_2pct',
  'service_fee',
  'workers',
  'clearance_fee',
  'syrian_driver',
  'turkish_transport',
  'internal_transport',
  'door_receipt',
  'other_expenses',
]

const VALIDATED_DUAL_FIELDS = [...COST_FIELDS, ...PRICE_FIELDS]

/**
 * يتحقق أن كل قلم مالي مُدخل رقم منتهٍ غير سالب.
 * يشمل الحقول الكلاسيكية والحقول المزدوجة (cost_* / price_*).
 * الأقلام الغائبة (null/undefined) مسموحة — السيارة قد تكون قيد الإكمال.
 */
function validateShipmentFinancials(data = {}) {
  if (data === null || typeof data !== 'object') {
    throw new CalculationError('بيانات السيارة غير صالحة')
  }

  for (const field of VALIDATED_FINANCIAL_FIELDS) {
    if (data[field] === null || data[field] === undefined) continue
    toFiniteNumber(data[field], SHIPMENT_FIELD_LABELS[field] || field)
  }

  for (const field of VALIDATED_DUAL_FIELDS) {
    if (data[field] === null || data[field] === undefined) continue
    const label = COST_FIELD_LABELS[field] || PRICE_FIELD_LABELS[field] || field
    toFiniteNumber(data[field], label)
  }

  return true
}

module.exports = { VALIDATED_FINANCIAL_FIELDS, validateShipmentFinancials }
