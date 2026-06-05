const { DEFAULT_APP_SETTINGS } = require('../config/appSettings')

/** اسم الشركة في التقارير — لا يحمّل SQLite عند الاستيراد */
function getReportCompanyName() {
  try {
    const SettingsService = require('../services/SettingsService')
    return SettingsService.getReportCompanyName()
  } catch {
    return DEFAULT_APP_SETTINGS.company_name_ar
  }
}

module.exports = { getReportCompanyName }
