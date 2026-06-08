const TransactionModel = require('../models/TransactionModel')
const DailyProfitModel = require('../models/DailyProfitModel')
const AccountingService = require('./AccountingService')
const { BusinessRuleError } = require('../utils/errors')
const { generateRef } = require('../utils/refGenerator')
const { REF_PREFIX } = require('../config/constants')
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
    // أساس المربح اليومي = مجموع «مربحنا» (ما نأخذه من التاجر) للسيارات المُرحَّلة باليوم
    const profitBasis = clearance.profit_total || 0

    return {
      date,
      num_trucks: clearance.count || 0,
      gross_revenue: grossRevenue,
      payments_received: payments.total || 0,
      gross_profit: profitBasis,
    }
  }

  /**
   * ينفّذ خصم بنود الميزانية المرتبطة بمركز (تاجر/مخلص) كقيود «مصروف» وارد تخفّض
   * رصيد المركز. يضع علامة `expense_tx` على كل بند مُنفَّذ لمنع التكرار عند إعادة الحفظ.
   *
   * @param {string} notesStr ملاحظات الميزانية (JSON)
   * @param {string} date تاريخ اليوم
   * @param {number} userId
   * @returns {{ notes:string, posted:object[] }}
   */
  _postBudgetCenterExpenses(notesStr, date, userId) {
    if (!notesStr) return { notes: notesStr, posted: [] }
    let parsed
    try {
      parsed = JSON.parse(notesStr)
    } catch {
      return { notes: notesStr, posted: [] }
    }
    const budget = parsed?.expense_budget
    if (!budget || typeof budget !== 'object') return { notes: notesStr, posted: [] }

    const posted = []
    let changed = false
    for (const key of Object.keys(budget)) {
      const lines = budget[key]
      if (!Array.isArray(lines)) continue
      for (const line of lines) {
        const centerId = Number(line.center_id)
        const amount = Number(line.amount)
        if (centerId && amount > 0 && !line.expense_tx) {
          const ref = generateRef(REF_PREFIX.TRANSACTION)
          AccountingService.createExpense(
            {
              ref_number: ref,
              center_id: centerId,
              amount,
              currency: 'USD',
              date,
              notes: line.label || 'مصروف',
            },
            userId
          )
          line.expense_tx = ref
          posted.push({ center_id: centerId, amount, label: line.label || 'مصروف', ref })
          changed = true
        }
      }
    }
    return { notes: changed ? JSON.stringify(parsed) : notesStr, posted }
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
    // الأساس = مجموع «مربحنا» للسيارات المُرحَّلة (لا إجمالي فواتير التخليص)
    const baseClearance = calc.gross_profit
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

    return DailyProfitModel.transaction(() => {
      // خصم بنود الميزانية المرتبطة بمراكز (يضع علامات منع التكرار في الملاحظات)
      const { notes: notesWithMarkers } = this._postBudgetCenterExpenses(notes, date, userId)
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
        notes: notesWithMarkers,
        created_by: userId,
      })
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
        baseClearance: calc.gross_profit, // الأساس = مجموع «مربحنا»
        clearance_diff: data.clearance_diff ?? existing.clearance_diff,
        transport_diff: data.transport_diff ?? existing.transport_diff,
        workers_diff: data.workers_diff ?? existing.workers_diff,
        driver_diff: data.driver_diff ?? existing.driver_diff,
        credit_diff: data.credit_diff ?? existing.credit_diff,
      })
    }

    const office = data.office_expenses ?? existing.office_expenses
    const home = data.home_expenses ?? existing.home_expenses

    return DailyProfitModel.transaction(() => {
      // خصم بنود الميزانية الجديدة المرتبطة بمراكز (إن وُجدت ملاحظات محدّثة)
      const notesOut =
        data.notes !== undefined
          ? this._postBudgetCenterExpenses(data.notes, date, userId).notes
          : data.notes

      return DailyProfitModel.update(existing.id, {
        ...data,
        ...(data.notes !== undefined ? { notes: notesOut } : {}),
        gross_profit: gross,
        office_expenses: office,
        home_expenses: home,
        net_profit: calculateNetProfit(gross, office, home),
        updated_by: userId,
      })
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

  /**
   * يزامن يوماً مُغلقاً مع السيارات المُرحَّلة لاحقاً: عدد السيارات ومربحها (والصافي)
   * مشتقّان من القيود الحيّة، أما المصاريف والفروقات فتبقى كما حُفظت عند الإغلاق.
   */
  _syncClosedCars(closed, preview) {
    if (!closed) return closed
    const DIFF_KEYS = ['clearance_diff', 'transport_diff', 'workers_diff', 'driver_diff', 'credit_diff']
    const diffSum = DIFF_KEYS.reduce((s, k) => s + (Number(closed[k]) || 0), 0)
    const liveTrucks = preview.num_trucks || 0
    const liveGross = Math.round(((preview.gross_profit || 0) + diffSum) * 100) / 100
    if ((Number(closed.num_trucks) || 0) === liveTrucks && (Number(closed.gross_profit) || 0) === liveGross) {
      return closed
    }
    const liveNet = calculateNetProfit(liveGross, closed.office_expenses, closed.home_expenses)
    DailyProfitModel.update(closed.id, {
      num_trucks: liveTrucks,
      gross_profit: liveGross,
      net_profit: liveNet,
    })
    return DailyProfitModel.findByDate(closed.date)
  }

  /** تفاصيل اليوم للواجهة والتقارير — لا يغيّر المحرك */
  getDayDetail(date) {
    const preview = this.calculateDay(date)
    const closed = this._syncClosedCars(this.getByDate(date), preview)
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
