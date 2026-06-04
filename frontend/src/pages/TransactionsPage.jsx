import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { transactionsApi } from '../api'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import { TX_TYPE } from '../constants'
import { formatCurrency, formatDate } from '../utils/format'

export default function TransactionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionsApi.list({ limit: 100 }),
  })

  const rows = data?.data || []

  const columns = [
    {
      key: 'ref',
      label: 'الرقم',
      render: (r) => <span className="text-gray-400 font-mono text-xs">{r.ref_number}</span>,
    },
    {
      key: 'date',
      label: 'التاريخ',
      render: (r) => formatDate(r.date),
    },
    {
      key: 'center',
      label: 'المركز',
      render: (r) => (
        <Link to={`/centers/${r.center_id}`} className="text-accent hover:underline">
          {r.center_name || r.center_id}
        </Link>
      ),
    },
    {
      key: 'type',
      label: 'النوع',
      render: (r) => {
        const cfg = TX_TYPE[r.type] || {}
        return <span className={cfg.color}>{cfg.label}</span>
      },
    },
    {
      key: 'category',
      label: 'التصنيف',
      render: (r) => <span className="text-gray-500">{r.category || '—'}</span>,
    },
    {
      key: 'amount',
      label: 'المبلغ',
      render: (r) => {
        const cfg = TX_TYPE[r.type] || {}
        return <span className={`font-medium ${cfg.color}`}>{cfg.sign}{formatCurrency(r.amount_usd)}</span>
      },
    },
    {
      key: 'delivered',
      label: 'مسلّم',
      render: (r) => (r.is_delivered ? '✓' : '⏳'),
    },
    {
      key: 'notes',
      label: 'ملاحظات',
      render: (r) => <span className="text-gray-500 truncate max-w-[150px] block">{r.notes || '—'}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="سجل الحركات"
        subtitle="كل القيود — ص (استحقاق) و و (دفعة)"
      />
      {isLoading ? (
        <p className="text-gray-500">جاري التحميل...</p>
      ) : (
        <DataTable columns={columns} rows={rows} />
      )}
    </div>
  )
}
