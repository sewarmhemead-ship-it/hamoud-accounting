const express = require('express')
const usersController = require('../controllers/usersController')
const authMiddleware = require('../middleware/auth.middleware')
const requireAdmin = require('../middleware/requireAdmin.middleware')

const router = express.Router()

router.use(authMiddleware)
router.use(requireAdmin)

router.get('/perm-config', usersController.permConfig)
router.post('/apply-permissions-template', usersController.applyPermissionsTemplate)
router.get('/', usersController.list)
router.post('/', usersController.create)
router.put('/:id', usersController.update)
router.delete('/:id', usersController.remove)

module.exports = router
