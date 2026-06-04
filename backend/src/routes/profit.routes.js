const express = require('express')
const profitController = require('../controllers/profitController')
const authMiddleware = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { closeDaySchema, updateDaySchema } = require('../validators/profit.validator')

const router = express.Router()

router.use(authMiddleware)

router.get('/monthly/:year/:month', profitController.getMonthly)
router.get('/preview/:date', profitController.preview)
router.get('/:date', profitController.getByDate)
router.post('/close', validate(closeDaySchema), profitController.closeDay)
router.put('/:date', validate(updateDaySchema), profitController.updateDay)

module.exports = router
