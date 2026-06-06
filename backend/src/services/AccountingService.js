const TransactionModel = require('../models/TransactionModel')
const ShipmentModel = require('../models/ShipmentModel')
const CenterModel = require('../models/CenterModel')
const { CURRENCY, CENTER_TYPE, TX_CATEGORY } = require('../config/constants')
const { convertToUsd } = require('../engine/currency')
const { nowISO } = require('../utils/dates')
const { round2 } = require('../engine/numbers')
const {
  calculateCenterBalance,
  calculateGrandTotal,
} = require('../engine/balance')

function buildOffsetNotes(fromCenter, toCenter, amount, userNotes) {
  const amt = round2(amount)
  const base = `مقاصة: خصمنا ${amt}$ من «${fromCenter.name}» وأضفنا ${amt}$ على «${toCenter.name}»`
  if (userNotes?.trim()) {
    return `${base} — ${userNotes.trim()}`
  }
  return base
}

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
    const center = CenterModel.findById(centerId)
    const isBroker = center?.type === CENTER_TYPE.BROKER
    const balance = this.getCenterBalance(centerId)

    const postedUndelivered = isBroker
      ? ShipmentModel.sumByClearanceCenterAndStatus(centerId, 'posted')
      : ShipmentModel.sumTraderByCenterAndStatus(centerId, 'posted')
    const wip = isBroker
      ? ShipmentModel.sumByClearanceCenterAndStatuses(centerId, ['pending', 'complete'])
      : ShipmentModel.sumTraderByCenterAndStatuses(centerId, ['pending', 'complete'])

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
    const fromCenter = CenterModel.findById(fromCenterId)
    const toCenter = CenterModel.findById(toCenterId)
    const offsetNotes = buildOffsetNotes(fromCenter, toCenter, amount, notes)
    const pairRef = refOut || refIn

    const baseData = {
      currency: CURRENCY.USD,
      amount,
      amount_usd: amount,
      exchange_rate: 1,
      category: TX_CATEGORY.OFFSET,
      is_delivered: 1,
      notes: offsetNotes,
    }

    return TransactionModel.transaction(() => {
      const creditTx = TransactionModel.create({
        ...baseData,
        ref_number: refOut,
        date:       nowISO(),
        type:       'in',
        center_id:  fromCenterId,
        notes:      `${offsetNotes} [${pairRef}]`,
        created_by: userId,
      })
      const debitTx = TransactionModel.create({
        ...baseData,
        ref_number: refIn,
        date:       nowISO(),
        type:       'out',
        center_id:  toCenterId,
        notes:      `${offsetNotes} [${pairRef}]`,
        created_by: userId,
      })
      return { out: creditTx, in: debitTx, credit: creditTx, debit: debitTx, notes: offsetNotes }
    })
  }
}

module.exports = new AccountingService()
