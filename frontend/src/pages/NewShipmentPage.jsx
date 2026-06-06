import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { centersApi, reportsApi, shipmentsApi, calculationsApi } from '../api'
import { todayISO, formatCurrency, parseNum } from '../utils/format'
import { DUAL_COST_FIELDS, DUAL_PRICE_FIELDS, DUAL_COST_TO_PRICE } from '../constants'
import { useUiStore } from '../store/auth.store'

const FINANCIAL_KEYS = [...DUAL_COST_FIELDS, ...DUAL_PRICE_FIELDS].map(([k]) => k)

const emptyForm = () => ({
  center_id: '',
  clearance_center_id: '',
  border_id: '',
  goods_name: '',
  goods_type_id: '',
  weight: '',
  quantity: '',
  source: '',
  destination: '',
  entry_date: todayISO(),
  driver_name: '',
  notes: '',
  ...Object.fromEntries(FINANCIAL_KEYS.map((k) => [k, ''])),
})

const n = parseNum
const numOrUndef = (v) => (v === '' || v === undefined || v === null ? undefined : parseFloat(v))

export default function NewShipmentPage() {
  const [form, setForm] = useState(emptyForm())
  const [margin, setMargin] = useState('')
  const [marginMode, setMarginMode] = useState('amount') // 'amount' | 'percent'
  const navigate = useNavigate()
  const showToast = useUiStore((s) => s.showToast)

  const { data: centersRes } = useQuery({
    queryKey: ['centers'],
    queryFn: () => centersApi.list({ limit: 200 }),
  })
  const { data: lookupsRes } = useQuery({
    queryKey: ['lookups'],
    queryFn: () => reportsApi.lookups(),
  })

  const traders = centersRes?.data?.filter((c) => c.type === 'trader') || []
  const brokers = centersRes?.data?.filter((c) => c.type === 'broker') || []
  const borders = lookupsRes?.data?.borders || []
  const goodsTypes = lookupsRes?.data?.goods_types || []

  // رصيد التاجر/المخلص الحالي (سياق)
  const { data: traderBal } = useQuery({
    queryKey: ['center-balance', form.center_id],
    queryFn: () => centersApi.balance(form.center_id),
    enabled: !!form.center_id,
  })
  const { data: brokerBal } = useQuery({
    queryKey: ['center-balance', form.clearance_center_id],
    queryFn: () => centersApi.balance(form.clearance_center_id),
    enabled: !!form.clearance_center_id,
  })

  // اقتراح الرسوم الجمركية حسب الوزن والنوع
  const goodsTypeName = goodsTypes.find((g) => String(g.id) === String(form.goods_type_id))?.name
  const { data: customsRes } = useQuery({
    queryKey: ['customs-fee', goodsTypeName, form.weight],
    queryFn: () => calculationsApi.customsFee({ goods_type: goodsTypeName, weight: n(form.weight) }),
    enabled: !!goodsTypeName && n(form.weight) > 0,
  })
  const customs = customsRes?.data

  const createMutation = useMutation({
    mutationFn: (payload) => shipmentsApi.create(payload),
    onSuccess: (res) => {
      showToast('تم تسجيل السيارة', 'success')
      navigate(`/shipments/${res.data.id}`)
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  // تزامن فوري عند الإدخال: ما ندفعه للمخلص (التكلفة) ينتقل تلقائياً لما نأخذه من
  // التاجر (الفاتورة) — يبقى قابلاً للتعديل لإضافة المربح يدوياً. التزامن وقت الإدخال فقط.
  const setCost = (costKey, val) => {
    const priceKey = DUAL_COST_TO_PRICE[costKey]
    setForm((f) => ({ ...f, [costKey]: val, ...(priceKey ? { [priceKey]: val } : {}) }))
  }

  // حسابات حيّة
  const calc = useMemo(() => {
    const costTotal = DUAL_COST_FIELDS.reduce((a, [k]) => a + n(form[k]), 0)
    const priceTotal = DUAL_PRICE_FIELDS.reduce((a, [k]) => a + n(form[k]), 0)
    const profit = priceTotal - costTotal
    const marginPct = costTotal > 0 ? (profit / costTotal) * 100 : 0
    return {
      costTotal: Math.round(costTotal * 100) / 100,
      priceTotal: Math.round(priceTotal * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      marginPct: Math.round(marginPct * 10) / 10,
    }
  }, [form])

  // معاينة قابلية الترحيل (الأقلام الإلزامية: ترسيم، تخليص، سائق)
  const missing = useMemo(() => {
    const m = []
    if (!n(form.cost_tarseem) && !n(form.price_tarseem)) m.push('الترسيم')
    if (!n(form.cost_clearance_fee) && !n(form.price_clearance_fee)) m.push('التخليص')
    if (!n(form.price_syrian_driver) && !n(form.cost_turkish_driver)) m.push('السائق')
    return m
  }, [form])

  // منع الحفظ حتى تكتمل الحقول الأساسية + الأقلام الإلزامية
  const blocking = useMemo(() => {
    const b = []
    if (!form.center_id) b.push('التاجر')
    if (!form.border_id) b.push('المعبر')
    if (!form.source?.trim()) b.push('المصدر')
    if (!form.destination?.trim()) b.push('الوجهة')
    if (!form.entry_date) b.push('تاريخ الدخول')
    return [...b, ...missing]
  }, [form, missing])

  const copyCostToPrice = () => {
    setForm((f) => {
      const next = { ...f }
      for (const [costKey, priceKey] of Object.entries(DUAL_COST_TO_PRICE)) {
        if (f[costKey] !== '' && f[costKey] !== undefined) next[priceKey] = f[costKey]
      }
      return next
    })
  }

  const applyMargin = () => {
    const m = n(margin)
    setForm((f) => {
      const next = { ...f }
      let costSum = 0
      for (const [costKey, priceKey] of Object.entries(DUAL_COST_TO_PRICE)) {
        const v = n(f[costKey])
        costSum += v
        next[priceKey] = f[costKey] === '' ? '' : v
      }
      const add = marginMode === 'percent' ? (costSum * m) / 100 : m
      if (add) next.price_other = Math.round((n(next.price_other) + add) * 100) / 100
      return next
    })
  }

  const applyCustoms = () => {
    if (customs?.fee != null) set('cost_tarseem', customs.fee)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (blocking.length > 0) {
      showToast(`أكمل الحقول الناقصة: ${blocking.join('، ')}`, 'error')
      return
    }
    const payload = {
      center_id: parseInt(form.center_id, 10),
      clearance_center_id: form.clearance_center_id
        ? parseInt(form.clearance_center_id, 10)
        : undefined,
      border_id: parseInt(form.border_id, 10),
      goods_type_id: form.goods_type_id ? parseInt(form.goods_type_id, 10) : undefined,
      goods_name: form.goods_name || undefined,
      weight: numOrUndef(form.weight),
      quantity: form.quantity ? parseInt(form.quantity, 10) : undefined,
      source: form.source,
      destination: form.destination,
      entry_date: form.entry_date,
      driver_name: form.driver_name || undefined,
      notes: form.notes || undefined,
    }
    for (const k of FINANCIAL_KEYS) payload[k] = numOrUndef(form[k])
    createMutation.mutate(payload)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-ink">تخليص جديد</h2>
        <p className="text-ink-soft text-sm mt-1">
          تكلفة المخلص تنتقل تلقائياً لفاتورة التاجر — عدّل الفاتورة لإضافة مربحك. كل الحقول الإلزامية مطلوبة قبل الحفظ
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ─── معلومات أساسية ─── */}
        <div className="card space-y-4">
          <h3 className="font-medium text-ink-soft">معلومات أساسية</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">التاجر *</label>
              <select value={form.center_id} onChange={(e) => set('center_id', e.target.value)} required>
                <option value="">—</option>
                {traders.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {traderBal?.data && (
                <p className="text-[11px] text-ink-faint mt-1">
                  الرصيد الحالي: <span className="text-accent">{formatCurrency(traderBal.data.balance)}</span>
                  {' • '}WIP: {formatCurrency(traderBal.data.wip_value)}
                </p>
              )}
            </div>
            <div>
              <label className="label">المخلص</label>
              <select value={form.clearance_center_id} onChange={(e) => set('clearance_center_id', e.target.value)}>
                <option value="">—</option>
                {brokers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {brokerBal?.data && (
                <p className="text-[11px] text-ink-faint mt-1">
                  الرصيد الحالي: <span className="text-accent">{formatCurrency(brokerBal.data.balance)}</span>
                </p>
              )}
            </div>
            <div>
              <label className="label">المعبر *</label>
              <select value={form.border_id} onChange={(e) => set('border_id', e.target.value)} required>
                <option value="">—</option>
                {borders.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">تاريخ الدخول *</label>
              <input type="date" value={form.entry_date} onChange={(e) => set('entry_date', e.target.value)} required />
            </div>
            <div>
              <label className="label">نوع البضاعة</label>
              <select value={form.goods_type_id} onChange={(e) => set('goods_type_id', e.target.value)}>
                <option value="">—</option>
                {goodsTypes.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">البضاعة (وصف)</label>
              <input value={form.goods_name} onChange={(e) => set('goods_name', e.target.value)} placeholder="خضار، فواكه..." />
            </div>
            <div>
              <label className="label">الوزن (كغ)</label>
              <input type="number" step="0.01" min="0" value={form.weight} onChange={(e) => set('weight', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">الكمية</label>
              <input type="number" min="0" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">السائق</label>
              <input value={form.driver_name} onChange={(e) => set('driver_name', e.target.value)} />
            </div>
            <div>
              <label className="label">المصدر *</label>
              <input value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="مرسين" required />
            </div>
            <div>
              <label className="label">الوجهة *</label>
              <input value={form.destination} onChange={(e) => set('destination', e.target.value)} placeholder="حلب" required />
            </div>
          </div>

          {/* اقتراح رسوم جمركية */}
          {customs && (
            <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                 style={{ background: '#3b82f618', border: '1px solid #3b82f630' }}>
              <span className="text-info">
                رسوم جمركية مقترحة: <b>{formatCurrency(customs.fee)}</b>
                <span className="text-ink-faint"> ({customs.weight} كغ × {customs.ratePerKg}$/كغ)</span>
              </span>
              <button type="button" onClick={applyCustoms} className="text-accent hover:text-accent-hover text-xs font-medium">
                تطبيق على ترسيم التكلفة ←
              </button>
            </div>
          )}
        </div>

        {/* ─── ملخص المربح الحيّ ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card tone-red">
            <p className="text-[11px] text-ink-faint mb-1.5">تكلفة المخلص</p>
            <p className="text-xl font-bold text-danger leading-none">{formatCurrency(calc.costTotal)}</p>
          </div>
          <div className="stat-card tone-green">
            <p className="text-[11px] text-ink-faint mb-1.5">فاتورة التاجر</p>
            <p className="text-xl font-bold text-success leading-none">{formatCurrency(calc.priceTotal)}</p>
          </div>
          <div className="stat-card tone-gold">
            <p className="text-[11px] text-ink-faint mb-1.5">مربح الشركة</p>
            <p className={`text-xl font-bold leading-none ${calc.profit >= 0 ? 'text-accent' : 'text-danger'}`}>
              {formatCurrency(calc.profit)}
            </p>
          </div>
          <div className="stat-card tone-blue">
            <p className="text-[11px] text-ink-faint mb-1.5">نسبة الهامش</p>
            <p className="text-xl font-bold text-info leading-none">{calc.marginPct}%</p>
          </div>
        </div>

        {/* معاينة قابلية الترحيل */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {missing.length === 0 ? (
            <span className="pill bg-success/20 text-success">● جاهزة للترحيل بعد الحفظ</span>
          ) : (
            <>
              <span className="text-ink-soft">معلّقة — ينقصها:</span>
              {missing.map((m) => (
                <span key={m} className="pill bg-warning/20 text-warning">◌ {m}</span>
              ))}
            </>
          )}
        </div>

        {/* ─── الأقلام المزدوجة ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* تكلفة المخلص */}
          <div className="card space-y-4">
            <h3 className="font-medium text-danger">ما ندفعه للمخلص (التكلفة)</h3>
            <div className="grid grid-cols-2 gap-3">
              {DUAL_COST_FIELDS.map(([key, label]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input type="number" step="0.01" min="0" value={form[key]} onChange={(e) => setCost(key, e.target.value)} placeholder="0" />
                </div>
              ))}
            </div>
          </div>

          {/* فاتورة التاجر */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-success">ما نأخذه من التاجر (الفاتورة)</h3>
              <button type="button" onClick={copyCostToPrice} className="text-xs text-accent hover:text-accent-hover">
                نسخ التكلفة ←
              </button>
            </div>
            {/* مساعد الهامش */}
            <div className="flex items-center gap-2 rounded-lg bg-surface-hover px-3 py-2">
              <span className="text-xs text-ink-soft shrink-0">هامش سريع:</span>
              <input
                type="number" step="0.01" min="0" value={margin}
                onChange={(e) => setMargin(e.target.value)}
                placeholder="0" className="!py-1 !px-2 text-sm w-24"
              />
              <select value={marginMode} onChange={(e) => setMarginMode(e.target.value)} className="!py-1 !px-2 text-sm w-20">
                <option value="amount">$</option>
                <option value="percent">%</option>
              </select>
              <button type="button" onClick={applyMargin} className="btn-secondary !py-1 !px-3 text-xs">تطبيق</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {DUAL_PRICE_FIELDS.map(([key, label]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input type="number" step="0.01" min="0" value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder="0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="label">ملاحظات</label>
          <textarea className="w-full" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        {blocking.length > 0 && (
          <div className="flex items-center gap-2 text-sm flex-wrap rounded-lg bg-warning/10 px-3 py-2">
            <span className="text-warning font-medium">لا يمكن الحفظ — أكمل:</span>
            {blocking.map((b) => (
              <span key={b} className="pill bg-warning/20 text-warning">◌ {b}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="btn-primary"
            disabled={createMutation.isPending || blocking.length > 0}
          >
            {createMutation.isPending ? 'جاري الحفظ...' : 'تسجيل السيارة'}
          </button>
          <span className="text-xs text-ink-faint">
            المربح المتوقع: <span className={calc.profit >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(calc.profit)}</span>
          </span>
        </div>
      </form>
    </div>
  )
}
