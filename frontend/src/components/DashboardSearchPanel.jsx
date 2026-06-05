import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { shipmentsApi } from '../api'
import { SHIPMENT_STATUS_FILTERS } from '../constants'
import StatusBadge from './StatusBadge'
import GlassPanel from './ui/GlassPanel'
import { buildShipmentsListParams, isListFilterActive } from '../utils/listFilters'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { formatCurrency, formatDate } from '../utils/format'
import { formatShipmentRoute, normalizeSearchQuery } from '../utils/searchNormalize'

const DASHBOARD_LIMIT = 20

export default function DashboardSearchPanel() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const debouncedRaw = useDebouncedValue(search, 350)
  const debouncedSearch = normalizeSearchQuery(debouncedRaw)

  const active = isListFilterActive({
    search: debouncedSearch,
    status,
    from,
    to,
  })

  const searchPending = search !== debouncedSearch

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['dashboard', 'shipments-search', debouncedSearch, status, from, to],
    queryFn: () =>
      shipmentsApi.list(
        buildShipmentsListParams({
          search: debouncedSearch,
          status,
          from,
          to,
          limit: DASHBOARD_LIMIT,
        })
      ),
    enabled: active,
    staleTime: 0,
    gcTime: 60_000,
  })

  const rows = data?.data || []
  const total = data?.meta?.total ?? rows.length

  const clearFilters = useCallback(() => {
    setSearch('')
    setStatus('')
    setFrom('')
    setTo('')
  }, [])

  const shipmentsLink = () => {
    const p = new URLSearchParams()
    if (status) p.set('status', status)
    if (debouncedSearch) p.set('search', debouncedSearch)
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    const q = p.toString()
    return `/shipments${q ? `?${q}` : ''}`
  }

  return (
    <GlassPanel
      title="بحث وفلترة"
      subtitle="ابحث برقم السيارة، التاجر، البضاعة، أو المسار — وفلتر بالحالة والتاريخ"
      action={
        active ? (
          <button type="button" onClick={clearFilters} className="text-[11px] text-ink-soft hover:text-accent">
            مسح الفلاتر
          </button>
        ) : null
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm pointer-events-none">
              🔍
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="رقم TRK، تاجر، بضاعة، مصدر، وجهة..."
              className="w-full !pr-10"
              aria-label="بحث في السيارات"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="!py-2 text-xs"
              title="من تاريخ"
              aria-label="من تاريخ الدخول"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="!py-2 text-xs"
              title="إلى تاريخ"
              aria-label="إلى تاريخ الدخول"
            />
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {SHIPMENT_STATUS_FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => setStatus(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                status === f.value ? 'text-accent' : 'text-ink-soft hover:text-ink'
              }`}
              style={
                status === f.value
                  ? {
                      background: 'var(--color-accent-muted)',
                      border: '1px solid rgba(96,165,250,0.28)',
                    }
                  : { border: '1px solid transparent' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {!active && (
          <p className="text-xs text-ink-faint text-center py-2">
            اكتب للبحث أو اختر حالة/تاريخ لعرض النتائج هنا
          </p>
        )}

        {active && (
          <div className="border-t border-surface-border pt-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-ink-soft">
                {isLoading || isFetching || searchPending ? 'جاري البحث...' : `${total} نتيجة`}
                {total > DASHBOARD_LIMIT && ` (أول ${DASHBOARD_LIMIT})`}
              </p>
              <Link to={shipmentsLink()} className="text-[11px] text-accent font-semibold hover:underline">
                عرض الكل في السيارات ←
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl animate-pulse bg-white/[0.03]" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-ink-soft text-center py-6">لا توجد سيارات تطابق البحث</p>
            ) : (
              <ul className="space-y-2">
                {rows.map((s) => (
                  <li
                    key={s.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(100px,1fr)_minmax(0,1.2fr)_auto_auto] gap-2 sm:gap-3 items-center py-2.5 px-3 rounded-xl text-sm"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <Link
                      to={`/shipments/${s.id}`}
                      className="font-mono text-accent font-semibold hover:underline"
                    >
                      {s.ref_number}
                    </Link>
                    <span className="text-ink-soft truncate hidden sm:block">{s.center_name}</span>
                    <span className="text-ink-faint text-xs truncate hidden sm:block">
                      {formatShipmentRoute(s.goods_name, s.source, s.destination)}
                    </span>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="font-bold text-ink tabular-nums text-xs sm:text-sm">
                        {formatCurrency(s.total_cost)}
                      </span>
                      <StatusBadge status={s.status} />
                    </div>
                    <span className="text-[10px] text-ink-faint sm:hidden col-span-2">
                      {s.center_name} · {formatDate(s.entry_date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </GlassPanel>
  )
}
