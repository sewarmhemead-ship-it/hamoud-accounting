const express = require('express')
const inventoryController = require('../controllers/inventoryController')
const authMiddleware = require('../middleware/auth.middleware')

const router = express.Router()

router.use(authMiddleware)

router.post('/snapshots', inventoryController.createSnapshot)
router.get('/snapshots/:date', inventoryController.getByDate)

module.exports = router
