const ShipmentModel = require('../models/ShipmentModel')
const ShipmentService = require('./ShipmentService')
const CenterModel = require('../models/CenterModel')
const InventoryModel = require('../models/InventoryModel')
const AdminModel = require('../models/AdminModel')
const ProfitService = require('./ProfitService')
const SettingsService = require('./SettingsService')
const { todayDB } = require('../utils/dates')
const { PERM } = require('../config/permissions')
const { userHasPerm, SEVERITY_ORDER } = require('../utils/notificationAuth')

function daysSinceIso(dateStr) {
  if (!dateStr) return null
  const a = new Date(`${dateStr}T12:00:00`)
  const b = new Date()
  return Math.floor((b - a) / 86_400_000)
}

function makeAlert({
  id,
  type,
  category,
  severity,
  title,
  message,
  count = 0,
  link = null,
}) {
  return {
    id: id || type,
    type,
    category,
    severity,
    title,
    message,
    count,
    link,
    at: todayDB(),
  }
}

/**
 * تنبيهات تشغيلية حقيقية من قاعدة البيانات — مفلترة حسب صلاحيات المستخدم.
 */
function buildAlerts(user) {
  const today = todayDB()
  const cfg = SettingsService.get()
  const wipDays = cfg.notification_wip_overdue_days
  const staleDays = cfg.notification_inventory_stale_days
  const highBalanceUsd = cfg.notification_high_balance_usd
  const alerts = []

  /* ─── شحنات ─── */
  if (userHasPerm(user, PERM.SHIPMENTS_VIEW)) {
    const pendingDb = ShipmentModel.sumGlobalByStatus('pending')
    const legacyComplete = ShipmentModel.sumGlobalByStatus('complete')
    const pending = pendingDb.count + legacyComplete.count
    const ready = ShipmentService.countReadyToPost().count
    const posted = ShipmentModel.sumGlobalByStatus('posted').count
    const overdue = ShipmentModel.countOverdueWip(wipDays)

    if (pending > ready) {
      alerts.push(
        makeAlert({
          type: 'pending_wip',
          category: 'shipments',
          severity: 'warning',
          title: 'سيارات معلقة',
          message: `${pending - ready} سيارة بأقلام ناقصة (WIP)`,
          count: pending - ready,
          link: '/shipments/wip',
        })
      )
    }

    if (ready > 0) {
      alerts.push(
        makeAlert({
          type: 'ready_to_post',
          category: 'shipments',
          severity: 'info',
          title: 'جاهزة للترحيل',
          message: `${ready} سيارة جاهزة للترحيل`,
          count: ready,
          link: '/shipments/ready',
        })
      )
    }

    if (overdue > 0) {
      alerts.push(
        makeAlert({
          type: 'overdue_wip',
          category: 'shipments',
          severity: 'danger',
          title: 'تأخير في الإنجاز',
          message: `${overdue} سيارة معلقة أكثر من ${wipDays} يوماً`,
          count: overdue,
          link: '/shipments/wip',
        })
      )
    }

    if (posted > 0 && userHasPerm(user, PERM.SHIPMENTS_DELIVER)) {
      alerts.push(
        makeAlert({
          type: 'posted_undelivered',
          category: 'shipments',
          severity: 'warning',
          title: 'بانتظار التسليم',
          message: `${posted} سيارة مُرحَّلة ولم تُسلَّم بعد`,
          count: posted,
          link: '/shipments?status=posted',
        })
      )
    }
  }

  /* ─── المربح اليومي ─── */
  if (userHasPerm(user, PERM.PROFIT_VIEW)) {
    const closed = ProfitService.getByDate(today)
    const preview = ProfitService.calculateDay(today)

    if (!closed) {
      const sev = userHasPerm(user, PERM.PROFIT_CLOSE) ? 'warning' : 'info'
      alerts.push(
        makeAlert({
          type: 'day_not_closed',
          category: 'finance',
          severity: sev,
          title: 'إغلاق اليوم',
          message: 'اليوم لم يُغلق بعد — راجع المربح وأغلقه',
          link: '/profit',
        })
      )

      if (preview.num_trucks === 0) {
        alerts.push(
          makeAlert({
            type: 'no_trucks_today',
            category: 'finance',
            severity: 'info',
            title: 'لا ترحيل اليوم',
            message: 'لم تُرحَّل أي سيارة في تاريخ اليوم بعد',
            link: '/shipments/ready',
          })
        )
      }
    }
  }

  /* ─── الجرد ─── */
  if (
    userHasPerm(user, PERM.INVENTORY_MANAGE) ||
    userHasPerm(user, PERM.REPORTS_VIEW) ||
    userHasPerm(user, PERM.CENTERS_VIEW)
  ) {
    const latest = InventoryModel.getLatestDate()
    if (!latest?.date) {
      alerts.push(
        makeAlert({
          type: 'inventory_none',
          category: 'inventory',
          severity: 'warning',
          title: 'لا يوجد جرد محفوظ',
          message: 'احفظ أول لقطة جرد من صفحة الجرد',
          link: '/inventory',
        })
      )
    } else {
      const days = daysSinceIso(latest.date)
      if (days != null && days >= staleDays) {
        alerts.push(
          makeAlert({
            type: 'inventory_stale',
            category: 'inventory',
            severity: days >= staleDays * 2 ? 'danger' : 'warning',
            title: 'جرد قديم',
            message: `آخر جرد منذ ${days} يوماً (${latest.date})`,
            link: '/inventory',
          })
        )
      }
    }
  }

  /* ─── مراكز ─── */
  if (userHasPerm(user, PERM.CENTERS_VIEW)) {
    const top = CenterModel.topTraderBalances(3)
    const high = top.filter((t) => (t.balance || 0) >= highBalanceUsd)
    if (high.length > 0) {
      const names = high.map((t) => t.name).slice(0, 2).join('، ')
      alerts.push(
        makeAlert({
          type: 'high_trader_balance',
          category: 'centers',
          severity: 'info',
          title: 'ذمم تجارية مرتفعة',
          message:
            high.length === 1
              ? `${names} — رصيد مرتفع`
              : `${high.length} تجار بذمم مرتفعة (${names}…)`,
          count: high.length,
          link: '/centers',
        })
      )
    }
  }

  /* ─── إدارة (مشرف) ─── */
  if (user.role === 'admin') {
    const stats = AdminModel.getStats()
    if (stats.recent_activity > 0) {
      alerts.push(
        makeAlert({
          type: 'admin_activity',
          category: 'admin',
          severity: 'info',
          title: 'نشاط النظام',
          message: `${stats.recent_activity} عملية مسجّلة خلال 7 أيام`,
          count: stats.recent_activity,
          link: '/admin',
        })
      )
    }
  }

  alerts.sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
      (b.count || 0) - (a.count || 0)
  )

  return {
    alerts,
    summary: {
      total: alerts.length,
      danger: alerts.filter((a) => a.severity === 'danger').length,
      warning: alerts.filter((a) => a.severity === 'warning').length,
      generated_at: new Date().toISOString(),
    },
  }
}

module.exports = { buildAlerts }
