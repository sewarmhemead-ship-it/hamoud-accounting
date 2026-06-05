import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { shipmentsApi } from '../api'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { buildShipmentsListParams } from '../utils/listFilters'
import { normalizeSearchQuery, formatShipmentRoute } from '../utils/searchNormalize'
import PageHeader from '../components/PageHeader'
import ShipmentsListFilterBar from '../components/ShipmentsListFilterBar'
import StatusBadge from '../components/StatusBadge'
import { formatCurrency, formatDate, todayISO } from '../utils/format'

function daysSince(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr.split('T')[0])
  const today = new Date(todayISO())
  return Math.floor((today - d) / 86_400_000)
}

function DaysChip({ days }) {
  if (days === null) return null
  const color = days > 14 ? 'text-danger' : days > 7 ? 'text-warning' : 'text-ink-faint'
  return (
    <span className={`text-[11px] tabular-nums font-medium ${color}`}>
      {days}ي
    </span>
  )
}

const WIP_STATUS_FILTERS = [
  { value: '', label: 'الكل' },
  { value: 'pending', label: 'معلقة' },
  { value: 'complete', label: 'مكتملة' },
]

export default function WipPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const debouncedRaw = useDebouncedValue(search, 350)
  const debouncedSearch = normalizeSearchQuery(debouncedRaw)
  const searchPending = normalizeSearchQuery(search) !== debouncedSearch

  const listParams = buildShipmentsListParams({
    search: debouncedSearch,
    from,
    to,
    limit: 200,
  })

  const { data: pendingRes, isLoading: l1, isFetching: f1 } = useQuery({
    queryKey: ['shipments', 'wip-pending', debouncedSearch, from, to],
    queryFn: () => shipmentsApi.list({ ...listParams, status: 'pending' }),
    enabled: status !== 'complete',
  })
  const { data: completeRes, isLoading: l2, isFetching: f2 } = useQuery({
    queryKey: ['shipments', 'wip-complete', debouncedSearch, from, to],
    queryFn: () => shipmentsApi.list({ ...listParams, status: 'complete' }),
    enabled: status !== 'pending',
  })

  const clearFilters = useCallback(() => {
    setSearch('')
    setStatus('')
    setFrom('')
    setTo('')
  }, [])

  const pending  = pendingRes?.data  || []
  const complete = completeRes?.data || []
  const all = [
    ...complete.map((s) => ({ ...s, _priority: 1 })), // مكتملة أولاً
    ...pending.map((s)  => ({ ...s, _priority: 2 })), // معلقة ثانياً
  ]
  const total = all.reduce((s, r) => s + (r.total_cost || 0), 0)

  // ترتيب: الأقدم أولاً (أكثر أيام انتظاراً)
  const sorted = [...all].sort((a, b) => {
    const da = new Date(a.entry_date || 0)
    const db = new Date(b.entry_date || 0)
    return da - db
  })

  const isLoading = l1 || l2 || f1 || f2 || searchPending

  return (
    <div className="space-y-5">
      <PageHeader
        title="سيارات معلقة (WIP)"
        subtitle={`${pending.length} معلقة + ${complete.length} مكتملة = ${formatCurrency(total)}`}
      />

      {/* بطاقات الملخص */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card tone-amber">
          <p className="text-[11px] text-ink-faint mb-1.5">معلقة</p>
          <p className="text-2xl font-bold text-warning">{pending.length}</p>
          <p className="text-[10px] text-ink-faint mt-1">أقلام ناقصة</p>
        </div>
        <div className="stat-card tone-gold">
          <p className="text-[11px] text-ink-faint mb-1.5">مكتملة</p>
          <p className="text-2xl font-bold text-accent">{complete.length}</p>
          <p className="text-[10px] text-ink-faint mt-1">جاهزة للترحيل</p>
        </div>
        <div className="stat-card tone-blue">
          <p className="text-[11px] text-ink-faint mb-1.5">إجمالي القيمة</p>
          <p className="text-lg font-bold text-info tabular-nums">{formatCurrency(total)}</p>
        </div>
        <div className="stat-card tone-red">
          <p className="text-[11px] text-ink-faint mb-1.5">أقدم سيارة</p>
          {sorted[0] ? (
            <>
              <p className="text-lg font-bold text-danger tabular-nums">
                {daysSince(sorted[0].entry_date)}
              </p>
              <p className="text-[10px] text-ink-faint mt-1">يوم</p>
            </>
          ) : <p className="text-ink-faint">—</p>}
        </div>
      </div>

      <ShipmentsListFilterBar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        from={from}
        onFromChange={setFrom}
        to={to}
        onToChange={setTo}
        onClear={clearFilters}
        statusFilters={WIP_STATUS_FILTERS}
        busy={isLoading}
      />

      {isLoading ? (
        <div className="card text-center py-10 text-ink-faint">جاري التحميل...</div>
      ) : sorted.length === 0 ? (
        <div className="card text-center py-12 text-ink-faint">
          {debouncedSearch || from || to || status
            ? 'لا توجد نتائج للفلتر'
            : '🎉 لا توجد سيارات معلقة'}
        </div>
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['الرقم', 'التاجر', 'المخلص', 'البضاعة', 'الدخول', 'انتظار', 'المجموع', 'الحالة', 'الأقلام الناقصة'].map((h) => (
                  <th key={h} className="text-right py-3 px-3 text-xs text-ink-faint font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => {
                const days   = daysSince(s.entry_date)
                const isOld  = days !== null && days > 7
                return (
                  <tr key={s.id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      className={`hover:bg-white/[0.025] transition-colors ${isOld ? 'bg-warning/[0.02]' : ''}`}>
                    <td className="py-2.5 px-3">
                      <Link to={`/shipments/${s.id}`} className="text-accent hover:text-accent-hover font-mono text-xs">
                        {s.ref_number}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-ink text-xs">{s.center_name}</td>
                    <td className="py-2.5 px-3 text-ink-soft text-xs">{s.broker_name || '—'}</td>
                    <td className="py-2.5 px-3 text-ink-soft text-xs max-w-[100px] truncate">
                      {formatShipmentRoute(s.goods_name, s.source, s.destination)}
                    </td>
                    <td className="py-2.5 px-3 text-ink-faint text-xs whitespace-nowrap">{formatDate(s.entry_date)}</td>
                    <td className="py-2.5 px-3 text-center"><DaysChip days={days} /></td>
                    <td className="py-2.5 px-3 text-xs tabular-nums">{formatCurrency(s.total_cost || 0)}</td>
                    <td className="py-2.5 px-3"><StatusBadge status={s.status} /></td>
                    <td className="py-2.5 px-3">
                      {s.status === 'pending' && s.progress?.missing?.length > 0 && (
                        <span className="text-[11px] text-warning">
                          {s.progress.missing.slice(0, 2).join('، ')}
                          {s.progress.missing.length > 2 && ` +${s.progress.missing.length - 2}`}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <td colSpan={6} className="py-2.5 px-3 text-xs text-ink-faint">
                  {sorted.length} سيارة
                </td>
                <td className="py-2.5 px-3 text-xs font-semibold text-ink tabular-nums">
                  {formatCurrency(total)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
