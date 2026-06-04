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

async function workbookToBuffer(wb) {
  return wb.xlsx.writeBuffer()
}

module.exports = { traderWorkbook, profitWorkbook, workbookToBuffer }
