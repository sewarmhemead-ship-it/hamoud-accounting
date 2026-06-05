const { isAdmin, assertAdmin, hasPermission } = require('../src/utils/accessControl')
const { ForbiddenError } = require('../src/utils/errors')
const { PERM } = require('../src/config/permissions')

describe('accessControl — صلاحيات واقعية', () => {
  const admin = { role: 'admin', permissions: [] }
  const accountant = {
    role: 'user',
    permissions: [PERM.PROFIT_VIEW, PERM.PROFIT_CLOSE, PERM.SHIPMENTS_VIEW],
  }
  const viewer = {
    role: 'user',
    permissions: [PERM.SHIPMENTS_VIEW, PERM.PROFIT_VIEW],
  }

  it('isAdmin للمشرف فقط', () => {
    expect(isAdmin(admin)).toBe(true)
    expect(isAdmin(accountant)).toBe(false)
  })

  it('assertAdmin يرمي للموظف', () => {
    expect(() => assertAdmin(accountant)).toThrow(ForbiddenError)
    expect(() => assertAdmin(admin)).not.toThrow()
  })

  it('admin يتجاوز كل الصلاحيات', () => {
    expect(hasPermission(admin, PERM.PROFIT_EDIT_CLOSED)).toBe(true)
    expect(hasPermission(admin, PERM.INVENTORY_MANAGE)).toBe(true)
  })

  it('محاسب يغلق المربح ولا يعدّل يوماً مُغلقاً', () => {
    expect(hasPermission(accountant, PERM.PROFIT_CLOSE)).toBe(true)
    expect(hasPermission(accountant, PERM.PROFIT_EDIT_CLOSED)).toBe(false)
  })

  it('مستعرض قراءة فقط', () => {
    expect(hasPermission(viewer, PERM.PROFIT_VIEW)).toBe(true)
    expect(hasPermission(viewer, PERM.PROFIT_CLOSE)).toBe(false)
    expect(hasPermission(viewer, PERM.PAYMENTS_CREATE)).toBe(false)
  })
})
