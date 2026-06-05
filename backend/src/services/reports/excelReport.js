const ExcelJS = require('exceljs')

const GOLD = 'FFB8860B'
const HEAD_BG = 'FF1F2937'
const HEAD_FG = 'FFFFFFFF'
const TOTAL_BG = 'FFFDF6E3'

function fmtDate(d) {
  return d ? String(d).slice(0, 10) : ''
}

function rangeLabel(range) {
  if (range.from && range.to) return `من ${range.from} إلى ${range.to}`
  if (range.from) return `من ${range.from}`
  if (range.to) return `حتى ${range.to}`
  return 'كل الفترات'
}

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEAD_FG }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_BG } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = { bottom: { style: 'thin', color: { argb: GOLD } } }
  })
}

function titleBlock(ws, data, reportTitle, span) {
  ws.mergeCells(1, 1, 1, span)
  const t = ws.getCell(1, 1)
  t.value = data.company
  t.font = { bold: true, size: 14, color: { argb: GOLD } }
  t.alignment = { horizontal: 'center' }

  ws.mergeCells(2, 1, 2, span)
  const s = ws.getCell(2, 1)
  s.value = `${reportTitle} — ${data.center.name}`
  s.font = { bold: true, size: 12 }
  s.alignment = { horizontal: 'center' }

  ws.mergeCells(3, 1, 3, span)
  const r = ws.getCell(3, 1)
  r.value = `${rangeLabel(data.range)}    |    تاريخ الإصدار: ${fmtDate(data.generated_at)}`
  r.font = { size: 10, color: { argb: 'FF6B7280' } }
  r.alignment = { horizontal: 'center' }
  ws.addRow([])
}

function totalsRow(ws, cells) {
  const row = ws.addRow(cells)
  row.eachCell((cell) => {
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } }
    cell.border = { top: { style: 'double', color: { argb: GOLD } } }
  })
  return row
}

