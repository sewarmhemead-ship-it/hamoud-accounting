export const EXPENSE_SECTIONS = [
  {
    key: 'office',
    label: 'مصاريف المكتب',
    presets: [
      'إيجار مكتب',
      'رواتب إدارية',
      'اتصالات وإنترنت',
      'قرطاسية',
      'ضيافة',
      'تأمينات',
      'محاسبة قانونية',
      'أخرى — مكتب',
    ],
  },
  {
    key: 'operations',
    label: 'مصاريف تشغيلية',
    presets: [
      'ديزل / وقود',
      'صيانة شاحنات',
      'أجور عمال ميدان',
      'رسوم موانئ',
      'تأشيرات وسفر',
      'قطع غيار',
      'مخالفات',
      'أخرى — تشغيل',
    ],
  },
  {
    key: 'misc',
    label: 'متفرقة (اختر وجهة الخصم)',
    presets: ['سلفة', 'تسوية', 'هدايا', 'تبرعات', 'غير مصنّف', 'أخرى'],
    allowBucket: true,
  },
  {
    key: 'home',
    label: 'مصاريف المنزل / شخصية',
    presets: [
      'إيجار سكن',
      'كهرباء وماء',
      'تموين عائلي',
      'تعليم',
      'صحة',
      'مواصلات شخصية',
      'أخرى — منزل',
    ],
  },
]

export function emptyLine(bucket = 'office') {
  return { label: '', amount: '', bucket }
}

export function emptyExpenseState() {
  return {
    office: [emptyLine()],
    home: [emptyLine()],
    operations: [emptyLine()],
    misc: [emptyLine('office')],
  }
}

export function parseBudgetNotes(notes) {
  const base = emptyExpenseState()
  base.memo = ''
  if (!notes) return { ...base, memo: '' }
  try {
    const j = JSON.parse(notes)
    if (j?.expense_budget) {
      const mapLines = (arr, defaultBucket) =>
        (arr || []).map((l) => ({
          label: l.label || '',
          amount: l.amount != null ? String(l.amount) : '',
          bucket: l.bucket === 'home' ? 'home' : defaultBucket || 'office',
        }))
      return {
        memo: j.memo || '',
        office: mapLines(j.expense_budget.office, 'office'),
        home: mapLines(j.expense_budget.home, 'home'),
        operations: mapLines(j.expense_budget.operations, 'office'),
        misc: mapLines(j.expense_budget.misc, 'office'),
      }
    }
  } catch {
    /* */
  }
  return { ...base, memo: String(notes) }
}

export function sumLines(lines, parseNum) {
  return (lines || []).reduce((s, l) => s + parseNum(l.amount), 0)
}

export function rollupExpenseTotals(sections, parseNum) {
  let office = 0
  let home = 0
  for (const sec of EXPENSE_SECTIONS) {
    for (const line of sections[sec.key] || []) {
      const amt = parseNum(line.amount)
      const bucket = sec.allowBucket ? line.bucket || 'office' : sec.key === 'home' ? 'home' : 'office'
      if (bucket === 'home') home += amt
      else office += amt
    }
  }
  return { office_expenses: office, home_expenses: home }
}

export function serializeBudgetNotes(memo, sections, parseNum) {
  const clean = (lines, allowBucket) =>
    (lines || [])
      .filter((l) => l.label.trim() || parseNum(l.amount))
      .map((l) => {
        const row = {
          label: l.label.trim() || '—',
          amount: parseNum(l.amount),
        }
        if (allowBucket && l.bucket === 'home') row.bucket = 'home'
        return row
      })

  const expense_budget = {
    office: clean(sections.office, false),
    home: clean(sections.home, false),
    operations: clean(sections.operations, false),
    misc: clean(sections.misc, true),
  }
  const hasLines = EXPENSE_SECTIONS.some((s) => expense_budget[s.key].length > 0)
  if (!hasLines && !memo.trim()) return undefined
  return JSON.stringify({
    expense_budget,
    memo: memo.trim() || undefined,
  })
}

/** @deprecated */
export const OFFICE_EXPENSE_PRESETS = EXPENSE_SECTIONS[0].presets
export const HOME_EXPENSE_PRESETS = EXPENSE_SECTIONS[3].presets
