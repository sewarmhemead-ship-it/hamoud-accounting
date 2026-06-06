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

  const legacyEmpty = (v) => v == null || Number(v) <= 0

  if (
    legacyEmpty(out.tarseem) &&
    (dual.cost_tarseem != null || dual.price_tarseem != null)
  ) {
    out.tarseem = dual.cost_tarseem ?? dual.price_tarseem
  }
  if (
    legacyEmpty(out.clearance_fee) &&
    (dual.cost_clearance_fee != null || dual.price_clearance_fee != null)
  ) {
    out.clearance_fee = dual.cost_clearance_fee ?? dual.price_clearance_fee
  }
  if (
    legacyEmpty(out.syrian_driver) &&
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

/** يبني patch لأعمدة legacy من cost/price عندما تكون مملوءة والقديمة فارغة */
function buildLegacySyncPatch(shipment = {}) {
  if (!hasActiveDualLedger(shipment)) return {}

  const financial = {}
  const dual = {}
  for (const f of ['tarseem', 'syrian_driver', 'clearance_fee']) {
    const v = shipment[f]
    if (v !== undefined && v !== null && Number(v) > 0) financial[f] = v
  }
  for (const f of [...COST_FIELDS, ...PRICE_FIELDS]) {
    if (shipment[f] !== undefined && shipment[f] !== null) dual[f] = shipment[f]
  }

  const synced = syncLegacyFromDual(financial, dual)
  const patch = {}
  for (const f of ['tarseem', 'syrian_driver', 'clearance_fee']) {
    const cur = shipment[f]
    const next = synced[f]
    if (
      (cur == null || Number(cur) <= 0) &&
      next != null &&
      Number(next) > 0
    ) {
      patch[f] = next
    }
  }

  if (Object.keys(patch).length > 0) {
    const merged = { ...shipment, ...patch }
    patch.total_cost = resolveTotalCost(merged).traderAmount
  }

  return patch
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
  buildLegacySyncPatch,
  COST_FIELDS,
  PRICE_FIELDS,
}
