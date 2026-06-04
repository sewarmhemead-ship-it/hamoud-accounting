import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { shipmentsApi } from '../api'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { formatCurrency, formatDate } from '../utils/format'

export default function WipPage() {
  const { data: pendingRes, isLoading: l1 } = useQuery({
    queryKey: ['shipments', 'wip-pending'],
    queryFn: () => shipmentsApi.list({ status: 'pending', limit: 200 }),
  })

  const { data: completeRes, isLoading: l2 } = useQuery({
    queryKey: ['shipments', 'wip-complete'],
    queryFn: () => shipmentsApi.list({ status: 'complete', limit: 200 }),
  })

  const pending = pendingRes?.data || []
  const complete = completeRes?.data || []
  const all = [...pending, ...complete]
  const total = all.reduce((s, r) => s + (r.total_cost || 0), 0)

  const columns = [
    {
      key: 'ref',
      label: 'الرقم',
      render: (row) => (
        <Link to={`/shipments/${row.id}`} className="text-accent hover:underline">
          {row.ref_number}
        </Link>
      ),
    },
    { key: 'center_name', label: 'التاجر' },
    { key: 'broker_name', label: 'المخلص', render: (r) => r.broker_name || '—' },
    { key: 'goods_name', label: 'البضاعة', render: (r) => r.goods_name || '—' },
    {
      key: 'entry_date',
      label: 'الدخول',
      render: (row) => formatDate(row.entry_date),
    },
    {
      key: 'total_cost',
      label: 'المجموع الحالي',
      render: (row) => formatCurrency(row.total_cost || 0),
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ]

  return (
    <div>
      <PageHeader
        title="سيارات معلقة (WIP)"
        subtitle={`${pending.length} معلقة + ${complete.length} مكتملة = ${formatCurrency(total)} — لا تدخل اليوميات بعد`}
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card border-warning/30">
          <p className="text-3xl font-bold text-warning">{pending.length}</p>
          <p className="text-sm text-gray-400">معلقة — أقلام ناقصة</p>
        </div>
        <div className="card border-accent/30">
          <p className="text-3xl font-bold text-accent">{complete.length}</p>
          <p className="text-sm text-gray-400">مكتملة — جاهزة للترحيل</p>
        </div>
      </div>

      {l1 || l2 ? (
        <p className="text-gray-500">جاري التحميل...</p>
      ) : (
        <DataTable columns={columns} rows={all} emptyMessage="لا توجد سيارات WIP" />
      )}
    </div>
  )
}
