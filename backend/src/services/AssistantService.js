/**
 * مساعد محاسبي — قراءة فقط من الخدمات الموجودة.
 * لا يعدّل البيانات ولا يستدعي محرك الحساب بطريقة مختلفة عن التطبيق.
 */
const ProfitService = require('./ProfitService')
const AccountingService = require('./AccountingService')
const ShipmentModel = require('../models/ShipmentModel')
const TransactionModel = require('../models/TransactionModel')
const DailyProfitModel = require('../models/DailyProfitModel')
const CenterModel = require('../models/CenterModel')
const { classifyQuestion } = require('../utils/assistantIntents')
const { todayDB } = require('../utils/dates')
const { hasPermission } = require('../utils/accessControl')
const { PERM } = require('../config/permissions')
const { ForbiddenError, ValidationError } = require('../utils/errors')

const STATUS_AR = {
  pending: 'معلقة',
  complete: 'مكتملة',
  posted: 'مُرحّلة',
  delivered: 'مُسلّمة',
}

function fmtMoney(n) {
  return `$${Math.round((Number(n) || 0) * 100) / 100}`
}

function can(user, perm) {
  return hasPermission(user, perm)
}

function assertCan(user, perm, label) {
  if (!can(user, perm)) {
    throw new ForbiddenError(`ليس لديك صلاحية لعرض: ${label}`)
  }
}

function findCenter(query) {
  if (!query) return null
  const db = CenterModel.db
  const byCode = db
    .prepare('SELECT * FROM centers WHERE code = ? AND is_deleted = 0')
    .get(String(query))
  if (byCode) return byCode
  const like = `%${query}%`
  return db
    .prepare(
      `SELECT * FROM centers WHERE is_deleted = 0 AND (name LIKE ? OR code LIKE ?) LIMIT 1`
    )
    .get(like, like)
}

class AssistantService {
  ask(user, question) {
    const q = String(question || '').trim()
    if (q.length < 2) throw new ValidationError('اكتب سؤالك بوضوح')
    if (q.length > 500) throw new ValidationError('السؤال طويل جداً')

    const parsed = classifyQuestion(q)

    switch (parsed.intent) {
      case 'profit_day':
        return this._profitDay(user, parsed.date)
      case 'profit_month':
        return this._profitMonth(user, parsed.month)
      case 'day_summary':
        return this._daySummary(user, parsed.date)
      case 'center_balance':
        return this._centerBalance(user, parsed.centerQuery)
      default:
        return this._help(user)
    }
  }

  _profitDay(user, date) {
    assertCan(user, PERM.PROFIT_VIEW, 'المربح اليومي')
    const closed = DailyProfitModel.findByDate(date)
    const preview = ProfitService.calculateDay(date)

    let answer
    const facts = { date, closed: !!closed, preview }

    if (closed) {
      facts.net_profit = closed.net_profit
      facts.gross_profit = closed.gross_profit
      facts.office_expenses = closed.office_expenses
      facts.home_expenses = closed.home_expenses
      facts.num_trucks = closed.num_trucks
      answer =
        `📊 **مربح يوم ${date}** (يوم مُغلق)\n` +
        `• عدد السيارات: ${closed.num_trucks}\n` +
        `• إجمالي المربح: ${fmtMoney(closed.gross_profit)}\n` +
        `• مصاريف مكتب: ${fmtMoney(closed.office_expenses)} · منزل: ${fmtMoney(closed.home_expenses)}\n` +
        `• **الصافي:** ${fmtMoney(closed.net_profit)}`
    } else {
      facts.gross_revenue = preview.gross_revenue
      facts.payments_received = preview.payments_received
      facts.num_trucks = preview.num_trucks
      answer =
        `📊 **معاينة مربح ${date}** (لم يُغلق بعد)\n` +
        `• سيارات مُرحّلة: ${preview.num_trucks}\n` +
        `• إيراد تخليص (تقدير): ${fmtMoney(preview.gross_revenue)}\n` +
        `• دفعات مستلمة: ${fmtMoney(preview.payments_received)}\n` +
        `• المربح الإجمالي التقديري: ${fmtMoney(preview.gross_profit)}\n` +
        `_أغلق اليوم من صفحة المربح لحفظ المصاريف والصافي._`
    }

    return {
      intent: 'profit_day',
      answer,
      facts,
      links: [{ label: 'صفحة المربح', path: '/profit' }],
    }
  }

