const BaseModel = require('./BaseModel')
const { buildShipmentListFilters } = require('./shipmentListQuery')

class ShipmentModel extends BaseModel {
  constructor() {
    super('shipments', {
      center_id: 'center_id',
      clearance_center_id: 'clearance_center_id',
      status: 'status',
      border_id: 'border_id',
    })
  }

  logUpdate(data) {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map(() => '?').join(', ')

    this.db
      .prepare(
        `INSERT INTO shipment_updates (${keys.join(', ')}) VALUES (${placeholders})`
      )
      .run(...values)
  }

  getUpdates(shipmentId) {
    return this.db
      .prepare(
        `SELECT su.*, u.name AS updated_by_name
         FROM shipment_updates su
         LEFT JOIN users u ON u.id = su.updated_by
         WHERE su.shipment_id = ?
         ORDER BY su.updated_at DESC`
      )
      .all(shipmentId)
  }

  sumByCenterAndStatuses(centerId, statuses) {
    const placeholders = statuses.map(() => '?').join(', ')
    return this.db
      .prepare(
        `
      SELECT COUNT(*) AS count, COALESCE(SUM(total_cost), 0) AS total
      FROM shipments
      WHERE center_id = ?
        AND status IN (${placeholders})
        AND is_deleted = 0
    `
      )
      .get(centerId, ...statuses)
  }

  countOverdueWip(days = 7) {
    return this.db
      .prepare(
        `SELECT COUNT(*) as count
         FROM shipments
         WHERE status IN ('pending','complete')
           AND is_deleted = 0
           AND date(entry_date) <= date('now', ?)`
      )
      .get(`-${days} days`).count
  }

  sumGlobalByStatus(status) {
    return this.db
      .prepare(
        `SELECT COUNT(*) AS count, COALESCE(SUM(total_cost), 0) AS total
         FROM shipments WHERE status = ? AND is_deleted = 0`
      )
      .get(status)
  }

  /** تجميع الشحنات حسب الحالة ضمن فترة تاريخ الدخول */
  summarizeByStatusInRange(from, to) {
    const rows = this.db
      .prepare(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(total_cost), 0) AS total
         FROM shipments
         WHERE is_deleted = 0 AND entry_date >= ? AND entry_date <= ?
         GROUP BY status`
      )
      .all(from, to)
    const byStatus = {}
    for (const r of rows) {
      byStatus[r.status] = { count: r.count, total: r.total }
    }
    return byStatus
  }

  sumByCenterAndStatus(centerId, status) {
    return this.sumByCenterAndStatuses(centerId, [status])
  }

  findByBroker(brokerId, { status, limit = 50, offset = 0 } = {}) {
    const conditions = ['clearance_center_id = ?', 'is_deleted = 0']
    const params = [brokerId]

    if (status) {
      conditions.push('status = ?')
      params.push(status)
    }

    const where = conditions.join(' AND ')
    const rows = this.db
      .prepare(
        `SELECT * FROM shipments WHERE ${where} ORDER BY entry_date DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset)

    const { count: total } = this.db
      .prepare(`SELECT COUNT(*) as count FROM shipments WHERE ${where}`)
      .get(...params)

    return { rows, total }
  }

  findReadyToPost({ limit = 50, offset = 0 } = {}) {
    return this.findAll({
      filters: { status: 'complete' },
      orderBy: 'entry_date ASC',
      limit,
      offset,
    })
  }

  findWithDetails(id) {
    return this.db
      .prepare(
        `
      SELECT
        s.*,
        c.name AS center_name,
        cb.name AS broker_name,
        b.name AS border_name,
        gt.name AS goods_type_name
      FROM shipments s
      LEFT JOIN centers c ON c.id = s.center_id
      LEFT JOIN centers cb ON cb.id = s.clearance_center_id
      LEFT JOIN borders b ON b.id = s.border_id
      LEFT JOIN goods_types gt ON gt.id = s.goods_type_id
      WHERE s.id = ? AND s.is_deleted = 0
    `
      )
      .get(id)
  }

  listWithDetails({ filters = {}, limit = 50, offset = 0 } = {}) {
    const { joins, where, params } = buildShipmentListFilters(filters)

    const rows = this.db
      .prepare(
        `
      SELECT
        s.*,
        c.name AS center_name,
        cb.name AS broker_name,
        b.name AS border_name
      ${joins}
      WHERE ${where}
      ORDER BY s.entry_date DESC
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

    return { rows, total, limit, offset }
  }
}

module.exports = new ShipmentModel()
