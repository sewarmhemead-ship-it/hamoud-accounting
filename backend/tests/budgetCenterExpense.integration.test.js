/**
 * خصم بنود الميزانية المرتبطة بمركز عند إغلاق اليوم — خصم فعلي مرة واحدة (علامة منع تكرار).
 */
const { createFullProductDb, destroyFullProductDb } = require('./helpers/fullProductDb')
const AccountingService = require('../src/services/AccountingService')
const ProfitService = require('../src/services/ProfitService')
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

function budgetNotes(centerId, amount, label = 'إيجار المكتب') {
  return JSON.stringify({
    expense_budget: {
      office: [],
      home: [],
      operations: [],
      misc: [{ label, amount, bucket: 'office', center_id: centerId }],
    },
    memo: 'اختبار',
  })
}

describe('بنود الميزانية المرتبطة بمركز — خصم فعلي عند الإغلاق', () => {
  it('إغلاق اليوم يخصم البند من حساب المركز ويضع علامة منع التكرار', () => {
    charge(ctx.traderId, 1000)
    expect(AccountingService.getCenterBalance(ctx.traderId).balance).toBe(1000)

    ProfitService.closeDay(ctx.testDate, { notes: budgetNotes(ctx.traderId, 300) }, ctx.adminId)

    // خُصم 300 من حساب التاجر
    expect(AccountingService.getCenterBalance(ctx.traderId).balance).toBe(700)

    // وُضعت علامة expense_tx على البند في الملاحظات المحفوظة
    const stored = ProfitService.getByDate(ctx.testDate)
    const parsed = JSON.parse(stored.notes)
    expect(parsed.expense_budget.misc[0].expense_tx).toBeTruthy()
  })

  it('إعادة الحفظ بنفس الملاحظات لا تكرّر الخصم', () => {
    charge(ctx.traderId, 1000)
    ProfitService.closeDay(ctx.testDate, { notes: budgetNotes(ctx.traderId, 300) }, ctx.adminId)
    expect(AccountingService.getCenterBalance(ctx.traderId).balance).toBe(700)

    // الملاحظات المحفوظة تحوي العلامة — إعادة الحفظ لا تخصم ثانيةً
    const stored = ProfitService.getByDate(ctx.testDate)
    ProfitService.updateDay(ctx.testDate, { notes: stored.notes }, ctx.adminId)
    expect(AccountingService.getCenterBalance(ctx.traderId).balance).toBe(700)
  })

  it('بند بلا مركز لا يُنشئ أي خصم', () => {
    charge(ctx.traderId, 1000)
    const notes = JSON.stringify({
      expense_budget: {
        office: [{ label: 'قرطاسية', amount: 50 }],
        home: [],
        operations: [],
        misc: [],
      },
    })
    ProfitService.closeDay(ctx.testDate, { notes }, ctx.adminId)
    expect(AccountingService.getCenterBalance(ctx.traderId).balance).toBe(1000)
  })

  it('بند على مخلص يُخصم من حسابه أيضاً', () => {
    charge(ctx.brokerId, 800)
    ProfitService.closeDay(ctx.testDate, { notes: budgetNotes(ctx.brokerId, 200, 'كهرباء') }, ctx.adminId)
    expect(AccountingService.getCenterBalance(ctx.brokerId).balance).toBe(600)
  })
})
