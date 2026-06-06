const { SHIPMENT_FIELD_LABELS } = require('../config/constants')
const {
  COST_FIELDS,
  PRICE_FIELDS,
  resolveTotalCost,
} = require('./clearance')

/** أزواج الأقلام الأساسية للكشف المزدوج — تفعيل المسار المزدوج فقط عند وجود قيمة حقيقية */
const DUAL_LEDGER_SIGNAL_FIELDS = [
  'cost_tarseem',
  'price_tarseem',
  'cost_clearance_fee',
  'price_clearance_fee',
  'cost_turkish_driver',
  'price_syrian_driver',
]

const REQUIRED_DUAL_MAP = {
  tarseem: ['cost_tarseem', 'price_tarseem'],
  clearance_fee: ['cost_clearance_fee', 'price_clearance_fee'],
  syrian_driver: ['price_syrian_driver', 'cost_turkish_driver'],
}

function hasActiveDualLedger(shipment = {}) {
  return DUAL_LEDGER_SIGNAL_FIELDS.some((field) => {
    const v = shipment[field]
    return v !== null && v !== undefined && Number(v) > 0
  })
}

function isRequiredFieldPresent(shipment, legacyField) {
  const legacy = shipment[legacyField]
  if (legacy !== null && legacy !== undefined && Number(legacy) > 0) {
    return true
  }
  const alts = REQUIRED_DUAL_MAP[legacyField] || []
  return alts.some((f) => {
    const v = shipment[f]
    return v !== null && v !== undefined && Number(v) > 0
  })
}

function missingRequiredFields(shipment, requiredFields) {
  return requiredFields
    .filter((f) => !isRequiredFieldPresent(shipment, f))
    .map((f) => SHIPMENT_FIELD_LABELS[f] || f)
}

/** يعكس الأقلام الإلزامية الكلاسيكية من أعمدة cost و price لتوحيد الاكتمال والكشوف. */
function syncLegacyFromDual(financial = {}, dual = {}) {
  const out = { ...financial }

  if (
    out.tarseem == null &&
    (dual.cost_tarseem != null || dual.price_tarseem != null)
  ) {
    out.tarseem = dual.cost_tarseem ?? dual.price_tarseem
  }
  if (
    out.clearance_fee == null &&
    (dual.cost_clearance_fee != null || dual.price_clearance_fee != null)
  ) {
    out.clearance_fee = dual.cost_clearance_fee ?? dual.price_clearance_fee
  }
  if (
    out.syrian_driver == null &&
    (dual.price_syrian_driver != null || dual.cost_turkish_driver != null)
  ) {
    out.syrian_driver = dual.price_syrian_driver ?? dual.cost_turkish_driver
  }

  return out
}

function brokerShipmentValue(shipment) {
  return resolveTotalCost(shipment).clearanceAmount
}

function traderShipmentValue(shipment) {
  return resolveTotalCost(shipment).traderAmount
}

function shipmentHasDualData(shipment = {}) {
  return hasActiveDualLedger(shipment)
}

module.exports = {
  DUAL_LEDGER_SIGNAL_FIELDS,
  REQUIRED_DUAL_MAP,
  hasActiveDualLedger,
  isRequiredFieldPresent,
  missingRequiredFields,
  syncLegacyFromDual,
  brokerShipmentValue,
  traderShipmentValue,
  shipmentHasDualData,
  COST_FIELDS,
  PRICE_FIELDS,
}
