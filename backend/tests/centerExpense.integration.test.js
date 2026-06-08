/**
 * بنود المصاريف على حساب المركز (تاجر/مخلص):
 * قيد وارد يخفّض الدين الذي على المركز لنا، ويظهر منظّماً في الكشف.
 */
const { createFullProductDb, destroyFullProductDb } = require('./helpers/fullProductDb')
const AccountingService = require('../src/services/AccountingService')
const BrokerStatementService = require('../src/services/BrokerStatementService')
const { generateRef } = require('../src/utils/refGenerator')
const { REF_PREFIX } = require('../src/config/constants')

let ctx

beforeEach(async () => {
  ctx = await createFullProductDb()
})

afterEach(() => {
  destroyFullProductDb(ctx?.db)
  ctx = null
})

function charge(centerId, amount) {
  // استحقاق (out) يجعل المركز مديناً لنا بمبلغ معروف
  return AccountingService.createManualOut(
    {
      ref_number: generateRef(REF_PREFIX.TRANSACTION),
      center_id: centerId,
      amount,
      currency: 'USD',
      date: `${ctx.testDate}T10:00:00.000Z`,
      notes: 'استحقاق',
    },
    ctx.adminId
  )
}

describe('بند مصروف على المركز — AccountingService.createExpense', () => {
  it('بند مصروف يخفّض رصيد التاجر (الدين الذي علينا لنا)', () => {
    charge(ctx.traderId, 1000) // التاجر مدين لنا 1000
    expect(AccountingService.getCenterBalance(ctx.traderId).balance).toBe(1000)

    AccountingService.createExpense(
      {
        ref_number: generateRef(REF_PREFIX.TRANSACTION),
        center_id: ctx.traderId,
        amount: 300,
        currency: 'USD',
        date: `${ctx.testDate}T12:00:00.000Z`,
        notes: 'إيجار المكتب',
      },
      ctx.adminId
    )

    // 1000 - 300 = 700
    expect(AccountingService.getCenterBalance(ctx.traderId).balance).toBe(700)
  })

  it('بند مصروف على المخلص أيضاً (ليس التاجر فقط)', () => {
    charge(ctx.brokerId, 500)
    AccountingService.createExpense(
      {
        ref_number: generateRef(REF_PREFIX.TRANSACTION),
        center_id: ctx.brokerId,
        amount: 200,
        currency: 'USD',
        date: `${ctx.testDate}T12:00:00.000Z`,
        notes: 'كهرباء',
      },
      ctx.adminId
    )
    expect(AccountingService.getCenterBalance(ctx.brokerId).balance).toBe(300)
  })

  it('البند يظهر في الكشف كصف منفصل مع مجموع المصاريف', () => {
    charge(ctx.traderId, 1000)
    AccountingService.createExpense(
      {
        ref_number: generateRef(REF_PREFIX.TRANSACTION),
        center_id: ctx.traderId,
        amount: 300,
        currency: 'USD',
        date: `${ctx.testDate}T12:00:00.000Z`,
        notes: 'إيجار المكتب',
      },
      ctx.adminId
    )

    const stmt = BrokerStatementService.getStatement(ctx.traderId)
    const expenseRow = stmt.rows.find((r) => r.kind === 'expense')
    expect(expenseRow).toBeTruthy()
    expect(expenseRow.label).toBe('إيجار المكتب')
    expect(stmt.totals.expenses_total).toBe(300)
  })
})
