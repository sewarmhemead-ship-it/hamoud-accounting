const AuthService = require('../src/services/AuthService')
const { createAuthTestDb, destroyAuthTestDb } = require('./helpers/authTestDb')
const { PERM } = require('../src/config/permissions')

describe('AuthService.login — دخول وترحيب حقيقي', () => {
  let db
  let password

  beforeEach(async () => {
    const ctx = await createAuthTestDb()
    db = ctx.db
    password = ctx.password
  })

  afterEach(() => {
    destroyAuthTestDb(db)
  })

  it('يرفض كلمة مرور خاطئة', async () => {
    await expect(AuthService.login('acc', 'wrong')).rejects.toThrow(
      /غير صحيحة/
    )
  })

  it('محاسب يستلم token وصلاحيات وwelcome مربوط بالقالب', async () => {
    const result = await AuthService.login('acc', password)
    expect(result.token).toBeTruthy()
    expect(result.user.permissions).toContain(PERM.PROFIT_VIEW)
    expect(result.user.permissions).toContain(PERM.PAYMENTS_CREATE)
    expect(result.welcome).toBeDefined()
    expect(result.welcome.template?.id).toBe('accountant')
    expect(result.welcome.landing_path).toBe('/profit')
    expect(result.welcome.permission_groups.length).toBeGreaterThan(0)
  })

  it('مدير يستلم كل الصلاحيات في التوكن', async () => {
    const result = await AuthService.login('admin', password)
    expect(result.user.role).toBe('admin')
    expect(result.user.permissions.length).toBeGreaterThan(10)
    expect(result.welcome.role_label).toBe('مدير النظام')
    expect(result.welcome.landing_path).toBe('/')
  })

  it('مستعرض welcome بدون إغلاق يوم', async () => {
    const result = await AuthService.login('view', password)
    expect(result.user.permissions).not.toContain(PERM.PROFIT_CLOSE)
    expect(result.welcome.template?.id).toBe('viewer')
  })
})
