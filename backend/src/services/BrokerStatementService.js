const CenterModel = require('../models/CenterModel')
const ShipmentModel = require('../models/ShipmentModel')
const TransactionModel = require('../models/TransactionModel')
const ShipmentService = require('./ShipmentService')
const { buildBrokerStatement } = require('../engine/statement')
const { SHIPMENT_REQUIRED_FIELDS, TX_CATEGORY } = require('../config/constants')

class BrokerStatementService {
  /**
   * كشف تخليص موحّد لمركز (مخلص غالباً): السيارات التي يخلّصها هذا المركز
   * (clearance_center_id) + الحركات على ذمته، بنفس ترتيبة كشوف Excel.
   *
   * @param {number} centerId
   * @returns {object} { center, ...statement }
   */
  getStatement(centerId) {
    const center = CenterModel.findById(centerId)

    const { rows: shipments } = ShipmentModel.findByBroker(centerId, { limit: 1000 })
    // الدفعات = حركات «وارد» (دفعات + مقاصة credit)؛ مقاصة debit = out منفصل
    const { rows: payments } = TransactionModel.findByCenter(centerId, {
      type: 'in',
      limit: 1000,
    })
    const { rows: offsetCharges } = TransactionModel.findByCenter(centerId, {
      type: 'out',
      category: TX_CATEGORY.OFFSET,
      limit: 1000,
    })

    const statement = buildBrokerStatement({
      shipments,
      payments,
      offsetCharges,
      centerType: center.type,
      requiredFields: SHIPMENT_REQUIRED_FIELDS.required,
    })

    return { center, ...statement }
  }

  /**
   * ترحيل كل السيارات «القابلة للترحيل» لهذا المركز دفعةً واحدة.
   *
   * @param {number} centerId
   * @param {number} userId
   * @returns {object} نتيجة الترحيل + الكشف المحدّث
   */
  postReady(centerId, userId) {
    CenterModel.findById(centerId)
    const { wip } = this.getStatement(centerId)
    const ids = wip.postable.ids

    const result = ShipmentService.bulkPost(ids, userId)
    return { ...result, statement: this.getStatement(centerId) }
  }
}

module.exports = new BrokerStatementService()
