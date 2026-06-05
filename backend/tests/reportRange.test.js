const { periodRangeSchema } = require('../src/validators/report.validator')

function isValidReportRange(from, to) {
  if (!from || !to) return false
  return from <= to
}

describe('reportRange (frontend contract)', () => {
  it('فترة صالحة', () => {
    expect(isValidReportRange('2026-01-01', '2026-06-04')).toBe(true)
  })
  it('فترة غير صالحة', () => {
    expect(isValidReportRange('2026-06-10', '2026-01-01')).toBe(false)
    expect(isValidReportRange('', '2026-01-01')).toBe(false)
  })
})

describe('periodRangeSchema', () => {
  it('يقبل فترة صحيحة', () => {
    expect(periodRangeSchema.safeParse({ from: '2026-01-01', to: '2026-06-30' }).success).toBe(true)
  })
  it('يرفض عندما من بعد إلى', () => {
    expect(periodRangeSchema.safeParse({ from: '2026-06-01', to: '2026-05-01' }).success).toBe(false)
  })
})

