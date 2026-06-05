const {
  DEFAULT_APP_SETTINGS,
  mergeSettings,
  validateSettingsPatch,
  brandingFromSettings,
} = require('../src/config/appSettings')

describe('appSettings', () => {
  it('mergeSettings يملأ الافتراضيات', () => {
    const s = mergeSettings({})
    expect(s.company_name_ar).toBe(DEFAULT_APP_SETTINGS.company_name_ar)
    expect(s.notification_wip_overdue_days).toBe(7)
  })

  it('mergeSettings يقبل قيم محفوظة', () => {
    const s = mergeSettings({
      company_name_ar: 'شركة تجريبية',
      notification_wip_overdue_days: 10,
    })
    expect(s.company_name_ar).toBe('شركة تجريبية')
    expect(s.notification_wip_overdue_days).toBe(10)
  })

  it('validateSettingsPatch يرفض حقول غير معروفة', () => {
    const { errors } = validateSettingsPatch({ tax_rate: 0.5 })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('validateSettingsPatch يرفض أيام غير منطقية', () => {
    const { errors } = validateSettingsPatch({ notification_wip_overdue_days: 0 })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('validateSettingsPatch يقبل تحديثاً صالحاً', () => {
    const { settings, errors } = validateSettingsPatch({
      app_title: 'حمود برو',
      notification_high_balance_usd: 100000,
    })
    expect(errors).toHaveLength(0)
    expect(settings.app_title).toBe('حمود برو')
    expect(settings.notification_high_balance_usd).toBe(100000)
  })

  it('brandingFromSettings يعيد حقول العرض فقط', () => {
    const b = brandingFromSettings(mergeSettings({ app_title: 'X' }))
    expect(b.app_title).toBe('X')
    expect(b).not.toHaveProperty('notification_wip_overdue_days')
  })

  it('mergeSettings يدمج إعدادات النسخ الاحتياطي', () => {
    const s = mergeSettings({
      backup_auto_enabled: true,
      backup_interval_hours: 2,
      backup_include_db: false,
    })
    expect(s.backup_auto_enabled).toBe(true)
    expect(s.backup_interval_hours).toBe(2)
    expect(s.backup_include_db).toBe(false)
  })

  it('validateSettingsPatch يرفض فترة نسخ غير صالحة', () => {
    const bad = validateSettingsPatch({ backup_interval_hours: 0.3 })
    expect(bad.errors.length).toBeGreaterThan(0)
    const high = validateSettingsPatch({ backup_interval_hours: 25 })
    expect(high.errors.length).toBeGreaterThan(0)
  })

  it('validateSettingsPatch يقبل إعدادات نسخ صالحة', () => {
    const { settings, errors } = validateSettingsPatch({
      backup_auto_enabled: true,
      backup_interval_hours: 1.5,
      backup_include_db: false,
    })
    expect(errors).toHaveLength(0)
    expect(settings.backup_auto_enabled).toBe(true)
    expect(settings.backup_interval_hours).toBe(1.5)
    expect(settings.backup_include_db).toBe(false)
  })
})
