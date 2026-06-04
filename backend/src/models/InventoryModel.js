const BaseModel = require('./BaseModel')

class InventoryModel extends BaseModel {
  constructor() {
    super('inventory_snapshots')
  }

  findByDate(snapshotDate) {
    return this.db
      .prepare(
        `
      SELECT inv.*, c.name AS center_name, c.type AS center_type
      FROM inventory_snapshots inv
      LEFT JOIN centers c ON c.id = inv.center_id
      WHERE inv.snapshot_date = ? AND inv.is_deleted = 0
      ORDER BY c.code ASC
    `
      )
      .all(snapshotDate)
  }
}

module.exports = new InventoryModel()
