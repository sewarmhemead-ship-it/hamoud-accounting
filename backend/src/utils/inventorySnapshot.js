const { CENTER_TYPE } = require('../config/constants')
const { calculateGrandTotal } = require('../engine/balance')

const INVENTORY_CATEGORIES = ['traders', 'brokers', 'partners', 'other']

function centerCategoryFromType(type) {
  if (type === CENTER_TYPE.TRADER) return 'traders'
  if (type === CENTER_TYPE.BROKER) return 'brokers'
  if (type === CENTER_TYPE.PARTNER) return 'partners'
  return 'other'
}

/**
 * بناء صف جرد من ملخص AccountingService (نفس المحرك — بلا تعديل).
 * @param {object} statement ناتج getCenterFullStatement
 */
function snapshotRowFromStatement(center, statement) {
  const balance = Number(statement.balance) || 0
  const posted = Number(statement.posted_undelivered_value) || 0
  const wip = Number(statement.wip_value) || 0
  const total = calculateGrandTotal(balance, posted)

  return {
    center_id: center.id,
    center_name: center.name,
    center_code: center.code,
    center_type: center.type,
    balance,
    posted_undelivered: posted,
    wip_value: wip,
    total,
    category: centerCategoryFromType(center.type),
    posted_undelivered_count: statement.posted_undelivered_count || 0,
    wip_count: statement.wip_count || 0,
  }
}

/** يتحقق أن total = balance + posted (محرك balance فقط) */
function assertRowMatchesEngine(row) {
  const expected = calculateGrandTotal(row.balance, row.posted_undelivered)
  const stored = Number(row.total) || 0
  return Math.abs(expected - stored) < 0.005
}

function rollupSnapshotTotals(rows) {
  const byCategory = Object.fromEntries(INVENTORY_CATEGORIES.map((c) => [c, 0]))
  const totals = rows.reduce(
    (acc, r) => {
      const cat = r.category || 'other'
      if (byCategory[cat] != null) byCategory[cat] += Number(r.total) || 0
      return {
        balance: acc.balance + (Number(r.balance) || 0),
        posted_undelivered: acc.posted_undelivered + (Number(r.posted_undelivered) || 0),
        wip_value: acc.wip_value + (Number(r.wip_value) || 0),
        total: acc.total + (Number(r.total) || 0),
        centers: acc.centers + 1,
      }
    },
    { balance: 0, posted_undelivered: 0, wip_value: 0, total: 0, centers: 0 }
  )
  return { ...totals, by_category: byCategory }
}

/**
 * مقارنة لقطة محفوظة مع الوضع الحي (نفس المصدر AccountingService).
 */
function diffSnapshotToLive(snapshotRows, liveRows) {
  const liveByCenter = new Map(liveRows.map((r) => [r.center_id, r]))
  return snapshotRows.map((snap) => {
    const live = liveByCenter.get(snap.center_id)
    if (!live) {
      return { ...snap, status: 'missing_live', delta_total: null }
    }
    const delta_total = Math.round(((Number(live.total) || 0) - (Number(snap.total) || 0)) * 100) / 100
    return {
      center_id: snap.center_id,
      center_name: snap.center_name,
      snapshot_total: snap.total,
      live_total: live.total,
      delta_total,
      delta_balance: Math.round((live.balance - snap.balance) * 100) / 100,
      delta_posted: Math.round((live.posted_undelivered - snap.posted_undelivered) * 100) / 100,
      status: Math.abs(delta_total) < 0.01 ? 'unchanged' : 'changed',
    }
  })
}

module.exports = {
  INVENTORY_CATEGORIES,
  centerCategoryFromType,
  snapshotRowFromStatement,
  assertRowMatchesEngine,
  rollupSnapshotTotals,
  diffSnapshotToLive,
}
