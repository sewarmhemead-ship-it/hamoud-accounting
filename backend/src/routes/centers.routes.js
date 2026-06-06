const express = require('express')
const centerController = require('../controllers/centerController')
const authMiddleware = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const {
  createCenterSchema,
  updateCenterSchema,
} = require('../validators/center.validator')

const router = express.Router()

router.use(authMiddleware)

router.get('/reports/traders.zip', centerController.tradersReportZip)
router.get('/', centerController.list)
router.post('/', validate(createCenterSchema), centerController.create)
router.get('/:id', centerController.getById)
router.put('/:id', validate(updateCenterSchema), centerController.update)
router.get('/:id/balance', centerController.getBalance)
router.get('/:id/statement', centerController.getStatement)
router.get('/:id/clearance-statement', centerController.getClearanceStatement)
router.get('/:id/dual-statement', centerController.getDualStatement)
router.get('/:id/reports/dual.xlsx', centerController.dualStatementXlsx)
router.get('/:id/reports/dual.pdf', centerController.dualStatementPdf)
router.post('/:id/post-ready', centerController.postReady)

// تقارير التجار (معاينة JSON + تصدير Excel/PDF)
router.get('/:id/reports/trader', centerController.traderReport)
router.get('/:id/reports/profit', centerController.profitReport)
router.get('/:id/reports/trader.xlsx', centerController.traderReportXlsx)
router.get('/:id/reports/profit.xlsx', centerController.profitReportXlsx)
router.get('/:id/reports/trader.pdf', centerController.traderReportPdf)
router.get('/:id/reports/profit.pdf', centerController.profitReportPdf)

module.exports = router
