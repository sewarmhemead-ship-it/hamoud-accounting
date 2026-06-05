const {
  parseExpenseNotes,
  rollupExpenseTotals,
  serializeExpenseBudget,
  emptyBudget,
} = require('../src/utils/expenseBudget')

describe('expenseBudget — أقسام المصاريف', () => {
  it('يجمع مكتب + تشغيل + متفرقة (مكتب) في office_expenses', () => {
    const budget = {
      office: [{ label: 'إيجار', amount: 100 }],
      home: [],
      operations: [{ label: 'ديزل', amount: 50 }],
      misc: [{ label: 'سلفة', amount: 20, bucket: 'office' }],
    }
    expect(rollupExpenseTotals(budget)).toEqual({
      office_expenses: 170,
      home_expenses: 0,
    })
  })

  it('متفرقة بوجهة منزل تُخصم من home_expenses', () => {
    const budget = {
      office: [],
      home: [{ label: 'كهرباء', amount: 30 }],
      operations: [],
      misc: [{ label: 'شخصي', amount: 15, bucket: 'home' }],
    }
    expect(rollupExpenseTotals(budget)).toEqual({
      office_expenses: 0,
      home_expenses: 45,
    })
  })

  it('serialize + parse يحافظ على الأقسام الأربعة', () => {
    const raw = serializeExpenseBudget('ملاحظة', {
      office: [{ label: 'أ', amount: 10 }],
      home: [{ label: 'ب', amount: 5 }],
      operations: [{ label: 'ج', amount: 3 }],
      misc: [{ label: 'د', amount: 2, bucket: 'home' }],
    })
    const p = parseExpenseNotes(raw)
    expect(p.memo).toBe('ملاحظة')
    expect(p.operations[0].amount).toBe(3)
    expect(p.misc[0].bucket).toBe('home')
    expect(rollupExpenseTotals(p)).toEqual({ office_expenses: 13, home_expenses: 7 })
  })

  it('ملاحظات قديمة (مكتب/منزل فقط) تبقى متوافقة', () => {
    const legacy = JSON.stringify({
      expense_budget: {
        office: [{ label: 'x', amount: 1 }],
        home: [{ label: 'y', amount: 2 }],
      },
    })
    const p = parseExpenseNotes(legacy)
    expect(p.operations).toEqual([])
    expect(p.misc).toEqual([])
  })

  it('emptyBudget', () => {
    expect(emptyBudget().office).toEqual([])
  })
})
