const { PERM, PERM_TEMPLATES, ALL_PERMS } = require('../src/config/permissions')

describe('صلاحيات المربح — مشرف كامل', () => {
  it('قالب صلاحيات كاملة يتضمن profit_edit_closed', () => {
    const full = PERM_TEMPLATES.find((t) => t.id === 'full')
    expect(full.perms).toContain(PERM.PROFIT_EDIT_CLOSED)
    expect(full.perms).toContain(PERM.PROFIT_CLOSE)
  })

  it('محاسب يغلق لكن لا يعدّل يوماً مُغلقاً', () => {
    const acc = PERM_TEMPLATES.find((t) => t.id === 'accountant')
    expect(acc.perms).toContain(PERM.PROFIT_CLOSE)
    expect(acc.perms).not.toContain(PERM.PROFIT_EDIT_CLOSED)
  })

  it('مستعرض لا يغلق ولا يعدّل', () => {
    const v = PERM_TEMPLATES.find((t) => t.id === 'viewer')
    expect(v.perms).not.toContain(PERM.PROFIT_CLOSE)
    expect(v.perms).not.toContain(PERM.PROFIT_EDIT_CLOSED)
  })

  it('profit_edit_closed ضمن ALL_PERMS', () => {
    expect(ALL_PERMS).toContain(PERM.PROFIT_EDIT_CLOSED)
  })
})
