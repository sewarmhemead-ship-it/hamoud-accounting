const express = require('express')
const juiceController = require('../controllers/juiceController')
const authMiddleware = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { createJuiceSchema } = require('../validators/juice.validator')

const router = express.Router()

router.use(authMiddleware)

router.get('/', juiceController.list)
router.post('/preview', validate(createJuiceSchema), juiceController.preview)
router.post('/', validate(createJuiceSchema), juiceController.create)

module.exports = router
