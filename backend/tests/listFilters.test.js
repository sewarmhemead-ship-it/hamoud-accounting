/**
 * عقد معاملات البحث — يطابق frontend/src/utils/listFilters.js
 * (نفس المنطق مكرر هنا لتشغيله ضمن Vitest الباك‑إند)
 */
function isListFilterActive({ search = '', status = '', from = '', to = '' } = {}) {
  const q = String(search).trim()
  return !!(status || from || to || q.length > 0)
}

function buildShipmentsListParams({
  search = '',
  status = '',
  from = '',
  to = '',
  limit = 25,
  offset = 0,
} = {}) {
  const q = String(search).trim()
  return {
    ...(status ? { status } : {}),
    ...(q ? { search: q } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    limit,
    offset,
  }
}

const { createPaymentSchema, offsetSchema } = require('../src/validators/transaction.validator')
const { calculateCenterBalance } = require('../src/engine/balance')

describe('دفعات ومقاصة — تحقق 1000×', () => {
  it('دفعة: مبالغ موجبة', () => {
    for (let i = 1; i <= 1000; i++) {
      const r = createPaymentSchema.safeParse({
        center_id: 1 + (i % 50),
        date: '2026-06-05',
        amount: i * 0.25,
        currency: 'USD',
      })
      expect(r.success).toBe(true)
    }
  })

  it('مقاصة: ترفض نفس المركز', () => {
    for (let i = 1; i <= 1000; i++) {
      expect(
        offsetSchema.safeParse({ from_center_id: 3, to_center_id: 3, amount: i }).success
      ).toBe(false)
    }
  })

  it('مقاصة: مركزان مختلفان', () => {
    for (let i = 1; i <= 1000; i++) {
      expect(
        offsetSchema.safeParse({ from_center_id: i, to_center_id: i + 1, amount: 10 + i }).success
      ).toBe(true)
    }
  })

  it('رصيد: out - in', () => {
    for (let i = 1; i <= 1000; i++) {
      expect(calculateCenterBalance(1000 + i, 200 + i)).toBe(800)
    }
  })
})

describe('listFilters — لوحة التحكم / قائمة السيارات', () => {
  it('isListFilterActive = false عندما كل الحقول فارغة', () => {
    expect(isListFilterActive({})).toBe(false)
    expect(isListFilterActive({ search: '   ' })).toBe(false)
  })

  it('isListFilterActive = true عند وجود بحث أو حالة أو تاريخ', () => {
    expect(isListFilterActive({ search: 'TRK' })).toBe(true)
    expect(isListFilterActive({ status: 'posted' })).toBe(true)
    expect(isListFilterActive({ from: '2026-01-01' })).toBe(true)
  })

  it('buildShipmentsListParams يحذف القيم الفارغة', () => {
    expect(buildShipmentsListParams({})).toEqual({ limit: 25, offset: 0 })
    expect(buildShipmentsListParams({ search: '  فراس  ', status: 'complete' })).toEqual({
      search: 'فراس',
      status: 'complete',
      limit: 25,
      offset: 0,
    })
  })
})
