import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profitApi, centersApi } from '../api'
import ReportExportButtons from '../components/ReportExportButtons'
import GlassPanel from '../components/ui/GlassPanel'
import KpiStatCard from '../components/ui/KpiStatCard'
import { formatCurrency, todayISO, formatDate, parseNum } from '../utils/format'
import {
  emptyExpenseState,
  parseBudgetNotes,
  rollupExpenseTotals,
  serializeBudgetNotes,
} from '../utils/profitBudget'
import ExpenseBudgetForm, { ExpenseBudgetBreakdown } from '../components/profit/ExpenseBudgetForm'
import { PERM } from '../constants/permissions'
import { useAuthStore, useUiStore } from '../store/auth.store'
import { downloadBlob } from '../utils/download'

const DIFF_FIELDS = [
  { key: 'clearance_diff', label: 'فرق تخليص' },
  { key: 'transport_diff', label: 'فرق نقل تركي' },
  { key: 'workers_diff', label: 'فرق عمال' },
  { key: 'driver_diff', label: 'فرق سائق سوري' },
  { key: 'credit_diff', label: 'فرق اعتماد' },
]

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

const QUICK_LINKS = [
  { to: '/', label: 'لوحة التحكم', icon: '📊' },
  { to: '/shipments/ready', label: 'جاهزة للترحيل', icon: '🚛' },
  { to: '/transactions', label: 'القيود', icon: '📒' },
  { to: '/cash', label: 'النقد', icon: '💵' },
  { to: '/reports', label: 'التقارير', icon: '📑' },
]

const n = parseNum

function fmtLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}
function shiftDate(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return fmtLocal(dt)
}
function shiftMonth(iso, months) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setMonth(dt.getMonth() + months)
  return fmtLocal(dt)
}

