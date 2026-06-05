import { FIELD_LABELS } from '../constants'
import { formatCurrency } from './format'

const MONEY_FIELD_RE = /^(cost_|price_|tarseem|tax_|service_|workers|clearance_|syrian_|turkish_|internal_|door_|other_|total_)/

export function getShipmentFieldLabel(fieldName) {
  if (!fieldName) return 'حقل غير معروف'
  return FIELD_LABELS[fieldName] || fieldName.replace(/_/g, ' ')
}

export function formatUpdateDisplayValue(val, fieldName) {
  if (val == null || val === '') return '—'
  if (fieldName === 'notes' || fieldName === 'goods_name' || fieldName === 'source' || fieldName === 'destination' || fieldName === 'driver_name') {
    return String(val).trim() || '—'
  }
  if (MONEY_FIELD_RE.test(fieldName) || typeof val === 'number' || /^-?\d+(\.\d+)?$/.test(String(val))) {
    return formatCurrency(val)
  }
  return String(val)
}

export function formatUpdateDateTime(dateStr) {
  if (!dateStr) return '—'
  const raw = String(dateStr).trim()
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?/)
  if (m) return m[2] ? `${m[1]} · ${m[2].slice(0, 5)}` : m[1]
  return raw.split('T')[0] || raw
}

export function describeShipmentUpdate(row) {
  const field_name = row?.field_name ?? ''
  const field_label = row.field_label || getShipmentFieldLabel(field_name)
  const old_display = row.old_display ?? formatUpdateDisplayValue(row?.old_value, field_name)
  const new_display = row.new_display ?? formatUpdateDisplayValue(row?.new_value, field_name)
  const summary =
    row.summary || `تم تعديل «${field_label}» من ${old_display} إلى ${new_display}`

  return {
    ...row,
    field_label,
    old_display,
    new_display,
    summary,
    updated_at_display: row.updated_at_display || formatUpdateDateTime(row?.updated_at),
  }
}
