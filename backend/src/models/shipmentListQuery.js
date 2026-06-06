const { searchLiteral } = require('../utils/likePattern')
const { searchTokens } = require('../utils/searchNormalize')

const SHIPMENT_LIST_JOINS = `
  FROM shipments s
  LEFT JOIN centers c ON c.id = s.center_id
  LEFT JOIN centers cb ON cb.id = s.clearance_center_id
  LEFT JOIN borders b ON b.id = s.border_id
  LEFT JOIN goods_types gt ON gt.id = s.goods_type_id
`

/** بحث جزئي عبر instr — يعمل مع العربية بدون ESCAPE */
const SEARCH_MATCH = `(
  instr(COALESCE(s.ref_number, ''), ?) > 0
  OR instr(COALESCE(s.goods_name, ''), ?) > 0
  OR instr(COALESCE(c.name, ''), ?) > 0
  OR instr(COALESCE(cb.name, ''), ?) > 0
  OR instr(COALESCE(s.driver_name, ''), ?) > 0
  OR instr(COALESCE(s.source, ''), ?) > 0
  OR instr(COALESCE(s.destination, ''), ?) > 0
)`

/**
 * بناء WHERE ومعاملات قائمة السيارات (نفس JOIN للعدّ والصفوف).
 */
function buildShipmentListFilters(filters = {}) {
  const conditions = ['s.is_deleted = 0']
  const params = []

  if (filters.center_id) {
    conditions.push('s.center_id = ?')
    params.push(filters.center_id)
  }
  if (filters.status_in?.length) {
    const placeholders = filters.status_in.map(() => '?').join(', ')
    conditions.push(`s.status IN (${placeholders})`)
    params.push(...filters.status_in)
  } else if (filters.status) {
    conditions.push('s.status = ?')
    params.push(filters.status)
  }
  if (filters.clearance_center_id) {
    conditions.push('s.clearance_center_id = ?')
    params.push(filters.clearance_center_id)
  }
  if (filters.from) {
    conditions.push('s.entry_date >= ?')
    params.push(filters.from)
  }
  if (filters.to) {
    conditions.push('s.entry_date <= ?')
    params.push(filters.to)
  }

  const tokens = searchTokens(filters.search)
  for (const token of tokens) {
    const literal = searchLiteral(token)
    if (!literal) continue
    conditions.push(SEARCH_MATCH)
    for (let i = 0; i < 7; i++) params.push(literal)
  }

  return {
    joins: SHIPMENT_LIST_JOINS,
    where: conditions.join(' AND '),
    params,
  }
}

module.exports = {
  SHIPMENT_LIST_JOINS,
  SEARCH_MATCH,
  buildShipmentListFilters,
}
