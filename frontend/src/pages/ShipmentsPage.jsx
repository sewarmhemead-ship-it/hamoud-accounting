import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { shipmentsApi } from '../api'
import StatusBadge from '../components/StatusBadge'
import { formatCurrency, formatDate } from '../utils/format'

const STATUS_FILTERS = [
  { value: '', label: 'الكل' },
  { value: 'pending', label: 'معلقة' },
  { value: 'complete', label: 'مكتملة' },
  { value: 'posted', label: 'مرحّلة' },
  { value: 'delivered', label: 'مُسلَّمة' },
]

export default function ShipmentsPage() {
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['shipments', status],
    queryFn: () => shipmentsApi.list({ status: status || undefined, limit: 100 }),
  })

  const shipments = data?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-white">السيارات</h2>
        <Link to="/shipments/new" className="btn-primary">
          + تخليص جديد
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              status === f.value
                ? 'bg-accent-muted text-accent'
                : 'bg-surface-card text-gray-400 hover:text-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-500">جاري التحميل...</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-surface-border">
                <th className="text-right py-3 px-2">الرقم</th>
                <th className="text-right py-3 px-2">التاجر</th>
                <th className="text-right py-3 px-2">البضاعة</th>
                <th className="text-right py-3 px-2">المسار</th>
                <th className="text-right py-3 px-2">الدخول</th>
                <th className="text-right py-3 px-2">المجموع</th>
                <th className="text-right py-3 px-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} className="border-b border-surface-border/50 hover:bg-surface-hover">
                  <td className="py-3 px-2">
                    <Link to={`/shipments/${s.id}`} className="text-accent hover:underline">
                      {s.ref_number}
                    </Link>
                  </td>
                  <td className="py-3 px-2 text-gray-300">{s.center_name}</td>
                  <td className="py-3 px-2 text-gray-300">{s.goods_name || '—'}</td>
                  <td className="py-3 px-2 text-gray-500 text-xs">
                    {s.source} → {s.destination}
                  </td>
                  <td className="py-3 px-2 text-gray-400">{formatDate(s.entry_date)}</td>
                  <td className="py-3 px-2 text-gray-200">{formatCurrency(s.total_cost || 0)}</td>
                  <td className="py-3 px-2">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shipments.length === 0 && (
            <p className="text-center text-gray-500 py-8">لا توجد سيارات</p>
          )}
        </div>
      )}
    </div>
  )
}
