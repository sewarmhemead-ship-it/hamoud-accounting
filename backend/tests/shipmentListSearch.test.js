const { searchLiteral } = require('../src/utils/likePattern')
const { buildShipmentListFilters } = require('../src/models/shipmentListQuery')

describe('searchLiteral', () => {
  it('يزيل محارف LIKE الخاصة', () => {
    expect(searchLiteral('100%')).toBe('100')
    expect(searchLiteral('a_b')).toBe('ab')
  })

  it('يرجع null للنص الفارغ', () => {
    expect(searchLiteral('')).toBeNull()
    expect(searchLiteral('   ')).toBeNull()
  })

  it('يحافظ على العربية', () => {
    expect(searchLiteral('فراس')).toBe('فراس')
    expect(searchLiteral('الشهابي')).toBe('الشهابي')
  })
})

describe('buildShipmentListFilters', () => {
  it('يضمّن JOIN و instr عند البحث', () => {
    const { joins, where, params } = buildShipmentListFilters({ search: 'فراس' })
    expect(joins).toContain('LEFT JOIN centers c')
    expect(where).toContain('instr(COALESCE(c.name')
    expect(where).not.toContain('ESCAPE')
    expect(params.filter((p) => p === 'فراس').length).toBe(7)
  })

  it('بحث متعدد الكلمات: AND بين فراس والشهابي', () => {
    const { where, params } = buildShipmentListFilters({
      search: 'فراس   الشهابي',
      status: 'complete',
    })
    expect(where).toContain('s.status = ?')
    expect(where.split('instr(COALESCE(c.name').length - 1).toBeGreaterThanOrEqual(2)
    expect(params).toContain('complete')
    expect(params.filter((p) => p === 'فراس').length).toBe(7)
    expect(params.filter((p) => p === 'الشهابي').length).toBe(7)
  })

  it('لا يضيف شرط بحث بدون نص', () => {
    const { where, params } = buildShipmentListFilters({ status: 'posted' })
    expect(where).not.toContain('instr(')
    expect(params).toEqual(['posted'])
  })
})
