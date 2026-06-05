const express = require('express')
const presenceController = require('../controllers/presenceController')
const authMiddleware = require('../middleware/auth.middleware')

const router = express.Router()

router.use(authMiddleware)

router.post('/heartbeat', presenceController.heartbeat)
router.get('/online', presenceController.listOnline)

module.exports = router
