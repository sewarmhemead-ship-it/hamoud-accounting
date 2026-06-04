import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { centersApi, transactionsApi } from '../api'
import PageHeader from '../components/PageHeader'
import { useUiStore } from '../store/auth.store'

export default function OffsetPage() {
  const [form, setForm] = useState({ from_center_id: '', to_center_id: '', amount: '', notes: '' })
  const showToast = useUiStore((s) => s.showToast)

  const { data: centersRes } = useQuery({
    queryKey: ['centers'],
    queryFn: () => centersApi.list({ limit: 200 }),
  })

  const mutation = useMutation({
    mutationFn: () =>
      transactionsApi.offset({
        from_center_id: parseInt(form.from_center_id, 10),
        to_center_id: parseInt(form.to_center_id, 10),
        amount: parseFloat(form.amount),
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      showToast('تمت المقاصة بين المركزين', 'success')
      setForm({ from_center_id: '', to_center_id: '', amount: '', notes: '' })
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const centers = centersRes?.data || []

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader
        title="مقاصة بين مركزين"
        subtitle="قيد-و على المركز الأول + قيد-ص على الثاني — نفس المبلغ"
      />

      <form
        className="card space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
      >
        <div>
          <label className="label">من (يُخصم) *</label>
          <select
            value={form.from_center_id}
            onChange={(e) => setForm({ ...form, from_center_id: e.target.value })}
            required
          >
            <option value="">—</option>
            {centers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">إلى (يُضاف) *</label>
          <select
            value={form.to_center_id}
            onChange={(e) => setForm({ ...form, to_center_id: e.target.value })}
            required
          >
            <option value="">—</option>
            {centers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">المبلغ $ *</label>
          <input
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">ملاحظات</label>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
          تنفيذ المقاصة
        </button>
      </form>
    </div>
  )
}
