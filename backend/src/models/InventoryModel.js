const BaseModel = require('./BaseModel')

class InventoryModel extends BaseModel {
  constructor() {
    super('inventory_snapshots')
  }

  findByDate(snapshotDate) {
    return this.db
      .prepare(
        `
      SELECT inv.*, c.name AS center_name, c.code AS center_code, c.type AS center_type
      FROM inventory_snapshots inv
      LEFT JOIN centers c ON c.id = inv.center_id
      WHERE inv.snapshot_date = ? AND inv.is_deleted = 0
      ORDER BY c.code ASC
    `
      )
      .all(snapshotDate)
  }

  softDeleteByDate(snapshotDate) {
    return this.db
      .prepare(
        `UPDATE inventory_snapshots SET is_deleted = 1
         WHERE snapshot_date = ? AND is_deleted = 0`
      )
      .run(snapshotDate)
  }

  listDates(limit = 60) {
    return this.db
      .prepare(
        `
      SELECT snapshot_date AS date,
             MAX(label) AS label,
             COUNT(*) AS centers_count,
             MIN(created_at) AS created_at
      FROM inventory_snapshots
      WHERE is_deleted = 0
      GROUP BY snapshot_date
      ORDER BY snapshot_date DESC
      LIMIT ?
    `
      )
      .all(limit)
  }

  getLatestDate() {
    return this.db
      .prepare(
        `SELECT snapshot_date AS date FROM inventory_snapshots
         WHERE is_deleted = 0 ORDER BY snapshot_date DESC LIMIT 1`
      )
      .get()
  }

  /** ملخص يومي ضمن فترة — أيام فيها لقطات محفوظة فقط */
  summarizeByRange(from, to) {
    return this.db
      .prepare(
        `
      SELECT
        snapshot_date AS date,
        MAX(label) AS label,
        COUNT(*) AS centers_count,
        SUM(balance) AS balance,
        SUM(posted_undelivered) AS posted_undelivered,
        SUM(wip_value) AS wip_value,
        SUM(total) AS total
      FROM inventory_snapshots
      WHERE is_deleted = 0 AND snapshot_date >= ? AND snapshot_date <= ?
      GROUP BY snapshot_date
      ORDER BY snapshot_date ASC
    `
      )
      .all(from, to)
  }

  /** كل صفوف الجرد في الفترة (للتصدير التفصيلي) */
  findByRange(from, to) {
    return this.db
      .prepare(
        `
      SELECT inv.*, c.name AS center_name, c.code AS center_code, c.type AS center_type
      FROM inventory_snapshots inv
      LEFT JOIN centers c ON c.id = inv.center_id
      WHERE inv.is_deleted = 0 AND inv.snapshot_date >= ? AND inv.snapshot_date <= ?
      ORDER BY inv.snapshot_date ASC, c.code ASC
    `
      )
      .all(from, to)
  }
}

module.exports = new InventoryModel()
