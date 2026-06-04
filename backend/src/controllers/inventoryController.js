const InventoryService = require('../services/InventoryService')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const inventoryController = {
  createSnapshot: asyncHandler(async (req, res) => {
    const { snapshot_date, label } = req.body
    const snapshots = InventoryService.createSnapshot(snapshot_date, label, req.user.id)
    res.status(201).json(apiResponse.success(snapshots, 'تم إنشاء الجرد'))
  }),

  getByDate: asyncHandler(async (req, res) => {
    const snapshots = InventoryService.getByDate(req.params.date)
    res.json(apiResponse.success(snapshots))
  }),
}

module.exports = inventoryController