function MonthlyBarChart({ days, selected, onPick }) {
  if (!days?.length) {
    return <p className="text-ink-faint text-sm py-8 text-center">لا أيام مُغلقة في هذا الشهر بعد</p>
  }
  const W = 720
  const H = 180
  const pad = { t: 16, b: 26, x: 8 }
  const vals = days.map((d) => Number(d.net_profit) || 0)
  const max = Math.max(0, ...vals)
  const min = Math.min(0, ...vals)
  const span = max - min || 1
  const innerH = H - pad.t - pad.b
  const zeroY = pad.t + (max / span) * innerH
  const slot = (W - pad.x * 2) / days.length
  const bw = Math.min(34, slot * 0.6)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
      <line x1={pad.x} y1={zeroY} x2={W - pad.x} y2={zeroY} stroke="currentColor" strokeOpacity="0.15" />
      {days.map((d, i) => {
        const v = Number(d.net_profit) || 0
        const h = (Math.abs(v) / span) * innerH
        const x = pad.x + slot * i + (slot - bw) / 2
        const y = v >= 0 ? zeroY - h : zeroY
        const isSel = d.date === selected
        const color = v >= 0 ? '#22c55e' : '#ef4444'
        const dayNum = parseInt(d.date.slice(8, 10), 10)
        return (
          <g key={d.date} onClick={() => onPick(d.date)} style={{ cursor: 'pointer' }}>
            <rect
              x={pad.x + slot * i}
              y={pad.t}
              width={slot}
              height={innerH}
              fill={isSel ? '#b8860b' : 'transparent'}
              fillOpacity={isSel ? 0.12 : 0}
            />
            <rect x={x} y={y} width={bw} height={Math.max(2, h)} rx="3" fill={color} fillOpacity={isSel ? 1 : 0.75} />
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.55">
              {dayNum}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function WaterfallRow({ label, value, op, strong, tone }) {
  const color = tone === 'pos' ? 'text-success' : tone === 'neg' ? 'text-danger' : 'text-ink'
  return (
    <div className={`flex items-center justify-between py-2.5 ${strong ? 'border-t border-surface-border mt-2 pt-3' : ''}`}>
      <span className={`text-sm ${strong ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
        {op && <span className="text-ink-faint ml-1 font-mono">{op}</span>}
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${strong ? color : 'text-ink-soft'}`}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

export default function ProfitPage() {
  const [date, setDate] = useState(todayISO())
  const [memo, setMemo] = useState('')
  const [expenseSections, setExpenseSections] = useState(emptyExpenseState)
  const [diffs, setDiffs] = useState({
    transport_diff: '',
    workers_diff: '',
    driver_diff: '',
    credit_diff: '',
  })
  const [editMode, setEditMode] = useState(false)
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canClose = hasPermission(PERM.PROFIT_CLOSE)
  const canEditClosed = hasPermission(PERM.PROFIT_EDIT_CLOSED)
  const setSection = (key, lines) => setExpenseSections((s) => ({ ...s, [key]: lines }))

  const { data: detailRes, isLoading, refetch } = useQuery({
    queryKey: ['profit', 'detail', date],
    queryFn: () => profitApi.detail(date),
  })

  const [year, month] = date.split('-')
  const { data: monthlyRes } = useQuery({
    queryKey: ['profit', 'monthly', year, month],
    queryFn: () => profitApi.monthly(parseInt(year, 10), parseInt(month, 10)),
  })

  const { data: centersRes } = useQuery({
    queryKey: ['centers'],
    queryFn: () => centersApi.list({ limit: 500 }),
  })
  const centers = centersRes?.data || []

  const detail = detailRes?.data
  const preview = detail?.preview
  const closed = detail?.closed
  const movements = detail?.movements || []
  const payments = detail?.payments || []
  const isClosed = !!closed
  const monthly = monthlyRes?.data

  const { office_expenses: officeTotal, home_expenses: homeTotal } = useMemo(
    () => rollupExpenseTotals(expenseSections, n),
    [expenseSections]
  )

  const parsedBudget = useMemo(
    () => (closed?.notes ? parseBudgetNotes(closed.notes) : null),
    [closed?.notes]
  )

  useEffect(() => {
    if (!detail) return
    if (closed) {
      const budget = parseBudgetNotes(closed.notes)
      setMemo(budget.memo)
      setExpenseSections({
        office: budget.office.length ? budget.office : emptyExpenseState().office,
        home: budget.home.length ? budget.home : emptyExpenseState().home,
        operations: budget.operations.length ? budget.operations : emptyExpenseState().operations,
        misc: budget.misc.length ? budget.misc : emptyExpenseState().misc,
      })
      setDiffs({
        clearance_diff: String(closed.clearance_diff ?? ''),
        transport_diff: String(closed.transport_diff ?? ''),
        workers_diff: String(closed.workers_diff ?? ''),
        driver_diff: String(closed.driver_diff ?? ''),
        credit_diff: String(closed.credit_diff ?? ''),
      })
      setEditMode(false)
    } else {
      setMemo('')
      setExpenseSections(emptyExpenseState())
      setDiffs({
        clearance_diff: '',
        transport_diff: '',
        workers_diff: '',
        driver_diff: '',
        credit_diff: '',
      })
    }
  }, [date, closed?.id, closed?.updated_at])

  const view = useMemo(() => {
    if (isClosed && !editMode) {
      const diffSum = DIFF_FIELDS.reduce((s, f) => s + n(closed[f.key]), 0)
      return {
        base: (Number(closed.gross_profit) || 0) - diffSum,
        diffs: Object.fromEntries(DIFF_FIELDS.map((f) => [f.key, n(closed[f.key])])),
        gross: Number(closed.gross_profit) || 0,
        office: Number(closed.office_expenses) || 0,
        home: Number(closed.home_expenses) || 0,
        net: Number(closed.net_profit) || 0,
        trucks: Number(closed.num_trucks) || 0,
      }
    }
    const base = preview?.gross_profit || 0
    const diffSum = DIFF_FIELDS.reduce((s, f) => s + n(diffs[f.key]), 0)
    const gross = base + diffSum
    return {
      base,
      diffs: Object.fromEntries(DIFF_FIELDS.map((f) => [f.key, n(diffs[f.key])])),
      gross,
      office: officeTotal,
      home: homeTotal,
      net: gross - officeTotal - homeTotal,
      trucks: preview?.num_trucks || 0,
    }
  }, [isClosed, editMode, closed, preview, diffs, officeTotal, homeTotal])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['profit'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  // بنود الميزانية المرتبطة بمركز ولم تُخصم بعد — تتطلب تأكيداً قبل الخصم الفعلي
  const pendingDeductions = () => {
    const out = []
    for (const key of Object.keys(expenseSections)) {
      for (const l of expenseSections[key] || []) {
        const amt = n(l.amount)
        if (l.center_id && amt > 0 && !l.expense_tx) {
          out.push({ name: l.center_name || 'مركز', amount: amt, label: l.label || 'مصروف' })
        }
      }
    }
    return out
  }

  const confirmDeductions = () => {
    const pend = pendingDeductions()
    if (pend.length === 0) return true
    const lines = pend
      .map((p) => `• ${p.label}: ${formatCurrency(p.amount)} — من «${p.name}»`)
      .join('\n')
    return window.confirm(
      `سيتم خصم البنود التالية فعلياً من حسابات المراكز:\n\n${lines}\n\nتأكيد التنفيذ؟`
    )
  }

  const buildPayload = () => ({
    clearance_diff: n(diffs.clearance_diff),
    transport_diff: n(diffs.transport_diff),
    workers_diff: n(diffs.workers_diff),
    driver_diff: n(diffs.driver_diff),
    credit_diff: n(diffs.credit_diff),
    office_expenses: officeTotal,
    home_expenses: homeTotal,
    notes: serializeBudgetNotes(memo, expenseSections, n),
  })

  const closeMutation = useMutation({
    mutationFn: () =>
      profitApi.close({
        date,
        num_trucks: preview?.num_trucks,
        ...buildPayload(),
      }),
    onSuccess: () => {
      showToast('تم إغلاق اليوم', 'success')
      refetch()
      invalidateAll()
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: () => profitApi.update(date, buildPayload()),
    onSuccess: () => {
      showToast('تم تحديث سجل اليوم', 'success')
      setEditMode(false)
      refetch()
      invalidateAll()
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const movementsMatch =
    Math.abs((detail?.movements_total || 0) - (preview?.gross_revenue || 0)) < 0.02

  if (isLoading && !detail) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 rounded-2xl glass-panel" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl glass-panel" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <GlassPanel className="!p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">المربح اليومي</h1>
          <p className="text-xs text-ink-faint mt-0.5">
            ميزانية يومية — فروقات — مصاريف مفصّلة — تقرير لكل سيارة مُرحَّلة
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" className="btn-secondary !py-1.5 !px-2.5" onClick={() => setDate(shiftDate(date, -1))}>
            ‹
          </button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          <button type="button" className="btn-secondary !py-1.5 !px-2.5" onClick={() => setDate(shiftDate(date, 1))}>
            ›
          </button>
          <button type="button" className="btn-secondary !py-1.5 !px-3 text-xs" onClick={() => setDate(todayISO())}>
            اليوم
          </button>
          <span className={`pill ${isClosed ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
            {isClosed ? '● مُغلق' : '◌ مفتوح'}
          </span>
        </div>
      </GlassPanel>

      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="btn-secondary !py-1.5 !px-3 text-xs gap-1.5 inline-flex items-center">
            <span>{l.icon}</span>
            {l.label}
          </Link>
        ))}
        {monthly?.days_count > 0 && (
          <div className="mr-auto">
            <ReportExportButtons
              filenameBase={`مربح_شهري_${year}-${month}`}
              fetchBlob={(fmt) => profitApi.monthBlob(year, month, fmt)}
              xlsxLabel="⬇ Excel الشهر"
              pdfLabel="⬇ PDF الشهر"
            />
          </div>
        )}
      </div>

      <GlassPanel className="!p-4 flex flex-wrap items-center justify-between gap-4 border border-accent/30">
        <div>
          <p className="font-semibold text-ink">تقارير اليوم — {formatDate(date)}</p>
          <p className="text-xs text-ink-faint mt-1">
            Excel و PDF: الميزانية، فروقات، مصاريف مفصّلة، كل سيارة مُرحَّلة، والدفعات
          </p>
        </div>
        <ReportExportButtons
          filenameBase={`مربح_يومي_${date}`}
          fetchBlob={(fmt) => profitApi.dayBlob(date, fmt)}
          xlsxLabel="📊 Excel اليوم"
          pdfLabel="📄 PDF اليوم"
        />
      </GlassPanel>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiStatCard
          icon="🚛"
          label="سيارات مرحّلة اليوم"
          value={view.trucks}
          format="number"
          sub={movementsMatch ? 'متطابق مع القيود' : 'تحقق من القيود'}
          tone="accent"
        />
        <KpiStatCard icon="🏛" label="مربح السيارات" value={view.base} sub="ما نأخذه من السيارات" tone="accent" />
        <KpiStatCard icon="🏢" label="مصاريف المكتب" value={view.office} sub="مكتب + تشغيل + متفرقة" tone="warning" />
        <KpiStatCard icon="🏠" label="مصاريف المنزل" value={view.home} sub="منزل / شخصية" tone="warning" />
        <KpiStatCard
          icon="💰"
          label="صافي المربح"
          value={view.net}
          sub="بعد كل المصاريف"
          tone={view.net >= 0 ? 'success' : 'danger'}
        />
      </div>

      {!movementsMatch && (preview?.gross_revenue || 0) > 0 && (
        <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2">
          تنبيه: مجموع إيراد الحركات ({formatCurrency(detail?.movements_total)}) يختلف عن معاينة التخليص (
          {formatCurrency(preview?.gross_revenue)}). راجع قيود الترحيل.
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <GlassPanel className="xl:col-span-1 space-y-4">
          <h3 className="font-semibold text-ink">
            {isClosed && !editMode
              ? 'اليوم مُغلق'
              : isClosed && editMode
                ? 'تعديل الإغلاق (مشرف)'
                : 'إغلاق اليوم'}
          </h3>

          {!isClosed && canClose && (
            <>
              <div>
                <p className="text-xs text-ink-faint mb-2">فروقات (ملف مربح يومي)</p>
                <div className="grid grid-cols-2 gap-3">
                  {DIFF_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="label text-xs">{f.label}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={diffs[f.key]}
                        onChange={(e) => setDiffs({ ...diffs, [f.key]: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <ExpenseBudgetForm
                sections={expenseSections}
                setSection={setSection}
                parseNum={n}
                memo={memo}
                setMemo={setMemo}
                centers={centers}
              />
              <button
                type="button"
                className="btn-success w-full"
                onClick={() => { if (confirmDeductions()) closeMutation.mutate() }}
                disabled={closeMutation.isPending}
              >
                {closeMutation.isPending ? 'جاري الإغلاق...' : 'إغلاق اليوم وحفظ الميزانية'}
              </button>
            </>
          )}

          {!isClosed && !canClose && (
            <p className="text-sm text-warning">ليس لديك صلاحية إغلاق اليوم. اطلب صلاحية «إغلاق اليوم» من المدير.</p>
          )}

          {isClosed && editMode && canEditClosed && (
            <>
              <p className="text-xs text-accent bg-accent/10 rounded-lg px-2 py-1.5">
                تعديل حصراً للمشرف بصلاحيات كاملة
              </p>
              <div className="grid grid-cols-2 gap-3">
                {DIFF_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="label text-xs">{f.label}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={diffs[f.key]}
                      onChange={(e) => setDiffs({ ...diffs, [f.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <ExpenseBudgetForm
                sections={expenseSections}
                setSection={setSection}
                parseNum={n}
                memo={memo}
                setMemo={setMemo}
                centers={centers}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-success flex-1"
                  onClick={() => { if (confirmDeductions()) updateMutation.mutate() }}
                  disabled={updateMutation.isPending}
                >
                  حفظ التعديل
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditMode(false)}>
                  إلغاء
                </button>
              </div>
            </>
          )}

          {isClosed && !editMode && (
            <div className="space-y-3">
              <p className="text-sm text-ink-soft">تم حفظ الميزانية. التفاصيل أدناه والتقارير تتضمن كل البنود.</p>
              {parsedBudget && <ExpenseBudgetBreakdown budget={parsedBudget} parseNum={n} />}
              {canEditClosed ? (
                <button type="button" className="btn-secondary w-full" onClick={() => setEditMode(true)}>
                  تعديل السجل (مشرف)
                </button>
              ) : (
                <p className="text-[11px] text-ink-faint">التعديل بعد الإغلاق للمشرف بصلاحية «تعديل يوم مُغلق» فقط.</p>
              )}
            </div>
          )}
        </GlassPanel>

        <GlassPanel className="xl:col-span-1">
          <h3 className="font-semibold text-ink mb-3">تفصيل الميزانية</h3>
          <WaterfallRow label="مربح السيارات" value={view.base} />
          {DIFF_FIELDS.map((f) => (
            <WaterfallRow key={f.key} op="+" label={f.label} value={view.diffs[f.key]} />
          ))}
          <WaterfallRow label="إجمالي اليوم" value={view.gross} strong />
          <WaterfallRow op="−" label="مصاريف المكتب" value={view.office} />
          <WaterfallRow op="−" label="مصاريف المنزل" value={view.home} />
          <WaterfallRow label="صافي المربح" value={view.net} strong tone={view.net >= 0 ? 'pos' : 'neg'} />
        </GlassPanel>

        <GlassPanel className="xl:col-span-1 overflow-hidden flex flex-col max-h-[420px]">
          <h3 className="font-semibold text-ink mb-2 shrink-0">
            حركات الترحيل ({movements.length})
          </h3>
          <div className="overflow-y-auto flex-1 -mx-1 px-1">
            {movements.length === 0 ? (
              <p className="text-sm text-ink-faint py-6 text-center">لا سيارات مُرحَّلة في هذا التاريخ</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-ink-faint border-b border-surface-border sticky top-0 bg-surface/90">
                    <th className="text-right py-2">رقم</th>
                    <th className="text-right py-2">تاجر</th>
                    <th className="text-left py-2">إيراد</th>
                    <th className="text-left py-2">مربحنا</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.transaction_id} className="border-b border-surface-border/30 hover:bg-surface-hover">
                      <td className="py-2">
                        <Link to={`/shipments/${m.shipment_id}`} className="text-accent font-medium hover:underline">
                          {m.ref_number}
                        </Link>
                      </td>
                      <td className="py-2 text-ink-soft truncate max-w-[8rem]">{m.trader_name}</td>
                      <td className="py-2 text-left tabular-nums font-medium">{formatCurrency(m.clearance_amount)}</td>
                      <td className="py-2 text-left tabular-nums font-semibold text-success">{formatCurrency(m.company_profit || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </GlassPanel>
      </div>

      {payments.length > 0 && (
        <GlassPanel>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-ink">دفعات اليوم ({payments.length})</h3>
            <Link to="/cash" className="text-xs text-accent hover:underline">
              صفحة النقد ←
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-faint border-b border-surface-border">
                  <th className="text-right py-2 px-2">مركز</th>
                  <th className="text-left py-2 px-2">مبلغ</th>
                  <th className="text-right py-2 px-2">فئة</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-surface-border/40">
                    <td className="py-2 px-2">
                      {p.center_id ? (
                        <Link to={`/centers/${p.center_id}`} className="text-accent hover:underline">
                          {p.center_name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 px-2 text-left tabular-nums">{formatCurrency(p.amount_usd)}</td>
                    <td className="py-2 px-2 text-ink-faint">{p.category || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}

      <GlassPanel className="space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-semibold text-ink">
            ملخص شهر {MONTHS_AR[parseInt(month, 10) - 1]} {year}
          </h3>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary !py-1.5 !px-2.5" onClick={() => setDate(shiftMonth(date, -1))}>
              ‹ السابق
            </button>
            <button type="button" className="btn-secondary !py-1.5 !px-2.5" onClick={() => setDate(shiftMonth(date, 1))}>
              التالي ›
            </button>
          </div>
        </div>

        {monthly?.days_count > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MiniStat label="أيام مُغلقة" value={monthly.days_count} plain />
              <MiniStat label="صافي الشهر" value={monthly.net_profit} tone="success" />
              <MiniStat label="متوسط/يوم" value={monthly.avg_net} />
              <MiniStat label="متوسط/سيارة" value={monthly.avg_per_truck} />
              <MiniStat label="إجمالي الإيراد" value={monthly.gross_profit} />
              <MiniStat label="عدد السيارات" value={monthly.num_trucks} plain />
            </div>
            <div>
              <p className="text-xs text-ink-faint mb-1">صافي الربح لكل يوم (انقر عموداً)</p>
              <MonthlyBarChart days={monthly.days} selected={date} onPick={setDate} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-ink-faint border-b border-surface-border">
                    <th className="text-right py-2 px-2">التاريخ</th>
                    <th className="text-right py-2 px-2">سيارات</th>
                    <th className="text-left py-2 px-2">إجمالي</th>
                    <th className="text-left py-2 px-2">مصاريف</th>
                    <th className="text-left py-2 px-2">صافي</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.days.map((d) => (
                    <tr
                      key={d.date}
                      onClick={() => setDate(d.date)}
                      className={`border-b border-surface-border/40 cursor-pointer hover:bg-surface-hover ${d.date === date ? 'bg-accent/10' : ''}`}
                    >
                      <td className="py-2 px-2">{formatDate(d.date)}</td>
                      <td className="py-2 px-2">{d.num_trucks}</td>
                      <td className="py-2 px-2 text-left tabular-nums">{formatCurrency(d.gross_profit)}</td>
                      <td className="py-2 px-2 text-left tabular-nums text-ink-faint">
                        {formatCurrency(n(d.office_expenses) + n(d.home_expenses))}
                      </td>
                      <td
                        className={`py-2 px-2 text-left tabular-nums font-semibold ${d.net_profit >= 0 ? 'text-success' : 'text-danger'}`}
                      >
                        {formatCurrency(d.net_profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {monthly.best_day && (
              <div className="flex flex-wrap gap-4 text-xs text-ink-faint">
                <span>
                  أفضل يوم:{' '}
                  <span className="text-success font-semibold">
                    {formatDate(monthly.best_day.date)} ({formatCurrency(monthly.best_day.net_profit)})
                  </span>
                </span>
                <span>
                  أضعف يوم:{' '}
                  <span className="text-danger font-semibold">
                    {formatDate(monthly.worst_day.date)} ({formatCurrency(monthly.worst_day.net_profit)})
                  </span>
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="text-ink-faint text-sm py-6 text-center">لا أيام مُغلقة في هذا الشهر بعد</p>
        )}
      </GlassPanel>
    </div>
  )
}

function MiniStat({ label, value, tone, plain }) {
  const color = tone === 'success' ? 'text-success' : 'text-ink'
  return (
    <div className="rounded-xl bg-surface-hover/80 px-3 py-2.5 border border-surface-border/40">
      <p className="text-[11px] text-ink-faint mb-1">{label}</p>
      <p className={`text-base font-bold tabular-nums ${color}`}>
        {plain ? Number(value || 0).toLocaleString('en-US') : formatCurrency(value)}
      </p>
    </div>
  )
}
