const LookupModel = require('../models/LookupModel')
const WhatsappService = require('../services/WhatsappService')
const ProfitService = require('../services/ProfitService')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const reportController = {
  lookups: asyncHandler(async (req, res) => {
    res.json(
      apiResponse.success({
        currencies: LookupModel.getCurrencies(),
        borders: LookupModel.getBorders(),
        goods_types: LookupModel.getGoodsTypes(),
      })
    )
  }),

  whatsappStatement: asyncHandler(async (req, res) => {
    const text = WhatsappService.formatCenterStatement(parseInt(req.params.centerId, 10))
    res.json(apiResponse.success({ text }))
  }),

  dailySummary: asyncHandler(async (req, res) => {
    const { date } = req.params
    const closed = ProfitService.getByDate(date)
    const preview = ProfitService.calculateDay(date)
    res.json(apiResponse.success({ closed, preview }))
  }),
}

module.exports = reportController
