const express = require('express')
const profitController = require('../controllers/profitController')
const authMiddleware = require('../middleware/auth.middleware')
const requirePermission = require('../middleware/requirePermission.middleware')
const { validate } = require('../middleware/validate.middleware')
const { closeDaySchema, updateDaySchema } = require('../validators/profit.validator')
const { PERM } = require('../config/permissions')

const router = express.Router()

router.use(authMiddleware)

router.get('/monthly/:year/:month', requirePermission(PERM.PROFIT_VIEW), profitController.getMonthly)
router.get(
  '/export/month/:year/:month.xlsx',
  requirePermission(PERM.PROFIT_VIEW),
  profitController.monthReportXlsx
)
router.get(
  '/export/month/:year/:month/pdf',
  requirePermission(PERM.PROFIT_VIEW),
  profitController.monthReportPdf
)
router.get('/detail/:date', requirePermission(PERM.PROFIT_VIEW), profitController.dayDetail)
router.get(
  '/export/day/:date/xlsx',
  requirePermission(PERM.PROFIT_VIEW),
  profitController.dayReportXlsx
)
router.get(
  '/export/day/:date/pdf',
  requirePermission(PERM.PROFIT_VIEW),
  profitController.dayReportPdf
)
router.get('/preview/:date', requirePermission(PERM.PROFIT_VIEW), profitController.preview)
router.get('/:date', requirePermission(PERM.PROFIT_VIEW), profitController.getByDate)
router.post('/close', requirePermission(PERM.PROFIT_CLOSE), validate(closeDaySchema), profitController.closeDay)
router.put(
  '/:date',
  requirePermission(PERM.PROFIT_EDIT_CLOSED),
  validate(updateDaySchema),
  profitController.updateDay
)

module.exports = router
