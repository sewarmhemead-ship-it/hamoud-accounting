const InventoryModel = require('../models/InventoryModel')
const CenterModel = require('../models/CenterModel')
const AccountingService = require('./AccountingService')
const {
  snapshotRowFromStatement,
  rollupSnapshotTotals,
  diffSnapshotToLive,
  assertRowMatchesEngine,
} = require('../utils/inventorySnapshot')
const { BusinessRuleError } = require('../utils/errors')
const {
  buildReportPayload,
  assertReportIntegrity,
  buildRangeReportPayload,
} = require('../utils/inventoryReport')

class InventoryService {
  /** معاينة حية — نفس أرقام كشف المركز دون حفظ */
  buildLiveRows() {
    const centers = CenterModel.findAll({ limit: 5000, offset: 0 })
    const rows = []

    for (const center of centers.rows) {
      const statement = AccountingService.getCenterFullStatement(center.id)
      const row = snapshotRowFromStatement(center, statement)
      if (!assertRowMatchesEngine(row)) {
        throw new BusinessRuleError(`تعارض محرك الذمة للمركز ${center.code}`)
      }
      rows.push(row)
    }

    return {
      snapshot_date: null,
      is_live: true,
      rows,
      totals: rollupSnapshotTotals(rows),
    }
  }

  createSnapshot(snapshotDate, label, userId, { replace = true } = {}) {
    const existing = InventoryModel.findByDate(snapshotDate)
    if (existing.length && !replace) {
      throw new BusinessRuleError('يوجد جرد لهذا التاريخ — فعّل الاستبدال أو اختر تاريخاً آخر')
    }
    if (existing.length && replace) {
      InventoryModel.softDeleteByDate(snapshotDate)
    }

    const live = this.buildLiveRows()
    const snapshots = []

    for (const row of live.rows) {
      const snap = InventoryModel.create({
        snapshot_date: snapshotDate,
        label: label || null,
        center_id: row.center_id,
        balance: row.balance,
        posted_undelivered: row.posted_undelivered,
        wip_value: row.wip_value,
        total: row.total,
        category: row.category,
        created_by: userId,
      })
      snapshots.push({ ...snap, center_name: row.center_name, center_code: row.center_code, center_type: row.center_type })
    }

    return {
      snapshot_date: snapshotDate,
      label: label || null,
      rows: snapshots,
      totals: rollupSnapshotTotals(snapshots),
      replaced: existing.length > 0,
    }
  }

  getByDate(snapshotDate) {
    const rows = InventoryModel.findByDate(snapshotDate)
    const dates = InventoryModel.listDates(30)
    return {
      snapshot_date: snapshotDate,
      label: rows[0]?.label ?? null,
      rows,
      totals: rollupSnapshotTotals(rows),
      history: dates,
      has_data: rows.length > 0,
    }
  }

  compareToLive(snapshotDate) {
    const saved = InventoryModel.findByDate(snapshotDate)
    if (!saved.length) {
      throw new BusinessRuleError('لا يوجد جرد محفوظ لهذا التاريخ')
    }
    const live = this.buildLiveRows()
    const diffs = diffSnapshotToLive(
      saved.map((s) => ({
        center_id: s.center_id,
        center_name: s.center_name,
        total: s.total,
        balance: s.balance,
        posted_undelivered: s.posted_undelivered,
      })),
      live.rows
    )
    const changed = diffs.filter((d) => d.status === 'changed').length
    return {
      snapshot_date: snapshotDate,
      compared_at: new Date().toISOString(),
      changed_count: changed,
      unchanged_count: diffs.length - changed,
      diffs,
      live_totals: live.totals,
      snapshot_totals: rollupSnapshotTotals(saved),
    }
  }

  listDates(limit = 60) {
    return InventoryModel.listDates(limit)
  }

  getLatest() {
    const latest = InventoryModel.getLatestDate()
    if (!latest?.date) return { latest: null }
    return { latest: this.getByDate(latest.date) }
  }

  buildReport(snapshotDate) {
    const detail = this.getByDate(snapshotDate)
    let rows = detail.rows
    let label = detail.label
    let is_live = false
    let compare = null

    if (!detail.has_data) {
      const live = this.buildLiveRows()
      rows = live.rows
      label = label || 'معاينة حية — لا لقطة محفوظة'
      is_live = true
    } else {
      try {
        compare = this.compareToLive(snapshotDate)
      } catch (_) {
        /* */
      }
    }

    const payload = buildReportPayload({
      snapshot_date: snapshotDate,
      label,
      rows,
      is_live,
      compare,
    })

    if (!assertReportIntegrity(payload)) {
      throw new BusinessRuleError('بيانات التقرير غير متسقة مع محرك الذمة')
    }

    return payload
  }

  getRange(from, to) {
    const days = InventoryModel.summarizeByRange(from, to)
    return buildRangeReportPayload({
      from,
      to,
      days,
      detail_rows: [],
    })
  }

  buildRangeReport(from, to) {
    const days = InventoryModel.summarizeByRange(from, to)
    const detail_rows = InventoryModel.findByRange(from, to)
    return buildRangeReportPayload({ from, to, days, detail_rows })
  }

  buildLiveReport(asOfDate) {
    const live = this.buildLiveRows()
    const payload = buildReportPayload({
      snapshot_date: asOfDate,
      label: 'معاينة حية — الآن',
      rows: live.rows,
      is_live: true,
      compare: null,
    })
    if (!assertReportIntegrity(payload)) {
      throw new BusinessRuleError('بيانات التقرير الحي غير متسقة')
    }
    return payload
  }
}

module.exports = new InventoryService()
