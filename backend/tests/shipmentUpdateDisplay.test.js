const {
  describeShipmentUpdate,
  getFieldLabel,
  formatUpdateValue,
  formatDateTimeDisplay,
} = require('../src/utils/shipmentUpdateDisplay')
const { COST_FIELDS, PRICE_FIELDS } = require('../src/engine/clearance')
const { SHIPMENT_FIELD_LABELS } = require('../src/config/constants')

const DUAL_CASES = [
  ['cost_workers', 0, 0.01, 'عمال (تكلفة)'],
  ['cost_tarseem', 3076, 3076, 'ترسيم (تكلفة)'],
  ['cost_turkish_driver', 400, 420, 'سائق/نقل تركي (تكلفة)'],
  ['cost_clearance_fee', 100, 150, 'تخليص (تكلفة)'],
  ['cost_service_fee', 30, 30, 'خدمات المعبر (تكلفة)'],
  ['cost_door_receipt', 0, 5, 'مكتب / وصل دور (تكلفة)'],
  ['cost_other', 0, 0, 'مصاريف أخرى (تكلفة)'],
  ['price_tarseem', 3106, 3200, 'ترسيم (فاتورة)'],
  ['price_syrian_driver', 400, 420, 'سائق سوري (فاتورة)'],
  ['price_clearance_fee', 50, 60, 'تخليص (فاتورة)'],
  ['price_workers', 0, 0.01, 'عمال (فاتورة)'],
  ['price_service_fee', 0, 0, 'خدمات أخرى (فاتورة)'],
  ['price_door_receipt', 0, 0, 'مكتب / وصل دور (فاتورة)'],
  ['price_other', 0, 0, 'مصاريف أخرى (فاتورة)'],
]

const CLASSIC_CASES = Object.keys(SHIPMENT_FIELD_LABELS).map((field) => [
  field,
  100,
  200,
  SHIPMENT_FIELD_LABELS[field],
])

describe('shipmentUpdateDisplay', () => {
  it.each(DUAL_CASES)(
    'يعرض حقل مزدوج %s بعربي وليس snake_case',
    (field_name, old_value, new_value, expectedLabel) => {
      const row = describeShipmentUpdate({
        id: 1,
        field_name,
        old_value,
        new_value,
        updated_at: '2026-06-05 00:19:32',
        updated_by_name: 'مدير',
      })
      expect(row.field_label).toBe(expectedLabel)
      expect(row.summary).toContain(`«${expectedLabel}»`)
      expect(row.summary).toMatch(/^تم تعديل/)
      expect(row.summary).not.toContain('cost_')
      expect(row.summary).not.toContain('price_')
      expect(row.old_display).toMatch(/^\$|—/)
      expect(row.new_display).toMatch(/^\$|—/)
    }
  )

  it.each(CLASSIC_CASES)(
    'يعرض حقل كلاسيكي %s بعربي',
    (field_name, _old, _new, expectedLabel) => {
      const row = describeShipmentUpdate({
        field_name,
        old_value: 10,
        new_value: 20,
      })
      expect(row.field_label).toBe(expectedLabel)
      expect(row.summary).not.toContain(field_name)
    }
  )

  it('formatDateTimeDisplay يفصل التاريخ عن الوقت', () => {
    expect(formatDateTimeDisplay('2026-06-05 00:19:32')).toBe('2026-06-05 · 00:19')
    expect(formatDateTimeDisplay('2026-06-04T23:05:02')).toBe('2026-06-04 · 23:05')
  })

  it('ملاحظات كنص وليس مبلغ', () => {
    const row = describeShipmentUpdate({
      field_name: 'notes',
      old_value: null,
      new_value: null,
      note: 'تعديل يدوي',
    })
    expect(row.field_label).toBe('ملاحظات')
    expect(formatUpdateValue('نص', 'notes')).toBe('نص')
  })

  it('10,000 تكرار: لا يظهر snake_case في الملخص لكل حقول مزدوجة وكلاسيكية', () => {
    const fields = [
      ...DUAL_CASES.map((c) => c[0]),
      ...CLASSIC_CASES.map((c) => c[0]),
    ]
    for (let i = 0; i < 10_000; i++) {
      const field_name = fields[i % fields.length]
      const row = describeShipmentUpdate({
        field_name,
        old_value: i,
        new_value: i + 1,
      })
      expect(row.field_label).not.toMatch(/^(cost_|price_)/)
      expect(row.summary).not.toMatch(/cost_|price_/)
      expect(getFieldLabel(field_name)).not.toMatch(/^(cost_|price_)/)
    }
  })

  it('كل حقول COST و PRICE لها تسمية عربية', () => {
    for (const f of [...COST_FIELDS, ...PRICE_FIELDS]) {
      const label = getFieldLabel(f)
      expect(label).not.toBe(f)
      expect(label.length).toBeGreaterThan(2)
    }
  })
})
