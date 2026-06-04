import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { shipmentsApi } from '../api'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { formatCurrency, formatDate } from '../utils/format'
import { useUiStore } from '../store/auth.store'

export default function ReadyToPostPage() {
  const [selected, setSelected] = useState(new Set())
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['shipments', 'ready'],
    queryFn: () => shipmentsApi.ready({ limit: 200 }),
  })

  const bulkMutation = useMutation({
    mutationFn: (ids) => shipmentsApi.bulkPost(ids),
    onSuccess: (res) => {
      const ok = res.data.results?.length || 0
      const fail = res.data.errors?.length || 0
      showToast(`تم ترحيل ${ok} سيارة${fail ? ` — فشل ${fail}` : ''}`, ok ? 'success' : 'error')
      setSelected(new Set())
      refetch()
      queryClient.invalidateQueries({ queryKey: ['centers'] })
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const rows = data?.data || []
  const total = rows.reduce((s, r) => s + (r.total_cost || 0), 0)

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const columns = [
    {
      key: 'select',
      label: '',
      render: (row) => (
        <input
          type="checkbox"
          checked={selected.has(row.id)}
          onChange={() => toggle(row.id)}
        />
      ),
    },
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
    { key: 'goods_name', label: 'البضاعة' },
    {
      key: 'entry_date',
      label: 'الدخول',
      render: (row) => formatDate(row.entry_date),
    },
    {
      key: 'total_cost',
      label: 'المجموع',
      render: (row) => formatCurrency(row.total_cost),
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
        title="جاهزة للترحيل"
        subtitle={`${rows.length} سيارة — ${formatCurrency(total)} — اكتملت الأقلام وانتظر قرار الترحيل`}
        actions={
          <button
            type="button"
            className="btn-success"
            disabled={selected.size === 0 || bulkMutation.isPending}
            onClick={() => bulkMutation.mutate([...selected])}
          >
            ترحيل المحدّد ({selected.size})
          </button>
        }
      />

      {isLoading ? (
        <p className="text-gray-500">جاري التحميل...</p>
      ) : (
        <DataTable columns={columns} rows={rows} emptyMessage="لا توجد سيارات جاهزة للترحيل" />
      )}
    </div>
  )
}
