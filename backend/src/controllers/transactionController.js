const TransactionModel = require('../models/TransactionModel')
const AccountingService = require('../services/AccountingService')
const { generateRef } = require('../utils/refGenerator')
const { REF_PREFIX } = require('../config/constants')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const transactionController = {
  list: asyncHandler(async (req, res) => {
    const { center_id, limit = 50, offset = 0 } = req.query

    if (center_id) {
      const result = TransactionModel.findByCenter(parseInt(center_id, 10), {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      })
      return res.json(
        apiResponse.paginated(result.rows, result.total, parseInt(limit, 10), parseInt(offset, 10))
      )
    }

    const result = TransactionModel.findAll({
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    })
    res.json(apiResponse.paginated(result.rows, result.total, result.limit, result.offset))
  }),

  getById: asyncHandler(async (req, res) => {
    const tx = TransactionModel.findById(parseInt(req.params.id, 10))
    res.json(apiResponse.success(tx))
  }),

  createPayment: asyncHandler(async (req, res) => {
    const ref_number = generateRef(REF_PREFIX.TRANSACTION)
    const tx = AccountingService.createPayment(
      { ...req.body, ref_number },
      req.user.id
    )
    res.status(201).json(apiResponse.success(tx, 'تم تسجيل الدفعة'))
  }),

  offset: asyncHandler(async (req, res) => {
    const { from_center_id, to_center_id, amount, notes } = req.body
    const refOut = generateRef(REF_PREFIX.TRANSACTION)
    const refIn = generateRef(REF_PREFIX.TRANSACTION)

    const result = AccountingService.offsetCenters(
      from_center_id,
      to_center_id,
      amount,
      req.user.id,
      notes,
      refOut,
      refIn
    )

    res.status(201).json(apiResponse.success(result, 'تمت المقاصة'))
  }),

  softDelete: asyncHandler(async (req, res) => {
    TransactionModel.softDelete(parseInt(req.params.id, 10))
    res.json(apiResponse.success(null, 'تم الحذف'))
  }),
}

module.exports = transactionController
