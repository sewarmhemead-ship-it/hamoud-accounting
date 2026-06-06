const DailyProfitModel = require('../models/DailyProfitModel')
const ShipmentModel = require('../models/ShipmentModel')
const { BusinessRuleError } = require('../utils/errors')
const { round2 } = require('../engine/numbers')

const SettingsService = require('./SettingsService')

function sumProfitDays(days) {
  return days.reduce(
    (acc, d) => ({
      days_count: acc.days_count + 1,
      gross_profit: round2(acc.gross_profit + (d.gross_profit || 0)),
      office_expenses: round2(acc.office_expenses + (d.office_expenses || 0)),
      home_expenses: round2(acc.home_expenses + (d.home_expenses || 0)),
      net_profit: round2(acc.net_profit + (d.net_profit || 0)),
      num_trucks: acc.num_trucks + (d.num_trucks || 0),
    }),
    {
      days_count: 0,
      gross_profit: 0,
      office_expenses: 0,
      home_expenses: 0,
      net_profit: 0,
      num_trucks: 0,
    }
  )
}

class PeriodReportService {
  /**
   * تقرير فترة: أيام مُغلقة (daily_profit.date) + شحنات (shipments.entry_date)
   */
  build({ from, to }) {
    if (!from || !to) {
      throw new BusinessRuleError('من تاريخ وإلى تاريخ مطلوبان')
    }
    if (from > to) {
      throw new BusinessRuleError('«من تاريخ» يجب أن يكون قبل «إلى تاريخ»')
    }

    const profitDays = DailyProfitModel.listByRange(from, to)
    const profitTotals = sumProfitDays(profitDays)

    const byStatus = ShipmentModel.summarizeByStatusInRange(from, to)
    const pendingMerged = {
      count: (byStatus.pending?.count || 0) + (byStatus.complete?.count || 0),
      total: round2((byStatus.pending?.total || 0) + (byStatus.complete?.total || 0)),
    }
    const statusSummary = {
      pending: pendingMerged,
      posted: byStatus.posted || { count: 0, total: 0 },
      delivered: byStatus.delivered || { count: 0, total: 0 },
    }
    let shipmentCount = 0
    let shipmentValue = 0
    for (const row of Object.values(statusSummary)) {
      shipmentCount += row.count
      shipmentValue = round2(shipmentValue + row.total)
    }

    const { rows, total } = ShipmentModel.listWithDetails({
      filters: { from, to },
      orderBy: 'entry_date ASC',
      limit: 5000,
      offset: 0,
    })

    return {
      company: SettingsService.getReportCompanyName(),
      range: { from, to },
      generated_at: new Date().toISOString(),
      profit: {
        days: profitDays,
        totals: profitTotals,
      },
      shipments: {
        by_status: statusSummary,
        totals: { count: total, total_value: shipmentValue },
        rows,
      },
    }
  }
}

module.exports = new PeriodReportService()
