const { PERM_TEMPLATES, ALL_PERMS } = require('../src/config/permissions')

function resolveNextPermissions(current, templatePerms, mode) {
  return mode === 'merge'
    ? [...new Set([...current, ...templatePerms])]
    : [...templatePerms]
}

describe('applyPermissionsTemplate', () => {
  const full = PERM_TEMPLATES.find((t) => t.id === 'full')

  it('قالب كامل يتضمن profit_edit_closed', () => {
    expect(full.perms).toContain('profit_edit_closed')
    expect(full.perms.length).toBe(ALL_PERMS.length)
  })

  it('replace يستبدل الصلاحيات القديمة', () => {
    const current = ['shipments_view']
    const next = resolveNextPermissions(current, full.perms, 'replace')
    expect(next).toContain('profit_edit_closed')
    expect(next).not.toEqual(current)
  })

  it('merge يضيف دون حذف', () => {
    const current = ['custom_perm']
    const next = resolveNextPermissions(current, full.perms, 'merge')
    expect(next).toContain('custom_perm')
    expect(next).toContain('profit_edit_closed')
  })
})