/** التقرير الخارجي للتاجر (بلا تكلفة/ربح). */
function traderWorkbook(data) {
  const wb = new ExcelJS.Workbook()
  wb.creator = data.company
  const ws = wb.addWorksheet('كشف التاجر', {
    views: [{ rightToLeft: true }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  })

  const priceCols = data.price_columns
  const header = ['التاريخ', 'رقم', 'البضاعة', 'المصدر', 'الوجهة', 'الوزن', ...priceCols.map((c) => c.label), 'المجموع']
  const span = header.length

  titleBlock(ws, data, 'كشف حساب التاجر', span)
  const hr = ws.addRow(header)
  styleHeaderRow(hr)

  for (const r of data.rows) {
    ws.addRow([
      fmtDate(r.entry_date),
      r.ref_number,
      r.goods_name || '',
      r.source || '',
      r.destination || '',
      r.weight || '',
      ...priceCols.map((c) => r.price[c.key] || 0),
      r.total,
    ])
  }

  totalsRow(ws, [
    'الإجمالي',
    '',
    `${data.totals.shipments_count} سيارة`,
    '',
    '',
    '',
    ...priceCols.map(() => ''),
    data.totals.charges,
  ])

  // ملخص الدفعات والرصيد
  ws.addRow([])
  ws.addRow([])
  const ph = ws.addRow(['الدفعات', '', '', '', ''])
  ph.getCell(1).font = { bold: true, size: 12, color: { argb: GOLD } }
  const phr = ws.addRow(['التاريخ', 'رقم', 'المبلغ', 'ملاحظات'])
  styleHeaderRow(phr)
  for (const p of data.payments) {
    ws.addRow([fmtDate(p.date), p.ref_number || '', p.amount, p.notes || ''])
  }

  ws.addRow([])
  const sumRows = [
    ['إجمالي الفواتير', data.totals.charges],
    ['إجمالي الدفعات', data.totals.payments],
    ['الرصيد المترتب', data.totals.balance],
  ]
  for (const [label, val] of sumRows) {
    const row = ws.addRow([label, val])
    row.getCell(1).font = { bold: true }
    row.getCell(2).font = { bold: true, color: { argb: GOLD } }
  }

  const widths = [12, 10, 18, 12, 12, 8, ...priceCols.map(() => 11), 12]
  ws.columns.forEach((col, i) => {
    col.width = widths[i] || 12
  })
  ws.getColumn(span).numFmt = '#,##0.00'

  return wb
}

/** التقرير الداخلي (الربح والميزانية). */
function profitWorkbook(data) {
  const wb = new ExcelJS.Workbook()
  wb.creator = data.company
  const ws = wb.addWorksheet('الربح والميزانية', {
    views: [{ rightToLeft: true }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  })

  const header = ['التاريخ', 'رقم', 'البضاعة', 'المخلص', 'الوجهة', 'التكلفة', 'الفاتورة', 'المربح']
  const span = header.length

  titleBlock(ws, data, 'تقرير الربح والميزانية (داخلي)', span)
  const hr = ws.addRow(header)
  styleHeaderRow(hr)

  for (const r of data.rows) {
    const row = ws.addRow([
      fmtDate(r.entry_date),
      r.ref_number,
      r.goods_name || '',
      r.broker_name || '',
      r.destination || '',
      r.cost_total,
      r.price_total,
      r.profit,
    ])
    const pc = row.getCell(8)
    pc.font = { color: { argb: r.profit >= 0 ? 'FF15803D' : 'FFB91C1C' }, bold: true }
  }

  totalsRow(ws, [
    'الإجمالي',
    '',
    `${data.totals.shipments_count} سيارة`,
    '',
    '',
    data.totals.cost,
    data.totals.charges,
    data.totals.profit,
  ])

  ws.addRow([])
  ws.addRow([])
  const mh = ws.addRow(['ملخص الميزانية'])
  mh.getCell(1).font = { bold: true, size: 12, color: { argb: GOLD } }
  const summary = [
    ['إجمالي فواتير التاجر (لنا)', data.totals.charges],
    ['إجمالي التكلفة (للمخلصين)', data.totals.cost],
    ['مربح الشركة', data.totals.profit],
    ['نسبة الهامش %', data.totals.margin_pct],
    ['إجمالي الدفعات الواردة', data.totals.payments],
    ['الرصيد المترتب على التاجر', data.totals.balance],
  ]
  for (const [label, val] of summary) {
    const row = ws.addRow([label, val])
    row.getCell(1).font = { bold: true }
    row.getCell(2).font = { bold: true, color: { argb: GOLD } }
  }

  ws.columns.forEach((col, i) => {
    col.width = [12, 10, 18, 16, 12, 12, 12, 12][i] || 12
  })
  ;[6, 7, 8].forEach((c) => (ws.getColumn(c).numFmt = '#,##0.00'))

  return wb
}

const STATUS_LABELS = {
  pending: 'معلقة',
  complete: 'مكتملة',
  posted: 'مرحّلة',
  delivered: 'مُسلّمة',
}

/** ملخص فترة: أيام مُغلقة + شحنات حسب تاريخ الدخول */
function periodWorkbook(data) {
  const wb = new ExcelJS.Workbook()
  wb.creator = data.company

  const wsP = wb.addWorksheet('ملخص المربح', { views: [{ rightToLeft: true }] })
  wsP.mergeCells(1, 1, 1, 5)
  wsP.getCell(1, 1).value = data.company
  wsP.getCell(1, 1).font = { bold: true, size: 14, color: { argb: GOLD } }
  wsP.mergeCells(2, 1, 2, 5)
  wsP.getCell(2, 1).value = `ملخص الفترة المحاسبي — ${rangeLabel(data.range)}`
  wsP.getCell(2, 1).alignment = { horizontal: 'center' }
  wsP.addRow([])
  const ph = wsP.addRow(['التاريخ', 'سيارات', 'إيراد', 'مصاريف مكتب', 'صافي'])
  styleHeaderRow(ph)
  for (const d of data.profit.days) {
    wsP.addRow([
      fmtDate(d.date),
      d.num_trucks,
      d.gross_profit,
      d.office_expenses,
      d.net_profit,
    ])
  }
  totalsRow(wsP, [
    'المجموع',
    data.profit.totals.num_trucks,
    data.profit.totals.gross_profit,
    data.profit.totals.office_expenses,
    data.profit.totals.net_profit,
  ])
  wsP.columns.forEach((c, i) => {
    c.width = [12, 8, 14, 14, 14][i] || 12
  })
  ;[3, 4, 5].forEach((i) => (wsP.getColumn(i).numFmt = '#,##0.00'))

  const wsS = wb.addWorksheet('الشحنات', { views: [{ rightToLeft: true }] })
  wsS.mergeCells(1, 1, 1, 8)
  wsS.getCell(1, 1).value = `شحنات الفترة (تاريخ الدخول) — ${rangeLabel(data.range)}`
  wsS.getCell(1, 1).font = { bold: true, size: 12 }
  wsS.addRow([])
  const sh = wsS.addRow([
    'تاريخ الدخول',
    'رقم',
    'تاجر',
    'بضاعة',
    'مصدر',
    'وجهة',
    'حالة',
    'المجموع',
  ])
  styleHeaderRow(sh)
  for (const s of data.shipments.rows) {
    wsS.addRow([
      fmtDate(s.entry_date),
      s.ref_number,
      s.center_name || '',
      s.goods_name || '',
      s.source || '',
      s.destination || '',
      STATUS_LABELS[s.status] || s.status,
      s.total_cost,
    ])
  }
  totalsRow(wsS, [
    'المجموع',
    '',
    '',
    '',
    '',
    '',
    data.shipments.totals.count,
    data.shipments.totals.total_value,
  ])
  wsS.columns.forEach((c, i) => {
    c.width = [12, 12, 16, 14, 12, 12, 10, 12][i] || 12
  })
  wsS.getColumn(8).numFmt = '#,##0.00'

  return wb
}

async function workbookToBuffer(wb) {
  return wb.xlsx.writeBuffer()
}

/** تقرير مربح يومي — ميزانية + حركات سيارات + دفعات */
function dailyProfitWorkbook(data) {
  const wb = new ExcelJS.Workbook()
  wb.creator = data.company
  const w = data.waterfall

  const wsB = wb.addWorksheet('الميزانية', { views: [{ rightToLeft: true }] })
  wsB.mergeCells(1, 1, 1, 3)
  wsB.getCell(1, 1).value = data.company
  wsB.getCell(1, 1).font = { bold: true, size: 14, color: { argb: GOLD } }
  wsB.mergeCells(2, 1, 2, 3)
  wsB.getCell(2, 1).value = `المربح اليومي — ${fmtDate(data.date)}`
  wsB.getCell(2, 1).alignment = { horizontal: 'center' }
  wsB.addRow([])
  const bh = wsB.addRow(['البند', 'التفاصيل', 'المبلغ'])
  styleHeaderRow(bh)
  wsB.addRow(['تخليص الشركة (أساس)', 'قيود تاجر مرحّلة', w.base_clearance])
  for (const [k, label] of Object.entries(data.diff_labels || {})) {
    wsB.addRow([label, 'فرق يدوي', w.diffs[k] || 0])
  }
  totalsRow(wsB, ['إجمالي اليوم', '', w.gross_profit])
  wsB.addRow(['مصاريف مكتب', '', w.office_expenses])
  wsB.addRow(['مصاريف منزل', '', w.home_expenses])
  totalsRow(wsB, ['صافي اليوم', '', w.net_profit])
  const expenseSections = [
    ['office', 'تفصيل مكتب'],
    ['operations', 'تفصيل تشغيلية'],
    ['misc', 'تفصيل متفرقة'],
    ['home', 'تفصيل منزل'],
  ]
  for (const [key, title] of expenseSections) {
    const lines = data.expenses?.[key]
    if (!lines?.length) continue
    wsB.addRow([])
    wsB.addRow([title, ''])
    for (const line of lines) {
      const hint = key === 'misc' && line.bucket === 'home' ? '→ منزل' : ''
      wsB.addRow([line.label || '—', hint, line.amount])
    }
  }
  wsB.getColumn(3).numFmt = '#,##0.00'

  const wsM = wb.addWorksheet('السيارات المرحّلة', { views: [{ rightToLeft: true }] })
  wsM.mergeCells(1, 1, 1, 6)
  wsM.getCell(1, 1).value = `حركات الترحيل — ${fmtDate(data.date)}`
  wsM.getCell(1, 1).font = { bold: true, size: 12 }
  wsM.addRow([])
  const mh = wsM.addRow(['رقم', 'تاجر', 'بضاعة', 'وقت الترحيل', 'إيراد تخليص', 'معرّف'])
  styleHeaderRow(mh)
  for (const m of data.movements || []) {
    wsM.addRow([
      m.ref_number,
      m.trader_name || '',
      m.goods_name || '',
      m.posted_at ? String(m.posted_at).slice(0, 16) : '',
      m.clearance_amount,
      m.shipment_id,
    ])
  }
  totalsRow(wsM, [
    'المجموع',
    '',
    '',
    '',
    data.movements_total,
    data.movements?.length || 0,
  ])
  wsM.getColumn(5).numFmt = '#,##0.00'

  const wsP = wb.addWorksheet('الدفعات', { views: [{ rightToLeft: true }] })
  const ph = wsP.addRow(['التاريخ', 'مركز', 'المبلغ', 'فئة', 'ملاحظات'])
  styleHeaderRow(ph)
  for (const p of data.payments || []) {
    wsP.addRow([
      fmtDate(p.date),
      p.center_name || '',
      p.amount_usd,
      p.category || '',
      p.notes || '',
    ])
  }
  totalsRow(wsP, ['المجموع', '', data.payments_total, '', ''])
  wsP.getColumn(3).numFmt = '#,##0.00'

  return wb
}

function dailyProfitMonthWorkbook(data) {
  const wb = new ExcelJS.Workbook()
  wb.creator = data.company
  const ws = wb.addWorksheet('ملخص الشهر', { views: [{ rightToLeft: true }] })
  ws.mergeCells(1, 1, 1, 6)
  ws.getCell(1, 1).value = data.company
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: GOLD } }
  ws.mergeCells(2, 1, 2, 6)
  ws.getCell(2, 1).value = `ملخص المربح — ${data.month_prefix}`
  ws.getCell(2, 1).alignment = { horizontal: 'center' }
  ws.addRow([])
  const h = ws.addRow(['التاريخ', 'سيارات', 'إجمالي', 'مكتب', 'منزل', 'صافي'])
  styleHeaderRow(h)
  for (const d of data.days || []) {
    ws.addRow([
      fmtDate(d.date),
      d.num_trucks,
      d.gross_profit,
      d.office_expenses,
      d.home_expenses,
      d.net_profit,
    ])
  }
  totalsRow(ws, [
    'المجموع',
    data.num_trucks,
    data.gross_profit,
    data.office_expenses,
    data.home_expenses,
    data.net_profit,
  ])
  ;[3, 4, 5, 6].forEach((i) => (ws.getColumn(i).numFmt = '#,##0.00'))
  return wb
}

