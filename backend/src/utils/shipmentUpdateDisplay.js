const { ALL_SHIPMENT_FIELD_LABELS } = require('../config/shipmentFieldLabels')
const { COST_FIELDS, PRICE_FIELDS } = require('../engine/clearance')
const { SHIPMENT_FIELD_LABELS } = require('../config/constants')

const MONEY_FIELDS = new Set([
  ...Object.keys(SHIPMENT_FIELD_LABELS),
  ...COST_FIELDS,
  ...PRICE_FIELDS,
  'total_cost',
  'weight',
  'tax_2pct',
])

const TEXT_FIELDS = new Set(['notes', 'goods_name', 'source', 'destination', 'driver_name'])

function getFieldLabel(fieldName) {
  if (!fieldName) return 'حقل غير معروف'
  return ALL_SHIPMENT_FIELD_LABELS[fieldName] || fieldName.replace(/_/g, ' ')
}

function formatMoney(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (Number.isNaN(n)) return String(val)
  const formatted = n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `$${formatted}`
}

function formatUpdateValue(val, fieldName) {
  if (val == null || val === '') return '—'
  if (MONEY_FIELDS.has(fieldName)) return formatMoney(val)
  if (TEXT_FIELDS.has(fieldName)) return String(val).trim() || '—'
  const n = Number(val)
  if (!Number.isNaN(n) && String(val).trim() !== '') return formatMoney(val)
  return String(val)
}

function formatDateTimeDisplay(dateStr) {
  if (!dateStr) return '—'
  const raw = String(dateStr).trim()
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?/)
  if (m) return m[2] ? `${m[1]} · ${m[2].slice(0, 5)}` : m[1]
  return raw.split('T')[0] || raw
}

/**
 * تحويل سجل shipment_updates إلى نص عربي واضح للواجهة.
 */
function describeShipmentUpdate(row) {
  const field_name = row?.field_name ?? ''
  const field_label = getFieldLabel(field_name)
  const old_display = formatUpdateValue(row?.old_value, field_name)
  const new_display = formatUpdateValue(row?.new_value, field_name)
  const summary = `تم تعديل «${field_label}» من ${old_display} إلى ${new_display}`

  return {
    ...row,
    field_label,
    old_display,
    new_display,
    summary,
    updated_at_display: formatDateTimeDisplay(row?.updated_at),
  }
}

module.exports = {
  getFieldLabel,
  formatUpdateValue,
  formatDateTimeDisplay,
  describeShipmentUpdate,
  ALL_SHIPMENT_FIELD_LABELS,
}
