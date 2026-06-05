const TransactionModel = require('../models/TransactionModel')
const AccountingService = require('../services/AccountingService')
const { generateRef } = require('../utils/refGenerator')
const { REF_PREFIX } = require('../config/constants')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')
const { normalizeSearchQuery } = require('../utils/searchNormalize')

const transactionController = {
  list: asyncHandler(async (req, res) => {
    const {
      center_id,
      type,
      category,
      search,
      from,
      to,
      is_delivered,
      shipment_id,
      limit = 50,
      offset = 0,
    } = req.query

    const filters = {}
    if (center_id) filters.center_id = parseInt(center_id, 10)
    if (type) filters.type = type
    if (category) filters.category = category
    if (search?.trim()) filters.search = normalizeSearchQuery(search)
    if (from) filters.from = from
    if (to) filters.to = to
    if (is_delivered === '0' || is_delivered === '1') {
      filters.is_delivered = is_delivered === '1'
    }
    if (shipment_id) filters.shipment_id = parseInt(shipment_id, 10)

    const lim = parseInt(limit, 10)
    const off = parseInt(offset, 10)
    const result = TransactionModel.listWithDetails({ filters, limit: lim, offset: off })
    res.json({
      success: true,
      data: result.rows,
      message: null,
      meta: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        page: Math.floor(result.offset / result.limit) + 1,
        totalPages: Math.ceil(result.total / result.limit) || 1,
        hasMore: result.offset + result.limit < result.total,
        total_out: result.total_out,
        total_in: result.total_in,
        net: result.total_out - result.total_in,
      },
    })
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
