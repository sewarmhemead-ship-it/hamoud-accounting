const express = require('express')
const shipmentController = require('../controllers/shipmentController')
const authMiddleware = require('../middleware/auth.middleware')
const auditMiddleware = require('../middleware/audit.middleware')
const requirePermission = require('../middleware/requirePermission.middleware')
const { PERM } = require('../config/permissions')
const { validate } = require('../middleware/validate.middleware')
const {
  createShipmentSchema,
  updateFieldsSchema,
  bulkPostSchema,
} = require('../validators/shipment.validator')

const router = express.Router()

router.use(authMiddleware)

router.get('/summary', shipmentController.summary)
router.get('/', shipmentController.list)
router.get('/ready', shipmentController.readyToPost)
router.post('/bulk-post', requirePermission(PERM.SHIPMENTS_POST), validate(bulkPostSchema), auditMiddleware('bulk_post', 'shipment'), shipmentController.bulkPost)
router.post('/', requirePermission(PERM.SHIPMENTS_CREATE), validate(createShipmentSchema), auditMiddleware('create', 'shipment'), shipmentController.create)
router.get('/:id', requirePermission(PERM.SHIPMENTS_VIEW), shipmentController.getById)
router.get('/:id/progress', requirePermission(PERM.SHIPMENTS_VIEW), shipmentController.getProgress)
router.patch('/:id/fields', requirePermission(PERM.SHIPMENTS_EDIT), validate(updateFieldsSchema), auditMiddleware('update', 'shipment'), shipmentController.updateFields)
router.post('/:id/post', requirePermission(PERM.SHIPMENTS_POST), auditMiddleware('post', 'shipment'), shipmentController.post)
router.patch('/:id/deliver', requirePermission(PERM.SHIPMENTS_DELIVER), auditMiddleware('deliver', 'shipment'), shipmentController.deliver)

module.exports = router
