import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { shipmentsApi } from '../api'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import ShipmentsListFilterBar from '../components/ShipmentsListFilterBar'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { buildShipmentsListParams } from '../utils/listFilters'
import { normalizeSearchQuery, formatShipmentRoute } from '../utils/searchNormalize'
import { formatCurrency, formatDate } from '../utils/format'
import { useUiStore } from '../store/auth.store'

const LIMIT = 200

export default function ReadyToPostPage() {
  const [selected, setSelected] = useState(new Set())
  const [confirming, setConfirming] = useState(false)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const debouncedRaw = useDebouncedValue(search, 350)
  const debouncedSearch = normalizeSearchQuery(debouncedRaw)
  const searchPending = normalizeSearchQuery(search) !== debouncedSearch

  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['shipments', 'ready-filtered', debouncedSearch, from, to],
    queryFn: () =>
      shipmentsApi.list(
        buildShipmentsListParams({
          status: 'complete',
          search: debouncedSearch,
          from,
          to,
          limit: LIMIT,
        })
      ),
  })

  const listBusy = isLoading || isFetching || searchPending
  const rows = data?.data || []
  const totalCount = data?.meta?.total ?? rows.length
  const total = rows.reduce((s, r) => s + (r.total_cost || 0), 0)

  const clearFilters = useCallback(() => {
    setSearch('')
    setFrom('')
    setTo('')
  }, [])

  const bulkMutation = useMutation({
    mutationFn: (ids) => shipmentsApi.bulkPost(ids),
    onSuccess: (res) => {
      const ok = res.data.results?.length || 0
      const fail = res.data.errors?.length || 0
      showToast(`تم ترحيل ${ok} سيارة${fail ? ` — فشل ${fail}` : ''}`, ok ? 'success' : 'error')
      setSelected(new Set())
      setConfirming(false)
      refetch()
      queryClient.invalidateQueries({ queryKey: ['centers'] })
      queryClient.invalidateQueries({ queryKey: ['shipments', 'summary'] })
    },
    onError: (err) => {
      showToast(err.message, 'error')
      setConfirming(false)
    },
  })

  const toggle = (id) =>
    setSelected((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const selectAll = () => setSelected(new Set(rows.map((r) => r.id)))
  const clearAll = () => setSelected(new Set())
  const allSel = rows.length > 0 && selected.size === rows.length

  const selectedValue = rows
    .filter((r) => selected.has(r.id))
    .reduce((s, r) => s + (r.total_cost || 0), 0)

  const hasFilter = !!(debouncedSearch || from || to)

  return (
    <div className="space-y-5">
      <PageHeader
        title="جاهزة للترحيل"
        subtitle={`${totalCount} سيارة · إجمالي ${formatCurrency(total)}${hasFilter ? ' (فلترة)' : ''}`}
      />

      <ShipmentsListFilterBar
        search={search}
        onSearchChange={setSearch}
        from={from}
        onFromChange={setFrom}
        to={to}
        onToChange={setTo}
        onClear={clearFilters}
        showStatus={false}
        lockedStatus="complete"
        busy={listBusy}
      />

      <div className="card !py-3 !px-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={allSel ? clearAll : selectAll}
          className="btn-secondary !py-1.5 !px-3 text-xs"
          disabled={rows.length === 0}
        >
          {allSel ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
        </button>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-faint">{selected.size} سيارة ·</span>
            <span className="font-semibold text-accent tabular-nums">{formatCurrency(selectedValue)}</span>
          </div>
        )}

        <div className="flex-1" />

        {selected.size > 0 && !confirming && (
          <button type="button" className="btn-success" onClick={() => setConfirming(true)}>
            ترحيل {selected.size} سيارة ({formatCurrency(selectedValue)})
          </button>
        )}

        {confirming && (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{
              background: 'rgba(96,165,250,0.08)',
              border: '1px solid rgba(96,165,250,0.2)',
            }}
          >
            <span className="text-accent text-sm">تأكيد ترحيل {selected.size} سيارة؟</span>
            <button
              type="button"
              className="btn-success !py-1 !px-3 text-xs"
              disabled={bulkMutation.isPending}
              onClick={() => bulkMutation.mutate([...selected])}
            >
              {bulkMutation.isPending ? 'جاري...' : 'نعم، رحّل'}
            </button>
            <button
              type="button"
              className="btn-secondary !py-1 !px-3 text-xs"
              onClick={() => setConfirming(false)}
            >
              إلغاء
            </button>
          </div>
        )}
      </div>

      {listBusy && rows.length === 0 ? (
        <div className="card text-center py-12 text-ink-faint">جاري التحميل...</div>
      ) : rows.length === 0 ? (
        <div className="card text-center py-14 space-y-2">
          <p className="text-2xl">✅</p>
          <p className="text-ink-soft">
            {hasFilter ? 'لا توجد سيارات تطابق الفلتر' : 'لا توجد سيارات تنتظر الترحيل'}
          </p>
        </div>
      ) : (
        <div className={`card overflow-x-auto !p-0 transition-opacity ${listBusy ? 'opacity-70' : ''}`}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="py-3 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSel}
                    onChange={allSel ? clearAll : selectAll}
                    className="cursor-pointer"
                  />
                </th>
                {['الرقم', 'التاجر', 'المخلص', 'البضاعة', 'الدخول', 'المجموع', 'الحالة'].map((h) => (
                  <th key={h} className="text-right py-3 px-3 text-xs text-ink-faint font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const isSel = selected.has(s.id)
                return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      background: isSel ? 'rgba(96,165,250,0.06)' : undefined,
                    }}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => toggle(s.id)}
                  >
                    <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggle(s.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/shipments/${s.id}`}
                        className="text-accent hover:text-accent-hover font-mono text-xs"
                      >
                        {s.ref_number}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-ink text-xs">{s.center_name || '—'}</td>
                    <td className="py-2.5 px-3 text-ink-soft text-xs">{s.broker_name || '—'}</td>
                    <td className="py-2.5 px-3 text-ink-soft text-xs max-w-[120px] truncate">
                      {formatShipmentRoute(s.goods_name, s.source, s.destination)}
                    </td>
                    <td className="py-2.5 px-3 text-ink-faint text-xs whitespace-nowrap">
                      {formatDate(s.entry_date)}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-medium tabular-nums">
                      {formatCurrency(s.total_cost || 0)}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <td colSpan={6} className="py-2.5 px-3 text-xs text-ink-faint">
                  {rows.length} من {totalCount} سيارة
                </td>
                <td className="py-2.5 px-3 text-xs font-semibold text-ink tabular-nums">
                  {formatCurrency(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
