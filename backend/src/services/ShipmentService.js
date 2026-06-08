const ShipmentModel = require('../models/ShipmentModel')
const TransactionModel = require('../models/TransactionModel')
const { generateRef } = require('../utils/refGenerator')
const { nowISO, todayDB } = require('../utils/dates')
const { BusinessRuleError } = require('../utils/errors')
const {
  SHIPMENT_REQUIRED_FIELDS,
  SHIPMENT_STATUS,
  SHIPMENT_FIELD_LABELS,
  TX_CATEGORY,
  REF_PREFIX,
  CURRENCY,
} = require('../config/constants')
const {
  resolveTotalCost,
  COST_FIELDS,
  PRICE_FIELDS,
} = require('../engine/clearance')
const { classifyPostability } = require('../engine/statement')
const { syncLegacyFromDual, buildLegacySyncPatch } = require('../engine/dualLedger')
const { validateShipmentFinancials } = require('../engine/validation')
const { round2 } = require('../engine/numbers')
const { describeShipmentUpdate } = require('../utils/shipmentUpdateDisplay')

const FINANCIAL_FIELDS = [
  'tarseem',
  'tax_2pct',
  'service_fee',
  'workers',
  'clearance_fee',
  'syrian_driver',
  'turkish_transport',
  'internal_transport',
  'door_receipt',
  'other_expenses',
]

const DUAL_FIELDS = [...COST_FIELDS, ...PRICE_FIELDS]

class ShipmentService {
  /** يملأ tarseem/syrian_driver/clearance_fee من cost/price إن وُجدت قيم دون تكرار يدوي */
  repairLegacyFromDual(shipmentId, userId = null) {
    const shipment = ShipmentModel.findById(shipmentId)
    const patch = buildLegacySyncPatch(shipment)
    if (!Object.keys(patch).length) return shipment

    ShipmentModel.update(shipmentId, {
      ...patch,
      ...(userId ? { updated_by: userId } : {}),
    })
    return ShipmentModel.findById(shipmentId)
  }

  /** يصلّح legacy من المزدوج ويُرجع الصف مع progress محدّث */
  _mapRowWithProgress(row) {
    if (!row?.id) return row
    this.repairLegacyFromDual(row.id)
    const fresh = ShipmentModel.findById(row.id)
    const { missing, is_postable } = classifyPostability(fresh)
    return {
      ...row,
      tarseem: fresh.tarseem,
      syrian_driver: fresh.syrian_driver,
      clearance_fee: fresh.clearance_fee,
      total_cost: fresh.total_cost ?? row.total_cost,
      progress: { missing, is_complete: is_postable },
    }
  }

  getCompletionProgress(shipmentId) {
    this.repairLegacyFromDual(shipmentId)
    const shipment = ShipmentModel.findById(shipmentId)
    const { is_postable, missing } = classifyPostability(shipment)
    const required = SHIPMENT_REQUIRED_FIELDS.required.length

    return {
      required,
      filled: required - missing.length,
      missing,
      is_complete: is_postable,
      status: shipment.status,
      total_cost: resolveTotalCost(shipment).traderAmount,
    }
  }

  createShipment(data, userId) {
    validateShipmentFinancials(data)
    const ref_number = generateRef(REF_PREFIX.TRUCK)

    const financial = {}
    for (const field of FINANCIAL_FIELDS) {
      if (data[field] !== undefined && data[field] !== null) {
        financial[field] = data[field]
      }
    }

    // أعمدة الكشف المزدوج (cost_*/price_*) كما وردت
    const dual = {}
    for (const field of DUAL_FIELDS) {
      if (data[field] !== undefined && data[field] !== null) {
        dual[field] = data[field]
      }
    }
    const hasDual = Object.keys(dual).length > 0

    // عند الإدخال المزدوج: نعكس الأقلام الإلزامية القديمة من الجانبين كي تعمل
    // دورة الحياة (اكتمال/قابلية ترحيل) دون تكرار يدوي.
    Object.assign(financial, syncLegacyFromDual(financial, dual))

    const mergedForTotal = { ...financial, ...dual }
    const resolved = resolveTotalCost(mergedForTotal)
    const total_cost = resolved.traderAmount

    const shipment = ShipmentModel.create({
      ref_number,
      center_id: data.center_id,
      clearance_center_id: data.clearance_center_id || null,
      border_id: data.border_id,
      goods_type_id: data.goods_type_id || null,
      goods_name: data.goods_name || null,
      weight: data.weight || null,
      quantity: data.quantity || null,
      source: data.source,
      destination: data.destination,
      driver_name: data.driver_name || null,
      entry_date: data.entry_date,
      company_profit: data.company_profit ?? null,
      ...financial,
      ...dual,
      total_cost,
      status: SHIPMENT_STATUS.PENDING,
      notes: data.notes || null,
      created_by: userId,
    })

    return shipment
  }

