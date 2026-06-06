const ExcelJS = require('exceljs')
const { styleHeaderRow, totalsRow, fmtDate } = require('./excelReport')

const GOLD = 'FFB8860B'
const STATUS_LABELS = {
  pending: 'معلقة',
  complete: 'مكتملة',
  posted: 'مرحّلة',
  delivered: 'مُسلّمة',
}

function addSheet(wb, name, headers, rows, { title, numCols = [] } = {}) {
  const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true }] })
  if (title) {
    ws.mergeCells(1, 1, 1, headers.length)
    const t = ws.getCell(1, 1)
    t.value = title
    t.font = { bold: true, size: 12, color: { argb: GOLD } }
    t.alignment = { horizontal: 'center' }
    ws.addRow([])
  }
  const hr = ws.addRow(headers)
  styleHeaderRow(hr)
  for (const row of rows) {
    ws.addRow(row)
  }
  ws.columns.forEach((col) => {
    col.width = 14
  })
  for (const c of numCols) {
    ws.getColumn(c).numFmt = '#,##0.00'
  }
  return ws
}

/**
 * بناء مصنف نسخ احتياطي كامل — يُستبدل الملف الثابت hamoud_accounting_backup.xlsx كل مرة.
 * @param {object} data بيانات مجمّعة من BackupService.collectBackupData()
 */
function fullBackupWorkbook(data) {
  const wb = new ExcelJS.Workbook()
  wb.creator = data.company || 'hamoud-accounting'
  wb.created = new Date(data.generated_at || Date.now())

  const wsSummary = wb.addWorksheet('ملخص', { views: [{ rightToLeft: true }] })
  wsSummary.mergeCells(1, 1, 1, 2)
  wsSummary.getCell(1, 1).value = data.company || ''
  wsSummary.getCell(1, 1).font = { bold: true, size: 14, color: { argb: GOLD } }
  wsSummary.mergeCells(2, 1, 2, 2)
  wsSummary.getCell(2, 1).value = `نسخة احتياطية — ${fmtDate(data.generated_at)}`
  wsSummary.getCell(2, 1).alignment = { horizontal: 'center' }
  wsSummary.addRow([])
  const counts = data.counts || {}
  const summaryRows = [
    ['المراكز', counts.centers ?? 0],
    ['الحركات', counts.transactions ?? 0],
    ['الشحنات', counts.shipments ?? 0],
    ['أيام المربح', counts.daily_profit ?? 0],
    ['لقطات الجرد', counts.inventory_snapshots ?? 0],
    ['المستخدمون', counts.users ?? 0],
    ['مفاتيح الإعدادات', counts.settings ?? 0],
  ]
  const sh = wsSummary.addRow(['البند', 'العدد'])
  styleHeaderRow(sh)
  for (const [label, val] of summaryRows) {
    wsSummary.addRow([label, val])
  }
  wsSummary.getColumn(1).width = 22
  wsSummary.getColumn(2).width = 12

  addSheet(
    wb,
    'المراكز',
    [
      'كود',
      'الاسم',
      'النوع',
      'عملة',
      'صادر',
      'وارد',
      'رصيد',
      'جارية',
      'WIP',
      'الذمة',
    ],
    (data.centers || []).map((c) => {
      const s = c.statement || {}
      return [
        c.code,
        c.name,
        c.type,
        c.currency,
        s.total_out ?? 0,
        s.total_in ?? 0,
        s.balance ?? 0,
        s.posted_undelivered_value ?? 0,
        s.wip_value ?? 0,
        s.grand_total ?? 0,
      ]
    }),
    { numCols: [5, 6, 7, 8, 9, 10] }
  )

  addSheet(
    wb,
    'الحركات',
    [
      'رقم',
      'تاريخ',
      'نوع',
      'مركز',
      'عملة',
      'مبلغ',
      'USD',
      'فئة',
      'شحنة',
      'ملاحظات',
    ],
    (data.transactions || []).map((t) => [
      t.ref_number,
      fmtDate(t.date),
      t.type,
      t.center_name || '',
      t.currency,
      t.amount,
      t.amount_usd,
      t.category || '',
      t.shipment_id || '',
      t.notes || '',
    ]),
    { numCols: [6, 7] }
  )

  addSheet(
    wb,
    'الشحنات',
    [
      'رقم',
      'تاريخ الدخول',
      'تاجر',
      'مخلص',
      'بضاعة',
      'مصدر',
      'وجهة',
      'حالة',
      'التكلفة',
      'ترحيل',
      'تسليم',
    ],
    (data.shipments || []).map((s) => [
      s.ref_number,
      fmtDate(s.entry_date),
      s.trader_name || '',
      s.broker_name || '',
      s.goods_name || '',
      s.source || '',
      s.destination || '',
      STATUS_LABELS[s.status] || s.status,
      s.total_cost ?? 0,
      fmtDate(s.posted_at),
      fmtDate(s.delivered_at),
    ]),
    { numCols: [9] }
  )

  addSheet(
    wb,
    'المربح_اليومي',
    [
      'تاريخ',
      'سيارات',
      'إجمالي',
      'مكتب',
      'منزل',
      'صافي',
      'ملاحظات',
    ],
    (data.daily_profit || []).map((d) => [
      fmtDate(d.date),
      d.num_trucks,
      d.gross_profit,
      d.office_expenses,
      d.home_expenses,
      d.net_profit,
      d.notes || '',
    ]),
    { numCols: [3, 4, 5, 6] }
  )

  addSheet(
    wb,
    'الجرد',
    [
      'تاريخ',
      'تسمية',
      'كود مركز',
      'مركز',
      'رصيد',
      'جارية',
      'WIP',
      'ذمة',
      'تصنيف',
    ],
    (data.inventory_snapshots || []).map((r) => [
      fmtDate(r.snapshot_date),
      r.label || '',
      r.center_code || '',
      r.center_name || '',
      r.balance,
      r.posted_undelivered,
      r.wip_value,
      r.total,
      r.category || '',
    ]),
    { numCols: [5, 6, 7, 8] }
  )

  addSheet(
    wb,
    'مستخدمون',
    ['معرّف', 'اسم المستخدم', 'الاسم', 'الدور', 'صلاحيات'],
    (data.users || []).map((u) => [
      u.id,
      u.username,
      u.name,
      u.role,
      Array.isArray(u.permissions) ? u.permissions.join(', ') : u.permissions || '',
    ])
  )

  addSheet(
    wb,
    'إعدادات',
    ['المفتاح', 'القيمة'],
    (data.settings || []).map(([k, v]) => [
      k,
      typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''),
    ])
  )

  return wb
}

module.exports = { fullBackupWorkbook }
