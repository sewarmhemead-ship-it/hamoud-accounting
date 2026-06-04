const express = require('express')
const authRoutes = require('./auth.routes')
const centersRoutes = require('./centers.routes')
const transactionsRoutes = require('./transactions.routes')
const shipmentsRoutes = require('./shipments.routes')
const juiceRoutes = require('./juice.routes')
const profitRoutes = require('./profit.routes')
const inventoryRoutes = require('./inventory.routes')
const reportsRoutes = require('./reports.routes')
const calculationsRoutes = require('./calculations.routes')

const router = express.Router()

router.use('/auth', authRoutes)
router.use('/centers', centersRoutes)
router.use('/transactions', transactionsRoutes)
router.use('/shipments', shipmentsRoutes)
router.use('/juice', juiceRoutes)
router.use('/profit', profitRoutes)
router.use('/inventory', inventoryRoutes)
router.use('/reports', reportsRoutes)
router.use('/calculations', calculationsRoutes)

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'hamoud-accounting API' })
})

module.exports = router