  updateFields(shipmentId, fields, userId) {
    const shipment = ShipmentModel.findById(shipmentId)

    if (
      shipment.status === SHIPMENT_STATUS.POSTED ||
      shipment.status === SHIPMENT_STATUS.DELIVERED
    ) {
      throw new BusinessRuleError(
        'لا يمكن تعديل سيارة مُرحَّلة — أنشئ قيد تعديل منفصل'
      )
    }

    const { _note, ...updates } = fields
    validateShipmentFinancials(updates)

    return ShipmentModel.transaction(() => {
      for (const [field, newValue] of Object.entries(updates)) {
        if (
          !FINANCIAL_FIELDS.includes(field) &&
          !DUAL_FIELDS.includes(field) &&
          field !== 'notes' &&
          field !== 'company_profit'
        )
          continue
        const oldValue = shipment[field]
        if (oldValue !== newValue) {
          ShipmentModel.logUpdate({
            shipment_id: shipmentId,
            field_name: field,
            old_value: oldValue ?? null,
            new_value: newValue ?? null,
            note: _note || null,
            updated_by: userId,
          })
        }
      }

      const merged = { ...shipment, ...updates }
      const financialPatch = {}
      const dualPatch = {}
      for (const field of FINANCIAL_FIELDS) {
        if (merged[field] !== undefined) financialPatch[field] = merged[field]
      }
      for (const field of DUAL_FIELDS) {
        if (merged[field] !== undefined) dualPatch[field] = merged[field]
      }
      const syncedLegacy = syncLegacyFromDual(financialPatch, dualPatch)
      Object.assign(updates, syncedLegacy)

      const mergedAfterSync = { ...merged, ...syncedLegacy }
      updates.total_cost = resolveTotalCost(mergedAfterSync).traderAmount
      updates.updated_by = userId

      ShipmentModel.update(shipmentId, updates)

      return ShipmentModel.findWithDetails(shipmentId)
    })
  }

  postShipment(shipmentId, userId) {
    this.repairLegacyFromDual(shipmentId, userId)
    const shipment = ShipmentModel.findById(shipmentId)

    if (shipment.status === SHIPMENT_STATUS.POSTED) {
      throw new BusinessRuleError('السيارة مُرحَّلة مسبقاً')
    }
    if (shipment.status === SHIPMENT_STATUS.DELIVERED) {
      throw new BusinessRuleError('السيارة مُسلَّمة مسبقاً')
    }
    const { is_postable, missing } = classifyPostability(shipment)
    if (!is_postable) {
      throw new BusinessRuleError(
        `السيارة غير جاهزة للترحيل. الأقلام الناقصة: ${missing.join('، ')}`
      )
    }

    return ShipmentModel.transaction(() => {
      const now = new Date().toISOString()
      const entryDay =
        shipment.entry_date && String(shipment.entry_date).slice(0, 10)
      const postedAt = entryDay ? `${entryDay}T12:00:00.000Z` : now
      const { traderAmount, clearanceAmount } = resolveTotalCost(shipment)
      const noteBase = `تخليص ${shipment.goods_name || ''} ${shipment.source} → ${shipment.destination} - ${shipment.ref_number}`

      // قيد 1: على التاجر (مدين لنا بالفاتورة)
      const traderTx = TransactionModel.create({
        ref_number: generateRef(REF_PREFIX.TRANSACTION),
        date: postedAt,
        type: 'out',
        center_id: shipment.center_id,
        currency: CURRENCY.USD,
        amount: traderAmount,
        amount_usd: traderAmount,
        category: TX_CATEGORY.CLEARANCE,
        shipment_id: shipmentId,
        is_delivered: 0,
        notes: noteBase,
        created_by: userId,
      })

      // قيد 2: على المخلص (نحن مدينون له بالتكلفة) — فقط إن وُجد مركز تخليص
      let clearanceTx = null
      if (shipment.clearance_center_id) {
        clearanceTx = TransactionModel.create({
          ref_number: generateRef(REF_PREFIX.TRANSACTION),
          date: postedAt,
          type: 'out',
          center_id: shipment.clearance_center_id,
          currency: CURRENCY.USD,
          amount: clearanceAmount,
          amount_usd: clearanceAmount,
          category: TX_CATEGORY.CLEARANCE,
          shipment_id: shipmentId,
          is_delivered: 0,
          notes: noteBase,
          created_by: userId,
        })
      }

      ShipmentModel.update(shipmentId, {
        status: SHIPMENT_STATUS.POSTED,
        posted_at: postedAt,
        transaction_id: traderTx.id, // توافق خلفي مع markDelivered
        trader_transaction_id: traderTx.id,
        clearance_transaction_id: clearanceTx ? clearanceTx.id : null,
        total_cost: traderAmount,
        updated_by: userId,
      })

      return {
        shipment: ShipmentModel.findWithDetails(shipmentId),
        transaction: traderTx,
        trader_tx: traderTx,
        clearance_tx: clearanceTx,
        profit: round2(traderAmount - clearanceAmount),
        total: traderAmount,
      }
    })
  }

