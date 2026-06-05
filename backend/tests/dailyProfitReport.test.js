const {
  parseExpenseNotes,
  sumExpenseLines,
  buildWaterfall,
} = require('../src/utils/expenseBudget')
const { calculateDailyGrossProfit, calculateNetProfit } = require('../src/engine')

describe('parseExpenseNotes / sumExpenseLines', () => {
  it('يفك JSON الميزانية', () => {
    const notes = JSON.stringify({
      expense_budget: {
        office: [{ label: 'إيجار', amount: 100 }],
        home: [{ label: 'منزل', amount: 50 }],
      },
      memo: 'تجربة',
    })
    const p = parseExpenseNotes(notes)
    expect(p.office).toHaveLength(1)
    expect(p.home[0].amount).toBe(50)
    expect(p.memo).toBe('تجربة')
    expect(sumExpenseLines(p.office)).toBe(100)
  })

  it('نص عادي يُعاد كملاحظة', () => {
    expect(parseExpenseNotes('ملاحظة يدوية').memo).toBe('ملاحظة يدوية')
  })

  it('قسم تشغيلية يدخل في التجميع', () => {
    const notes = JSON.stringify({
      expense_budget: {
        office: [],
        home: [],
        operations: [{ label: 'وقود', amount: 40 }],
        misc: [],
      },
    })
    const { rollupExpenseTotals } = require('../src/utils/expenseBudget')
    expect(rollupExpenseTotals(parseExpenseNotes(notes)).office_expenses).toBe(40)
  })
})

describe('buildWaterfall — توافق مع المحرك', () => {
  const preview = {
    gross_revenue: 580,
    num_trucks: 3,
    payments_received: 200,
  }

  it('معاينة حية = calculateDailyGrossProfit + calculateNetProfit', () => {
    const live = {
      transport_diff: 40,
      workers_diff: 60,
      driver_diff: 125,
      credit_diff: -41,
      office_expenses: 100,
      home_expenses: 50,
    }
    const w = buildWaterfall(preview, null, live)
    const gross = calculateDailyGrossProfit({
      baseClearance: 580,
      transport_diff: 40,
      workers_diff: 60,
      driver_diff: 125,
      credit_diff: -41,
    })
    expect(w.gross_profit).toBe(gross)
    expect(w.net_profit).toBe(calculateNetProfit(gross, 100, 50))
    expect(w.base_clearance).toBe(580)
  })

  it('يوم مُغلق يعكس السجل المحفوظ', () => {
    const closed = {
      gross_profit: 764,
      transport_diff: 40,
      workers_diff: 60,
      driver_diff: 125,
      credit_diff: -41,
      office_expenses: 200,
      home_expenses: 0,
      net_profit: 564,
      num_trucks: 5,
    }
    const w = buildWaterfall(preview, closed)
    expect(w.base_clearance).toBe(580)
    expect(w.gross_profit).toBe(764)
    expect(w.net_profit).toBe(564)
    expect(w.num_trucks).toBe(5)
  })
})

describe('إغلاق اليوم — عقد الحقول (zod)', () => {
  const { closeDaySchema } = require('../src/validators/profit.validator')

  it('يقبل فروقات سالبة ومصاريف صفر', () => {
    const r = closeDaySchema.safeParse({
      date: '2026-06-05',
      transport_diff: -10,
      credit_diff: -41,
      office_expenses: 0,
      home_expenses: 0,
    })
    expect(r.success).toBe(true)
  })

  it('يرفض مصروف مكتب سالب', () => {
    expect(
      closeDaySchema.safeParse({ date: '2026-06-05', office_expenses: -1 }).success
    ).toBe(false)
  })
})
