import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { centersApi, shipmentsApi, profitApi, reportsApi } from '../api'
import BalanceCard from '../components/BalanceCard'
import StatusBadge from '../components/StatusBadge'
import ShipmentLifecycle from '../components/ShipmentLifecycle'
import { formatCurrency, todayISO } from '../utils/format'

export default function DashboardPage() {
  const today = todayISO()

  const { data: centersRes } = useQuery({
    queryKey: ['centers'],
    queryFn: () => centersApi.list({ limit: 200 }),
  })

  const { data: pendingRes } = useQuery({
    queryKey: ['shipments', 'pending'],
    queryFn: () => shipmentsApi.list({ status: 'pending', limit: 100 }),
  })

  const { data: completeRes } = useQuery({
    queryKey: ['shipments', 'complete'],
    queryFn: () => shipmentsApi.list({ status: 'complete', limit: 100 }),
  })

  const { data: postedRes } = useQuery({
    queryKey: ['shipments', 'posted'],
    queryFn: () => shipmentsApi.list({ status: 'posted', limit: 100 }),
  })

  const { data: profitRes } = useQuery({
    queryKey: ['profit', 'preview', today],
    queryFn: () => profitApi.preview(today),
  })

  const { data: dailyRes } = useQuery({
    queryKey: ['reports', 'daily', today],
    queryFn: () => reportsApi.dailySummary(today),
  })

  const centers = centersRes?.data || []
  const traders = centers.filter((c) => c.type === 'trader')
  const brokers = centers.filter((c) => c.type === 'broker')
  const pending = pendingRes?.data || []
  const complete = completeRes?.data || []
  const posted = postedRes?.data || []
  const preview = profitRes?.data
  const closed = dailyRes?.data?.closed

  const wipValue = [...pending, ...complete].reduce((s, x) => s + (x.total_cost || 0), 0)
  const postedValue = posted.reduce((s, x) => s + (x.total_cost || 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BalanceCard icon="🚛" title="إيراد مرحّل اليوم" value={preview?.gross_revenue || 0} variant="accent" subtitle={`${preview?.num_trucks || 0} سيارة مرحّلة`} />
        <BalanceCard icon="✅" title="سيارات مرحّلة" value={preview?.num_trucks || 0} format="number" variant="positive" subtitle="اليوم" />
        <BalanceCard icon="⏳" title="WIP (معلقة+مكتملة)" value={wipValue} variant="warning" subtitle={`${pending.length + complete.length} سيارة`} />
        <BalanceCard icon="📦" title="جارية غير مسلّمة" value={postedValue} variant="danger" subtitle={`${posted.length} سيارة`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ShipmentLifecycle currentStatus="pending" />

          <div className="grid grid-cols-3 gap-4">
            <Link to="/shipments/wip" className="card hover:border-warning/50 transition-colors">
              <p className="text-2xl font-bold text-warning">{pending.length}</p>
              <p className="text-sm text-gray-400">معلقة</p>
            </Link>
            <Link to="/shipments/ready" className="card hover:border-accent/50 transition-colors">
              <p className="text-2xl font-bold text-accent">{complete.length}</p>
              <p className="text-sm text-gray-400">جاهزة للترحيل</p>
            </Link>
            <Link to="/shipments?status=posted" className="card hover:border-success/50 transition-colors">
              <p className="text-2xl font-bold text-success">{posted.length}</p>
              <p className="text-sm text-gray-400">مرحّلة غير مسلّمة</p>
            </Link>
          </div>

          {complete.length > 0 && (
            <div className="card border-accent/30">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-accent">⚠️ {complete.length} سيارة تنتظر الترحيل</h3>
                <Link to="/shipments/ready" className="text-sm text-accent hover:underline">ترحيل →</Link>
              </div>
              <ul className="space-y-2 text-sm">
                {complete.slice(0, 3).map((s) => (
                  <li key={s.id} className="flex justify-between text-gray-400">
                    <Link to={`/shipments/${s.id}`} className="text-gray-200 hover:text-accent">{s.ref_number}</Link>
                    <span>{formatCurrency(s.total_cost)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-white mb-3">المراكز</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-lg bg-surface">
                <p className="text-xl font-bold text-white">{traders.length}</p>
                <p className="text-xs text-gray-500">تجار</p>
              </div>
              <div className="p-3 rounded-lg bg-surface">
                <p className="text-xl font-bold text-white">{brokers.length}</p>
                <p className="text-xs text-gray-500">مخلصون</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-white mb-3">اليوم</h3>
            {closed ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">صافي المربح</span>
                  <span className="text-success font-bold">{formatCurrency(closed.net_profit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">مصاريف مكتب</span>
                  <span>{formatCurrency(closed.office_expenses)}</span>
                </div>
                <p className="text-xs text-success">✓ اليوم مُغلق</p>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-gray-400">
                <p>اليوم لم يُغلق بعد</p>
                <Link to="/profit" className="text-accent hover:underline">إغلاق اليوم →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
