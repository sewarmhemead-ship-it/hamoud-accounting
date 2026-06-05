import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { transactionsApi, centersApi } from '../api'
import PageHeader from '../components/PageHeader'
import TransactionsFilterBar from '../components/TransactionsFilterBar'
import { TX_TYPE, TX_CATEGORY } from '../constants'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { normalizeSearchQuery } from '../utils/searchNormalize'
import { formatCurrency, formatDate } from '../utils/format'

const PAGE_SIZE = 40

function buildListParams({
  debouncedSearch,
  type,
  category,
  delivered,
  centerId,
  from,
  to,
  page,
}) {
  const p = { limit: PAGE_SIZE, offset: page * PAGE_SIZE }
  if (debouncedSearch) p.search = debouncedSearch
  if (type) p.type = type
  if (category) p.category = category
  if (delivered !== '') p.is_delivered = delivered
  if (centerId) p.center_id = parseInt(centerId, 10)
  if (from) p.from = from
  if (to) p.to = to
  return p
}

function CategoryBadge({ category }) {
  const cfg = TX_CATEGORY[category] || { label: category || '—', color: 'bg-white/5 text-ink-soft' }
  return (
    <span className={`pill ${cfg.color}`}>{cfg.label}</span>
  )
}

function SourceCell({ row }) {
  if (row.shipment_id && row.shipment_ref) {
    return (
      <div className="space-y-0.5">
        <Link
          to={`/shipments/${row.shipment_id}`}
          className="text-accent hover:underline font-mono text-[11px]"
          onClick={(e) => e.stopPropagation()}
        >
          {row.shipment_ref}
        </Link>
        {row.shipment_goods && (
          <p className="text-[10px] text-ink-faint truncate max-w-[140px]">{row.shipment_goods}</p>
        )}
      </div>
    )
  }
  if (row.category === 'offset') {
    return <span className="text-xs text-ink-soft">مقاصة بين مراكز</span>
  }
  if (row.category === 'payment') {
    return <span className="text-xs text-ink-soft">دفعة يدوية</span>
  }
  return <span className="text-ink-faint text-xs">—</span>
}

