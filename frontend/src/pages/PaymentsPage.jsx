import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { centersApi, transactionsApi } from '../api'
import { todayISO } from '../utils/format'
import { useUiStore } from '../store/auth.store'

export default function PaymentsPage() {
  const [form, setForm] = useState({
    center_id: '',
    amount: '',
    date: todayISO(),
    notes: '',
  })
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  const { data: centersRes } = useQuery({
    queryKey: ['centers'],
    queryFn: () => centersApi.list({ limit: 200 }),
  })

  const traders = centersRes?.data?.filter((c) => c.type === 'trader') || []

  const mutation = useMutation({
    mutationFn: (data) => transactionsApi.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centers'] })
      setForm({ center_id: '', amount: '', date: todayISO(), notes: '' })
      showToast('تم تسجيل الدفعة', 'success')
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-xl font-bold text-white">تسجيل دفعة</h2>
      <p className="text-gray-500 text-sm">قيد-و — يخصم من ذمة التاجر</p>

      <form
        className="card space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate({
            center_id: parseInt(form.center_id, 10),
            amount: parseFloat(form.amount),
            date: form.date,
            notes: form.notes || undefined,
          })
        }}
      >
        <div>
          <label className="label">التاجر *</label>
          <select
            value={form.center_id}
            onChange={(e) => setForm({ ...form, center_id: e.target.value })}
            required
          >
            <option value="">—</option>
            {traders.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
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
          <label className="label">التاريخ</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div>
          <label className="label">ملاحظات</label>
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="نقداً، حوالة..."
          />
        </div>
        <button type="submit" className="btn-success w-full" disabled={mutation.isPending}>
          تسجيل الدفعة
        </button>
      </form>
    </div>
  )
}
