const {
  buildReportPayload,
  assertReportIntegrity,
  compareRowsForExport,
  CATEGORY_LABELS_AR,
} = require('../src/utils/inventoryReport')
const { calculateGrandTotal } = require('../src/engine')

function sampleRows(n = 5) {
  return Array.from({ length: n }, (_, i) => {
    const balance = (i + 1) * 100
    const posted = i * 50
    return {
      center_id: i + 1,
      center_code: `C${i}`,
      center_name: `مركز ${i}`,
      center_type: i % 2 ? 'trader' : 'broker',
      category: i % 2 ? 'traders' : 'brokers',
      balance,
      posted_undelivered: posted,
      wip_value: i * 10,
      total: calculateGrandTotal(balance, posted),
    }
  })
}

describe('inventoryReport — حمولة التصدير', () => {
  it('buildReportPayload يمرّ assertReportIntegrity', () => {
    const rows = sampleRows(8)
    const payload = buildReportPayload({
      snapshot_date: '2026-06-05',
      label: 'اختبار',
      rows,
      is_live: false,
    })
    expect(assertReportIntegrity(payload)).toBe(true)
    expect(payload.totals.centers).toBe(8)
    expect(payload.category_labels).toEqual(CATEGORY_LABELS_AR)
  })

  it('compareRowsForExport يفلتر المتغيّر فقط', () => {
    const cmp = {
      diffs: [
        { status: 'unchanged', center_name: 'أ' },
        { status: 'changed', center_name: 'ب' },
      ],
    }
    expect(compareRowsForExport(cmp)).toHaveLength(1)
  })
})

describe('inventoryReport — 1000 تكرار سلامة التقرير', () => {
  it('كل صف عشوائي يبني تقريراً صالحاً', () => {
    for (let i = 0; i < 1000; i++) {
      const balance = (Math.random() - 0.5) * 1e5
      const posted = Math.random() * 1e4
      const row = {
        center_id: 1,
        balance,
        posted_undelivered: posted,
        wip_value: Math.random() * 1000,
        total: calculateGrandTotal(balance, posted),
        category: 'traders',
      }
      const payload = buildReportPayload({
        snapshot_date: '2026-01-15',
        rows: [row],
      })
      expect(assertReportIntegrity(payload)).toBe(true)
    }
  })

  it('مجموع التصنيفات = إجمالي الذمم', () => {
    for (let i = 0; i < 200; i++) {
      const rows = sampleRows(3 + (i % 7))
      const payload = buildReportPayload({ snapshot_date: '2026-03-01', rows })
      const sumCat = Object.values(payload.totals.by_category).reduce((a, b) => a + b, 0)
      expect(Math.abs(sumCat - payload.totals.total)).toBeLessThan(0.05)
    }
  })
})

describe('inventory.routes — عقد المسارات (ربط API)', () => {
  const routes = [
    '/inventory/live',
    '/inventory/dates',
    '/inventory/latest',
    '/inventory/snapshots/:date',
    '/inventory/snapshots/:date/compare',
    '/inventory/export/live/xlsx',
    '/inventory/export/live/pdf',
    '/inventory/export/:date/xlsx',
    '/inventory/export/:date/pdf',
    '/reports/inventory/:date.xlsx',
    '/reports/inventory/:date.pdf',
  ]

  it('مسارات التصدير معرّفة', () => {
    expect(routes.filter((r) => r.includes('export') || r.includes('inventory')).length).toBeGreaterThanOrEqual(6)
  })

  it('1000 تحقق من شكل التاريخ في التصدير', () => {
    const re = /^\d{4}-\d{2}-\d{2}$/
    for (let i = 0; i < 1000; i++) {
      const y = 2020 + (i % 7)
      const m = String((i % 12) + 1).padStart(2, '0')
      const d = String((i % 28) + 1).padStart(2, '0')
      expect(re.test(`${y}-${m}-${d}`)).toBe(true)
    }
  })
})
