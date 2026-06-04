const JuiceService = require('../services/JuiceService')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const juiceController = {
  list: asyncHandler(async (req, res) => {
    const { center_id, limit = 50, offset = 0 } = req.query
    const result = JuiceService.list({
      center_id: center_id ? parseInt(center_id, 10) : undefined,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    })
    res.json(apiResponse.paginated(result.rows, result.total, result.limit, result.offset))
  }),

  create: asyncHandler(async (req, res) => {
    const shipment = JuiceService.create(req.body, req.user.id)
    res.status(201).json(apiResponse.success(shipment, 'تم تسجيل شحنة طازج'))
  }),

  preview: asyncHandler(async (req, res) => {
    const calc = JuiceService.calculate(req.body)
    res.json(apiResponse.success(calc))
  }),
}

module.exports = juiceController
