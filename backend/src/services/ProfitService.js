const TransactionModel = require('../models/TransactionModel')
const DailyProfitModel = require('../models/DailyProfitModel')
const { BusinessRuleError } = require('../utils/errors')
const {
  calculateDailyGrossProfit,
  calculateNetProfit,
} = require('../engine/dailyProfit')

class ProfitService {
  calculateDay(date) {
    // إيراد التخليص + عدد السيارات المُرحَّلة محسوبان مباشرةً من قيود التاجر
    // (قيد واحد لكل سيارة مُرحَّلة في اليوم) دون تحميل السيارات في الذاكرة.
    const clearance = TransactionModel.sumPostedClearancesByDate(date)
    const payments = TransactionModel.sumPaymentsByDate(date)

    const grossRevenue = clearance.total || 0

    return {
      date,
      num_trucks: clearance.count || 0,
      gross_revenue: grossRevenue,
      payments_received: payments.total || 0,
      gross_profit: grossRevenue,
    }
  }

  closeDay(date, {
    office_expenses = 0,
    home_expenses = 0,
    notes = null,
    clearance_diff = 0,
    transport_diff = 0,
    workers_diff = 0,
    driver_diff = 0,
    credit_diff = 0,
    num_trucks,
    gross_profit: manualGross,
  }, userId) {
    const existing = DailyProfitModel.findByDate(date)
    if (existing) {
      throw new BusinessRuleError('اليوم مُغلق مسبقاً — عدّل السجل الموجود')
    }

    const calc = this.calculateDay(date)
    const baseClearance = calc.gross_revenue
    const gross_profit =
      manualGross ??
      calculateDailyGrossProfit({
        baseClearance,
        clearance_diff,
        transport_diff,
        workers_diff,
        driver_diff,
        credit_diff,
      })
    const net_profit = calculateNetProfit(gross_profit, office_expenses, home_expenses)

    return DailyProfitModel.create({
      date,
      num_trucks: num_trucks ?? calc.num_trucks,
      clearance_diff,
      transport_diff,
      workers_diff,
      driver_diff,
      credit_diff,
      gross_profit,
      office_expenses,
      home_expenses,
      net_profit,
      notes,
      created_by: userId,
    })
  }

  updateDay(date, data, userId) {
    const existing = DailyProfitModel.findByDate(date)
    if (!existing) {
      throw new BusinessRuleError('لا يوجد سجل لهذا اليوم')
    }

    const diffTouched =
      data.clearance_diff !== undefined ||
      data.transport_diff !== undefined ||
      data.workers_diff !== undefined ||
      data.driver_diff !== undefined ||
      data.credit_diff !== undefined

    let gross = data.gross_profit ?? existing.gross_profit
    if (diffTouched && data.gross_profit === undefined) {
      const calc = this.calculateDay(date)
      gross = calculateDailyGrossProfit({
        baseClearance: calc.gross_revenue,
        clearance_diff: data.clearance_diff ?? existing.clearance_diff,
        transport_diff: data.transport_diff ?? existing.transport_diff,
        workers_diff: data.workers_diff ?? existing.workers_diff,
        driver_diff: data.driver_diff ?? existing.driver_diff,
        credit_diff: data.credit_diff ?? existing.credit_diff,
      })
    }

    const office = data.office_expenses ?? existing.office_expenses
    const home = data.home_expenses ?? existing.home_expenses

    return DailyProfitModel.update(existing.id, {
      ...data,
      gross_profit: gross,
      office_expenses: office,
      home_expenses: home,
      net_profit: calculateNetProfit(gross, office, home),
      updated_by: userId,
    })
  }

  getMonthly(year, month) {
    const summary = DailyProfitModel.sumMonthly(year, month)
    const days = DailyProfitModel.listDays(year, month)

    const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100
    const avg_net = summary.days_count ? round2(summary.net_profit / summary.days_count) : 0
    const avg_per_truck = summary.num_trucks ? round2(summary.gross_profit / summary.num_trucks) : 0

    let best_day = null
    let worst_day = null
    for (const d of days) {
      if (!best_day || d.net_profit > best_day.net_profit) best_day = d
      if (!worst_day || d.net_profit < worst_day.net_profit) worst_day = d
    }

    return { ...summary, avg_net, avg_per_truck, best_day, worst_day, days }
  }

  getByDate(date) {
    return DailyProfitModel.findByDate(date)
  }

  /** تفاصيل اليوم للواجهة والتقارير — لا يغيّر المحرك */
  getDayDetail(date) {
    const preview = this.calculateDay(date)
    const closed = this.getByDate(date)
    const movements = TransactionModel.listPostedClearancesByDate(date)
    const payments = TransactionModel.listPaymentsByDate(date)
    const movements_total = movements.reduce(
      (s, m) => s + (Number(m.clearance_amount) || 0),
      0
    )

    return {
      preview,
      closed,
      movements,
      payments,
      movements_total: Math.round(movements_total * 100) / 100,
      payments_total: preview.payments_received,
      is_closed: !!closed,
    }
  }
}

module.exports = new ProfitService()
