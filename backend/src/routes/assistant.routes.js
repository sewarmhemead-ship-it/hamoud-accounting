const express = require('express')
const assistantController = require('../controllers/assistantController')
const authMiddleware = require('../middleware/auth.middleware')

const router = express.Router()
router.use(authMiddleware)

router.get('/hints', assistantController.hints)
router.post('/ask', assistantController.ask)

module.exports = router
