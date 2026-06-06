const CenterModel = require('../models/CenterModel')
const AccountingService = require('../services/AccountingService')
const BrokerStatementService = require('../services/BrokerStatementService')
const DualStatementService = require('../services/DualStatementService')
const TraderReportService = require('../services/TraderReportService')
const SettingsService = require('../services/SettingsService')
const { traderWorkbook, profitWorkbook, dualStatementWorkbook, workbookToBuffer } = require('../services/reports/excelReport')
const { traderHtml, profitHtml, dualStatementHtml, htmlToPdf } = require('../services/reports/pdfReport')
const archiver = require('archiver')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')
const { BusinessRuleError } = require('../utils/errors')

function sendDownload(res, buffer, filename, mime) {
  const encoded = encodeURIComponent(filename)
  res.setHeader('Content-Type', mime)
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="report"; filename*=UTF-8''${encoded}`
  )
  res.send(Buffer.from(buffer))
}

const centerController = {
  list: asyncHandler(async (req, res) => {
    const { type, limit = 50, offset = 0 } = req.query
    const filters = {}
    if (type) filters.type = type

    const result = CenterModel.findAll({
      filters,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    })

    res.json(apiResponse.paginated(result.rows, result.total, result.limit, result.offset))
  }),

  getById: asyncHandler(async (req, res) => {
    const center = CenterModel.findById(parseInt(req.params.id, 10))
    res.json(apiResponse.success(center))
  }),

  create: asyncHandler(async (req, res) => {
    const code = req.body.code || CenterModel.getNextCode()
    const existing = CenterModel.findByCode(code)
    if (existing) throw new BusinessRuleError('رمز المركز موجود مسبقاً')

    const center = CenterModel.create({
      ...req.body,
      code,
      created_by: req.user.id,
    })

    res.status(201).json(apiResponse.success(center, 'تم إنشاء المركز'))
  }),

  update: asyncHandler(async (req, res) => {
    const center = CenterModel.update(parseInt(req.params.id, 10), {
      ...req.body,
      updated_by: req.user.id,
    })
    res.json(apiResponse.success(center, 'تم التحديث'))
  }),

  getBalance: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const balance = AccountingService.getCenterFullStatement(id)
    res.json(apiResponse.success(balance))
  }),

  getStatement: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const { from, to, type, limit = 50, offset = 0 } = req.query

    const statement = AccountingService.getCenterStatement(id, {
      from,
      to,
      type,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    })

    res.json(apiResponse.success(statement))
  }),

  getClearanceStatement: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const statement = BrokerStatementService.getStatement(id)
    res.json(apiResponse.success(statement))
  }),

  postReady: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const result = BrokerStatementService.postReady(id, req.user.id)
    const ok = result.results?.length || 0
    res.json(apiResponse.success(result, `تم ترحيل ${ok} سيارة`))
  }),

  getDualStatement: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const statement = DualStatementService.getStatement(id)
    res.json(apiResponse.success(statement))
  }),

  // بيانات تقرير الكشف المزدوج جاهزة للتصدير (Excel / PDF)
  _buildDualReportData(id) {
    const stmt = DualStatementService.getStatement(id)
    return {
      company: SettingsService.getReportCompanyName(),
      center: stmt.clearance_center,
      range: {},
      generated_at: new Date().toISOString(),
      broker_side: stmt.broker_side,
      trader_side: stmt.trader_side,
      company_profit: stmt.company_profit,
    }
  },

  dualStatementXlsx: asyncHandler(async (req, res) => {
    const data = centerController._buildDualReportData(parseInt(req.params.id, 10))
    const buf = await workbookToBuffer(dualStatementWorkbook(data))
    sendDownload(
      res,
      buf,
      `كشف_مزدوج_${data.center.name}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  }),

  dualStatementPdf: asyncHandler(async (req, res) => {
    const data = centerController._buildDualReportData(parseInt(req.params.id, 10))
    const buf = await htmlToPdf(dualStatementHtml(data))
    sendDownload(res, buf, `كشف_مزدوج_${data.center.name}.pdf`, 'application/pdf')
  }),

  // ===== تقارير التجار (Excel / PDF) =====
  traderReport: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const { from, to } = req.query
    res.json(apiResponse.success(TraderReportService.buildTraderStatement(id, { from, to })))
  }),

  profitReport: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const { from, to } = req.query
    res.json(apiResponse.success(TraderReportService.buildProfitReport(id, { from, to })))
  }),

  traderReportXlsx: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const data = TraderReportService.buildTraderStatement(id, req.query)
    const buf = await workbookToBuffer(traderWorkbook(data))
    sendDownload(
      res,
      buf,
      `كشف_${data.center.name}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  }),

  profitReportXlsx: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const data = TraderReportService.buildProfitReport(id, req.query)
    const buf = await workbookToBuffer(profitWorkbook(data))
    sendDownload(
      res,
      buf,
      `ربح_${data.center.name}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  }),

  traderReportPdf: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const data = TraderReportService.buildTraderStatement(id, req.query)
    const buf = await htmlToPdf(traderHtml(data))
    sendDownload(res, buf, `كشف_${data.center.name}.pdf`, 'application/pdf')
  }),

  profitReportPdf: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const data = TraderReportService.buildProfitReport(id, req.query)
    const buf = await htmlToPdf(profitHtml(data))
    sendDownload(res, buf, `ربح_${data.center.name}.pdf`, 'application/pdf')
  }),

  // تقرير مجمّع لكل التجار في ملف ZIP واحد
  tradersReportZip: asyncHandler(async (req, res) => {
    const { from, to } = req.query
    const kind = req.query.kind === 'profit' ? 'profit' : 'trader'
    const fmt = req.query.fmt === 'pdf' ? 'pdf' : 'xlsx'

    const { rows: traders } = CenterModel.findAll({ filters: { type: 'trader' }, limit: 1000 })

    const zipName = `${kind === 'profit' ? 'تقارير_ربح' : 'كشوف'}_التجار.zip`
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reports.zip"; filename*=UTF-8''${encodeURIComponent(zipName)}`
    )

    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.on('error', (err) => {
      throw err
    })
    archive.pipe(res)

    for (const t of traders) {
      const data =
        kind === 'profit'
          ? TraderReportService.buildProfitReport(t.id, { from, to })
          : TraderReportService.buildTraderStatement(t.id, { from, to })
      if (!data.rows.length) continue

      const prefix = kind === 'profit' ? 'ربح' : 'كشف'
      let buf
      if (fmt === 'pdf') {
        buf = await htmlToPdf(kind === 'profit' ? profitHtml(data) : traderHtml(data))
      } else {
        buf = await workbookToBuffer(kind === 'profit' ? profitWorkbook(data) : traderWorkbook(data))
      }
      archive.append(Buffer.from(buf), { name: `${prefix}_${t.name}.${fmt}` })
    }

    await archive.finalize()
  }),
}

module.exports = centerController