/** تقرير جرد — تفصيل + ملخص تصنيف + مقارنة */
function inventoryWorkbook(data) {
  const wb = new ExcelJS.Workbook()
  wb.creator = data.company
  const modeLabel = data.is_live ? ' (حي)' : ' (لقطة)'

  const ws = wb.addWorksheet('تفصيل الجرد', { views: [{ rightToLeft: true }] })
  ws.mergeCells(1, 1, 1, 7)
  ws.getCell(1, 1).value = data.company
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: GOLD } }
  ws.mergeCells(2, 1, 2, 7)
  ws.getCell(2, 1).value = `جرد الذمم — ${fmtDate(data.snapshot_date)}${modeLabel}${data.label ? ` — ${data.label}` : ''}`
  ws.getCell(2, 1).alignment = { horizontal: 'center' }
  ws.addRow([])
  const h = ws.addRow(['كود', 'المركز', 'تصنيف', 'رصيد', 'جارية', 'WIP', 'الذمة'])
  styleHeaderRow(h)
  for (const r of data.rows || []) {
    const catLabel = (data.category_labels && data.category_labels[r.category]) || r.category
    ws.addRow([
      r.center_code || '',
      r.center_name || '',
      catLabel || '',
      r.balance,
      r.posted_undelivered,
      r.wip_value,
      r.total,
    ])
  }
  const t = data.totals || {}
  totalsRow(ws, ['المجموع', '', '', t.balance, t.posted_undelivered, t.wip_value, t.total])
  ;[4, 5, 6, 7].forEach((i) => (ws.getColumn(i).numFmt = '#,##0.00'))

  const wsS = wb.addWorksheet('ملخص التصنيف', { views: [{ rightToLeft: true }] })
  wsS.mergeCells(1, 1, 1, 3)
  wsS.getCell(1, 1).value = 'ملخص حسب التصنيف'
  wsS.addRow([])
  const sh = wsS.addRow(['التصنيف', 'عدد المراكز', 'إجمالي الذمة'])
  styleHeaderRow(sh)
  const byCat = t.by_category || {}
  for (const [cat, sum] of Object.entries(byCat)) {
    const count = (data.rows || []).filter((r) => r.category === cat).length
    const label = (data.category_labels && data.category_labels[cat]) || cat
    wsS.addRow([label, count, sum])
  }
  wsS.getColumn(3).numFmt = '#,##0.00'

  if (data.compare?.diffs?.length) {
    const changed = data.compare.diffs.filter((d) => d.status === 'changed')
    const wsC = wb.addWorksheet('مقارنة مع الحي', { views: [{ rightToLeft: true }] })
    wsC.getCell(1, 1).value = `تغيّر ${data.compare.changed_count} مركز من ${data.compare.diffs.length}`
    wsC.addRow([])
    const ch = wsC.addRow(['مركز', 'محفوظ', 'حي', 'فرق', 'فرق رصيد', 'فرق جارية'])
    styleHeaderRow(ch)
    for (const d of changed) {
      wsC.addRow([
        d.center_name,
        d.snapshot_total,
        d.live_total,
        d.delta_total,
        d.delta_balance,
        d.delta_posted,
      ])
    }
    ;[2, 3, 4, 5, 6].forEach((i) => (wsC.getColumn(i).numFmt = '#,##0.00'))
  }

  return wb
}

