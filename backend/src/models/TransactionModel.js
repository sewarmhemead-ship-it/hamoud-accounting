const BaseModel = require('./BaseModel')
const { buildTransactionListFilters } = require('./transactionListQuery')

class TransactionModel extends BaseModel {
  constructor() {
    super('transactions', {
      center_id: 'center_id',
      type: 'type',
      currency: 'currency',
      category: 'category',
      is_delivered: 'is_delivered',
      shipment_id: 'shipment_id',
    })
  }

  sumByCenter(centerId, currency = 'USD') {
    return this.db
      .prepare(
        `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'out' THEN amount_usd ELSE 0 END), 0) AS total_out,
        COALESCE(SUM(CASE WHEN type = 'in'  THEN amount_usd ELSE 0 END), 0) AS total_in
      FROM transactions
      WHERE center_id = ?
        AND currency = ?
        AND is_deleted = 0
        AND is_delivered = 1
    `
      )
      .get(centerId, currency)
  }

  findByCenter(
    centerId,
    { from, to, type, is_delivered, limit = 50, offset = 0 } = {}
  ) {
    const conditions = ['t.center_id = ?', 't.is_deleted = 0']
    const params = [centerId]

    if (from) {
      conditions.push('t.date >= ?')
      params.push(from)
    }
    if (to) {
      conditions.push('t.date <= ?')
      params.push(to)
    }
    if (type) {
      conditions.push('t.type = ?')
      params.push(type)
    }
    if (is_delivered !== undefined) {
      conditions.push('t.is_delivered = ?')
      params.push(is_delivered ? 1 : 0)
    }

    const where = conditions.join(' AND ')

    const rows = this.db
      .prepare(
        `
      SELECT
        t.*,
        c.name AS center_name,
        s.ref_number AS shipment_ref,
        s.goods_name,
        s.source,
        s.destination,
        s.weight,
        s.tarseem,
        s.workers,
        s.door_receipt,
        s.clearance_fee,
        s.syrian_driver,
        s.turkish_transport,
        s.other_expenses,
        s.total_cost AS shipment_total
      FROM transactions t
      LEFT JOIN centers c ON t.center_id = c.id
      LEFT JOIN shipments s ON s.id = t.shipment_id
      WHERE ${where}
      ORDER BY t.date DESC, t.id DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(...params, limit, offset)

    const { count: total } = this.db
      .prepare(`SELECT COUNT(*) as count FROM transactions t WHERE ${where}`)
      .get(...params)

    return { rows, total }
  }

  sumPostedClearancesByDate(date) {
    // الترحيل المزدوج يُنشئ قيدين بنفس الفئة (clearance): قيد على التاجر (فاتورة =
    // price) وقيد على المخلص (تكلفة = cost). إيراد تخليص الشركة هو فاتورة التاجر فقط،
    // لذا نقصُر الجمع على القيود التي مركزها من نوع «تاجر» تجنباً لمضاعفة الرقم.
    return this.db
      .prepare(
        `
      SELECT COALESCE(SUM(t.amount_usd), 0) AS total, COUNT(*) AS count
      FROM transactions t
      INNER JOIN shipments s ON s.id = t.shipment_id
      INNER JOIN centers c ON c.id = t.center_id
      WHERE t.type = 'out'
        AND t.category = 'clearance'
        AND t.is_deleted = 0
        AND c.type = 'trader'
        AND date(s.posted_at) = date(?)
    `
      )
      .get(date)
  }

  sumPaymentsByDate(date) {
    return this.db
      .prepare(
        `
      SELECT COALESCE(SUM(amount_usd), 0) AS total
      FROM transactions
      WHERE type = 'in'
        AND is_deleted = 0
        AND date(date) = date(?)
    `
      )
      .get(date)
  }

  /** سيارات مُرحَّلة في اليوم — إيراد تخليص التاجر (قراءة فقط، نفس منطق sumPostedClearancesByDate) */
  listPostedClearancesByDate(date) {
    return this.db
      .prepare(
        `
      SELECT
        s.id AS shipment_id,
        s.ref_number,
        s.goods_name,
        s.status,
        datetime(s.posted_at) AS posted_at,
        c.id AS trader_id,
        c.name AS trader_name,
        t.id AS transaction_id,
        t.amount_usd AS clearance_amount
      FROM transactions t
      INNER JOIN shipments s ON s.id = t.shipment_id
      INNER JOIN centers c ON c.id = t.center_id
      WHERE t.type = 'out'
        AND t.category = 'clearance'
        AND t.is_deleted = 0
        AND c.type = 'trader'
        AND date(s.posted_at) = date(?)
      ORDER BY s.posted_at ASC, s.ref_number ASC
    `
      )
      .all(date)
  }

  /** دفعات نقدية في اليوم — للربط مع صفحة النقد والتقارير */
  listPaymentsByDate(date) {
    return this.db
      .prepare(
        `
      SELECT
        t.id,
        t.date,
        t.amount_usd,
        t.category,
        t.notes,
        c.id AS center_id,
        c.name AS center_name,
        c.type AS center_type,
        s.id AS shipment_id,
        s.ref_number AS shipment_ref
      FROM transactions t
      LEFT JOIN centers c ON c.id = t.center_id
      LEFT JOIN shipments s ON s.id = t.shipment_id
      WHERE t.type = 'in'
        AND t.is_deleted = 0
        AND date(t.date) = date(?)
      ORDER BY t.date DESC, t.id DESC
    `
      )
      .all(date)
  }

  /** قائمة عامة مع تفاصيل المركز والسيارة — قراءة فقط، لا تغيّر المحرك */
  listWithDetails({ filters = {}, limit = 50, offset = 0 } = {}) {
    const { joins, where, params } = buildTransactionListFilters(filters)

    const rows = this.db
      .prepare(
        `
      SELECT
        t.*,
        c.name AS center_name,
        c.type AS center_type,
        s.ref_number AS shipment_ref,
        s.goods_name AS shipment_goods,
        s.status AS shipment_status,
        u.name AS created_by_name
      ${joins}
      WHERE ${where}
      ORDER BY t.date DESC, t.id DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(...params, limit, offset)

    const { count: total } = this.db
      .prepare(
        `
      SELECT COUNT(*) AS count
      ${joins}
      WHERE ${where}
    `
      )
      .get(...params)

    const sums = this.db
      .prepare(
        `
      SELECT
        COALESCE(SUM(CASE WHEN t.type = 'out' THEN t.amount_usd ELSE 0 END), 0) AS total_out,
        COALESCE(SUM(CASE WHEN t.type = 'in'  THEN t.amount_usd ELSE 0 END), 0) AS total_in
      ${joins}
      WHERE ${where}
    `
      )
      .get(...params)

    return {
      rows,
      total,
      total_out: sums.total_out,
      total_in: sums.total_in,
      limit,
      offset,
    }
  }

  findByShipment(shipmentId) {
    // قد يُنتج الترحيل المزدوج قيدين (تاجر + مخلص) لنفس السيارة، فنُعيدهما معاً.
    return this.db
      .prepare(
        'SELECT * FROM transactions WHERE shipment_id = ? AND is_deleted = 0 ORDER BY id'
      )
      .all(shipmentId)
  }
}

module.exports = new TransactionModel()
