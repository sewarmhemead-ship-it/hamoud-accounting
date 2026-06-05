const { userHasPerm, SEVERITY_ORDER } = require('../src/utils/notificationAuth')
const { PERM } = require('../src/config/permissions')

describe('NotificationService', () => {
  it('admin يملك كل الصلاحيات', () => {
    expect(userHasPerm({ role: 'admin' }, PERM.PROFIT_CLOSE)).toBe(true)
  })

  it('موظف بدون صلاحية يُرفض', () => {
    expect(
      userHasPerm({ role: 'user', permissions: [PERM.SHIPMENTS_VIEW] }, PERM.PROFIT_VIEW)
    ).toBe(false)
  })

  it('موظف بصلاحية محددة يُقبل', () => {
    expect(
      userHasPerm({ role: 'user', permissions: [PERM.PROFIT_VIEW] }, PERM.PROFIT_VIEW)
    ).toBe(true)
  })

  it('ترتيب الخطورة: danger قبل info', () => {
    expect(SEVERITY_ORDER.danger).toBeLessThan(SEVERITY_ORDER.info)
  })
})
