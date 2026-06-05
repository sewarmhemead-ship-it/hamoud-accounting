const {
  centerCategoryFromType,
  snapshotRowFromStatement,
  assertRowMatchesEngine,
  rollupSnapshotTotals,
  diffSnapshotToLive,
} = require('../src/utils/inventorySnapshot')
const { calculateGrandTotal, calculateCenterBalance } = require('../src/engine')

describe('inventorySnapshot — ربط محرك balance', () => {
  it('total = calculateGrandTotal(balance, posted)', () => {
    const row = snapshotRowFromStatement(
      { id: 1, name: 'تاجر', code: 'T1', type: 'trader' },
      {
        balance: 1000,
        posted_undelivered_value: 500,
        wip_value: 200,
        posted_undelivered_count: 2,
        wip_count: 1,
      }
    )
    expect(row.total).toBe(calculateGrandTotal(1000, 500))
    expect(assertRowMatchesEngine(row)).toBe(true)
  })

  it('تصنيف المراكز', () => {
    expect(centerCategoryFromType('trader')).toBe('traders')
    expect(centerCategoryFromType('broker')).toBe('brokers')
    expect(centerCategoryFromType('supplier')).toBe('other')
  })

  it('rollupSnapshotTotals', () => {
    const t = rollupSnapshotTotals([
      { category: 'traders', balance: 10, posted_undelivered: 5, wip_value: 1, total: 15 },
      { category: 'brokers', balance: 20, posted_undelivered: 0, wip_value: 0, total: 20 },
    ])
    expect(t.balance).toBe(30)
    expect(t.total).toBe(35)
    expect(t.by_category.traders).toBe(15)
  })

  it('diffSnapshotToLive يكتشف التغيير', () => {
    const diffs = diffSnapshotToLive(
      [{ center_id: 1, center_name: 'أ', total: 100, balance: 80, posted_undelivered: 20 }],
      [{ center_id: 1, center_name: 'أ', total: 110, balance: 80, posted_undelivered: 30 }]
    )
    expect(diffs[0].status).toBe('changed')
    expect(diffs[0].delta_total).toBe(10)
  })
})

describe('inventorySnapshot — 1000 تكرار عشوائي', () => {
  it('كل صف يطابق المحرك', () => {
    for (let i = 0; i < 1000; i++) {
      const out = Math.random() * 1e6
      const inn = Math.random() * 1e6
      const balance = calculateCenterBalance(out, inn)
      const posted = (Math.random() - 0.3) * 5e5
      const row = snapshotRowFromStatement(
        { id: i, name: 'x', code: `C${i}`, type: 'trader' },
        { balance, posted_undelivered_value: posted, wip_value: Math.random() * 1e4 }
      )
      expect(assertRowMatchesEngine(row)).toBe(true)
      expect(row.total).toBe(calculateGrandTotal(balance, posted))
    }
  })

  it('rollup لا يفقد من المراكز', () => {
    for (let n = 0; n < 200; n++) {
      const rows = Array.from({ length: 5 + (n % 10) }, (_, j) => ({
        category: j % 2 ? 'traders' : 'brokers',
        balance: j * 10,
        posted_undelivered: j,
        wip_value: 0,
        total: calculateGrandTotal(j * 10, j),
      }))
      const t = rollupSnapshotTotals(rows)
      const sumTotal = rows.reduce((s, r) => s + r.total, 0)
      expect(Math.abs(t.total - sumTotal)).toBeLessThan(0.02)
    }
  })
})

describe('inventory.validator', () => {
  const { createSnapshotSchema } = require('../src/validators/inventory.validator')
  it('يقبل تاريخاً صالحاً', () => {
    expect(createSnapshotSchema.safeParse({ snapshot_date: '2026-06-05' }).success).toBe(true)
  })
})
