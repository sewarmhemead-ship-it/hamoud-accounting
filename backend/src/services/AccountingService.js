const TransactionModel = require('../models/TransactionModel')
const ShipmentModel = require('../models/ShipmentModel')
const { CURRENCY } = require('../config/constants')
const { convertToUsd } = require('../engine/currency')
const { nowISO } = require('../utils/dates')
const {
  calculateCenterBalance,
  calculateGrandTotal,
} = require('../engine/balance')

class AccountingService {
  getCenterBalance(centerId, currency = CURRENCY.USD) {
    const { total_out, total_in } = TransactionModel.sumByCenter(centerId, currency)

    return {
      total_out,
      total_in,
      balance: calculateCenterBalance(total_out, total_in),
      currency,
    }
  }

  getCenterFullStatement(centerId) {
    const balance = this.getCenterBalance(centerId)
    const postedUndelivered = ShipmentModel.sumByCenterAndStatus(centerId, 'posted')
    const wip = ShipmentModel.sumByCenterAndStatuses(centerId, ['pending', 'complete'])

    return {
      ...balance,
      posted_undelivered_count: postedUndelivered.count,
      posted_undelivered_value: postedUndelivered.total,
      wip_count: wip.count,
      wip_value: wip.total,
      grand_total: calculateGrandTotal(balance.balance, postedUndelivered.total),
    }
  }

  getCenterStatement(centerId, filters = {}) {
    const summary = this.getCenterFullStatement(centerId)
    const { rows, total } = TransactionModel.findByCenter(centerId, filters)

    return {
      summary,
      transactions: rows,
      total,
    }
  }

  // بناء قيد معاملة — المصدر الموحّد لـ createPayment و createManualOut
  _buildTx(data, type, userId) {
    const { amount_usd, exchange_rate } = convertToUsd(
      data.amount,
      data.currency || CURRENCY.USD,
      data.exchange_rate
    )
    const defaultCategory = type === 'in' ? 'payment' : 'adjustment'
    return TransactionModel.create({
      ref_number:   data.ref_number,
      date:         data.date,
      type,
      center_id:    data.center_id,
      currency:     data.currency || CURRENCY.USD,
      amount:       data.amount,
      amount_usd,
      exchange_rate,
      category:     data.category || defaultCategory,
      is_delivered: 1,
      notes:        data.notes || null,
      created_by:   userId,
    })
  }

  createPayment(data, userId) {
    return this._buildTx(data, 'in', userId)
  }

  createManualOut(data, userId) {
    return this._buildTx(data, 'out', userId)
  }

  offsetCenters(fromCenterId, toCenterId, amount, userId, notes, refOut, refIn) {
    const baseData = {
      currency: CURRENCY.USD,
      amount,
      amount_usd: amount,
      exchange_rate: 1,
      category: 'offset',
      notes: notes || 'مقاصة',
    }

    return TransactionModel.transaction(() => {
      const outTx = TransactionModel.create({
        ...baseData,
        ref_number: refOut,
        date:       nowISO(),
        type:       'in',
        center_id:  fromCenterId,
        created_by: userId,
      })
      const inTx = TransactionModel.create({
        ...baseData,
        ref_number: refIn,
        date:       nowISO(),
        type:       'out',
        center_id:  toCenterId,
        created_by: userId,
      })
      return { out: outTx, in: inTx }
    })
  }
}

module.exports = new AccountingService()
