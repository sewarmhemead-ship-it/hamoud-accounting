const ProfitService = require('./ProfitService')
const {
  DIFF_LABELS,
  parseExpenseNotes,
  buildWaterfall,
} = require('../utils/expenseBudget')

const SettingsService = require('./SettingsService')

class DailyProfitReportService {
  buildDay(date) {
    const detail = ProfitService.getDayDetail(date)
    const expenses = parseExpenseNotes(detail.closed?.notes)
    const waterfall = buildWaterfall(detail.preview, detail.closed)

    return {
      company: SettingsService.getReportCompanyName(),
      date,
      generated_at: new Date().toISOString(),
      ...detail,
      expenses,
      waterfall,
      diff_labels: DIFF_LABELS,
    }
  }

  buildMonth(year, month) {
    const summary = ProfitService.getMonthly(year, month)
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return {
      company: SettingsService.getReportCompanyName(),
      year,
      month,
      month_prefix: prefix,
      generated_at: new Date().toISOString(),
      ...summary,
    }
  }
}

module.exports = {
  DailyProfitReportService: new DailyProfitReportService(),
}
