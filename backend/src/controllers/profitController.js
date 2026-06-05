const ProfitService = require('../services/ProfitService')
const { DailyProfitReportService } = require('../services/DailyProfitReportService')
const {
  dailyProfitWorkbook,
  dailyProfitMonthWorkbook,
  workbookToBuffer,
} = require('../services/reports/excelReport')
const { dailyProfitHtml, monthlyProfitHtml, htmlToPdf } = require('../services/reports/pdfReport')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

function sendDownload(res, buffer, filename, contentType) {
  const encoded = encodeURIComponent(filename)
  res.setHeader('Content-Type', contentType)
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="report"; filename*=UTF-8''${encoded}`
  )
  res.send(buffer)
}

const profitController = {
  getByDate: asyncHandler(async (req, res) => {
    const record = ProfitService.getByDate(req.params.date)
    res.json(apiResponse.success(record))
  }),

  preview: asyncHandler(async (req, res) => {
    const calc = ProfitService.calculateDay(req.params.date)
    res.json(apiResponse.success(calc))
  }),

  closeDay: asyncHandler(async (req, res) => {
    const record = ProfitService.closeDay(req.body.date, req.body, req.user.id)
    res.status(201).json(apiResponse.success(record, 'تم إغلاق اليوم'))
  }),

  updateDay: asyncHandler(async (req, res) => {
    const record = ProfitService.updateDay(req.params.date, req.body, req.user.id)
    res.json(apiResponse.success(record, 'تم تحديث سجل اليوم'))
  }),

  getMonthly: asyncHandler(async (req, res) => {
    const { year, month } = req.params
    const summary = ProfitService.getMonthly(parseInt(year, 10), parseInt(month, 10))
    res.json(apiResponse.success(summary))
  }),

  dayDetail: asyncHandler(async (req, res) => {
    const detail = ProfitService.getDayDetail(req.params.date)
    res.json(apiResponse.success(detail))
  }),

  dayReportXlsx: asyncHandler(async (req, res) => {
    const data = DailyProfitReportService.buildDay(req.params.date)
    const buf = await workbookToBuffer(dailyProfitWorkbook(data))
    sendDownload(
      res,
      buf,
      `مربح_يومي_${req.params.date}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  }),

  dayReportPdf: asyncHandler(async (req, res) => {
    const data = DailyProfitReportService.buildDay(req.params.date)
    const buf = await htmlToPdf(dailyProfitHtml(data))
    sendDownload(res, buf, `مربح_يومي_${req.params.date}.pdf`, 'application/pdf')
  }),

  monthReportXlsx: asyncHandler(async (req, res) => {
    const { year, month } = req.params
    const data = DailyProfitReportService.buildMonth(
      parseInt(year, 10),
      parseInt(month, 10)
    )
    const buf = await workbookToBuffer(dailyProfitMonthWorkbook(data))
    sendDownload(
      res,
      buf,
      `مربح_شهري_${year}-${String(month).padStart(2, '0')}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  }),

  monthReportPdf: asyncHandler(async (req, res) => {
    const { year, month } = req.params
    const data = DailyProfitReportService.buildMonth(
      parseInt(year, 10),
      parseInt(month, 10)
    )
    const buf = await htmlToPdf(monthlyProfitHtml(data))
    sendDownload(
      res,
      buf,
      `مربح_شهري_${year}-${String(month).padStart(2, '0')}.pdf`,
      'application/pdf'
    )
  }),
}

module.exports = profitController
