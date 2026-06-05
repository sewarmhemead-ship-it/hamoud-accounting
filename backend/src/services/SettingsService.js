const SettingsModel = require('../models/SettingsModel')
const {
  DEFAULT_APP_SETTINGS,
  mergeSettings,
  validateSettingsPatch,
  brandingFromSettings,
} = require('../config/appSettings')

let cache = null
let cacheAt = 0
const CACHE_MS = 5_000
const BACKUP_KEYS = new Set(['backup_auto_enabled', 'backup_interval_hours', 'backup_include_db'])

class SettingsService {
  /** إعدادات مدمجة (افتراضي + قاعدة) */
  get() {
    const now = Date.now()
    if (cache && now - cacheAt < CACHE_MS) return cache
    SettingsModel.ensureTable()
    const stored = SettingsModel.getAll()
    cache = mergeSettings(stored)
    cacheAt = now
    return cache
  }

  getFromMap(stored) {
    return mergeSettings(stored)
  }

  invalidate() {
    cache = null
    cacheAt = 0
  }

  getBranding() {
    return brandingFromSettings(this.get())
  }

  getReportCompanyName() {
    return this.get().company_name_ar || DEFAULT_APP_SETTINGS.company_name_ar
  }

  getReportFooter() {
    const s = this.get()
    const parts = [s.report_footer, s.company_phone, s.company_address].filter(Boolean)
    return parts.join(' · ')
  }

  update(patch, userId) {
    const { settings: validated, errors } = validateSettingsPatch(patch)
    if (errors.length) {
      const err = new Error(errors.join('؛ '))
      err.name = 'ValidationError'
      err.errors = errors
      throw err
    }
    if (!Object.keys(validated).length) {
      return this.get()
    }
    SettingsModel.setMany(validated, userId)
    this.invalidate()
    if (Object.keys(validated).some((k) => BACKUP_KEYS.has(k))) {
      try {
        const BackupScheduler = require('./BackupScheduler')
        BackupScheduler.reschedule()
      } catch {
        /* scheduler optional during tests */
      }
    }
    return this.get()
  }
}

module.exports = new SettingsService()
