import { useState, useMemo, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { centersApi, transactionsApi } from '../api'
import PageHeader from '../components/PageHeader'
import { TX_TYPE, TX_CATEGORY } from '../constants'
import { todayISO, formatCurrency, formatDate } from '../utils/format'
import { useUiStore } from '../store/auth.store'

const MODES = {
  payment: { key: 'payment', label: 'دفعة', icon: '💰', desc: 'قيد-و — تسجيل دفعة لمركز (نقداً أو حوالة)' },
  offset: { key: 'offset', label: 'مقاصة', icon: '🔄', desc: 'تحويل رصيد بين مركزين — قيدان متوازنان' },
}

const CURRENCIES = [
  { value: 'USD', label: 'دولار $' },
  { value: 'SYP', label: 'ليرة سورية ل.س' },
  { value: 'TRY', label: 'ليرة تركية ₺' },
]

const emptyPayment = () => ({
  center_id: '',
  amount: '',
  currency: 'USD',
  exchange_rate: '',
  date: todayISO(),
  notes: '',
})

const emptyOffset = () => ({
  from_center_id: '',
  to_center_id: '',
  amount: '',
  date: todayISO(),
  notes: '',
})

function centerLabel(c) {
  const types = { trader: 'تاجر', broker: 'مخلص', supplier: 'مورد', partner: 'شريك', fund: 'صندوق', internal: 'داخلي' }
  return `${c.name} (${types[c.type] || c.type})`
}

export default function CashOperationsPage() {
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'offset' ? 'offset' : 'payment'

  const [paymentForm, setPaymentForm] = useState(emptyPayment)
  const [offsetForm, setOffsetForm] = useState(emptyOffset)

  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  const setMode = useCallback(
    (m) => {
      setParams(m === 'offset' ? { mode: 'offset' } : {}, { replace: true })
    },
    [setParams]
  )

  const { data: centersRes } = useQuery({
    queryKey: ['centers'],
    queryFn: () => centersApi.list({ limit: 300 }),
  })
  const centers = centersRes?.data || []

  const { data: recentRes, refetch: refetchRecent } = useQuery({
    queryKey: ['transactions', 'cash-recent'],
    queryFn: () =>
      transactionsApi.list({
        limit: 25,
        ...(mode === 'payment' ? { category: 'payment' } : { category: 'offset' }),
      }),
  })
  const recentRows = recentRes?.data || []

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['centers'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    refetchRecent()
  }, [queryClient, refetchRecent])

  const paymentMutation = useMutation({
    mutationFn: (data) => transactionsApi.createPayment(data),
    onSuccess: () => {
      invalidateAll()
      setPaymentForm(emptyPayment())
      showToast('تم تسجيل الدفعة', 'success')
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const offsetMutation = useMutation({
    mutationFn: (data) => transactionsApi.offset(data),
    onSuccess: () => {
      invalidateAll()
      setOffsetForm(emptyOffset())
      showToast('تمت المقاصة بين المركزين', 'success')
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const setPay = (k, v) => setPaymentForm((f) => ({ ...f, [k]: v }))
  const needsRate = paymentForm.currency !== 'USD'

  const offsetValid = useMemo(() => {
    const a = parseInt(offsetForm.from_center_id, 10)
    const b = parseInt(offsetForm.to_center_id, 10)
    return a && b && a !== b && parseFloat(offsetForm.amount) > 0
  }, [offsetForm])

  const submitPayment = (e) => {
    e.preventDefault()
    paymentMutation.mutate({
      center_id: parseInt(paymentForm.center_id, 10),
      amount: parseFloat(paymentForm.amount),
      currency: paymentForm.currency,
      exchange_rate:
        paymentForm.currency !== 'USD' && paymentForm.exchange_rate
          ? parseFloat(paymentForm.exchange_rate)
          : 1,
      date: paymentForm.date,
      notes: paymentForm.notes || undefined,
    })
  }

  const submitOffset = (e) => {
    e.preventDefault()
    if (!offsetValid) {
      showToast('اختر مركزين مختلفين ومبلغاً صحيحاً', 'error')
      return
    }
    offsetMutation.mutate({
      from_center_id: parseInt(offsetForm.from_center_id, 10),
      to_center_id: parseInt(offsetForm.to_center_id, 10),
      amount: parseFloat(offsetForm.amount),
      date: offsetForm.date,
      notes: offsetForm.notes || undefined,
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="دفعات ومقاصة"
        subtitle="حركات نقدية موحّدة — كل قيد يظهر في سجل الحركات"
        actions={
          <Link to="/transactions" className="btn-secondary text-sm">
            سجل الحركات ←
          </Link>
        }
      />

      <div className="flex gap-2 p-1 rounded-2xl max-w-md" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {Object.values(MODES).map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === m.key ? 'text-accent' : 'text-ink-soft hover:text-ink'
            }`}
            style={
              mode === m.key
                ? {
                    background: 'var(--color-accent-muted)',
                    border: '1px solid rgba(96,165,250,0.28)',
                  }
                : { border: '1px solid transparent' }
            }
          >
            <span>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] gap-5">
        <div className="card space-y-4">
          <p className="text-sm text-ink-soft">{MODES[mode].desc}</p>

          {mode === 'payment' ? (
            <form className="space-y-4" onSubmit={submitPayment}>
              <div>
                <label className="label">المركز *</label>
                <select
                  value={paymentForm.center_id}
                  onChange={(e) => setPay('center_id', e.target.value)}
                  required
                >
                  <option value="">— اختر المركز —</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {centerLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">المبلغ *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPay('amount', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">العملة</label>
                  <select
                    value={paymentForm.currency}
                    onChange={(e) => setPay('currency', e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {needsRate && (
                <div>
                  <label className="label">سعر الصرف مقابل الدولار *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentForm.exchange_rate}
                    onChange={(e) => setPay('exchange_rate', e.target.value)}
                    placeholder={paymentForm.currency === 'SYP' ? 'مثال: 14500' : 'مثال: 32'}
                    required
                  />
                </div>
              )}
              <div>
                <label className="label">التاريخ</label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPay('date', e.target.value)}
                />
              </div>
              <div>
                <label className="label">ملاحظات</label>
                <input
                  value={paymentForm.notes}
                  onChange={(e) => setPay('notes', e.target.value)}
                  placeholder="نقداً، حوالة، شيك..."
                />
              </div>
              <button type="submit" className="btn-success w-full" disabled={paymentMutation.isPending}>
                {paymentMutation.isPending ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={submitOffset}>
              <div>
                <label className="label">من مركز (يُخصم منه) *</label>
                <select
                  value={offsetForm.from_center_id}
                  onChange={(e) => setOffsetForm({ ...offsetForm, from_center_id: e.target.value })}
                  required
                >
                  <option value="">—</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {centerLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">إلى مركز (يُضاف له) *</label>
                <select
                  value={offsetForm.to_center_id}
                  onChange={(e) => setOffsetForm({ ...offsetForm, to_center_id: e.target.value })}
                  required
                >
                  <option value="">—</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {centerLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
              {offsetForm.from_center_id &&
                offsetForm.to_center_id &&
                offsetForm.from_center_id === offsetForm.to_center_id && (
                  <p className="text-xs text-danger">يجب اختيار مركزين مختلفين</p>
                )}
              <div>
                <label className="label">المبلغ (USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={offsetForm.amount}
                  onChange={(e) => setOffsetForm({ ...offsetForm, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">تاريخ المقاصة *</label>
                <input
                  type="date"
                  value={offsetForm.date}
                  onChange={(e) => setOffsetForm({ ...offsetForm, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">ملاحظات</label>
                <input
                  value={offsetForm.notes}
                  onChange={(e) => setOffsetForm({ ...offsetForm, notes: e.target.value })}
                  placeholder="سبب المقاصة..."
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={offsetMutation.isPending || !offsetValid}
              >
                {offsetMutation.isPending ? 'جاري التنفيذ...' : 'تنفيذ المقاصة'}
              </button>
            </form>
          )}
        </div>

        <div className="card !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border">
            <h3 className="text-sm font-semibold text-ink">
              آخر {mode === 'payment' ? 'الدفعات' : 'المقاصات'}
            </h3>
            <p className="text-[11px] text-ink-faint mt-0.5">من سجل الحركات</p>
          </div>
          <ul className="max-h-[420px] overflow-y-auto divide-y divide-white/[0.04]">
            {recentRows.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-ink-faint">لا توجد حركات بعد</li>
            ) : (
              recentRows.map((r) => {
                const tx = TX_TYPE[r.type] || {}
                const cat = TX_CATEGORY[r.category] || {}
                return (
                  <li key={r.id} className="px-4 py-3 hover:bg-white/[0.02]">
                    <div className="flex justify-between gap-2 items-start">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-accent">{r.ref_number}</p>
                        <p className="text-xs text-ink truncate">{r.center_name}</p>
                        <p className="text-[10px] text-ink-faint">{formatDate(r.date)}</p>
                      </div>
                      <div className="text-left shrink-0">
                        <span className={`text-xs font-bold tabular-nums ${tx.color}`}>
                          {tx.sign}
                          {formatCurrency(r.amount_usd)}
                        </span>
                        <span className={`block text-[10px] mt-0.5 pill ${cat.color || ''}`}>
                          {cat.label || r.category}
                        </span>
                      </div>
                    </div>
                    {mode === 'offset' && r.notes && (
                      <p className="text-[10px] text-ink-faint mt-1 truncate">{r.notes}</p>
                    )}
                  </li>
                )
              })
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
