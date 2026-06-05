const express = require('express')
const chatController = require('../controllers/chatController')
const authMiddleware = require('../middleware/auth.middleware')

const router = express.Router()

router.use(authMiddleware)

router.get('/threads', chatController.listThreads)
router.get('/threads/:id/messages', chatController.getMessages)
router.post('/threads/direct', chatController.startDirect)
router.post('/threads/:id/messages', chatController.sendMessage)
router.get('/media/:id', chatController.serveMedia)

module.exports = router
