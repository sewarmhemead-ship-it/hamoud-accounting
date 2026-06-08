const express = require('express')
const adminController = require('../controllers/adminController')
const usersController = require('../controllers/usersController')
const settingsController = require('../controllers/settingsController')
const backupController = require('../controllers/backupController')
const authMiddleware = require('../middleware/auth.middleware')
const requireAdmin = require('../middleware/requireAdmin.middleware')

const router = express.Router()
router.use(authMiddleware)
router.use(requireAdmin)

router.get('/stats', adminController.stats)
router.get('/settings', settingsController.getAdmin)
router.put('/settings', settingsController.putAdmin)
router.get('/perm-config', usersController.permConfig)

router.get('/borders',       adminController.listBorders)
router.post('/borders',      adminController.createBorder)
router.put('/borders/:id',   adminController.updateBorder)

router.get('/goods-types',      adminController.listGoodsTypes)
router.post('/goods-types',     adminController.createGoodsType)
router.put('/goods-types/:id',  adminController.updateGoodsType)

router.get('/sources',       adminController.listSources)
router.post('/sources',      adminController.createSource)
router.put('/sources/:id',   adminController.updateSource)

router.get('/destinations',      adminController.listDestinations)
router.post('/destinations',     adminController.createDestination)
router.put('/destinations/:id',  adminController.updateDestination)

router.get('/audit-log', adminController.auditLog)

router.get('/backup/status', backupController.status)
router.post('/backup/run', backupController.run)
router.get('/backup/download', backupController.download)

module.exports = router
