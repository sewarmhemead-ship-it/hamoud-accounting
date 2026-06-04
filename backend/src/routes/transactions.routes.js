const express = require('express')
const transactionController = require('../controllers/transactionController')
const authMiddleware = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const {
  createPaymentSchema,
  offsetSchema,
} = require('../validators/transaction.validator')

const router = express.Router()

router.use(authMiddleware)

router.get('/', transactionController.list)
router.get('/:id', transactionController.getById)
router.post('/payment', validate(createPaymentSchema), transactionController.createPayment)
router.post('/offset', validate(offsetSchema), transactionController.offset)
router.delete('/:id', transactionController.softDelete)

module.exports = router
