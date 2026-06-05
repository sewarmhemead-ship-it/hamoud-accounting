const { buildTransactionListFilters } = require('../src/models/transactionListQuery')

describe('buildTransactionListFilters', () => {
  it('يبني JOIN للمركز والسيارة', () => {
    const { joins, where } = buildTransactionListFilters({})
    expect(joins).toContain('LEFT JOIN centers c')
    expect(joins).toContain('LEFT JOIN shipments s')
    expect(where).toContain('t.is_deleted = 0')
  })

  it('يدعم بحث عربي متعدد الكلمات', () => {
    const { where, params } = buildTransactionListFilters({ search: 'فراس دفعة' })
    expect(params).toContain('فراس')
    expect(params).toContain('دفعة')
    expect(where.split('instr').length).toBeGreaterThan(2)
  })

  it('يفلتر بالتصنيف والنوع', () => {
    const { where, params } = buildTransactionListFilters({
      type: 'out',
      category: 'clearance',
      center_id: 3,
    })
    expect(where).toContain("t.type = ?")
    expect(where).toContain("t.category = ?")
    expect(params).toEqual(expect.arrayContaining(['out', 'clearance', 3]))
  })
})
