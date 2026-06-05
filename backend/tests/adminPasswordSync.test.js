const AuthService = require('../src/services/AuthService')
const { createAuthTestDb, destroyAuthTestDb } = require('./helpers/authTestDb')
const { syncAdminPasswordFromEnv } = require('../src/database/seeds/users')

describe('syncAdminPasswordFromEnv', () => {
  let db

  beforeEach(async () => {
    const ctx = await createAuthTestDb()
    db = ctx.db
  })

  afterEach(() => {
    delete process.env.ADMIN_PASSWORD
    destroyAuthTestDb(db)
  })

  it('يحدّث كلمة مرور admin عند ضبط ADMIN_PASSWORD', async () => {
    process.env.ADMIN_PASSWORD = 'railway-secret-99'
    const ok = await syncAdminPasswordFromEnv()
    expect(ok).toBe(true)
    const result = await AuthService.login('admin', 'railway-secret-99')
    expect(result.user.role).toBe('admin')
    await expect(AuthService.login('admin', 'admin123')).rejects.toThrow(/غير صحيحة/)
  })
})
