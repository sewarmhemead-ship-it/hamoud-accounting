const express = require('express')
const reportController = require('../controllers/reportController')
const authMiddleware = require('../middleware/auth.middleware')

const router = express.Router()

router.get('/lookups', reportController.lookups)

router.use(authMiddleware)

router.get('/daily/:date', reportController.dailySummary)
router.get('/whatsapp/:centerId', reportController.whatsappStatement)

module.exports = router