  _profitMonth(user, month) {
    assertCan(user, PERM.PROFIT_VIEW, 'المربح الشهري')
    if (!month?.year || !month?.month) {
      throw new ValidationError('حدّد الشهر، مثال: مربح شهر 2026-06')
    }
    const summary = ProfitService.getMonthly(month.year, month.month)
    const answer =
      `📅 **مربح ${month.year}-${String(month.month).padStart(2, '0')}**\n` +
      `• أيام مُغلقة: ${summary.days_count}\n` +
      `• سيارات: ${summary.num_trucks}\n` +
      `• مربح إجمالي: ${fmtMoney(summary.gross_profit)}\n` +
      `• **صافي الشهر:** ${fmtMoney(summary.net_profit)}`

    return {
      intent: 'profit_month',
      answer,
      facts: summary,
      links: [{ label: 'المربح', path: '/profit' }],
    }
  }

  _daySummary(user, date) {
    assertCan(user, PERM.SHIPMENTS_VIEW, 'ملخص اليوم')
    const ships = ShipmentModel.summarizeByStatusInRange(date, date)
    const clearance = TransactionModel.sumPostedClearancesByDate(date)
    const payments = TransactionModel.sumPaymentsByDate(date)
    const closed = DailyProfitModel.findByDate(date)

    const lines = [`📋 **ملخص ${date}**`, '']
    lines.push('**السيارات (تاريخ الدخول):**')
    for (const [st, info] of Object.entries(ships)) {
      if (info?.count) {
        lines.push(`• ${STATUS_AR[st] || st}: ${info.count} (${fmtMoney(info.total)})`)
      }
    }
    if (!Object.keys(ships).length) lines.push('• لا سيارات مسجّلة بهذا التاريخ دخول')

    if (can(user, PERM.PROFIT_VIEW)) {
      lines.push('')
      lines.push(`**ترحيل:** ${clearance.count} سيارة — ${fmtMoney(clearance.total)}`)
      lines.push(`**دفعات:** ${fmtMoney(payments.total)}`)
      if (closed) {
        lines.push(`**يوم مُغلق** — صافي: ${fmtMoney(closed.net_profit)}`)
      } else {
        const prev = ProfitService.calculateDay(date)
        lines.push(`**مربح تقديري:** ${fmtMoney(prev.gross_profit)} (${prev.num_trucks} سيارة)`)
      }
    }

    return {
      intent: 'day_summary',
      answer: lines.join('\n'),
      facts: { date, ships, clearance, payments, closed: !!closed },
      links: [
        { label: 'السيارات', path: `/shipments?from=${date}&to=${date}` },
        { label: 'المربح', path: '/profit' },
      ],
    }
  }

  _centerBalance(user, centerQuery) {
    assertCan(user, PERM.CENTERS_VIEW, 'كشف المراكز')
    const center = findCenter(centerQuery)
    if (!center) {
      return {
        intent: 'center_balance',
        answer: 'لم أجد مركزاً بهذا الاسم أو الكود. جرّب: «ذمة تاجر 101»',
        facts: {},
        links: [{ label: 'المراكز', path: '/centers' }],
      }
    }
    const stmt = AccountingService.getCenterFullStatement(center.id)
    const answer =
      `🏛 **${center.name}** (كود ${center.code})\n` +
      `• صادر: ${fmtMoney(stmt.total_out)} · وارد: ${fmtMoney(stmt.total_in)}\n` +
      `• **الرصيد:** ${fmtMoney(stmt.balance)}\n` +
      `• سيارات مُرحّلة غير مُسلّمة: ${stmt.posted_undelivered_count} — ${fmtMoney(stmt.posted_undelivered_value)}\n` +
      `• **المجموع الكلي (ذمة):** ${fmtMoney(stmt.grand_total)}`

    return {
      intent: 'center_balance',
      answer,
      facts: { center_id: center.id, ...stmt },
      links: [{ label: 'كشف الحساب', path: `/centers/${center.id}` }],
    }
  }

  _help(user) {
    const hints = [
      '• **ميزانية / مربح اليوم** — «شو المربح اليوم؟»',
      '• **ملخص تاريخ** — «شو صار بتاريخ 2026-06-05؟»',
      '• **شهر** — «مربح شهر 2026-06»',
      '• **ذمة تاجر** — «ذمة تاجر 101»',
    ]
    if (!can(user, PERM.PROFIT_VIEW)) {
      hints.push('_بعض الإجابات تحتاج صلاحية عرض المربح._')
    }
    return {
      intent: 'help',
      answer: `🤖 **مساعد حمود** (قراءة فقط — الأرقام من النظام)\n\n${hints.join('\n')}`,
      facts: {},
      links: [],
    }
  }
}

module.exports = new AssistantService()
