const LookupModel    = require('../models/LookupModel')
const CenterModel    = require('../models/CenterModel')
const ShipmentModel  = require('../models/ShipmentModel')
const ShipmentService = require('../services/ShipmentService')
const DailyProfitModel = require('../models/DailyProfitModel')
const WhatsappService  = require('../services/WhatsappService')
const ProfitService    = require('../services/ProfitService')
const InventoryService = require('../services/InventoryService')
const NotificationService = require('../services/NotificationService')
const PeriodReportService = require('../services/PeriodReportService')
const { periodWorkbook, workbookToBuffer } = require('../services/reports/excelReport')
const { periodHtml, htmlToPdf } = require('../services/reports/pdfReport')
const { todayDB }      = require('../utils/dates')
const apiResponse      = require('../utils/apiResponse')
const asyncHandler     = require('../utils/asyncHandler')

function sendDownload(res, buffer, filename, contentType) {
  const encoded = encodeURIComponent(filename)
  res.setHeader('Content-Type', contentType)
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="report"; filename*=UTF-8''${encoded}`
  )
  res.send(buffer)
}

const reportController = {
  lookups: asyncHandler(async (req, res) => {
    res.json(apiResponse.success({
      currencies:  LookupModel.getCurrencies(),
      borders:     LookupModel.getBorders(),
      goods_types: LookupModel.getGoodsTypes(),
    }))
  }),

  whatsappStatement: asyncHandler(async (req, res) => {
    const text = WhatsappService.formatCenterStatement(parseInt(req.params.centerId, 10))
    res.json(apiResponse.success({ text }))
  }),

  dailySummary: asyncHandler(async (req, res) => {
    const { date } = req.params
    const closed  = ProfitService.getByDate(date)
    const preview = ProfitService.calculateDay(date)
    res.json(apiResponse.success({ closed, preview }))
  }),

  /* ─────────── لوحة التحكم — طلب واحد يجمع كل البيانات ─────────── */
  dashboard: asyncHandler(async (req, res) => {
    const today = todayDB()

    // اليوم
    const todayCalc = ProfitService.calculateDay(today)
    const closed    = ProfitService.getByDate(today)

    // الشحنات
    const [pendingDb, legacyComplete, posted, delivered] = ['pending', 'complete', 'posted', 'delivered'].map(
      (s) => ShipmentModel.sumGlobalByStatus(s)
    )
    const readyToPost = ShipmentService.countReadyToPost()
    const wipCount = pendingDb.count + legacyComplete.count
    const wipTotal = pendingDb.total + legacyComplete.total

    // أحدث السيارات
    const recent = ShipmentModel.listWithDetails({ limit: 5 }).rows

    // جاهزة للترحيل — حسب اكتمال الأقلام لا حالة complete
    const pendingPost = ShipmentService.getReadyToPost({ limit: 10 }).rows

    // المراكز
    const tradersTotal = CenterModel.findAll({ filters: { type: 'trader' }, limit: 1 }).total
    const brokersTotal = CenterModel.findAll({ filters: { type: 'broker' }, limit: 1 }).total
    const topBalances  = CenterModel.topTraderBalances(5)

    // آخر 7 أيام (للمخطط)
    const trend = []
    for (let i = 6; i >= 0; i--) {
      const d  = new Date()
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const dp = DailyProfitModel.findByDate(ds)
      trend.push({
        date:         ds,
        net_profit:   dp?.net_profit   ?? null,
        gross_profit: dp?.gross_profit ?? null,
        num_trucks:   dp?.num_trucks   ?? null,
        is_closed:    !!dp,
      })
    }

    let inventory = { latest_date: null, totals: null }
    try {
      const latest = InventoryService.getLatest()
      if (latest.latest?.snapshot_date) {
        inventory = {
          latest_date: latest.latest.snapshot_date,
          label: latest.latest.label,
          totals: latest.latest.totals,
          centers: latest.latest.totals?.centers ?? 0,
        }
      }
    } catch (_) {
      /* */
    }

    res.json(apiResponse.success({
      today: {
        date:          today,
        gross_revenue: todayCalc.gross_revenue,
        num_trucks:    todayCalc.num_trucks,
        is_closed:     !!closed,
        closed,
      },
      shipments: {
        pending: {
          count: wipCount,
          total_value: wipTotal,
        },
        ready_to_post: {
          count: readyToPost.count,
          total_value: readyToPost.total_value,
        },
        posted:    { count: posted.count,    total_value: posted.total },
        delivered: { count: delivered.count, total_value: delivered.total },
      },
      centers:      { traders: tradersTotal, brokers: brokersTotal },
      top_balances: topBalances,
      recent,
      pending_post: pendingPost,
      profit_trend: trend,
      inventory,
    }))
  }),

  /* ─────────── إشعارات النظام ─────────── */
  notifications: asyncHandler(async (req, res) => {
    const payload = NotificationService.buildAlerts(req.user)
    res.json(apiResponse.success(payload))
  }),

  periodReport: asyncHandler(async (req, res) => {
    const { from, to } = req.query
    const data = PeriodReportService.build({ from, to })
    res.json(apiResponse.success(data))
  }),

  periodReportXlsx: asyncHandler(async (req, res) => {
    const { from, to } = req.query
    const data = PeriodReportService.build({ from, to })
    const buf = await workbookToBuffer(periodWorkbook(data))
    sendDownload(
      res,
      buf,
      `تقرير_فترة_${from}_${to}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  }),

  periodReportPdf: asyncHandler(async (req, res) => {
    const { from, to } = req.query
    const data = PeriodReportService.build({ from, to })
    const buf = await htmlToPdf(periodHtml(data))
    sendDownload(res, buf, `تقرير_فترة_${from}_${to}.pdf`, 'application/pdf')
  }),
}

module.exports = reportController