/** جرد فترة — ملخص يومي + تفاصيل */
function inventoryRangeWorkbook(data) {
  const wb = new ExcelJS.Workbook()
  wb.creator = data.company

  const wsD = wb.addWorksheet('ملخص الأيام', { views: [{ rightToLeft: true }] })
  wsD.mergeCells(1, 1, 1, 7)
  wsD.getCell(1, 1).value = data.company
  wsD.getCell(1, 1).font = { bold: true, size: 14, color: { argb: GOLD } }
  wsD.mergeCells(2, 1, 2, 7)
  wsD.getCell(2, 1).value = `جرد الفترة — من ${data.from} إلى ${data.to}`
  wsD.getCell(2, 1).alignment = { horizontal: 'center' }
  wsD.addRow([])
  const dh = wsD.addRow(['التاريخ', 'تسمية', 'مراكز', 'رصيد', 'جارية', 'WIP', 'الذمة'])
  styleHeaderRow(dh)
  for (const d of data.days || []) {
    wsD.addRow([
      fmtDate(d.date),
      d.label || '',
      d.centers_count,
      d.balance,
      d.posted_undelivered,
      d.wip_value,
      d.total,
    ])
  }
  if (data.delta_first_last) {
    wsD.addRow([])
    const dl = data.delta_first_last
    wsD.addRow([
      `فرق ${fmtDate(dl.from_date)} → ${fmtDate(dl.to_date)}`,
      '',
      '',
      dl.delta_balance,
      dl.delta_posted,
      dl.delta_wip,
      dl.delta_total,
    ])
  }
  ;[4, 5, 6, 7].forEach((i) => (wsD.getColumn(i).numFmt = '#,##0.00'))

  const wsT = wb.addWorksheet('تفاصيل الفترة', { views: [{ rightToLeft: true }] })
  const th = wsT.addRow(['التاريخ', 'كود', 'مركز', 'تصنيف', 'رصيد', 'جارية', 'WIP', 'ذمة'])
  styleHeaderRow(th)
  const labels = data.category_labels || {}
  for (const r of data.detail_rows || []) {
    wsT.addRow([
      fmtDate(r.snapshot_date),
      r.center_code || '',
      r.center_name || '',
      labels[r.category] || r.category,
      r.balance,
      r.posted_undelivered,
      r.wip_value,
      r.total,
    ])
  }
  ;[5, 6, 7, 8].forEach((i) => (wsT.getColumn(i).numFmt = '#,##0.00'))
  return wb
}

module.exports = {
  traderWorkbook,
  profitWorkbook,
  periodWorkbook,
  dailyProfitWorkbook,
  dailyProfitMonthWorkbook,
  inventoryWorkbook,
  inventoryRangeWorkbook,
  workbookToBuffer,
  styleHeaderRow,
  totalsRow,
  fmtDate,
}
