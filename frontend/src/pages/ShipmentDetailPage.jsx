import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shipmentsApi } from '../api'
import StatusBadge from '../components/StatusBadge'
import ShipmentLifecycle from '../components/ShipmentLifecycle'
import PageHeader from '../components/PageHeader'
import { DUAL_COST_FIELDS, DUAL_PRICE_FIELDS } from '../constants'
import { formatCurrency, formatDate } from '../utils/format'
import { describeShipmentUpdate } from '../utils/shipmentUpdateDisplay'
import { useUiStore } from '../store/auth.store'

const CLASSIC_FIELDS = [
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
  const navigate = useNavigate()
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

  const removeMutation = useMutation({
    mutationFn: () => shipmentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centers'] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      showToast('تم حذف السيارة', 'success')
      navigate('/shipments/wip')
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-6 w-48 rounded-lg bg-white/5 animate-pulse" />
      <div className="card h-32 bg-white/5 animate-pulse" />
    </div>
  )

  const s = data?.data
  if (!s) return <p className="text-ink-faint">السيارة غير موجودة</p>

  const progress = s.progress || {}
  const canEdit = s.status === 'pending' || s.status === 'complete'
  const canPost = progress.is_complete && (s.status === 'pending' || s.status === 'complete')
  const canDeliver = s.status === 'posted'
  const canRemove = s.status === 'pending' || s.status === 'complete' || s.status === 'posted'

  // تحقق هل السيارة تستخدم نظام الكشف المزدوج
  const hasDual =
    DUAL_COST_FIELDS.some(([k]) => Number(s[k]) > 0) ||
    DUAL_PRICE_FIELDS.some(([k]) => Number(s[k]) > 0)

  const saveFields = () => {
    const hasChanges = Object.entries(editFields).some(([, v]) => v !== '')
    if (!hasChanges && !note) {
      showToast('لا توجد تغييرات', 'error')
      return
    }
    const payload = { _note: note || undefined }
    for (const [key, val] of Object.entries(editFields)) {
      if (val !== '') payload[key] = parseFloat(val)
    }
    updateMutation.mutate(payload)
  }

  const renderFieldRow = (field, label) => {
    const filled = s[field] != null
    return (
      <div key={field} className="flex items-center gap-4 flex-wrap">
        <span className={`w-4 text-center ${filled ? 'text-success' : 'text-ink-faint'}`}>
          {filled ? '✓' : '○'}
        </span>
        <span className="w-40 text-sm text-ink-soft">{label || FIELD_LABELS[field] || field}</span>
        <span className="text-ink w-24">
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
            onChange={(e) => setEditFields((f) => ({ ...f, [field]: e.target.value }))}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-faint">
        <button type="button" onClick={() => navigate(-1)} className="hover:text-ink transition-colors">← رجوع</button>
        <span>·</span>
        <Link to="/shipments" className="hover:text-ink transition-colors">السيارات</Link>
        <span>·</span>
        <span className="text-ink font-mono">{s.ref_number}</span>
      </div>

      <PageHeader
        title={s.ref_number}
        subtitle={`${s.source} → ${s.destination}`}
        actions={<StatusBadge status={s.status} postable={progress.is_complete} />}
      />

      <ShipmentLifecycle currentStatus={s.status} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card">
          <p className="text-xs text-ink-faint mb-1">التاجر</p>
          <Link to={`/centers/${s.center_id}`} className="text-accent hover:text-accent-hover font-medium text-sm">
            {s.center_name}
          </Link>
        </div>
        <div className="card">
          <p className="text-xs text-ink-faint mb-1">المخلص</p>
          {s.broker_name ? (
            <Link to={`/centers/${s.clearance_center_id}`} className="text-accent hover:text-accent-hover font-medium text-sm">
              {s.broker_name}
            </Link>
          ) : (
            <span className="text-ink-faint text-sm">—</span>
          )}
        </div>
        <div className="card">
          <p className="text-xs text-ink-faint mb-1">تاريخ الدخول</p>
          <p className="text-ink text-sm">{formatDate(s.entry_date)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-ink-faint mb-1">المجموع</p>
          <p className="text-2xl font-bold text-accent tabular-nums">{formatCurrency(s.total_cost || 0)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-ink-soft">اكتمال الأقلام الإلزامية</span>
          <span className="text-ink">
            {progress.filled || 0} / {progress.required || 3}
          </span>
        </div>
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${((progress.filled || 0) / (progress.required || 3)) * 100}%` }}
          />
        </div>
        {progress.missing?.length > 0 && (
          <p className="text-warning text-xs mt-2">
            ناقص: {progress.missing.join('، ')}
          </p>
        )}
      </div>

      {/* حقول الكشف المزدوج */}
      {hasDual ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card space-y-3">
            <h3 className="font-semibold text-danger text-sm">ما ندفعه للمخلص (التكلفة)</h3>
            {DUAL_COST_FIELDS.map(([field, label]) => renderFieldRow(field, label))}
          </div>
          <div className="card space-y-3">
            <h3 className="font-semibold text-success text-sm">ما نأخذه من التاجر (الفاتورة)</h3>
            {DUAL_PRICE_FIELDS.map(([field, label]) => renderFieldRow(field, label))}
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="font-semibold text-ink mb-4">الأقلام المالية</h3>
          <div className="space-y-3">
            {CLASSIC_FIELDS.map((field) => renderFieldRow(field, FIELD_LABELS[field]))}
          </div>
        </div>
      )}

      {/* زر حفظ التعديلات */}
      {canEdit && (
        <div className="card space-y-3">
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
        {canRemove && (
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              if (window.confirm('حذف السيارة وعكس قيودها إن وُجدت؟')) removeMutation.mutate()
            }}
            disabled={removeMutation.isPending}
          >
            حذف السيارة
          </button>
        )}
      </div>

      {/* Update history */}
      {s.updates?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-ink mb-3">سجل التعديلات</h3>
          <ul className="space-y-3 text-sm">
            {s.updates.map((raw) => {
              const u = describeShipmentUpdate(raw)
              return (
                <li
                  key={u.id}
                  className="border-b border-surface-border pb-3 last:border-0"
                >
                  <p className="text-ink leading-relaxed">{u.summary}</p>
                  {u.note && (
                    <p className="text-ink-faint text-xs mt-1">ملاحظة: {u.note}</p>
                  )}
                  <p className="text-[11px] text-ink-faint mt-1.5 tabular-nums">
                    {u.updated_at_display}
                    {u.updated_by_name ? ` · ${u.updated_by_name}` : ''}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
