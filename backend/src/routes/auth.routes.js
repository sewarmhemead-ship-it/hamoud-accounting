const express = require('express')
const authController = require('../controllers/authController')
const authMiddleware = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { loginSchema } = require('../validators/auth.validator')

const router = express.Router()

router.post('/login', validate(loginSchema), authController.login)
router.get('/me', authMiddleware, authController.me)

module.exports = router
