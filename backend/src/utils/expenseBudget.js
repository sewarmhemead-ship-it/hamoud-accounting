const { calculateDailyGrossProfit } = require('../engine/dailyProfit')

const DIFF_KEYS = ['clearance_diff', 'transport_diff', 'workers_diff', 'driver_diff', 'credit_diff']
const DIFF_LABELS = {
  clearance_diff: 'فرق تخليص',
  transport_diff: 'فرق نقل تركي',
  workers_diff: 'فرق عمال',
  driver_diff: 'فرق سائق سوري',
  credit_diff: 'فرق اعتماد',
}

/** أقسام المصاريف — تُجمع إلى office_expenses / home_expenses في DB */
const EXPENSE_SECTION_KEYS = ['office', 'home', 'operations', 'misc']

const EXPENSE_SECTION_LABELS = {
  office: 'مصاريف المكتب',
  home: 'مصاريف المنزل / شخصية',
  operations: 'مصاريف تشغيلية',
  misc: 'متفرقة وأخرى',
}

const EXPENSE_SECTION_ROLLS = {
  office: 'office',
  home: 'home',
  operations: 'office',
  misc: null, // يُحدَّد لكل بند: bucket
}

function emptyBudget() {
  return { memo: '', office: [], home: [], operations: [], misc: [] }
}

function parseExpenseNotes(notes) {
  if (!notes) return emptyBudget()
  try {
    const j = JSON.parse(notes)
    if (j && typeof j === 'object' && j.expense_budget) {
      const b = j.expense_budget
      return {
        memo: j.memo || '',
        office: Array.isArray(b.office) ? b.office : [],
        home: Array.isArray(b.home) ? b.home : [],
        operations: Array.isArray(b.operations) ? b.operations : [],
        misc: Array.isArray(b.misc) ? b.misc : [],
      }
    }
  } catch (_) {
    /* */
  }
  return { memo: String(notes), office: [], home: [], operations: [], misc: [] }
}

function sumExpenseLines(lines) {
  return Math.round(
    (lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0) * 100
  ) / 100
}

/**
 * @param {object} budget من parseExpenseNotes
 * @returns {{ office_expenses: number, home_expenses: number }}
 */
function rollupExpenseTotals(budget) {
  let office = 0
  let home = 0

  const addLines = (lines, defaultBucket) => {
    for (const line of lines || []) {
      const amt = Number(line.amount) || 0
      const bucket =
        defaultBucket === null
          ? line.bucket === 'home'
            ? 'home'
            : 'office'
          : defaultBucket
      if (bucket === 'home') home += amt
      else office += amt
    }
  }

  addLines(budget.office, 'office')
  addLines(budget.home, 'home')
  addLines(budget.operations, 'office')
  addLines(budget.misc, null)

  return {
    office_expenses: Math.round(office * 100) / 100,
    home_expenses: Math.round(home * 100) / 100,
  }
}

function serializeExpenseBudget(memo, budget) {
  const clean = (lines, allowBucket) =>
    (lines || [])
      .filter((l) => (l.label && String(l.label).trim()) || Number(l.amount))
      .map((l) => {
        const row = {
          label: String(l.label || '').trim() || '—',
          amount: Math.round((Number(l.amount) || 0) * 100) / 100,
        }
        if (allowBucket && l.bucket === 'home') row.bucket = 'home'
        return row
      })

  const expense_budget = {
    office: clean(budget.office, false),
    home: clean(budget.home, false),
    operations: clean(budget.operations, false),
    misc: clean(budget.misc, true),
  }
  const hasLines = EXPENSE_SECTION_KEYS.some((k) => expense_budget[k].length > 0)
  if (!hasLines && !(memo && String(memo).trim())) return undefined

  return JSON.stringify({
    expense_budget,
    memo: memo && String(memo).trim() ? String(memo).trim() : undefined,
  })
}

function buildWaterfall(preview, closed, live = {}) {
  const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100

  if (closed) {
    const diffSum = DIFF_KEYS.reduce((s, k) => s + (Number(closed[k]) || 0), 0)
    return {
      base_clearance: round2((Number(closed.gross_profit) || 0) - diffSum),
      diffs: Object.fromEntries(DIFF_KEYS.map((k) => [k, Number(closed[k]) || 0])),
      gross_profit: Number(closed.gross_profit) || 0,
      office_expenses: Number(closed.office_expenses) || 0,
      home_expenses: Number(closed.home_expenses) || 0,
      net_profit: Number(closed.net_profit) || 0,
      num_trucks: Number(closed.num_trucks) || 0,
    }
  }

  // الأساس = مجموع «مربحنا» للسيارات المُرحَّلة (لا إجمالي فواتير التخليص)
  const base = preview?.gross_profit || 0
  const diffs = Object.fromEntries(
    DIFF_KEYS.map((k) => [k, Number(live[k]) || 0])
  )
  const gross = calculateDailyGrossProfit({ baseClearance: base, ...diffs })
  const office = Number(live.office_expenses) || 0
  const home = Number(live.home_expenses) || 0
  const net = round2(gross - office - home)

  return {
    base_clearance: base,
    diffs,
    gross_profit: gross,
    office_expenses: office,
    home_expenses: home,
    net_profit: net,
    num_trucks: preview?.num_trucks || 0,
  }
}

module.exports = {
  DIFF_KEYS,
  DIFF_LABELS,
  EXPENSE_SECTION_KEYS,
  EXPENSE_SECTION_LABELS,
  EXPENSE_SECTION_ROLLS,
  emptyBudget,
  parseExpenseNotes,
  sumExpenseLines,
  rollupExpenseTotals,
  serializeExpenseBudget,
  buildWaterfall,
}
