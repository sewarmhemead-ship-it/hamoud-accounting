import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '../api'
import ReportExportButtons from '../components/ReportExportButtons'
import GlassPanel from '../components/ui/GlassPanel'
import KpiStatCard from '../components/ui/KpiStatCard'
import CenterTypeBadge from '../components/CenterTypeBadge'
import { PERM } from '../constants/permissions'
import { formatCurrency, todayISO, formatDate } from '../utils/format'
import { defaultReportRange, isValidReportRange } from '../utils/reportRange'
import { useAuthStore, useUiStore } from '../store/auth.store'

const QUICK_LINKS = [
  { to: '/', label: 'لوحة التحكم', icon: '📊' },
  { to: '/centers', label: 'المراكز', icon: '🏢' },
  { to: '/transactions', label: 'القيود', icon: '📒' },
  { to: '/profit', label: 'المربح اليومي', icon: '💹' },
  { to: '/reports', label: 'التقارير', icon: '📑' },
]

const CATEGORY_LABELS = {
  traders: 'تجار',
  brokers: 'مخلّصون',
  partners: 'شركاء',
  other: 'أخرى',
}

export default function InventoryPage() {
  const rangeDefaults = useMemo(() => defaultReportRange(), [])
  const [rangeFrom, setRangeFrom] = useState(rangeDefaults.from)
  const [rangeTo, setRangeTo] = useState(rangeDefaults.to)
  const rangeOk = isValidReportRange(rangeFrom, rangeTo)

  const [date, setDate] = useState(todayISO())
  const [label, setLabel] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [showCompare, setShowCompare] = useState(false)
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canManage = hasPermission(PERM.INVENTORY_MANAGE)
  const canExport = hasPermission(PERM.INVENTORY_MANAGE) || hasPermission(PERM.REPORTS_EXPORT)

  const { data: detailRes, isLoading, refetch } = useQuery({
    queryKey: ['inventory', 'detail', date],
    queryFn: () => inventoryApi.getByDate(date),
  })

  const { data: liveRes } = useQuery({
    queryKey: ['inventory', 'live'],
    queryFn: () => inventoryApi.live(),
    staleTime: 30_000,
  })

  const { data: compareRes } = useQuery({
    queryKey: ['inventory', 'compare', date],
    queryFn: () => inventoryApi.compare(date),
    enabled: showCompare && !!detailRes?.data?.has_data,
  })

  const detail = detailRes?.data
  const live = liveRes?.data
  const rows = detail?.rows || []
  const hasSnapshot = detail?.has_data
  const totals = hasSnapshot ? detail.totals : live?.totals
  const liveTotals = live?.totals

  const filteredRows = useMemo(() => {
    if (filterCat === 'all') return rows
    return rows.filter((r) => r.category === filterCat)
  }, [rows, filterCat])

  const createMutation = useMutation({
    mutationFn: () =>
      inventoryApi.createSnapshot({
        snapshot_date: date,
        label: label || undefined,
        replace: true,
      }),
    onSuccess: () => {
      showToast('تم حفظ لقطة الجرد لهذا التاريخ', 'success')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const history = detail?.history || []

  const { data: rangeRes } = useQuery({
    queryKey: ['inventory', 'range', rangeFrom, rangeTo],
    queryFn: () => inventoryApi.range({ from: rangeFrom, to: rangeTo }),
    enabled: rangeOk,
  })
  const rangeData = rangeRes?.data

  return (
    <div className="space-y-6 animate-fade-in">
      <GlassPanel className="!p-4 flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">الجرد الدوري</h1>
          <p className="text-xs text-ink-faint mt-1">
            لقطة ذمم مرتبطة بـ AccountingService — الرصيد + الجارية = الإجمالي (محرك balance). WIP للمتابعة فقط.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {canManage && (
            <button
              type="button"
              className="btn-success"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'جاري الحفظ...' : '💾 حفظ لقطة لهذا التاريخ'}
            </button>
          )}
        </div>
      </GlassPanel>

      <GlassPanel className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-semibold text-ink">جرد الفترة</h2>
            <p className="text-xs text-ink-faint mt-1">
              من تاريخ إلى تاريخ — يظهر فقط الأيام التي حُفظت لها لقطة جرد
            </p>
          </div>
          {canExport && rangeOk && (rangeData?.days_count || 0) > 0 && (
            <ReportExportButtons
              filenameBase={`جرد_${rangeFrom}_${rangeTo}`}
              fetchBlob={(fmt) => inventoryApi.rangeBlob(fmt, { from: rangeFrom, to: rangeTo })}
              xlsxLabel="Excel الفترة"
              pdfLabel="PDF الفترة"
            />
          )}
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">من تاريخ</label>
            <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">إلى تاريخ</label>
            <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
          </div>
        </div>
        {!rangeOk && <p className="text-sm text-danger">«من» يجب أن يكون قبل أو يساوي «إلى»</p>}
        {rangeOk && rangeData && (
          <>
            {rangeData.days_count === 0 ? (
              <p className="text-sm text-warning">لا توجد لقطات جرد محفوظة في هذه الفترة — احفظ لقطة لكل يوم مطلوب.</p>
            ) : (
              <>
                {rangeData.delta_first_last && (
                  <p className="text-xs text-ink-soft">
                    فرق أول يوم ({formatDate(rangeData.delta_first_last.from_date)}) → آخر يوم (
                    {formatDate(rangeData.delta_first_last.to_date)}): الذمة{' '}
                    <span className="font-bold text-accent">
                      {formatCurrency(rangeData.delta_first_last.delta_total)}
                    </span>
                  </p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-ink-faint border-b border-surface-border">
                        <th className="text-right py-2 px-2">التاريخ</th>
                        <th className="text-right py-2 px-2">تسمية</th>
                        <th className="text-right py-2 px-2">مراكز</th>
                        <th className="text-left py-2 px-2">رصيد</th>
                        <th className="text-left py-2 px-2">جارية</th>
                        <th className="text-left py-2 px-2">WIP</th>
                        <th className="text-left py-2 px-2">الذمة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rangeData.days.map((d) => (
                        <tr
                          key={d.date}
                          className="border-b border-surface-border/40 hover:bg-surface-hover cursor-pointer"
                          onClick={() => setDate(d.date)}
                        >
                          <td className="py-2 px-2 text-accent font-medium">{formatDate(d.date)}</td>
                          <td className="py-2 px-2 text-ink-faint">{d.label || '—'}</td>
                          <td className="py-2 px-2">{d.centers_count}</td>
                          <td className="py-2 px-2 text-left tabular-nums">{formatCurrency(d.balance)}</td>
                          <td className="py-2 px-2 text-left tabular-nums">{formatCurrency(d.posted_undelivered)}</td>
                          <td className="py-2 px-2 text-left tabular-nums text-ink-faint">{formatCurrency(d.wip_value)}</td>
                          <td className="py-2 px-2 text-left tabular-nums font-semibold text-success">
                            {formatCurrency(d.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-ink-faint">انقر على يوم لفتح تفاصيله أدناه</p>
              </>
            )}
          </>
        )}
      </GlassPanel>

      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="btn-secondary !py-1.5 !px-3 text-xs inline-flex items-center gap-1">
            <span>{l.icon}</span>
            {l.label}
          </Link>
        ))}
        {canExport && (
          <div className="mr-auto flex flex-wrap gap-2 items-center">
            <ReportExportButtons
              filenameBase={`جرد_${date}${hasSnapshot ? '' : '_حي'}`}
              fetchBlob={(fmt) => inventoryApi.exportBlob(date, fmt, { live: !hasSnapshot })}
              xlsxLabel={hasSnapshot ? 'Excel لقطة' : 'Excel حي'}
              pdfLabel={hasSnapshot ? 'PDF لقطة' : 'PDF حي'}
            />
            {hasSnapshot && (
              <ReportExportButtons
                filenameBase={`جرد_${date}_حي`}
                fetchBlob={(fmt) => inventoryApi.exportBlob(date, fmt, { live: true })}
                xlsxLabel="Excel وضع حي"
                pdfLabel="PDF وضع حي"
              />
            )}
          </div>
        )}
      </div>

      {canExport && (
        <GlassPanel className="!p-4 flex flex-wrap items-center justify-between gap-4 border border-accent/25">
          <div>
            <p className="font-semibold text-ink">تصدير Excel / PDF</p>
            <p className="text-xs text-ink-faint mt-1">
              {hasSnapshot
                ? 'لقطة محفوظة + مقارنة مع الحي في Excel (3 أوراق)'
                : 'تقرير المعاينة الحية للتاريخ المختار'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ReportExportButtons
              filenameBase={`جرد_${date}${hasSnapshot ? '' : '_حي'}`}
              fetchBlob={(fmt) => inventoryApi.exportBlob(date, fmt, { live: !hasSnapshot })}
              xlsxLabel="Excel"
              pdfLabel="PDF"
            />
          </div>
        </GlassPanel>
      )}

      <div className="card flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">تاريخ اللقطة</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {canManage && (
          <div className="flex-1 min-w-[12rem]">
            <label className="label">تسمية (اختياري)</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="جرد نهاية الشهر" />
          </div>
        )}
        <div>
          <label className="label">تصفية</label>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="all">كل المراكز</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {hasSnapshot && (
          <button
            type="button"
            className={`btn-secondary ${showCompare ? '!border-accent' : ''}`}
            onClick={() => setShowCompare((v) => !v)}
          >
            {showCompare ? 'إخفاء المقارنة' : 'مقارنة مع الوضع الحي'}
          </button>
        )}
      </div>

      {history.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-ink-faint self-center">لقطات سابقة:</span>
          {history.slice(0, 8).map((h) => (
            <button
              key={h.date}
              type="button"
              className={`text-xs px-2 py-1 rounded-lg border ${h.date === date ? 'border-accent bg-accent/10 text-accent' : 'border-surface-border text-ink-soft hover:bg-surface-hover'}`}
              onClick={() => setDate(h.date)}
            >
              {formatDate(h.date)}
              {h.label ? ` · ${h.label}` : ''}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiStatCard
          icon="📋"
          label={hasSnapshot ? 'إجمالي الذمم (محفوظ)' : 'إجمالي الذمم (حي)'}
          value={totals?.total ?? 0}
          sub={`${totals?.centers ?? 0} مركز`}
          tone="success"
        />
        <KpiStatCard icon="💳" label="رصيد مسلّم" value={totals?.balance ?? 0} tone="accent" />
        <KpiStatCard icon="🚛" label="جارية مرحّلة" value={totals?.posted_undelivered ?? 0} tone="warning" />
        <KpiStatCard icon="⏳" label="WIP (لا يدخل الإجمالي)" value={totals?.wip_value ?? 0} tone="danger" />
        {hasSnapshot && liveTotals && (
          <KpiStatCard
            icon="Δ"
            label="فرق عن الحي"
            value={Math.round(((liveTotals.total || 0) - (totals?.total || 0)) * 100) / 100}
            sub="بعد الترحيل والدفعات"
            tone="accent"
          />
        )}
      </div>

      {!hasSnapshot && !isLoading && (
        <p className="text-sm text-warning bg-warning/10 rounded-lg px-3 py-2">
          لا توجد لقطة محفوظة لهذا التاريخ — المعروض أدناه <strong>معاينة حية</strong> الآن. اضغط «حفظ لقطة» لتثبيت الجرد.
        </p>
      )}

      {showCompare && compareRes?.data && (
        <GlassPanel className="!p-4">
          <h3 className="font-semibold text-ink mb-2">مقارنة اللقطة مع الوضع الحالي</h3>
          <p className="text-xs text-ink-faint mb-3">
            تغيّر {compareRes.data.changed_count} مركز · بدون تغيير {compareRes.data.unchanged_count}
          </p>
          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-ink-faint border-b border-surface-border">
                  <th className="text-right py-2">مركز</th>
                  <th className="text-left py-2">محفوظ</th>
                  <th className="text-left py-2">حي</th>
                  <th className="text-left py-2">فرق</th>
                </tr>
              </thead>
              <tbody>
                {compareRes.data.diffs
                  .filter((d) => d.status === 'changed')
                  .slice(0, 20)
                  .map((d) => (
                    <tr key={d.center_id} className="border-b border-surface-border/30">
                      <td className="py-1.5">{d.center_name}</td>
                      <td className="py-1.5 text-left tabular-nums">{formatCurrency(d.snapshot_total)}</td>
                      <td className="py-1.5 text-left tabular-nums">{formatCurrency(d.live_total)}</td>
                      <td
                        className={`py-1.5 text-left tabular-nums font-semibold ${d.delta_total >= 0 ? 'text-success' : 'text-danger'}`}
                      >
                        {formatCurrency(d.delta_total)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}

      {isLoading ? (
        <p className="text-ink-faint text-sm">جاري التحميل...</p>
      ) : (
        <GlassPanel className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-faint border-b border-surface-border">
                <th className="text-right py-2 px-2">مركز</th>
                <th className="text-right py-2 px-2">تصنيف</th>
                <th className="text-left py-2 px-2">رصيد</th>
                <th className="text-left py-2 px-2">جارية</th>
                <th className="text-left py-2 px-2">WIP</th>
                <th className="text-left py-2 px-2">الذمة</th>
              </tr>
            </thead>
            <tbody>
              {(hasSnapshot ? filteredRows : (live?.rows || []).filter((r) => filterCat === 'all' || r.category === filterCat)).map(
                (r) => (
                  <tr key={r.center_id} className="border-b border-surface-border/40 hover:bg-surface-hover">
                    <td className="py-2 px-2">
                      <Link to={`/centers/${r.center_id}`} className="text-accent font-medium hover:underline">
                        {r.center_name}
                      </Link>
                      {r.center_code && (
                        <span className="text-ink-faint text-xs mr-1">({r.center_code})</span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <CenterTypeBadge type={r.center_type} />
                      <span className="text-[10px] text-ink-faint mr-1">
                        {CATEGORY_LABELS[r.category] || r.category}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-left tabular-nums">{formatCurrency(r.balance)}</td>
                    <td className="py-2 px-2 text-left tabular-nums">{formatCurrency(r.posted_undelivered)}</td>
                    <td className="py-2 px-2 text-left tabular-nums text-ink-faint">{formatCurrency(r.wip_value)}</td>
                    <td className="py-2 px-2 text-left tabular-nums font-semibold text-success">
                      {formatCurrency(r.total)}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          {!hasSnapshot && !(live?.rows?.length) && (
            <p className="text-center text-ink-faint py-8 text-sm">لا مراكز أو فشل التحميل</p>
          )}
          {hasSnapshot && !filteredRows.length && (
            <p className="text-center text-ink-faint py-8 text-sm">لا مراكز في هذا التصنيف</p>
          )}
        </GlassPanel>
      )}

      <p className="text-[11px] text-ink-faint text-center">
        نفس أرقام صفحة المركز (balance API) — لا يعدّل المحرك، يقرأ AccountingService فقط.
      </p>
    </div>
  )
}
