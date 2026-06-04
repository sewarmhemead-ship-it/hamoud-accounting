const InventoryModel = require('../models/InventoryModel')
const CenterModel = require('../models/CenterModel')
const AccountingService = require('./AccountingService')
const { CENTER_TYPE } = require('../config/constants')

class InventoryService {
  createSnapshot(snapshotDate, label, userId) {
    const centers = CenterModel.findAll({ limit: 1000, offset: 0 })
    const snapshots = []

    for (const center of centers.rows) {
      const statement = AccountingService.getCenterFullStatement(center.id)

      let category = 'other'
      if (center.type === CENTER_TYPE.TRADER) category = 'traders'
      else if (center.type === CENTER_TYPE.BROKER) category = 'brokers'
      else if (center.type === CENTER_TYPE.PARTNER) category = 'partners'

      const snap = InventoryModel.create({
        snapshot_date: snapshotDate,
        label: label || null,
        center_id: center.id,
        balance: statement.balance,
        posted_undelivered: statement.posted_undelivered_value,
        wip_value: statement.wip_value,
        total: statement.grand_total,
        category,
        created_by: userId,
      })

      snapshots.push(snap)
    }

    return snapshots
  }

  getByDate(snapshotDate) {
    return InventoryModel.findByDate(snapshotDate)
  }
}

module.exports = new InventoryService()
