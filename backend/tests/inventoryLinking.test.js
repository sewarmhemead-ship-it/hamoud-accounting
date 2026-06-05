const {
  snapshotRowFromStatement,
  rollupSnapshotTotals,
  diffSnapshotToLive,
  assertRowMatchesEngine,
} = require('../src/utils/inventorySnapshot')
const { buildReportPayload, assertReportIntegrity } = require('../src/utils/inventoryReport')
const { calculateCenterBalance, calculateGrandTotal } = require('../src/engine')
const { PERM, PERM_TEMPLATES } = require('../src/config/permissions')

/** محاكاة getCenterFullStatement دون DB */
function mockStatement(out, inn, posted, wip) {
  const balance = calculateCenterBalance(out, inn)
  return {
    balance,
    posted_undelivered_value: posted,
    wip_value: wip,
    posted_undelivered_count: 1,
    wip_count: 1,
  }
}

describe('inventoryLinking — سلسلة محاسبية كاملة', () => {
  it('من statement إلى صف جرد إلى تقرير', () => {
    const center = { id: 10, name: 'تاجر', code: 'T10', type: 'trader' }
    const st = mockStatement(5000, 3000, 800, 200)
    const row = snapshotRowFromStatement(center, st)
    const payload = buildReportPayload({
      snapshot_date: '2026-06-05',
      rows: [row],
      compare: null,
    })
    expect(row.total).toBe(calculateGrandTotal(2000, 800))
    expect(assertReportIntegrity(payload)).toBe(true)
  })

  it('مقارنة لقطة vs حي بعد تغيّر وهمي', () => {
    const snap = [
      {
        center_id: 1,
        center_name: 'أ',
        total: 100,
        balance: 80,
        posted_undelivered: 20,
      },
    ]
    const live = [
      {
        center_id: 1,
        center_name: 'أ',
        total: 150,
        balance: 100,
        posted_undelivered: 50,
      },
    ]
    const diffs = diffSnapshotToLive(snap, live)
    expect(diffs[0].delta_total).toBe(50)
    const payload = buildReportPayload({
      snapshot_date: '2026-06-05',
      rows: snap,
      compare: { diffs, changed_count: 1 },
    })
    expect(payload.compare.changed_count).toBe(1)
  })
})

describe('inventoryLinking — 1000 ربط مركز↔محرك', () => {
  it('كل مركز وهمي: statement → row → engine', () => {
    for (let i = 0; i < 1000; i++) {
      const out = Math.random() * 50000
      const inn = Math.random() * 40000
      const posted = Math.random() * 10000
      const wip = Math.random() * 5000
      const types = ['trader', 'broker', 'partner', 'supplier']
      const center = {
        id: i,
        name: `X${i}`,
        code: `C${i}`,
        type: types[i % types.length],
      }
      const row = snapshotRowFromStatement(center, mockStatement(out, inn, posted, wip))
      expect(assertRowMatchesEngine(row)).toBe(true)
      expect(row.wip_value).toBe(wip)
    }
  })

  it('تجميع عدة مراكز يطابق مجموع الصفوف', () => {
    for (let n = 0; n < 250; n++) {
      const rows = []
      for (let j = 0; j < 4; j++) {
        const b = j * 11
        const p = j * 3
        rows.push({
          category: 'traders',
          balance: b,
          posted_undelivered: p,
          wip_value: 0,
          total: calculateGrandTotal(b, p),
        })
      }
      const rolled = rollupSnapshotTotals(rows)
      const sum = rows.reduce((s, r) => s + r.total, 0)
      expect(Math.abs(rolled.total - sum)).toBeLessThan(0.02)
      const payload = buildReportPayload({ snapshot_date: '2026-06-01', rows })
      expect(assertReportIntegrity(payload)).toBe(true)
    }
  })
})

describe('inventoryLinking — صلاحيات التصدير', () => {
  it('المحاسب يصدّر ويدير الجرد', () => {
    const acc = PERM_TEMPLATES.find((t) => t.id === 'accountant')
    expect(acc.perms).toContain(PERM.INVENTORY_MANAGE)
    expect(acc.perms).toContain(PERM.REPORTS_EXPORT)
  })

  it('المستعرض لا يصدّر', () => {
    const v = PERM_TEMPLATES.find((t) => t.id === 'viewer')
    expect(v.perms).not.toContain(PERM.INVENTORY_MANAGE)
    expect(v.perms).not.toContain(PERM.REPORTS_EXPORT)
  })
})
