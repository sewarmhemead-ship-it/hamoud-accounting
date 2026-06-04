import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { centersApi } from '../api'
import CenterTypeBadge from '../components/CenterTypeBadge'
import { downloadBlob } from '../utils/download'
import { useUiStore } from '../store/auth.store'

function TraderExport({ center }) {
  const showToast = useUiStore((s) => s.showToast)
  const [busy, setBusy] = useState('')
  const dl = async (fmt) => {
    setBusy(fmt)
    try {
      const blob = await centersApi.reportBlob(center.id, `trader.${fmt}`)
      downloadBlob(blob, `كشف ${center.name}.${fmt}`)
    } catch (e) {
      showToast(e.message || 'تعذّر التصدير', 'error')
    } finally {
      setBusy('')
    }
  }
  return (
    <span className="inline-flex gap-1.5">
      <button type="button" title="تصدير Excel" disabled={!!busy} onClick={() => dl('xlsx')} className="text-success hover:underline text-xs">
        {busy === 'xlsx' ? '...' : 'Excel'}
      </button>
      <span className="text-ink-faint">·</span>
      <button type="button" title="تصدير PDF" disabled={!!busy} onClick={() => dl('pdf')} className="text-danger hover:underline text-xs">
        {busy === 'pdf' ? '...' : 'PDF'}
      </button>
    </span>
  )
}

export default function CentersPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'trader', currency: 'USD' })
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  const { data, isLoading } = useQuery({
    queryKey: ['centers'],
    queryFn: () => centersApi.list({ limit: 200 }),
  })

  const createMutation = useMutation({
    mutationFn: (payload) => centersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centers'] })
      setShowForm(false)
      setForm({ name: '', type: 'trader', currency: 'USD' })
      showToast('تم إنشاء المركز', 'success')
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const centers = data?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">المراكز</h2>
        <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'إلغاء' : '+ مركز جديد'}
        </button>
      </div>

      {showForm && (
        <form
          className="card space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate(form)
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">الاسم</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">النوع</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="trader">تاجر</option>
                <option value="broker">مخلص</option>
                <option value="supplier">مورد</option>
                <option value="partner">شريك</option>
                <option value="fund">صندوق</option>
                <option value="internal">داخلي</option>
              </select>
            </div>
            <div>
              <label className="label">العملة</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="USD">دولار</option>
                <option value="SYP">ليرة سورية</option>
                <option value="TRY">ليرة تركية</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
            حفظ
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-gray-500">جاري التحميل...</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-surface-border">
                <th className="text-right py-3 px-2">الرمز</th>
                <th className="text-right py-3 px-2">الاسم</th>
                <th className="text-right py-3 px-2">النوع</th>
                <th className="text-right py-3 px-2">العملة</th>
                <th className="text-right py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {centers.map((c) => (
                <tr key={c.id} className="border-b border-surface-border/50 hover:bg-surface-hover">
                  <td className="py-3 px-2 text-gray-400">{c.code}</td>
                  <td className="py-3 px-2 text-gray-200">{c.name}</td>
                  <td className="py-3 px-2">
                    <CenterTypeBadge type={c.type} />
                  </td>
                  <td className="py-3 px-2 text-gray-400">{c.currency}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3 justify-end">
                      {c.type === 'trader' && <TraderExport center={c} />}
                      <Link to={`/centers/${c.id}`} className="text-accent hover:underline">
                        كشف حساب
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
