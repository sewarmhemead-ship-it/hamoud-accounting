const InventoryService = require('../services/InventoryService')
const {
  inventoryWorkbook,
  inventoryRangeWorkbook,
  workbookToBuffer,
} = require('../services/reports/excelReport')
const { inventoryHtml, inventoryRangeHtml, htmlToPdf } = require('../services/reports/pdfReport')
const { todayDB } = require('../utils/dates')
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

async function exportReport(res, data, fmt) {
  const suffix = data.is_live ? '_حي' : ''
  const base = `جرد_${data.snapshot_date}${suffix}`
  if (fmt === 'xlsx') {
    const buf = await workbookToBuffer(inventoryWorkbook(data))
    sendDownload(
      res,
      buf,
      `${base}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  } else {
    const buf = await htmlToPdf(inventoryHtml(data))
    sendDownload(res, buf, `${base}.pdf`, 'application/pdf')
  }
}

const inventoryController = {
  getRange: asyncHandler(async (req, res) => {
    const { from, to } = req.query
    res.json(apiResponse.success(InventoryService.getRange(from, to)))
  }),

  rangeReportXlsx: asyncHandler(async (req, res) => {
    const { from, to } = req.query
    const data = InventoryService.buildRangeReport(from, to)
    const buf = await workbookToBuffer(inventoryRangeWorkbook(data))
    sendDownload(
      res,
      buf,
      `جرد_${from}_${to}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  }),

  rangeReportPdf: asyncHandler(async (req, res) => {
    const { from, to } = req.query
    const data = InventoryService.buildRangeReport(from, to)
    const buf = await htmlToPdf(inventoryRangeHtml(data))
    sendDownload(res, buf, `جرد_${from}_${to}.pdf`, 'application/pdf')
  }),

  livePreview: asyncHandler(async (req, res) => {
    res.json(apiResponse.success(InventoryService.buildLiveRows()))
  }),

  listDates: asyncHandler(async (req, res) => {
    res.json(apiResponse.success(InventoryService.listDates()))
  }),

  latest: asyncHandler(async (req, res) => {
    res.json(apiResponse.success(InventoryService.getLatest()))
  }),

  createSnapshot: asyncHandler(async (req, res) => {
    const { snapshot_date, label, replace } = req.body
    const result = InventoryService.createSnapshot(snapshot_date, label, req.user.id, {
      replace: replace !== false,
    })
    res.status(201).json(apiResponse.success(result, 'تم حفظ لقطة الجرد'))
  }),

  getByDate: asyncHandler(async (req, res) => {
    const detail = InventoryService.getByDate(req.params.date)
    res.json(apiResponse.success(detail))
  }),

  compare: asyncHandler(async (req, res) => {
    const cmp = InventoryService.compareToLive(req.params.date)
    res.json(apiResponse.success(cmp))
  }),

  reportXlsx: asyncHandler(async (req, res) => {
    const data = InventoryService.buildReport(req.params.date)
    await exportReport(res, data, 'xlsx')
  }),

  reportPdf: asyncHandler(async (req, res) => {
    const data = InventoryService.buildReport(req.params.date)
    await exportReport(res, data, 'pdf')
  }),

  reportLiveXlsx: asyncHandler(async (req, res) => {
    const asOf = req.query.date || todayDB()
    const data = InventoryService.buildLiveReport(asOf)
    await exportReport(res, data, 'xlsx')
  }),

  reportLivePdf: asyncHandler(async (req, res) => {
    const asOf = req.query.date || todayDB()
    const data = InventoryService.buildLiveReport(asOf)
    await exportReport(res, data, 'pdf')
  }),
}

module.exports = inventoryController
