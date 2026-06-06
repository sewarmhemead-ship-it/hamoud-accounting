const { inventoryRangeSchema } = require('../src/validators/inventory.validator')
const { deltaFirstLast, buildRangeReportPayload } = require('../src/utils/inventoryReport')
const { inventoryRangeHtml } = require('../src/services/reports/pdfReport')

describe('inventoryRange — فترة من–إلى', () => {
  it('يقبل فترة صحيحة', () => {
    expect(
      inventoryRangeSchema.safeParse({ from: '2026-01-01', to: '2026-06-30' }).success
    ).toBe(true)
  })

  it('يرفض عندما من بعد إلى', () => {
    expect(
      inventoryRangeSchema.safeParse({ from: '2026-06-01', to: '2026-01-01' }).success
    ).toBe(false)
  })

  it('deltaFirstLast بين يومين', () => {
    const d = deltaFirstLast([
      { date: '2026-01-01', total: 100, balance: 80, posted_undelivered: 20, wip_value: 5 },
      { date: '2026-01-31', total: 150, balance: 90, posted_undelivered: 60, wip_value: 10 },
    ])
    expect(d.delta_total).toBe(50)
    expect(d.delta_balance).toBe(10)
  })

  it('buildRangeReportPayload', () => {
    const p = buildRangeReportPayload({
      from: '2026-01-01',
      to: '2026-01-31',
      days: [{ date: '2026-01-15', total: 1000, centers_count: 5 }],
    })
    expect(p.days_count).toBe(1)
    expect(p.range.from).toBe('2026-01-01')
  })

  it('inventoryRangeHtml بدون center لا يرمي خطأ', () => {
    const html = inventoryRangeHtml({
      company: 'شركة الحمود',
      from: '2026-05-31',
      to: '2026-06-05',
      generated_at: '2026-06-05T12:00:00.000Z',
      days_count: 1,
      days: [
        {
          date: '2026-06-01',
          label: 'جرد يومي',
          centers_count: 18,
          balance: 1000,
          posted_undelivered: 500,
          wip_value: 200,
          total: 1500,
        },
      ],
    })
    expect(html).toContain('تقرير جرد الفترة')
    expect(html).toContain('2026-05-31')
    expect(html).not.toContain('undefined')
  })
})

describe('inventoryRange — 1000 تحقق فترة', () => {
  it('from <= to', () => {
    for (let i = 0; i < 1000; i++) {
      const y = 2020 + (i % 5)
      const m1 = (i % 12) + 1
      const m2 = ((i + 3) % 12) + 1
      const from = `${y}-${String(Math.min(m1, m2)).padStart(2, '0')}-01`
      const to = `${y}-${String(Math.max(m1, m2)).padStart(2, '0')}-28`
      expect(from <= to).toBe(true)
      expect(inventoryRangeSchema.safeParse({ from, to }).success).toBe(true)
    }
  })
})
