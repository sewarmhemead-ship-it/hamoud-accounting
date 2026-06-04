import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profitApi } from '../api'
import BalanceCard from '../components/BalanceCard'
import { formatCurrency, todayISO, formatDate } from '../utils/format'
import { useUiStore } from '../store/auth.store'

const DIFF_FIELDS = [
  { key: 'transport_diff', label: 'فرق نقل تركي' },
  { key: 'workers_diff', label: 'فرق عمال' },
  { key: 'driver_diff', label: 'فرق سائق سوري' },
  { key: 'credit_diff', label: 'فرق اعتماد' },
]

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

const n = (v) => parseFloat(v) || 0

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

// مخطّط أعمدة SVG خفيف بلا تبعيات
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
            <rect x={pad.x + slot * i} y={pad.t} width={slot} height={innerH} fill={isSel ? '#b8860b' : 'transparent'} fillOpacity={isSel ? 0.12 : 0} />
            <rect x={x} y={y} width={bw} height={Math.max(2, h)} rx="3" fill={color} fillOpacity={isSel ? 1 : 0.75} />
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.55">{dayNum}</text>
          </g>
        )
      })}
    </svg>
  )
}

function WaterfallRow({ label, value, op, strong, tone }) {
  const color = tone === 'pos' ? 'text-success' : tone === 'neg' ? 'text-danger' : 'text-ink'
  return (
    <div className={`flex items-center justify-between py-2 ${strong ? 'border-t border-surface-border mt-1' : ''}`}>
      <span className={`text-sm ${strong ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
        {op && <span className="text-ink-faint ml-1">{op}</span>}{label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${strong ? color : 'text-ink-soft'}`}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

export default function ProfitPage() {
  const [date, setDate] = useState(todayISO())
  const [office, setOffice] = useState('')
  const [home, setHome] = useState('')
  const [notes, setNotes] = useState('')
  const [diffs, setDiffs] = useState({ transport_diff: '', workers_diff: '', driver_diff: '', credit_diff: '' })
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  const { data: previewRes } = useQuery({
    queryKey: ['profit', 'preview', date],
    queryFn: () => profitApi.preview(date),
  })
  const { data: closedRes, refetch } = useQuery({
    queryKey: ['profit', 'closed', date],
    queryFn: () => profitApi.get(date),
  })

  const [year, month] = date.split('-')
  const { data: monthlyRes } = useQuery({
    queryKey: ['profit', 'monthly', year, month],
    queryFn: () => profitApi.monthly(parseInt(year, 10), parseInt(month, 10)),
  })

  const preview = previewRes?.data
  const closed = closedRes?.data
  const monthly = monthlyRes?.data
  const isClosed = !!closed

  // قيم العرض — من السجل المُغلق أو من المعاينة الحيّة
  const view = useMemo(() => {
    if (isClosed) {
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
    const base = preview?.gross_revenue || 0
    const diffSum = DIFF_FIELDS.reduce((s, f) => s + n(diffs[f.key]), 0)
    const gross = base + diffSum
    const office_ = n(office)
    const home_ = n(home)
    return {
      base,
      diffs: Object.fromEntries(DIFF_FIELDS.map((f) => [f.key, n(diffs[f.key])])),
      gross,
      office: office_,
      home: home_,
      net: gross - office_ - home_,
      trucks: preview?.num_trucks || 0,
    }
  }, [isClosed, closed, preview, diffs, office, home])

  const closeMutation = useMutation({
    mutationFn: () =>
      profitApi.close({
        date,
        num_trucks: preview?.num_trucks,
        clearance_diff: 0,
        transport_diff: n(diffs.transport_diff),
        workers_diff: n(diffs.workers_diff),
        driver_diff: n(diffs.driver_diff),
        credit_diff: n(diffs.credit_diff),
        office_expenses: n(office),
        home_expenses: n(home),
        notes: notes || undefined,
      }),
    onSuccess: () => {
      showToast('تم إغلاق اليوم', 'success')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['profit'] })
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  return (
    <div className="space-y-6">
      {/* شريط التنقّل */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary !py-1.5 !px-2.5" onClick={() => setDate(shiftDate(date, -1))}>‹</button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          <button type="button" className="btn-secondary !py-1.5 !px-2.5" onClick={() => setDate(shiftDate(date, 1))}>›</button>
          <button type="button" className="btn-secondary !py-1.5 !px-3 text-xs" onClick={() => setDate(todayISO())}>اليوم</button>
        </div>
        <span className={`pill ${isClosed ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
          {isClosed ? '● مُغلق' : '◌ مفتوح'}
        </span>
      </div>

      {/* مؤشرات اليوم */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BalanceCard title="تخليص الشركة" value={view.base} variant="accent" icon="🏛" subtitle="أساس — قيود مرحّلة" />
        <BalanceCard title="سيارات تركية" value={view.trucks} format="number" icon="🚛" />
        <BalanceCard title="إجمالي اليوم" value={view.gross} variant="warning" icon="∑" subtitle="تخليص + فروقات" />
        <BalanceCard title="صافي اليوم" value={view.net} variant={view.net >= 0 ? 'positive' : 'danger'} icon="💰" subtitle="بعد المصاريف" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* الإدخال */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-ink">{isClosed ? '✓ تم إغلاق اليوم' : 'فروقات ومصاريف اليوم'}</h3>
          {!isClosed ? (
            <>
              <div>
                <p className="text-xs text-ink-faint mb-2">فروقات (من ملف مربح يومي)</p>
                <div className="grid grid-cols-2 gap-3">
                  {DIFF_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="label text-xs">{f.label}</label>
                      <input type="number" step="0.01" value={diffs[f.key]} onChange={(e) => setDiffs({ ...diffs, [f.key]: e.target.value })} placeholder="0" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-ink-faint mb-2">المصاريف</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">مصاريف مكتب</label>
                    <input type="number" step="0.01" value={office} onChange={(e) => setOffice(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className="label text-xs">مصاريف منزل</label>
                    <input type="number" step="0.01" value={home} onChange={(e) => setHome(e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>
              <div>
                <label className="label text-xs">ملاحظات</label>
                <textarea rows={2} className="w-full" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <button type="button" className="btn-success w-full" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
                {closeMutation.isPending ? 'جاري الإغلاق...' : 'إغلاق اليوم'}
              </button>
            </>
          ) : (
            <p className="text-sm text-ink-soft">
              أُغلق هذا اليوم. القيم النهائية معروضة في تفصيل الحساب. {closed.notes && <span className="block mt-2 text-ink-faint">ملاحظات: {closed.notes}</span>}
            </p>
          )}
        </div>

        {/* تفصيل الحساب (waterfall) */}
        <div className="card">
          <h3 className="font-semibold text-ink mb-2">تفصيل الحساب</h3>
          <div className="divide-y divide-surface-border/40">
            <WaterfallRow label="تخليص الشركة" value={view.base} />
            {DIFF_FIELDS.map((f) => (
              <WaterfallRow key={f.key} op="+" label={f.label} value={view.diffs[f.key]} />
            ))}
            <WaterfallRow label="إجمالي اليوم" value={view.gross} strong />
            <WaterfallRow op="−" label="مصاريف مكتب" value={view.office} />
            <WaterfallRow op="−" label="مصاريف منزل" value={view.home} />
            <WaterfallRow label="صافي اليوم" value={view.net} strong tone={view.net >= 0 ? 'pos' : 'neg'} />
          </div>
        </div>
      </div>

      {/* القسم الشهري */}
      <div className="card space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-semibold text-ink">ملخص شهر {MONTHS_AR[parseInt(month, 10) - 1]} {year}</h3>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary !py-1.5 !px-2.5" onClick={() => setDate(shiftMonth(date, -1))}>‹ السابق</button>
            <button type="button" className="btn-secondary !py-1.5 !px-2.5" onClick={() => setDate(shiftMonth(date, 1))}>التالي ›</button>
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

            <div className="text-ink">
              <p className="text-xs text-ink-faint mb-1">صافي الربح لكل يوم (انقر عموداً لفتح اليوم)</p>
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
                      <td className="py-2 px-2 text-left tabular-nums text-ink-faint">{formatCurrency(n(d.office_expenses) + n(d.home_expenses))}</td>
                      <td className={`py-2 px-2 text-left tabular-nums font-semibold ${d.net_profit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(d.net_profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {monthly.best_day && (
              <div className="flex flex-wrap gap-4 text-xs text-ink-faint">
                <span>أفضل يوم: <span className="text-success font-semibold">{formatDate(monthly.best_day.date)} ({formatCurrency(monthly.best_day.net_profit)})</span></span>
                <span>أضعف يوم: <span className="text-danger font-semibold">{formatDate(monthly.worst_day.date)} ({formatCurrency(monthly.worst_day.net_profit)})</span></span>
              </div>
            )}
          </>
        ) : (
          <p className="text-ink-faint text-sm py-6 text-center">لا أيام مُغلقة في هذا الشهر بعد</p>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, tone, plain }) {
  const color = tone === 'success' ? 'text-success' : 'text-ink'
  return (
    <div className="rounded-lg bg-surface-hover px-3 py-2.5">
      <p className="text-[11px] text-ink-faint mb-1">{label}</p>
      <p className={`text-base font-bold tabular-nums ${color}`}>
        {plain ? Number(value || 0).toLocaleString('en-US') : formatCurrency(value)}
      </p>
    </div>
  )
}
