const express = require('express')
const authController = require('../controllers/authController')
const settingsController = require('../controllers/settingsController')
const authMiddleware = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { loginSchema } = require('../validators/auth.validator')
const rateLimit = require('../middleware/rateLimit.middleware')

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: 'محاولات تسجيل دخول كثيرة، انتظر 15 دقيقة' })

const router = express.Router()

router.post('/login', loginLimiter, validate(loginSchema), authController.login)
router.get('/me', authMiddleware, authController.me)
router.get('/branding', settingsController.getBranding)

module.exports = router
