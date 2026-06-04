const ShipmentService = require('../services/ShipmentService')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const shipmentController = {
  list: asyncHandler(async (req, res) => {
    const { center_id, status, clearance_center_id, limit = 50, offset = 0 } = req.query
    const filters = {}
    if (center_id) filters.center_id = parseInt(center_id, 10)
    if (status) filters.status = status
    if (clearance_center_id) filters.clearance_center_id = parseInt(clearance_center_id, 10)

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
}

module.exports = shipmentController
