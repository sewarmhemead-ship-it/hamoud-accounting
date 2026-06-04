const express = require('express')
const calculationsController = require('../controllers/calculationsController')
const authMiddleware = require('../middleware/auth.middleware')

const router = express.Router()

router.use(authMiddleware)

// حاسبات معاينة (لا تحفظ شيئاً) — تستدعي محرك الحسابات مباشرةً
router.post('/shipment-total', calculationsController.shipmentTotal)
router.post('/customs-fee', calculationsController.customsFee)
router.post('/broker-margin', calculationsController.brokerMargin)
router.post('/flour-line', calculationsController.flourLine)
router.post('/juice', calculationsController.juice)
router.post('/daily-profit', calculationsController.dailyProfit)
router.post('/currency', calculationsController.currency)

module.exports = router
