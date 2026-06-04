const TransactionModel = require('../models/TransactionModel')
const ShipmentModel = require('../models/ShipmentModel')
const { CURRENCY } = require('../config/constants')
const { convertToUsd } = require('../engine/currency')
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

  createPayment(data, userId) {
    const { amount_usd, exchange_rate } = convertToUsd(
      data.amount,
      data.currency || CURRENCY.USD,
      data.exchange_rate
    )

    return TransactionModel.create({
      ref_number: data.ref_number,
      date: data.date,
      type: 'in',
      center_id: data.center_id,
      currency: data.currency || CURRENCY.USD,
      amount: data.amount,
      amount_usd,
      exchange_rate,
      category: data.category || 'payment',
      is_delivered: 1,
      notes: data.notes || null,
      created_by: userId,
    })
  }

  createManualOut(data, userId) {
    const { amount_usd, exchange_rate } = convertToUsd(
      data.amount,
      data.currency || CURRENCY.USD,
      data.exchange_rate
    )

    return TransactionModel.create({
      ref_number: data.ref_number,
      date: data.date,
      type: 'out',
      center_id: data.center_id,
      currency: data.currency || CURRENCY.USD,
      amount: data.amount,
      amount_usd,
      exchange_rate,
      category: data.category || 'adjustment',
      is_delivered: 1,
      notes: data.notes || null,
      created_by: userId,
    })
  }

  offsetCenters(fromCenterId, toCenterId, amount, userId, notes, refOut, refIn) {
    const { getDatabase } = require('../config/database')
    const db = getDatabase()

    const offset = db.transaction(() => {
      const outTx = TransactionModel.create({
        ref_number: refOut,
        date: new Date().toISOString(),
        type: 'in',
        center_id: fromCenterId,
        currency: CURRENCY.USD,
        amount,
        amount_usd: amount,
        category: 'offset',
        is_delivered: 1,
        notes: notes || 'مقاصة',
        created_by: userId,
      })

      const inTx = TransactionModel.create({
        ref_number: refIn,
        date: new Date().toISOString(),
        type: 'out',
        center_id: toCenterId,
        currency: CURRENCY.USD,
        amount,
        amount_usd: amount,
        category: 'offset',
        is_delivered: 1,
        notes: notes || 'مقاصة',
        created_by: userId,
      })

      return { out: outTx, in: inTx }
    })

    return offset()
  }
}

module.exports = new AccountingService()
