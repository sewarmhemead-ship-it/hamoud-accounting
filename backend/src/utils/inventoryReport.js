const {
  rollupSnapshotTotals,
  assertRowMatchesEngine,
  INVENTORY_CATEGORIES,
} = require('./inventorySnapshot')

const { getReportCompanyName } = require('./reportBranding')

const CATEGORY_LABELS_AR = {
  traders: 'تجار',
  brokers: 'مخلّصون',
  partners: 'شركاء',
  other: 'أخرى',
}

/**
 * تجميع حمولة التقرير (Excel/PDF) — بلا DB.
 */
function buildReportPayload({
  snapshot_date,
  label = null,
  rows = [],
  totals = null,
  is_live = false,
  compare = null,
}) {
  const computed = totals || rollupSnapshotTotals(rows)
  return {
    company: getReportCompanyName(),
    snapshot_date: snapshot_date || new Date().toISOString().slice(0, 10),
    label,
    is_live,
    rows,
    totals: computed,
    by_category: computed.by_category || {},
    category_labels: CATEGORY_LABELS_AR,
    compare,
    generated_at: new Date().toISOString(),
  }
}

/** تحقق سلامة التقرير قبل التصدير */
function assertReportIntegrity(data) {
  if (!data || !Array.isArray(data.rows)) return false
  for (const row of data.rows) {
    if (!assertRowMatchesEngine(row)) return false
  }
  const rolled = rollupSnapshotTotals(data.rows)
  const t = data.totals || {}
  const ok =
    Math.abs((t.balance || 0) - rolled.balance) < 0.02 &&
    Math.abs((t.total || 0) - rolled.total) < 0.02 &&
    Math.abs((t.posted_undelivered || 0) - rolled.posted_undelivered) < 0.02
  return ok
}

function compareRowsForExport(compare) {
  if (!compare?.diffs) return []
  return compare.diffs.filter((d) => d.status === 'changed')
}

function deltaFirstLast(days) {
  if (!days?.length || days.length < 2) return null
  const first = days[0]
  const last = days[days.length - 1]
  const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100
  return {
    from_date: first.date,
    to_date: last.date,
    delta_total: round2((last.total || 0) - (first.total || 0)),
    delta_balance: round2((last.balance || 0) - (first.balance || 0)),
    delta_posted: round2((last.posted_undelivered || 0) - (first.posted_undelivered || 0)),
    delta_wip: round2((last.wip_value || 0) - (first.wip_value || 0)),
  }
}

function buildRangeReportPayload({ from, to, days, detail_rows = [] }) {
  return {
    company: getReportCompanyName(),
    range: { from, to },
    from,
    to,
    days: days || [],
    days_count: (days || []).length,
    delta_first_last: deltaFirstLast(days),
    detail_rows,
    generated_at: new Date().toISOString(),
    category_labels: CATEGORY_LABELS_AR,
  }
}

module.exports = {
  getReportCompanyName,
  CATEGORY_LABELS_AR,
  INVENTORY_CATEGORIES,
  buildReportPayload,
  assertReportIntegrity,
  compareRowsForExport,
  deltaFirstLast,
  buildRangeReportPayload,
}
