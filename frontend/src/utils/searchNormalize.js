export function normalizeSearchQuery(q) {
  return String(q ?? '')
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatShipmentRoutePart(value) {
  if (value == null || value === '') return null
  const s = String(value).trim()
  if (!s || /^[?\s]+$/.test(s)) return null
  return s
}

export function formatShipmentRoute(goods_name, source, destination) {
  const parts = [goods_name, source, destination]
    .map(formatShipmentRoutePart)
    .filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}
