import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { reportsApi, profitApi, centersApi } from '../api'
import PageHeader from '../components/PageHeader'
import BalanceCard from '../components/BalanceCard'
import { formatCurrency, todayISO } from '../utils/format'

export default function ReportsPage() {
  const [date, setDate] = useState(todayISO())

  const { data: dailyRes } = useQuery({
    queryKey: ['reports', 'daily', date],
    queryFn: () => reportsApi.dailySummary(date),
  })

  const { data: lookupsRes } = useQuery({
    queryKey: ['lookups'],
    queryFn: () => reportsApi.lookups(),
  })

  const { data: centersRes } = useQuery({
    queryKey: ['centers'],
    queryFn: () => centersApi.list({ limit: 200 }),
  })

  const [year, month] = date.split('-')
  const { data: monthlyRes } = useQuery({
    queryKey: ['profit', 'monthly', year, month],
    queryFn: () => profitApi.monthly(parseInt(year, 10), parseInt(month, 10)),
  })

  const preview = dailyRes?.data?.preview
  const closed = dailyRes?.data?.closed
  const monthly = monthlyRes?.data
  const traders = centersRes?.data?.filter((c) => c.type === 'trader') || []

  return (
    <div className="space-y-6">
      <PageHeader title="التقارير" subtitle="ملخص يومي، شهري، ومراجع النظام" />

      <div>
        <label className="label">التاريخ</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BalanceCard title="إيراد مرحّل" value={preview?.gross_revenue || 0} variant="accent" />
        <BalanceCard title="دفعات" value={preview?.payments_received || 0} variant="positive" />
        <BalanceCard title="سيارات" value={preview?.num_trucks || 0} format="number" />
        <BalanceCard title="صافي (مُغلق)" value={closed?.net_profit ?? 0} variant={closed ? 'positive' : 'default'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-white mb-4">ملخص الشهر</h3>
          {monthly?.days_count > 0 ? (
            <dl className="space-y-2 text-sm">
              <Item label="أيام مُغلقة" value={monthly.days_count} />
              <Item label="صافي الشهر" value={formatCurrency(monthly.net_profit)} bold />
              <Item label="إيراد" value={formatCurrency(monthly.gross_profit)} />
              <Item label="مصاريف" value={formatCurrency(monthly.office_expenses + monthly.home_expenses)} />
            </dl>
          ) : (
            <p className="text-gray-500 text-sm">لا توجد أيام مُغلقة</p>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-white mb-4">مراجع النظام</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-500 mb-1">العملات</dt>
              <dd className="flex gap-2 flex-wrap">
                {lookupsRes?.data?.currencies?.map((c) => (
                  <span key={c.code} className="px-2 py-0.5 rounded bg-surface text-gray-300">{c.code}</span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-1">المعابر</dt>
              <dd className="text-gray-300">{lookupsRes?.data?.borders?.map((b) => b.name).join(' · ')}</dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-1">أنواع البضائع</dt>
              <dd className="text-gray-300">{lookupsRes?.data?.goods_types?.map((g) => g.name).join(' · ')}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-white mb-4">كشوف واتساب — التجار</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {traders.map((t) => (
            <Link
              key={t.id}
              to={`/centers/${t.id}`}
              className="p-3 rounded-lg bg-surface hover:bg-surface-hover text-sm text-gray-300"
            >
              {t.name} <span className="text-gray-600">({t.code})</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function Item({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? 'text-white font-bold' : 'text-gray-400'}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
