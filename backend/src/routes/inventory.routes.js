const express = require('express')
const inventoryController = require('../controllers/inventoryController')
const authMiddleware = require('../middleware/auth.middleware')
const requirePermission = require('../middleware/requirePermission.middleware')
const requireAnyPermission = require('../middleware/requireAnyPermission.middleware')
const { validate, validateQuery } = require('../middleware/validate.middleware')
const { createSnapshotSchema, inventoryRangeSchema } = require('../validators/inventory.validator')
const { PERM } = require('../config/permissions')

const router = express.Router()

router.use(authMiddleware)

const canView = requireAnyPermission(
  PERM.INVENTORY_MANAGE,
  PERM.CENTERS_VIEW,
  PERM.REPORTS_VIEW
)
const canExport = requireAnyPermission(PERM.INVENTORY_MANAGE, PERM.REPORTS_EXPORT)

router.get('/live', canView, inventoryController.livePreview)
router.get('/dates', canView, inventoryController.listDates)
router.get('/latest', canView, inventoryController.latest)
router.get('/range', canView, validateQuery(inventoryRangeSchema), inventoryController.getRange)
router.get(
  '/export/range.xlsx',
  canExport,
  validateQuery(inventoryRangeSchema),
  inventoryController.rangeReportXlsx
)
router.get(
  '/export/range.pdf',
  canExport,
  validateQuery(inventoryRangeSchema),
  inventoryController.rangeReportPdf
)
router.get('/snapshots/:date', canView, inventoryController.getByDate)
router.get('/snapshots/:date/compare', canView, inventoryController.compare)
router.get('/export/live/xlsx', canExport, inventoryController.reportLiveXlsx)
router.get('/export/live/pdf', canExport, inventoryController.reportLivePdf)
router.get('/export/:date/xlsx', canExport, inventoryController.reportXlsx)
router.get('/export/:date/pdf', canExport, inventoryController.reportPdf)

router.post(
  '/snapshots',
  requirePermission(PERM.INVENTORY_MANAGE),
  validate(createSnapshotSchema),
  inventoryController.createSnapshot
)

module.exports = router
