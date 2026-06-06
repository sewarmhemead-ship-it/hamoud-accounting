const asyncHandler = require('../utils/asyncHandler')
const apiResponse = require('../utils/apiResponse')
const engine = require('../engine')
const { BusinessRuleError } = require('../utils/errors')
const { CalculationError } = require('../engine/errors')

function mapCalcError(err, next) {
  if (err instanceof CalculationError) {
    return next(new BusinessRuleError(err.message))
  }
  return next(err)
}

const calculationsController = {
  shipmentTotal: asyncHandler(async (req, res, next) => {
    try {
      engine.validateShipmentFinancials(req.body)
      const total = engine.calculateShipmentTotal(req.body)
      // الضريبة مدموجة في الترسيم — تُعرض فقط إذا أُدخلت يدوياً، بلا احتساب 2% تلقائي
      const tax_2pct = req.body.tax_2pct ?? 0
      res.json(apiResponse.success({ total, tax_2pct, breakdown: req.body }))
    } catch (e) {
      mapCalcError(e, next)
    }
  }),

  customsFee: asyncHandler(async (req, res, next) => {
    try {
      const result = engine.calculateCustomsFee({
        goodsType: req.body.goods_type ?? req.body.goodsType,
        weight: req.body.weight,
        ratePerKg: req.body.rate_per_kg ?? req.body.ratePerKg,
      })
      res.json(apiResponse.success(result))
    } catch (e) {
      mapCalcError(e, next)
    }
  }),

  dailyProfit: asyncHandler(async (req, res, next) => {
    try {
      const gross = engine.calculateDailyGrossProfit(req.body)
      const net = engine.calculateNetProfit(
        gross,
        req.body.office_expenses,
        req.body.home_expenses
      )
      res.json(apiResponse.success({ gross_profit: gross, net_profit: net }))
    } catch (e) {
      mapCalcError(e, next)
    }
  }),

  currency: asyncHandler(async (req, res, next) => {
    try {
      const result = engine.convertToUsd(
        req.body.amount,
        req.body.currency,
        req.body.exchange_rate
      )
      res.json(apiResponse.success(result))
    } catch (e) {
      mapCalcError(e, next)
    }
  }),
}

module.exports = calculationsController
