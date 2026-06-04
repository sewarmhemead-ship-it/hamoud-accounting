const JuiceShipmentModel = require('../models/JuiceShipmentModel')
const { BusinessRuleError } = require('../utils/errors')
const { CalculationError } = require('../engine/errors')
const { calculateJuiceProfit } = require('../engine/juice')
const { generateRef } = require('../utils/refGenerator')

class JuiceService {
  calculate(data) {
    try {
      return calculateJuiceProfit(data)
    } catch (err) {
      if (err instanceof CalculationError) {
        throw new BusinessRuleError(err.message)
      }
      throw err
    }
  }

  create(data, userId) {
    const calc = this.calculate(data)
    const ref_number = generateRef('JCE')

    return JuiceShipmentModel.create({
      ref_number,
      date: data.date,
      product_type: data.product_type,
      units_sent: data.units_sent,
      units_lost: data.units_lost || 0,
      units_received: calc.units_received,
      capital: data.capital || 0,
      turkish_transport: data.turkish_transport || 0,
      tarseem: data.tarseem || 0,
      workers: data.workers || 0,
      clearance_fee: data.clearance_fee || 0,
      driver_cost: data.driver_cost || 0,
      cost_per_unit: calc.cost_per_unit,
      sale_price: data.sale_price,
      profit_per_unit: calc.profit_per_unit,
      total_profit: calc.total_profit,
      center_id: data.center_id,
      driver: data.driver || null,
      border_id: data.border_id || null,
      notes: data.notes || null,
      created_by: userId,
    })
  }

  list(filters = {}) {
    const { limit = 50, offset = 0, center_id } = filters
    if (center_id) {
      return JuiceShipmentModel.findByCenter(center_id, { limit, offset })
    }
    return JuiceShipmentModel.findAll({ limit, offset })
  }
}

module.exports = new JuiceService()
