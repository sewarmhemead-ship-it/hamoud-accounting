import { EXPENSE_SECTIONS, emptyLine, sumLines } from '../../utils/profitBudget'
import { formatCurrency } from '../../utils/format'

function ExpenseSectionEditor({ section, lines, onChange, parseNum }) {
  const total = sumLines(lines, parseNum)

  const setLine = (idx, patch) => {
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  return (
    <div className="rounded-xl border border-surface-border/60 p-3 space-y-2 bg-surface-hover/30">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink">{section.label}</p>
        <span className="text-xs tabular-nums text-accent font-bold">{formatCurrency(total)}</span>
      </div>
      {lines.map((line, idx) => (
        <div
          key={idx}
          className={`grid gap-2 items-center ${section.allowBucket ? 'grid-cols-[1fr_5rem_7rem_auto]' : 'grid-cols-[1fr_7rem_auto]'}`}
        >
          <input
            list={`preset-${section.key}-${idx}`}
            value={line.label}
            onChange={(e) => setLine(idx, { label: e.target.value })}
            placeholder="اسم البند (حر)"
            className="text-sm"
          />
          <datalist id={`preset-${section.key}-${idx}`}>
            {section.presets.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          {section.allowBucket && (
            <select
              value={line.bucket || 'office'}
              onChange={(e) => setLine(idx, { bucket: e.target.value })}
              className="text-xs"
              title="يُخصم من"
            >
              <option value="office">مكتب</option>
              <option value="home">منزل</option>
            </select>
          )}
          <input
            type="number"
            step="0.01"
            value={line.amount}
            onChange={(e) => setLine(idx, { amount: e.target.value })}
            placeholder="0"
            className="text-sm"
          />
          <button
            type="button"
            className="btn-secondary !py-1 !px-2 text-xs"
            onClick={() => onChange(lines.filter((_, i) => i !== idx))}
            disabled={lines.length <= 1}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-xs text-accent hover:underline"
        onClick={() =>
          onChange([
            ...lines,
            emptyLine(section.allowBucket ? 'office' : section.key === 'home' ? 'home' : 'office'),
          ])
        }
      >
        + إضافة بند
      </button>
    </div>
  )
}

export function ExpenseBudgetBreakdown({ budget, parseNum }) {
  return (
    <div className="space-y-3 text-sm">
      {EXPENSE_SECTIONS.map((sec) => {
        const lines = budget[sec.key] || []
        if (!lines.length) return null
        const sub = sumLines(lines, parseNum)
        if (!sub) return null
        return (
          <div key={sec.key}>
            <p className="text-xs font-semibold text-ink-soft mb-1">{sec.label}</p>
            <ul className="space-y-1">
              {lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-2 text-ink-faint">
                  <span>
                    {l.label || '—'}
                    {sec.allowBucket && l.bucket === 'home' && (
                      <span className="text-[10px] mr-1 text-warning">(منزل)</span>
                    )}
                  </span>
                  <span className="tabular-nums">{formatCurrency(parseNum(l.amount))}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export default function ExpenseBudgetForm({ sections, setSection, parseNum, memo, setMemo }) {
  const { office_expenses, home_expenses } = (() => {
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
  })()

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-faint">
        المجموع المحاسبي: مكتب + تشغيل + متفرقة (مكتب) ={' '}
        <strong className="text-ink">{formatCurrency(office_expenses)}</strong>
        {' · '}
        منزل + متفرقة (منزل) ={' '}
        <strong className="text-ink">{formatCurrency(home_expenses)}</strong>
      </p>
      {EXPENSE_SECTIONS.map((sec) => (
        <ExpenseSectionEditor
          key={sec.key}
          section={sec}
          lines={sections[sec.key] || []}
          onChange={(lines) => setSection(sec.key, lines)}
          parseNum={parseNum}
        />
      ))}
      <div>
        <label className="label text-xs">ملاحظات عامة على الميزانية</label>
        <textarea rows={2} className="w-full text-sm" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
    </div>
  )
}