  bulkPost(shipmentIds, userId) {
    const results = []
    const errors = []

    for (const id of shipmentIds) {
      try {
        results.push(this.postShipment(id, userId))
      } catch (err) {
        errors.push({ id, message: err.message })
      }
    }

    return { results, errors }
  }

  markDelivered(shipmentId, userId) {
    const shipment = ShipmentModel.findById(shipmentId)

    if (shipment.status !== SHIPMENT_STATUS.POSTED) {
      throw new BusinessRuleError('يجب ترحيل السيارة أولاً قبل تسجيل التسليم')
    }

    return ShipmentModel.transaction(() => {
      ShipmentModel.update(shipmentId, {
        status: SHIPMENT_STATUS.DELIVERED,
        delivered_at: todayDB(),
        updated_by: userId,
      })

      const txIds = [
        shipment.trader_transaction_id || shipment.transaction_id,
        shipment.clearance_transaction_id,
      ].filter(Boolean)
      for (const txId of txIds) {
        TransactionModel.update(txId, { is_delivered: 1, updated_by: userId })
      }

      return ShipmentModel.findWithDetails(shipmentId)
    })
  }

  /**
   * إلغاء/حذف سيارة — يُحدّث WIP أو يعكس قيود الترحيل قبل الحذف الناعم.
   * pending/complete: حذف فقط. posted/delivered: حذف القيود المرتبطة ثم الحذف.
   */
  removeShipment(shipmentId, userId) {
    const shipment = ShipmentModel.findById(shipmentId)

    return ShipmentModel.transaction(() => {
      if (
        shipment.status === SHIPMENT_STATUS.POSTED ||
        shipment.status === SHIPMENT_STATUS.DELIVERED
      ) {
        const txs = TransactionModel.findByShipment(shipmentId)
        for (const tx of txs) {
          TransactionModel.softDelete(tx.id)
        }
      }

      ShipmentModel.softDelete(shipmentId)

      return {
        id: shipmentId,
        ref_number: shipment.ref_number,
        previous_status: shipment.status,
        reversed_transactions:
          shipment.status === SHIPMENT_STATUS.POSTED ||
          shipment.status === SHIPMENT_STATUS.DELIVERED,
      }
    })
  }

  getPendingByBroker(brokerId, { limit = 50, offset = 0 } = {}) {
    return ShipmentModel.findByBroker(brokerId, {
      limit,
      offset,
    })
  }

  _filterPostable(rows) {
    return rows
      .map((row) => this._mapRowWithProgress(row))
      .filter((row) => row.progress.is_complete)
  }

  countReadyToPost() {
    const { rows } = ShipmentModel.listWithDetails({
      filters: { status_in: [SHIPMENT_STATUS.PENDING, SHIPMENT_STATUS.COMPLETE] },
      limit: 10_000,
      offset: 0,
    })
    const postable = this._filterPostable(rows)
    const total_value = round2(
      postable.reduce((sum, row) => sum + (Number(row.total_cost) || 0), 0)
    )
    return { count: postable.length, total_value }
  }

  getReadyToPost({ limit = 50, offset = 0, search, from, to } = {}) {
    const { rows } = ShipmentModel.listWithDetails({
      filters: {
        status_in: [SHIPMENT_STATUS.PENDING, SHIPMENT_STATUS.COMPLETE],
        search,
        from,
        to,
      },
      limit: 10_000,
      offset: 0,
    })
    const postable = this._filterPostable(rows)
    return {
      rows: postable.slice(offset, offset + limit),
      total: postable.length,
      limit,
      offset,
    }
  }

  list(filters = {}) {
    const { limit = 50, offset = 0, ...rest } = filters
    const result = ShipmentModel.listWithDetails({ filters: rest, limit, offset })
    return {
      ...result,
      rows: result.rows.map((row) => this._mapRowWithProgress(row)),
    }
  }

  getById(id) {
    ShipmentModel.findById(id)
    this.repairLegacyFromDual(id)
    const shipment = ShipmentModel.findWithDetails(id)
    return {
      ...shipment,
      progress: this.getCompletionProgress(id),
      updates: ShipmentModel.getUpdates(id).map(describeShipmentUpdate),
    }
  }
}

module.exports = new ShipmentService()
