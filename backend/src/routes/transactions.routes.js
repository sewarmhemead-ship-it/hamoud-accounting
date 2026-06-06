const express = require('express')
const transactionController = require('../controllers/transactionController')
const authMiddleware = require('../middleware/auth.middleware')
const auditMiddleware = require('../middleware/audit.middleware')
const requirePermission = require('../middleware/requirePermission.middleware')
const { PERM } = require('../config/permissions')
const { validate } = require('../middleware/validate.middleware')
const {
  createPaymentSchema,
  offsetSchema,
  updateTransactionSchema,
} = require('../validators/transaction.validator')

const router = express.Router()

router.use(authMiddleware)

router.get('/', transactionController.list)
router.get('/:id', transactionController.getById)
router.post('/payment', requirePermission(PERM.PAYMENTS_CREATE), validate(createPaymentSchema), auditMiddleware('payment', 'transaction'), transactionController.createPayment)
router.post('/offset', requirePermission(PERM.OFFSET), validate(offsetSchema), auditMiddleware('offset', 'transaction'), transactionController.offset)
router.put('/:id', requirePermission(PERM.TRANSACTIONS_EDIT), validate(updateTransactionSchema), auditMiddleware('update', 'transaction'), transactionController.update)
router.delete('/:id', requirePermission(PERM.PAYMENTS_DELETE), auditMiddleware('delete', 'transaction'), transactionController.softDelete)

module.exports = router
