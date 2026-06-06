const express = require('express')
const authRoutes = require('./auth.routes')
const centersRoutes = require('./centers.routes')
const transactionsRoutes = require('./transactions.routes')
const shipmentsRoutes = require('./shipments.routes')
const profitRoutes = require('./profit.routes')
const inventoryRoutes = require('./inventory.routes')
const reportsRoutes = require('./reports.routes')
const calculationsRoutes = require('./calculations.routes')
const usersRoutes = require('./users.routes')
const adminRoutes = require('./admin.routes')
const profileRoutes = require('./profile.routes')
const chatRoutes = require('./chat.routes')
const presenceRoutes = require('./presence.routes')
const assistantRoutes = require('./assistant.routes')

const router = express.Router()

router.use('/auth', authRoutes)
router.use('/centers', centersRoutes)
router.use('/transactions', transactionsRoutes)
router.use('/shipments', shipmentsRoutes)
router.use('/profit', profitRoutes)
router.use('/inventory', inventoryRoutes)
router.use('/reports', reportsRoutes)
router.use('/calculations', calculationsRoutes)
router.use('/users', usersRoutes)
router.use('/admin', adminRoutes)
router.use('/profile', profileRoutes)
router.use('/chat', chatRoutes)
router.use('/presence', presenceRoutes)
router.use('/assistant', assistantRoutes)

router.get('/health', (req, res) => {
  const commit =
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.RAILWAY_GIT_COMMIT ||
    process.env.GIT_COMMIT ||
    null
  res.json({
    success: true,
    message: 'hamoud-accounting API',
    version: commit ? String(commit).slice(0, 7) : 'local',
    modules: ['assistant', 'chat', 'profile', 'backup', 'profit', 'shipments'],
  })
})

module.exports = router
