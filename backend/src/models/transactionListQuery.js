const { searchTokens } = require('../utils/searchNormalize')

const TX_LIST_JOINS = `
  FROM transactions t
  LEFT JOIN centers c ON c.id = t.center_id
  LEFT JOIN shipments s ON s.id = t.shipment_id
  LEFT JOIN users u ON u.id = t.created_by
`

const SEARCH_MATCH = `(
  instr(COALESCE(t.ref_number, ''), ?) > 0
  OR instr(COALESCE(t.notes, ''), ?) > 0
  OR instr(COALESCE(t.category, ''), ?) > 0
  OR instr(COALESCE(c.name, ''), ?) > 0
  OR instr(COALESCE(s.ref_number, ''), ?) > 0
  OR instr(COALESCE(s.goods_name, ''), ?) > 0
)`

function buildTransactionListFilters(filters = {}) {
  const conditions = ['t.is_deleted = 0']
  const params = []

  if (filters.center_id) {
    conditions.push('t.center_id = ?')
    params.push(filters.center_id)
  }
  if (filters.type) {
    conditions.push('t.type = ?')
    params.push(filters.type)
  }
  if (filters.category) {
    conditions.push('t.category = ?')
    params.push(filters.category)
  }
  if (filters.from) {
    conditions.push('t.date >= ?')
    params.push(filters.from)
  }
  if (filters.to) {
    conditions.push('t.date <= ?')
    params.push(filters.to)
  }
  if (filters.is_delivered !== undefined && filters.is_delivered !== null) {
    conditions.push('t.is_delivered = ?')
    params.push(filters.is_delivered ? 1 : 0)
  }
  if (filters.shipment_id) {
    conditions.push('t.shipment_id = ?')
    params.push(filters.shipment_id)
  }

  const tokens = searchTokens(filters.search)
  for (const token of tokens) {
    conditions.push(SEARCH_MATCH)
    for (let i = 0; i < 6; i++) params.push(token)
  }

  return {
    joins: TX_LIST_JOINS,
    where: conditions.join(' AND '),
    params,
  }
}

module.exports = {
  TX_LIST_JOINS,
  SEARCH_MATCH,
  buildTransactionListFilters,
}