export default function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [category, setCategory] = useState('')
  const [delivered, setDelivered] = useState('')
  const [centerId, setCenterId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)

  const debouncedRaw = useDebouncedValue(search, 350)
  const debouncedSearch = normalizeSearchQuery(debouncedRaw)
  const searchPending = normalizeSearchQuery(search) !== debouncedSearch

  const resetPage = useCallback(() => setPage(0), [])

  const { data: centersRes } = useQuery({
    queryKey: ['centers', 'tx-filter'],
    queryFn: () => centersApi.list({ limit: 300 }),
    staleTime: 60_000,
  })
  const centers = centersRes?.data || []

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'transactions',
      'ledger',
      debouncedSearch,
      type,
      category,
      delivered,
      centerId,
      from,
      to,
      page,
    ],
    queryFn: () =>
      transactionsApi.list(
        buildListParams({
          debouncedSearch,
          type,
          category,
          delivered,
          centerId,
          from,
          to,
          page,
        })
      ),
  })

  const rows = data?.data || []
  const meta = data?.meta || {}
  const total = meta.total ?? 0
  const pages = meta.totalPages ?? 1
  const busy = isLoading || isFetching || searchPending

  const clearFilters = useCallback(() => {
    setSearch('')
    setType('')
    setCategory('')
    setDelivered('')
    setCenterId('')
    setFrom('')
    setTo('')
    setPage(0)
  }, [])

  const hasFilter = useMemo(
    () => !!(debouncedSearch || type || category || delivered || centerId || from || to),
    [debouncedSearch, type, category, delivered, centerId, from, to]
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="سجل الحركات"
        subtitle="كل القيود المالية في النظام — ترحيل تخليص، دفعات، مقاصة، وتعديلات"
        actions={
          <div className="flex gap-2">
            <Link to="/cash" className="btn-primary text-sm">
              + دفعة / مقاصة
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card tone-blue">
          <p className="text-[11px] text-ink-faint mb-1">عدد القيود</p>
          <p className="text-xl font-bold text-ink tabular-nums">{total}</p>
          {hasFilter && <p className="text-[10px] text-ink-faint mt-1">ضمن الفلتر</p>}
        </div>
        <div className="stat-card tone-red">
          <p className="text-[11px] text-ink-faint mb-1">إجمالي قيود-ص</p>
          <p className="text-lg font-bold text-danger tabular-nums">
            {formatCurrency(meta.total_out ?? 0)}
          </p>
        </div>
        <div className="stat-card tone-green">
          <p className="text-[11px] text-ink-faint mb-1">إجمالي قيود-و</p>
          <p className="text-lg font-bold text-success tabular-nums">
            {formatCurrency(meta.total_in ?? 0)}
          </p>
        </div>
        <div className="stat-card tone-gold">
          <p className="text-[11px] text-ink-faint mb-1">صافي (ص − و)</p>
          <p className="text-lg font-bold text-accent tabular-nums">
            {formatCurrency(meta.net ?? (meta.total_out ?? 0) - (meta.total_in ?? 0))}
          </p>
        </div>
      </div>

      <TransactionsFilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); resetPage() }}
        type={type}
        onTypeChange={(v) => { setType(v); resetPage() }}
        category={category}
        onCategoryChange={(v) => { setCategory(v); resetPage() }}
        delivered={delivered}
        onDeliveredChange={(v) => { setDelivered(v); resetPage() }}
        centerId={centerId}
        onCenterChange={(v) => { setCenterId(v); resetPage() }}
        centers={centers}
        from={from}
        onFromChange={(v) => { setFrom(v); resetPage() }}
        to={to}
        onToChange={(v) => { setTo(v); resetPage() }}
        onClear={clearFilters}
        busy={busy}
      />

      {busy && rows.length === 0 ? (
        <div className="card text-center py-14 text-ink-faint">جاري تحميل الحركات...</div>
      ) : rows.length === 0 ? (
        <div className="card text-center py-14 text-ink-soft">
          {hasFilter ? 'لا توجد حركات تطابق الفلتر' : 'لا توجد حركات مسجّلة بعد'}
        </div>
      ) : (
        <div className={`card overflow-x-auto !p-0 transition-opacity ${busy ? 'opacity-70' : ''}`}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  'القيد',
                  'التاريخ',
                  'المركز',
                  'النوع',
                  'التصنيف',
                  'المصدر',
                  'المبلغ',
                  'تسليم',
                  'ملاحظات',
                ].map((h) => (
                  <th key={h} className="text-right py-3 px-3 text-xs text-ink-faint font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const txCfg = TX_TYPE[r.type] || {}
                return (
                  <tr
                    key={r.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    className="hover:bg-white/[0.025] transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono text-xs text-accent">{r.ref_number}</td>
                    <td className="py-2.5 px-3 text-ink-faint text-xs whitespace-nowrap">
                      {formatDate(r.date)}
                    </td>
                    <td className="py-2.5 px-3">
                      <Link to={`/centers/${r.center_id}`} className="text-ink hover:text-accent text-xs">
                        {r.center_name || r.center_id}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs font-semibold ${txCfg.color}`}>{txCfg.label}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <CategoryBadge category={r.category} />
                    </td>
                    <td className="py-2.5 px-3">
                      <SourceCell row={r} />
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`font-semibold tabular-nums text-xs ${txCfg.color}`}>
                        {txCfg.sign}
                        {formatCurrency(r.amount_usd)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-xs">
                      {r.is_delivered ? (
                        <span className="text-success" title="مسلّم">✓</span>
                      ) : (
                        <span className="text-warning" title="غير مسلّم">⏳</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-ink-faint text-xs max-w-[180px] truncate" title={r.notes || ''}>
                      {r.notes || '—'}
                      {r.created_by_name && (
                        <span className="block text-[10px] text-ink-faint/80">{r.created_by_name}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-faint text-xs">
            صفحة {page + 1} من {pages} · {total} قيد
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              className="btn-secondary !py-1 !px-3 text-xs"
              disabled={page === 0}
              onClick={() => setPage(0)}
            >
              «
            </button>
            <button
              type="button"
              className="btn-secondary !py-1 !px-3 text-xs"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              ‹ السابق
            </button>
            <button
              type="button"
              className="btn-secondary !py-1 !px-3 text-xs"
              disabled={page + 1 >= pages}
              onClick={() => setPage(page + 1)}
            >
              التالي ›
            </button>
            <button
              type="button"
              className="btn-secondary !py-1 !px-3 text-xs"
              disabled={page + 1 >= pages}
              onClick={() => setPage(pages - 1)}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
