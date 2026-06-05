const express = require('express')
const profileController = require('../controllers/profileController')
const authMiddleware = require('../middleware/auth.middleware')

const router = express.Router()

router.use(authMiddleware)

router.get('/directory', profileController.listDirectory)
router.get('/me', profileController.getMe)
router.put('/me', profileController.updateMe)
router.post('/avatar', profileController.uploadAvatar)
router.get('/avatar/:filename', profileController.serveAvatar)
router.get('/:userId', profileController.getByUserId)

module.exports = router
