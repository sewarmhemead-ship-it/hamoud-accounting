const express = require('express')
const reportController = require('../controllers/reportController')
const inventoryController = require('../controllers/inventoryController')
const profitController = require('../controllers/profitController')
const authMiddleware = require('../middleware/auth.middleware')
const requirePermission = require('../middleware/requirePermission.middleware')
const requireAnyPermission = require('../middleware/requireAnyPermission.middleware')
const { validateQuery } = require('../middleware/validate.middleware')
const { periodRangeSchema } = require('../validators/report.validator')
const { PERM } = require('../config/permissions')

const router = express.Router()

router.get('/lookups', reportController.lookups)

router.use(authMiddleware)

router.get('/dashboard',          reportController.dashboard)
router.get('/notifications',      reportController.notifications)
router.get('/daily/:date', reportController.dailySummary)
router.get(
  '/daily/:date/xlsx',
  requirePermission(PERM.PROFIT_VIEW),
  profitController.dayReportXlsx
)
router.get(
  '/daily/:date/pdf',
  requirePermission(PERM.PROFIT_VIEW),
  profitController.dayReportPdf
)
router.get('/whatsapp/:centerId', reportController.whatsappStatement)

router.get('/period',       validateQuery(periodRangeSchema), reportController.periodReport)
router.get('/period.xlsx',  validateQuery(periodRangeSchema), reportController.periodReportXlsx)
router.get('/period.pdf',   validateQuery(periodRangeSchema), reportController.periodReportPdf)

router.get(
  '/inventory/:date.xlsx',
  requireAnyPermission(PERM.INVENTORY_MANAGE, PERM.REPORTS_EXPORT),
  inventoryController.reportXlsx
)
router.get(
  '/inventory/:date.pdf',
  requireAnyPermission(PERM.INVENTORY_MANAGE, PERM.REPORTS_EXPORT),
  inventoryController.reportPdf
)
router.get(
  '/inventory-range.xlsx',
  requireAnyPermission(PERM.INVENTORY_MANAGE, PERM.REPORTS_EXPORT),
  validateQuery(periodRangeSchema),
  inventoryController.rangeReportXlsx
)
router.get(
  '/inventory-range.pdf',
  requireAnyPermission(PERM.INVENTORY_MANAGE, PERM.REPORTS_EXPORT),
  validateQuery(periodRangeSchema),
  inventoryController.rangeReportPdf
)

module.exports = router
