import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { transactionsApi, centersApi } from '../api'
import PageHeader from '../components/PageHeader'
import TransactionsFilterBar from '../components/TransactionsFilterBar'
import { TX_TYPE, TX_CATEGORY } from '../constants'
import { PERM } from '../constants/permissions'
import { useAuthStore, useUiStore } from '../store/auth.store'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { normalizeSearchQuery } from '../utils/searchNormalize'
import { formatCurrency, formatDate } from '../utils/format'

const PAGE_SIZE = 40
const CURRENCIES = ['USD', 'SYP', 'TRY']
const LINKED_CATEGORIES = ['clearance', 'offset']

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

function EditTransactionModal({ tx, onClose, onSaved }) {
  const showToast = useUiStore((s) => s.showToast)
  const [form, setForm] = useState({
    amount: '',
    currency: 'USD',
    exchange_rate: '',
    date: '',
    notes: '',
  })

  useEffect(() => {
    if (!tx) return
    setForm({
      amount: tx.amount ?? '',
      currency: tx.currency || 'USD',
      exchange_rate: tx.exchange_rate ?? '',
      date: (tx.date || '').slice(0, 10),
      notes: tx.notes ?? '',
    })
  }, [tx])

  const mutation = useMutation({
    mutationFn: (data) => transactionsApi.update(tx.id, data),
    onSuccess: () => {
      showToast('تم تعديل الحركة', 'success')
      onSaved()
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  if (!tx) return null

  const isLinked = LINKED_CATEGORIES.includes(tx.category)
  const needsRate = form.currency !== 'USD'

  const submit = (e) => {
    e.preventDefault()
    const payload = {
      amount: parseFloat(form.amount),
      currency: form.currency,
      exchange_rate: needsRate && form.exchange_rate ? parseFloat(form.exchange_rate) : 1,
      date: form.date,
      notes: form.notes || null,
    }
    mutation.mutate(payload)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-ink">تعديل الحركة</h3>
          <span className="font-mono text-xs text-accent">{tx.ref_number}</span>
        </div>

        {isLinked && (
          <div className="rounded-lg px-3 py-2.5 text-xs leading-relaxed" style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}>
            <span className="text-warning font-semibold">⚠️ تنبيه: </span>
            <span className="text-ink-soft">
              {tx.category === 'clearance'
                ? 'هذا قيد ناتج عن ترحيل سيارة. تعديل المبلغ يغيّر الذمة فقط ولا يُحدّث أقلام السيارة — قد ينشأ اختلاف بين الكشف وتفاصيل السيارة.'
                : 'هذا قيد مقاصة (نصف زوج متوازن). تعديل طرف واحد فقط سيفك توازن المقاصة.'}
            </span>
          </div>
        )}

        <form className="space-y-3" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">المبلغ *</label>
              <input
                type="number" step="0.01" min="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">العملة</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {needsRate && (
            <div>
              <label className="label">سعر الصرف مقابل الدولار *</label>
              <input
                type="number" step="0.01" min="0.01"
                value={form.exchange_rate}
                onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })}
                placeholder={form.currency === 'SYP' ? 'مثال: 14500' : 'مثال: 32'}
                required
              />
            </div>
          )}

          <div>
            <label className="label">التاريخ</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          <div>
            <label className="label">ملاحظات</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="..." />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-success flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديل'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const queryClient = useQueryClient()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canEdit = hasPermission(PERM.TRANSACTIONS_EDIT)
  const [editingTx, setEditingTx] = useState(null)
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
                  ...(canEdit ? ['إجراء'] : []),
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
                    {canEdit && (
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          className="btn-secondary !py-1 !px-2.5 text-xs"
                          onClick={() => setEditingTx(r)}
                          title="تعديل الحركة"
                        >
                          ✎ تعديل
                        </button>
                      </td>
                    )}
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

      {canEdit && editingTx && (
        <EditTransactionModal
          tx={editingTx}
          onClose={() => setEditingTx(null)}
          onSaved={() => {
            setEditingTx(null)
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['centers'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          }}
        />
      )}
    </div>
  )
}
