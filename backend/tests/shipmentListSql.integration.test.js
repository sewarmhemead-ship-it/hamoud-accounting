/**
 * تحقق من اتساق SQL البحث (بدون تحميل better-sqlite3 — يتجنب تعارض إصدار Node في CI).
 */
const { buildShipmentListFilters } = require('../src/models/shipmentListQuery')

function buildQueries(filters) {
  const { joins, where, params } = buildShipmentListFilters(filters)
  const countSql = `SELECT COUNT(*) AS count ${joins} WHERE ${where}`
  const rowsSql = `SELECT s.id ${joins} WHERE ${where} LIMIT ? OFFSET ?`
  return { countSql, rowsSql, params, joins, where }
}

describe('shipmentListSql integration (SQL contract)', () => {
  it('COUNT و SELECT يستخدمان نفس JOIN و WHERE مع العربية', () => {
    const { countSql, rowsSql, params, joins, where } = buildQueries({
      search: 'فراس',
      status: 'complete',
    })
    expect(joins).toContain('LEFT JOIN centers c')
    expect(where).toContain('instr(COALESCE(c.name')
    expect(where).not.toContain('ESCAPE')
    expect(where).not.toContain('LIKE')
    expect(countSql).toContain(joins.trim())
    expect(rowsSql).toContain(joins.trim())
    const placeholders = (where.match(/\?/g) || []).length
    expect(placeholders).toBe(params.length)
    expect(params).toContain('complete')
    expect(params.filter((p) => p === 'فراس').length).toBe(7)
  })

  it('بحث متعدد الكلمات — عدد المعاملات صحيح', () => {
    const { where, params } = buildQueries({ search: 'فراس الشهابي' })
    const tokenBlocks = (where.match(/instr\(COALESCE\(c\.name/g) || []).length
    expect(tokenBlocks).toBe(2)
    expect(params.filter((p) => p === 'فراس').length).toBe(7)
    expect(params.filter((p) => p === 'الشهابي').length).toBe(7)
  })

  it('حرف عربي واحد لا يكسر بناء الاستعلام', () => {
    const { where, params } = buildQueries({ search: 'ر' })
    expect(where).toContain('instr(')
    expect(params).toEqual(['ر', 'ر', 'ر', 'ر', 'ر', 'ر', 'ر'])
  })
})
