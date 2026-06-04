const { getDatabase } = require('../config/database')
const ShipmentModel = require('../models/ShipmentModel')
const TransactionModel = require('../models/TransactionModel')
const { generateRef } = require('../utils/refGenerator')
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
  calculateShipmentTotal,
  calculateCostTotal,
  calculatePriceTotal,
  COST_FIELDS,
  PRICE_FIELDS,
} = require('../engine/clearance')
const { validateShipmentFinancials } = require('../engine/validation')
const { round2 } = require('../engine/numbers')

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
  calculateTotal(shipment) {
    return calculateShipmentTotal(shipment)
  }

  checkCompletion(shipment) {
    return SHIPMENT_REQUIRED_FIELDS.required.every(
      (field) => shipment[field] !== null && shipment[field] !== undefined
    )
  }

  getMissingFields(shipment) {
    return SHIPMENT_REQUIRED_FIELDS.required
      .filter((f) => shipment[f] === null || shipment[f] === undefined)
      .map((f) => SHIPMENT_FIELD_LABELS[f] || f)
  }

  getCompletionProgress(shipmentId) {
    const shipment = ShipmentModel.findById(shipmentId)
    const missing = this.getMissingFields(shipment)
    const required = SHIPMENT_REQUIRED_FIELDS.required.length

    return {
      required,
      filled: required - missing.length,
      missing,
      is_complete: this.checkCompletion(shipment),
      status: shipment.status,
      total_cost: this.calculateTotal(shipment),
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
    if (hasDual) {
      if (financial.tarseem == null && (dual.cost_tarseem != null || dual.price_tarseem != null)) {
        financial.tarseem = dual.cost_tarseem ?? dual.price_tarseem
      }
      if (
        financial.clearance_fee == null &&
        (dual.cost_clearance_fee != null || dual.price_clearance_fee != null)
      ) {
        financial.clearance_fee = dual.cost_clearance_fee ?? dual.price_clearance_fee
      }
      if (
        financial.syrian_driver == null &&
        (dual.price_syrian_driver != null || dual.cost_turkish_driver != null)
      ) {
        financial.syrian_driver = dual.price_syrian_driver ?? dual.cost_turkish_driver
      }
    }

    // ملاحظة: لا تُحتسب ضريبة 2% تلقائياً — فهي مدموجة أصلاً في الترسيم لدى المخلص
    // (مثال باب الهوى: المجموع = ترسيم + سائق + تخليص بدون أي إضافة).
    // يبقى tax_2pct حقلاً اختيارياً يُدخَل يدوياً عند الحاجة فقط.

    // المجموع: عند المزدوج نعتمد فاتورة التاجر (price)، وإلا المجموع الكلاسيكي.
    let total_cost = 0
    if (hasDual) {
      const priceTotal = calculatePriceTotal(dual)
      total_cost = priceTotal || calculateCostTotal(dual)
    } else if (Object.keys(financial).length) {
      total_cost = this.calculateTotal({ ...financial, tarseem: financial.tarseem ?? null })
    }

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
      ...financial,
      ...dual,
      total_cost,
      status: SHIPMENT_STATUS.PENDING,
      notes: data.notes || null,
      created_by: userId,
    })

    if (this.checkCompletion(shipment)) {
      return ShipmentModel.update(shipment.id, {
        status: SHIPMENT_STATUS.COMPLETE,
        completed_at: new Date().toISOString(),
        updated_by: userId,
      })
    }

    return shipment
  }

  updateFields(shipmentId, fields, userId) {
    const db = getDatabase()
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

    const update = db.transaction(() => {
      for (const [field, newValue] of Object.entries(updates)) {
        if (
          !FINANCIAL_FIELDS.includes(field) &&
          !DUAL_FIELDS.includes(field) &&
          field !== 'notes'
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

      // لا إعادة احتساب لضريبة 2% — مدموجة في الترسيم (راجع createShipment)

      // المجموع: عند وجود أعمدة مزدوجة نعتمد فاتورة التاجر (price)، وإلا الكلاسيكي.
      const merged = { ...shipment, ...updates }
      const priceTotal = calculatePriceTotal(merged)
      const costTotal = calculateCostTotal(merged)
      const usesDual = priceTotal > 0 || costTotal > 0
      updates.total_cost = usesDual
        ? priceTotal || costTotal
        : this.calculateTotal(merged)
      updates.updated_by = userId

      ShipmentModel.update(shipmentId, updates)
      const updated = ShipmentModel.findById(shipmentId)

      if (this.checkCompletion(updated)) {
        if (updated.status === SHIPMENT_STATUS.PENDING) {
          ShipmentModel.update(shipmentId, {
            status: SHIPMENT_STATUS.COMPLETE,
            completed_at: new Date().toISOString(),
            updated_by: userId,
          })
        }
      } else if (updated.status === SHIPMENT_STATUS.COMPLETE) {
        ShipmentModel.update(shipmentId, {
          status: SHIPMENT_STATUS.PENDING,
          completed_at: null,
          updated_by: userId,
        })
      }

      return ShipmentModel.findWithDetails(shipmentId)
    })

    return update()
  }

  postShipment(shipmentId, userId) {
    const db = getDatabase()
    const shipment = ShipmentModel.findById(shipmentId)

    if (shipment.status === SHIPMENT_STATUS.POSTED) {
      throw new BusinessRuleError('السيارة مُرحَّلة مسبقاً')
    }

    if (shipment.status === SHIPMENT_STATUS.DELIVERED) {
      throw new BusinessRuleError('السيارة مُسلَّمة مسبقاً')
    }

    if (shipment.status !== SHIPMENT_STATUS.COMPLETE) {
      const missing = this.getMissingFields(shipment)
      throw new BusinessRuleError(
        `السيارة غير مكتملة. الأقلام الناقصة: ${missing.join('، ')}`
      )
    }

    const post = db.transaction(() => {
      const now = new Date().toISOString()

      // الكشف المزدوج: ما نأخذه من التاجر (price_*) مقابل ما ندفعه للمخلص (cost_*).
      // التوافق الخلفي: السيارات القديمة بلا أعمدة مزدوجة تعتمد المجموع الكلاسيكي.
      const costTotal = calculateCostTotal(shipment)
      const priceTotal = calculatePriceTotal(shipment)
      const usesDual = costTotal > 0 || priceTotal > 0
      const legacyTotal = this.calculateTotal(shipment)
      const traderAmount = usesDual ? priceTotal : legacyTotal
      const clearanceAmount = usesDual ? costTotal : legacyTotal

      const noteBase = `تخليص ${shipment.goods_name || ''} ${shipment.source} → ${shipment.destination} - ${shipment.ref_number}`

      // قيد 1: على التاجر (مدين لنا بالفاتورة)
      const traderTx = TransactionModel.create({
        ref_number: generateRef(REF_PREFIX.TRANSACTION),
        date: now,
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
          date: now,
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
        posted_at: now,
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

    return post()
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
    const db = getDatabase()
    const shipment = ShipmentModel.findById(shipmentId)

    if (shipment.status !== SHIPMENT_STATUS.POSTED) {
      throw new BusinessRuleError('يجب ترحيل السيارة أولاً قبل تسجيل التسليم')
    }

    const deliver = db.transaction(() => {
      const deliveredAt = new Date().toISOString().split('T')[0]

      ShipmentModel.update(shipmentId, {
        status: SHIPMENT_STATUS.DELIVERED,
        delivered_at: deliveredAt,
        updated_by: userId,
      })

      // تسوية قيدَي الترحيل (التاجر + المخلص) إن وُجدا
      const txIds = [
        shipment.trader_transaction_id || shipment.transaction_id,
        shipment.clearance_transaction_id,
      ].filter(Boolean)
      for (const txId of txIds) {
        TransactionModel.update(txId, { is_delivered: 1, updated_by: userId })
      }

      return ShipmentModel.findWithDetails(shipmentId)
    })

    return deliver()
  }

  getPendingByBroker(brokerId, { limit = 50, offset = 0 } = {}) {
    return ShipmentModel.findByBroker(brokerId, {
      limit,
      offset,
    })
  }

  getReadyToPost({ limit = 50, offset = 0 } = {}) {
    return ShipmentModel.findReadyToPost({ limit, offset })
  }

  list(filters = {}) {
    const { limit = 50, offset = 0, ...rest } = filters
    return ShipmentModel.listWithDetails({ filters: rest, limit, offset })
  }

  getById(id) {
    ShipmentModel.findById(id)
    const shipment = ShipmentModel.findWithDetails(id)
    return {
      ...shipment,
      progress: this.getCompletionProgress(id),
      updates: ShipmentModel.getUpdates(id),
    }
  }
}

module.exports = new ShipmentService()
