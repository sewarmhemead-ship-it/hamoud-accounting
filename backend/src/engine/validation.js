const { SHIPMENT_FIELD_LABELS } = require('../config/constants')
const { CalculationError } = require('./errors')
const { toFiniteNumber } = require('./numbers')

/**
 * الحقول المالية التي يجب التحقق منها قبل الحفظ/الترحيل.
 */
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

/**
 * يتحقق أن كل قلم مالي مُدخل رقم منتهٍ غير سالب.
 * الأقلام الغائبة (null/undefined) مسموحة لأن السيارة قد تكون قيد الإكمال.
 * يرمي CalculationError عند أول قيمة غير صالحة.
 *
 * @param {object} data بيانات السيارة (أو تحديث جزئي)
 * @returns {true}
 */
function validateShipmentFinancials(data = {}) {
  if (data === null || typeof data !== 'object') {
    throw new CalculationError('بيانات السيارة غير صالحة')
  }

  for (const field of VALIDATED_FINANCIAL_FIELDS) {
    if (data[field] === null || data[field] === undefined) continue
    const label = SHIPMENT_FIELD_LABELS[field] || field
    // toFiniteNumber يرمي عند NaN/نص/سالب — وهو بالضبط ما نريد التحقق منه
    toFiniteNumber(data[field], label)
  }

  return true
}

module.exports = { VALIDATED_FINANCIAL_FIELDS, validateShipmentFinancials }
