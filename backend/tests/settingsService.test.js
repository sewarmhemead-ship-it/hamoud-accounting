const { mergeSettings } = require('../src/config/appSettings')

describe('SettingsService — دمج بدون قاعدة', () => {
  it('عتبات التنبيهات قابلة للتخصيص دون مساس بالمحرك', () => {
    const s = mergeSettings({
      notification_wip_overdue_days: 14,
      notification_inventory_stale_days: 21,
      notification_high_balance_usd: 75000,
    })
    expect(s.notification_wip_overdue_days).toBe(14)
    expect(s.notification_inventory_stale_days).toBe(21)
    expect(s.notification_high_balance_usd).toBe(75000)
    // محرك الحساب لا يقرأ هذه الحقول — فقط NotificationService
  })

  it('default_service_fee_usd للواجهة فقط', () => {
    const s = mergeSettings({ default_service_fee_usd: 45 })
    expect(s.default_service_fee_usd).toBe(45)
  })
})
