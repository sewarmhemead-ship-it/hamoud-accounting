import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shipmentsApi } from '../api'
import StatusBadge from '../components/StatusBadge'
import ShipmentLifecycle from '../components/ShipmentLifecycle'
import PageHeader from '../components/PageHeader'
import { FIELD_LABELS } from '../constants'
import { formatCurrency, formatDate } from '../utils/format'
import { useUiStore } from '../store/auth.store'

const EDITABLE_FIELDS = [
  'tarseem',
  'service_fee',
  'workers',
  'clearance_fee',
  'syrian_driver',
  'turkish_transport',
  'internal_transport',
  'door_receipt',
  'other_expenses',
]

export default function ShipmentDetailPage() {
  const { id } = useParams()
  const [editFields, setEditFields] = useState({})
  const [note, setNote] = useState('')
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => shipmentsApi.get(id),
  })

  const updateMutation = useMutation({
    mutationFn: (payload) => shipmentsApi.updateFields(id, payload),
    onSuccess: () => {
      refetch()
      setEditFields({})
      setNote('')
      showToast('تم تحديث الأقلام', 'success')
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const postMutation = useMutation({
    mutationFn: () => shipmentsApi.post(id),
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({ queryKey: ['centers'] })
      showToast('تم ترحيل السيارة لليوميات', 'success')
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const deliverMutation = useMutation({
    mutationFn: () => shipmentsApi.deliver(id),
    onSuccess: () => {
      refetch()
      showToast('تم تسجيل التسليم', 'success')
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  if (isLoading) return <p className="text-gray-500">جاري التحميل...</p>

  const s = data?.data
  if (!s) return <p className="text-gray-500">السيارة غير موجودة</p>

  const progress = s.progress || {}
  const canEdit = s.status === 'pending' || s.status === 'complete'
  const canPost = s.status === 'complete'
  const canDeliver = s.status === 'posted'

  const saveFields = () => {
    const payload = { _note: note || undefined }
    for (const [key, val] of Object.entries(editFields)) {
      if (val !== '') payload[key] = parseFloat(val)
    }
    if (Object.keys(payload).length <= 1 && !note) {
      showToast('لا توجد تغييرات', 'error')
      return
    }
    updateMutation.mutate(payload)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.ref_number}
        subtitle={`${s.center_name} — ${s.source} → ${s.destination}`}
        actions={<StatusBadge status={s.status} />}
      />

      <ShipmentLifecycle currentStatus={s.status} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-400">التاجر</p>
          <p className="text-white font-medium">{s.center_name}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">المسار</p>
          <p className="text-white text-sm">{s.source} → {s.destination}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">تاريخ الدخول</p>
          <p className="text-white">{formatDate(s.entry_date)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">المجموع</p>
          <p className="text-2xl font-bold text-accent">{formatCurrency(s.total_cost || 0)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">اكتمال الأقلام الإلزامية</span>
          <span className="text-gray-300">
            {progress.filled || 0} / {progress.required || 3}
          </span>
        </div>
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{
              width: `${((progress.filled || 0) / (progress.required || 3)) * 100}%`,
            }}
          />
        </div>
        {progress.missing?.length > 0 && (
          <p className="text-warning text-xs mt-2">
            ناقص: {progress.missing.join('، ')}
          </p>
        )}
      </div>

      {/* Fields table */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">الأقلام المالية</h3>
        <div className="space-y-3">
          {EDITABLE_FIELDS.map((field) => {
            const filled = s[field] != null
            return (
              <div key={field} className="flex items-center gap-4 flex-wrap">
                <span className={`w-4 text-center ${filled ? 'text-success' : 'text-gray-600'}`}>
                  {filled ? '✓' : '○'}
                </span>
                <span className="w-32 text-sm text-gray-400">{FIELD_LABELS[field]}</span>
                <span className="text-gray-200 w-24">
                  {filled ? formatCurrency(s[field]) : '—'}
                </span>
                {canEdit && (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-28 text-sm py-1"
                    placeholder="تحديث"
                    value={editFields[field] ?? ''}
                    onChange={(e) =>
                      setEditFields((f) => ({ ...f, [field]: e.target.value }))
                    }
                  />
                )}
              </div>
            )
          })}
        </div>

        {canEdit && (
          <div className="mt-4 pt-4 border-t border-surface-border space-y-3">
            <input
              placeholder="ملاحظة التعديل (اختياري)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-sm"
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={saveFields}
              disabled={updateMutation.isPending}
            >
              حفظ التعديلات
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {canPost && (
          <button
            type="button"
            className="btn-success"
            onClick={() => postMutation.mutate()}
            disabled={postMutation.isPending}
          >
            ترحيل لليوميات
          </button>
        )}
        {canDeliver && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => deliverMutation.mutate()}
            disabled={deliverMutation.isPending}
          >
            تسجيل التسليم
          </button>
        )}
      </div>

      {/* Update history */}
      {s.updates?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-white mb-3">سجل التعديلات</h3>
          <ul className="space-y-2 text-sm">
            {s.updates.map((u) => (
              <li key={u.id} className="text-gray-400 border-b border-surface-border/50 pb-2">
                <span className="text-gray-300">{FIELD_LABELS[u.field_name] || u.field_name}</span>
                {' '}
                {u.old_value ?? '—'} → {u.new_value}
                {u.note && <span className="text-gray-500"> — {u.note}</span>}
                <span className="block text-xs text-gray-600">{formatDate(u.updated_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
