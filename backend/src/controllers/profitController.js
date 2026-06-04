const ProfitService = require('../services/ProfitService')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

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
}

module.exports = profitController
