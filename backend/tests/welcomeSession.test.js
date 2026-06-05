const {
  buildWelcomeSession,
  resolveLandingPath,
  detectMatchedTemplate,
} = require('../src/utils/welcomeSession')
const { PERM, PERM_TEMPLATES } = require('../src/config/permissions')

describe('welcomeSession — ترحيب مربوط بالصلاحيات', () => {
  const accountantTemplate = PERM_TEMPLATES.find((t) => t.id === 'accountant')

  const accountant = {
    id: 2,
    username: 'acc',
    name: 'محاسب',
    role: 'user',
    permissions: [...accountantTemplate.perms],
  }

  const viewer = {
    id: 3,
    username: 'view',
    name: 'مستعرض',
    role: 'user',
    permissions: PERM_TEMPLATES.find((t) => t.id === 'viewer').perms,
  }

  const admin = {
    id: 1,
    username: 'admin',
    name: 'مدير',
    role: 'admin',
    permissions: [],
  }

  it('يكتشف قالب المحاسب عند تطابق الصلاحيات', () => {
    const t = detectMatchedTemplate(accountant.permissions, 'user')
    expect(t?.id).toBe('accountant')
  })

  it('محاسب يهبط على المربح عند وجود profit_view', () => {
    expect(resolveLandingPath(accountant)).toBe('/profit')
  })

  it('مستعرض بدون profit_close يهبط على السيارات أو المراكز', () => {
    const path = resolveLandingPath(viewer)
    expect(['/shipments', '/centers', '/profit', '/reports']).toContain(path)
  })

  it('المدير يهبط على اللوحة', () => {
    expect(resolveLandingPath(admin)).toBe('/')
  })

  it('buildWelcomeSession يعيد مجموعات صلاحيات معرّفة', () => {
    const w = buildWelcomeSession(accountant)
    expect(w.greeting).toBe('محاسب')
    expect(w.role_label).toBe('محاسب')
    expect(w.template?.id).toBe('accountant')
    expect(w.permission_count).toBe(accountantTemplate.perms.length)
    expect(w.permission_groups.length).toBeGreaterThan(0)
    expect(w.permission_groups.some((g) => g.label === 'المالية')).toBe(true)
    expect(w.landing_path).toBe('/profit')
    expect(w.quick_links.length).toBeGreaterThan(0)
  })

  it('المدير يحصل على قالب كامل وكل المجموعات', () => {
    const w = buildWelcomeSession(admin)
    expect(w.role_label).toBe('مدير النظام')
    expect(w.template?.id).toBe('full')
    expect(w.permission_groups.length).toBeGreaterThan(3)
  })

  it('صلاحيات مخصصة بلا قالب — template null', () => {
    const custom = {
      ...accountant,
      permissions: [PERM.SHIPMENTS_VIEW, PERM.CENTERS_VIEW],
    }
    const w = buildWelcomeSession(custom)
    expect(w.template).toBeNull()
    expect(resolveLandingPath(custom)).toBe('/shipments')
  })
})
