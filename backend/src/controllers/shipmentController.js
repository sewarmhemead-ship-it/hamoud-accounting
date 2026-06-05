const ShipmentService = require('../services/ShipmentService')
const ShipmentModel = require('../models/ShipmentModel')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')
const { normalizeSearchQuery } = require('../utils/searchNormalize')

const shipmentController = {
  list: asyncHandler(async (req, res) => {
    const { center_id, status, clearance_center_id, search, from, to, limit = 50, offset = 0 } = req.query
    const filters = {}
    if (center_id)            filters.center_id = parseInt(center_id, 10)
    if (status)               filters.status = status
    if (clearance_center_id)  filters.clearance_center_id = parseInt(clearance_center_id, 10)
    if (search?.trim())       filters.search = normalizeSearchQuery(search)
    if (from)                 filters.from = from
    if (to)                   filters.to = to

    const result = ShipmentService.list({
      ...filters,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    })

    res.json(apiResponse.paginated(result.rows, result.total, result.limit, result.offset))
  }),

  getById: asyncHandler(async (req, res) => {
    const shipment = ShipmentService.getById(parseInt(req.params.id, 10))
    res.json(apiResponse.success(shipment))
  }),

  create: asyncHandler(async (req, res) => {
    const shipment = ShipmentService.createShipment(req.body, req.user.id)
    res.status(201).json(apiResponse.success(shipment, 'تم تسجيل السيارة'))
  }),

  updateFields: asyncHandler(async (req, res) => {
    const shipment = ShipmentService.updateFields(
      parseInt(req.params.id, 10),
      req.body,
      req.user.id
    )
    res.json(apiResponse.success(shipment, 'تم تحديث الأقلام'))
  }),

  getProgress: asyncHandler(async (req, res) => {
    const progress = ShipmentService.getCompletionProgress(parseInt(req.params.id, 10))
    res.json(apiResponse.success(progress))
  }),

  post: asyncHandler(async (req, res) => {
    const result = ShipmentService.postShipment(parseInt(req.params.id, 10), req.user.id)
    res.json(apiResponse.success(result, 'تم ترحيل السيارة'))
  }),

  bulkPost: asyncHandler(async (req, res) => {
    const result = ShipmentService.bulkPost(req.body.shipment_ids, req.user.id)
    res.json(apiResponse.success(result, 'تم الترحيل'))
  }),

  deliver: asyncHandler(async (req, res) => {
    const shipment = ShipmentService.markDelivered(parseInt(req.params.id, 10), req.user.id)
    res.json(apiResponse.success(shipment, 'تم تسجيل التسليم'))
  }),

  readyToPost: asyncHandler(async (req, res) => {
    const { limit = 50, offset = 0 } = req.query
    const result = ShipmentService.getReadyToPost({
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    })
    res.json(apiResponse.paginated(result.rows, result.total, result.limit, result.offset))
  }),

  summary: asyncHandler(async (req, res) => {
    const statuses = ['pending', 'complete', 'posted', 'delivered']
    const summary = {}
    for (const status of statuses) {
      const row = ShipmentModel.sumGlobalByStatus(status)
      summary[status] = { count: row.count, total_value: row.total }
    }
    res.json(apiResponse.success(summary))
  }),
}

module.exports = shipmentController
