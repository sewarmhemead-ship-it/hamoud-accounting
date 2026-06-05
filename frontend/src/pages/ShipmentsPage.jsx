import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { shipmentsApi } from '../api'
import StatusBadge from '../components/StatusBadge'
import ShipmentsListFilterBar from '../components/ShipmentsListFilterBar'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { buildShipmentsListParams } from '../utils/listFilters'
import { normalizeSearchQuery } from '../utils/searchNormalize'
import { formatCurrency, formatDate } from '../utils/format'

const PAGE_SIZE = 30

export default function ShipmentsPage() {
  const [params, setSearchParams] = useSearchParams()
  const [status, setStatus]   = useState(() => params.get('status') || '')
  const [search, setSearch]   = useState(() => params.get('search') || '')
  const [from,   setFrom]     = useState(() => params.get('from') || '')
  const [to,     setTo]       = useState(() => params.get('to') || '')
  const [page,   setPage]     = useState(0)
  const debouncedRaw = useDebouncedValue(search, 350)
  const debouncedSearch = normalizeSearchQuery(debouncedRaw)

  // إعادة الصفحة للأول عند تغيير أي فلتر
  const setStatusP  = useCallback((v) => { setStatus(v);  setPage(0) }, [])
  const setSearchP  = useCallback((v) => { setSearch(v);  setPage(0) }, [])
  const setFromP    = useCallback((v) => { setFrom(v);    setPage(0) }, [])
  const setToP      = useCallback((v) => { setTo(v);      setPage(0) }, [])

  useEffect(() => {
    const p = new URLSearchParams()
    if (status) p.set('status', status)
    if (debouncedSearch) p.set('search', debouncedSearch)
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    const next = p.toString()
    if (next !== params.toString()) {
      setSearchParams(p, { replace: true })
    }
  }, [status, debouncedSearch, from, to, setSearchParams])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['shipments-list', status, debouncedSearch, from, to, page],
    queryFn: () =>
      shipmentsApi.list(
        buildShipmentsListParams({
          status,
          search: debouncedSearch,
          from,
          to,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        })
      ),
  })

  const shipments = data?.data  || []
  const total     = data?.meta?.total ?? 0
  const pages     = Math.ceil(total / PAGE_SIZE)
  const hasActive = !!(status || debouncedSearch || from || to)
  const searchPending = normalizeSearchQuery(search) !== debouncedSearch
  const listBusy = isLoading || isFetching || searchPending

  const clearFilters = () => { setStatus(''); setSearch(''); setFrom(''); setTo(''); setPage(0) }

  return (
    <div className="space-y-4">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">السيارات</h2>
          {total > 0 && (
            <p className="text-xs text-ink-faint mt-0.5">
              {total} سيارة{hasActive ? ' (فلترة نشطة)' : ''}
            </p>
          )}
        </div>
        <Link to="/shipments/new" className="btn-primary">+ تخليص جديد</Link>
      </div>

      <ShipmentsListFilterBar
        search={search}
        onSearchChange={setSearchP}
        status={status}
        onStatusChange={setStatusP}
        from={from}
        onFromChange={setFromP}
        to={to}
        onToChange={setToP}
        onClear={clearFilters}
        busy={listBusy}
      />

      {/* الجدول */}
      {listBusy && shipments.length === 0 ? (
        <div className="card text-center py-12 text-ink-faint">جاري البحث...</div>
      ) : (
        <div className={`card overflow-x-auto !p-0 transition-opacity ${listBusy ? 'opacity-60 pointer-events-none' : ''}`}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['الرقم', 'التاجر', 'المخلص', 'البضاعة', 'المسار', 'الدخول', 'المجموع', 'الحالة'].map((h) => (
                  <th key={h} className="text-right py-3 px-3 text-xs text-ink-faint font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-faint text-sm">
                    {hasActive ? 'لا توجد نتائج للبحث الحالي' : 'لا توجد سيارات'}
                  </td>
                </tr>
              ) : shipments.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    className="hover:bg-white/[0.025] transition-colors">
                  <td className="py-2.5 px-3">
                    <Link to={`/shipments/${s.id}`} className="text-accent hover:text-accent-hover font-mono text-xs">
                      {s.ref_number}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-ink text-xs">{s.center_name}</td>
                  <td className="py-2.5 px-3 text-ink-soft text-xs">{s.broker_name || '—'}</td>
                  <td className="py-2.5 px-3 text-ink-soft text-xs max-w-[120px] truncate">{s.goods_name || '—'}</td>
                  <td className="py-2.5 px-3 text-ink-faint text-xs whitespace-nowrap">
                    {[s.source, s.destination].filter((p) => p && !/^[?\s]+$/.test(String(p))).join(' → ') || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-ink-faint text-xs whitespace-nowrap">{formatDate(s.entry_date)}</td>
                  <td className="py-2.5 px-3 text-ink font-medium text-xs tabular-nums">{formatCurrency(s.total_cost || 0)}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-faint text-xs">
            صفحة {page + 1} من {pages} · {total} سيارة
          </span>
          <div className="flex gap-1.5">
            <button type="button" className="btn-secondary !py-1 !px-3 text-xs"
              disabled={page === 0} onClick={() => setPage(0)}>«</button>
            <button type="button" className="btn-secondary !py-1 !px-3 text-xs"
              disabled={page === 0} onClick={() => setPage(page - 1)}>‹ السابق</button>
            <button type="button" className="btn-secondary !py-1 !px-3 text-xs"
              disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>التالي ›</button>
            <button type="button" className="btn-secondary !py-1 !px-3 text-xs"
              disabled={page + 1 >= pages} onClick={() => setPage(pages - 1)}>»</button>
          </div>
        </div>
      )}
    </div>
  )
}
