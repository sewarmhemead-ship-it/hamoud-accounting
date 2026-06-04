import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { centersApi, juiceApi, reportsApi } from '../api'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import { formatCurrency, formatDate, todayISO } from '../utils/format'
import { useUiStore } from '../store/auth.store'

const emptyForm = () => ({
  date: todayISO(),
  product_type: '',
  units_sent: '',
  units_lost: '0',
  capital: '',
  turkish_transport: '',
  tarseem: '',
  workers: '',
  clearance_fee: '',
  driver_cost: '',
  sale_price: '',
  center_id: '',
  driver: '',
  border_id: '',
})

export default function JuicePage() {
  const [form, setForm] = useState(emptyForm())
  const [preview, setPreview] = useState(null)
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  const { data: listRes } = useQuery({
    queryKey: ['juice'],
    queryFn: () => juiceApi.list({ limit: 50 }),
  })

  const { data: centersRes } = useQuery({
    queryKey: ['centers'],
    queryFn: () => centersApi.list({ limit: 200 }),
  })

  const { data: lookupsRes } = useQuery({
    queryKey: ['lookups'],
    queryFn: () => reportsApi.lookups(),
  })

  const traders = centersRes?.data?.filter((c) => c.type === 'trader') || []
  const borders = lookupsRes?.data?.borders || []
  const rows = listRes?.data || []

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const payload = () => ({
    date: form.date,
    product_type: form.product_type,
    units_sent: parseInt(form.units_sent, 10),
    units_lost: parseInt(form.units_lost, 10) || 0,
    capital: parseFloat(form.capital) || 0,
    turkish_transport: parseFloat(form.turkish_transport) || 0,
    tarseem: parseFloat(form.tarseem) || 0,
    workers: parseFloat(form.workers) || 0,
    clearance_fee: parseFloat(form.clearance_fee) || 0,
    driver_cost: parseFloat(form.driver_cost) || 0,
    sale_price: parseFloat(form.sale_price),
    center_id: parseInt(form.center_id, 10),
    driver: form.driver || undefined,
    border_id: form.border_id ? parseInt(form.border_id, 10) : undefined,
  })

  const createMutation = useMutation({
    mutationFn: () => juiceApi.create(payload()),
    onSuccess: () => {
      showToast('تم تسجيل شحنة طازج', 'success')
      setForm(emptyForm())
      setPreview(null)
      queryClient.invalidateQueries({ queryKey: ['juice'] })
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const handlePreview = async () => {
    try {
      const res = await juiceApi.preview(payload())
      setPreview(res.data)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const columns = [
    { key: 'ref_number', label: 'الرقم' },
    { key: 'product_type', label: 'المنتج' },
    {
      key: 'units',
      label: 'وحدات',
      render: (r) => `${r.units_received}/${r.units_sent}`,
    },
    {
      key: 'cost_per_unit',
      label: 'تكلفة/وحدة',
      render: (r) => formatCurrency(r.cost_per_unit),
    },
    {
      key: 'total_profit',
      label: 'المربح',
      render: (r) => <span className="text-success">{formatCurrency(r.total_profit)}</span>,
    },
    {
      key: 'date',
      label: 'التاريخ',
      render: (r) => formatDate(r.date),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="وحدة طازج"
        subtitle="حساب بالوحدة — تكلفة/وحدة = (رأس المال + مصاريف) ÷ الوحدات المستلمة"
      />

      <form className="card space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="label">التاريخ</label>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div>
            <label className="label">المنتج *</label>
            <input value={form.product_type} onChange={(e) => set('product_type', e.target.value)} required />
          </div>
          <div>
            <label className="label">التاجر *</label>
            <select value={form.center_id} onChange={(e) => set('center_id', e.target.value)} required>
              <option value="">—</option>
              {traders.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">سعر البيع *</label>
            <input type="number" step="0.01" value={form.sale_price} onChange={(e) => set('sale_price', e.target.value)} />
          </div>
          <div>
            <label className="label">وحدات مرسلة *</label>
            <input type="number" value={form.units_sent} onChange={(e) => set('units_sent', e.target.value)} />
          </div>
          <div>
            <label className="label">وحدات هالكة</label>
            <input type="number" value={form.units_lost} onChange={(e) => set('units_lost', e.target.value)} />
          </div>
          <div>
            <label className="label">رأس المال</label>
            <input type="number" step="0.01" value={form.capital} onChange={(e) => set('capital', e.target.value)} />
          </div>
          <div>
            <label className="label">ترسيم</label>
            <input type="number" step="0.01" value={form.tarseem} onChange={(e) => set('tarseem', e.target.value)} />
          </div>
          {[
            ['turkish_transport', 'نقل تركي'],
            ['workers', 'عمال'],
            ['clearance_fee', 'تخليص'],
            ['driver_cost', 'سائق'],
          ].map(([k, l]) => (
            <div key={k}>
              <label className="label">{l}</label>
              <input type="number" step="0.01" value={form[k]} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </div>

        {preview && (
          <div className="p-4 rounded-lg bg-surface grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">مستلمة:</span> {preview.units_received}</div>
            <div><span className="text-gray-500">تكلفة/وحدة:</span> {formatCurrency(preview.cost_per_unit)}</div>
            <div><span className="text-gray-500">مربح/وحدة:</span> <span className="text-success">{formatCurrency(preview.profit_per_unit)}</span></div>
            <div className="col-span-3"><span className="text-gray-500">إجمالي المربح:</span> <strong className="text-success">{formatCurrency(preview.total_profit)}</strong></div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" className="btn-secondary" onClick={handlePreview}>معاينة الحساب</button>
          <button type="button" className="btn-primary" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            حفظ
          </button>
        </div>
      </form>

      <DataTable columns={columns} rows={rows} emptyMessage="لا توجد شحنات طازج" />
    </div>
  )
}
