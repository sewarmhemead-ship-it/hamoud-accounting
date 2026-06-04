const express = require('express')
const shipmentController = require('../controllers/shipmentController')
const authMiddleware = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const {
  createShipmentSchema,
  updateFieldsSchema,
  bulkPostSchema,
} = require('../validators/shipment.validator')

const router = express.Router()

router.use(authMiddleware)

router.get('/', shipmentController.list)
router.get('/ready', shipmentController.readyToPost)
router.post('/bulk-post', validate(bulkPostSchema), shipmentController.bulkPost)
router.post('/', validate(createShipmentSchema), shipmentController.create)
router.get('/:id', shipmentController.getById)
router.get('/:id/progress', shipmentController.getProgress)
router.patch('/:id/fields', validate(updateFieldsSchema), shipmentController.updateFields)
router.post('/:id/post', shipmentController.post)
router.patch('/:id/deliver', shipmentController.deliver)

module.exports = router
