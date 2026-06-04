import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '../api'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import CenterTypeBadge from '../components/CenterTypeBadge'
import { formatCurrency, todayISO } from '../utils/format'
import { useUiStore } from '../store/auth.store'

export default function InventoryPage() {
  const [date, setDate] = useState(todayISO())
  const [label, setLabel] = useState('')
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['inventory', date],
    queryFn: () => inventoryApi.getByDate(date),
    retry: false,
  })

  const createMutation = useMutation({
    mutationFn: () => inventoryApi.createSnapshot({ snapshot_date: date, label: label || undefined }),
    onSuccess: () => {
      showToast('تم إنشاء لقطة الجرد', 'success')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const snapshots = data?.data || []
  const totals = snapshots.reduce(
    (acc, s) => ({
      balance: acc.balance + s.balance,
      posted: acc.posted + s.posted_undelivered,
      wip: acc.wip + s.wip_value,
      total: acc.total + s.total,
    }),
    { balance: 0, posted: 0, wip: 0, total: 0 }
  )

  const columns = [
    { key: 'center_name', label: 'المركز' },
    {
      key: 'category',
      label: 'التصنيف',
      render: (r) => <CenterTypeBadge type={r.center_type} />,
    },
    {
      key: 'balance',
      label: 'رصيد',
      render: (r) => formatCurrency(r.balance),
    },
    {
      key: 'posted_undelivered',
      label: 'جارية',
      render: (r) => formatCurrency(r.posted_undelivered),
    },
    {
      key: 'wip_value',
      label: 'WIP',
      render: (r) => formatCurrency(r.wip_value),
    },
    {
      key: 'total',
      label: 'الذمة',
      render: (r) => <span className="text-success font-medium">{formatCurrency(r.total)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="الجرد الدوري"
        subtitle="لقطة في لحظة زمنية — balance + posted_undelivered = total"
        actions={
          <button
            type="button"
            className="btn-primary"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            + لقطة جرد جديدة
          </button>
        }
      />

      <div className="card flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">تاريخ الجرد</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">تسمية (اختياري)</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="جرد نهاية الشهر" />
        </div>
      </div>

      {snapshots.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <MiniStat label="رصيد" value={formatCurrency(totals.balance)} />
          <MiniStat label="جارية" value={formatCurrency(totals.posted)} />
          <MiniStat label="WIP" value={formatCurrency(totals.wip)} />
          <MiniStat label="إجمالي الذمم" value={formatCurrency(totals.total)} highlight />
        </div>
      )}

      {isFetching ? (
        <p className="text-gray-500">جاري التحميل...</p>
      ) : (
        <DataTable columns={columns} rows={snapshots} emptyMessage="لا يوجد جرد لهذا التاريخ — أنشئ لقطة جديدة" />
      )}
    </div>
  )
}

function MiniStat({ label, value, highlight }) {
  return (
    <div className={`card ${highlight ? 'border-success/30' : ''}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-success' : 'text-white'}`}>{value}</p>
    </div>
  )
}
