const CenterModel = require('../models/CenterModel')
const ShipmentModel = require('../models/ShipmentModel')
const TransactionModel = require('../models/TransactionModel')
const { buildDualStatement } = require('../engine/statement')
const { SHIPMENT_REQUIRED_FIELDS } = require('../config/constants')

class DualStatementService {
  /**
   * الكشف المزدوج لمركز تخليص (مخلص): جانب «المخلص» (ما ندفعه = cost_*) مقابل
   * جانب «التاجر» (ما نأخذه = price_*)، ومنه مربح الشركة.
   *
   * - الدفعات تُحسب من حركات «وارد» (type='in') فقط؛ أما القيود المُرحَّلة (out)
   *   فمأخوذة أصلاً من مجاميع السيارات، فلا تُحتسب كدفعات تجنباً للازدواج.
   *
   * @param {number} centerId معرّف المخلص
   * @returns {object}
   */
  getStatement(centerId) {
    const center = CenterModel.findById(centerId)

    const { rows: shipments } = ShipmentModel.listWithDetails({
      filters: { clearance_center_id: centerId },
      limit: 1000,
    })

    // دفعات المخلص: وارد على ذمته
    const { rows: brokerPayments } = TransactionModel.findByCenter(centerId, {
      type: 'in',
      limit: 1000,
    })

    // دفعات التجّار: وارد على ذمم التجّار المرتبطين بهذه السيارات
    const traderIds = [
      ...new Set(shipments.map((s) => s.center_id).filter(Boolean)),
    ]
    const traderPayments = []
    for (const id of traderIds) {
      const { rows } = TransactionModel.findByCenter(id, { type: 'in', limit: 1000 })
      traderPayments.push(...rows)
    }

    const statement = buildDualStatement({
      shipments,
      brokerPayments,
      traderPayments,
      requiredFields: SHIPMENT_REQUIRED_FIELDS.required,
    })

    return { clearance_center: center, ...statement }
  }
}

module.exports = new DualStatementService()
