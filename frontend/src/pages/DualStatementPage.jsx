import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { centersApi } from '../api'
import PageHeader from '../components/PageHeader'
import { formatCurrency, formatDate } from '../utils/format'

function SideTable({ side, accent, field }) {
  const cols = side.columns || []
  const rows = side.rows || []
  return (
    <div className="card overflow-x-auto p-0">
      <div className={`px-4 py-3 border-b border-surface-border font-semibold ${accent}`}>
        {side.label}
      </div>
      <table className="data-table w-full text-sm whitespace-nowrap">
        <thead>
          <tr>
            <th className="py-2.5 px-2 text-right">م</th>
            <th className="py-2.5 px-2 text-right">التاريخ</th>
            <th className="py-2.5 px-2 text-right">البيان</th>
            {cols.map((c) => (
              <th key={c.key} className="py-2.5 px-2 text-left">
                {c.label}
              </th>
            ))}
            <th className="py-2.5 px-2 text-left">المجموع</th>
            <th className="py-2.5 px-2 text-left">الدفعات</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5 + cols.length} className="py-8 text-center text-ink-soft">
                لا توجد سيارات مُرحَّلة أو دفعات بعد
              </td>
            </tr>
          )}
          {rows.map((r, i) => {
            const cells = r.kind === 'truck' ? r[field] : null
            const total = r.kind === 'truck' ? r[`${field}_total`] : null
            return (
              <tr
                key={`${r.kind}-${r.id ?? i}`}
                className={r.kind === 'payment' ? 'bg-success/5' : ''}
              >
                <td className="py-2 px-2 text-right text-ink-soft">{i + 1}</td>
                <td className="py-2 px-2 text-right">{formatDate(r.date)}</td>
                <td className="py-2 px-2 text-right">
                  {r.kind === 'truck' ? (
                    <Link to={`/shipments/${r.id}`} className="text-accent hover:underline">
                      {r.goods_name || r.ref_number}
                    </Link>
                  ) : (
                    <span className="text-ink">{r.label}</span>
                  )}
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="py-2 px-2 text-left text-ink">
                    {r.kind === 'truck' && cells && cells[c.key]
                      ? formatCurrency(cells[c.key])
                      : ''}
                  </td>
                ))}
                <td className="py-2 px-2 text-left font-medium">
                  {r.kind === 'truck' ? formatCurrency(total) : ''}
                </td>
                <td className="py-2 px-2 text-left text-success">
                  {r.kind === 'payment' ? formatCurrency(r.amount) : ''}
                </td>
              </tr>
            )
          })}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-surface-border font-bold bg-surface/50">
              <td colSpan={3 + cols.length} className="py-2.5 px-2 text-right">
                المجموع
              </td>
              <td className="py-2.5 px-2 text-left">{formatCurrency(side.total_charges)}</td>
              <td className="py-2.5 px-2 text-left text-success">
                {formatCurrency(side.total_payments)}
              </td>
            </tr>
            <tr className="font-bold">
              <td colSpan={3 + cols.length} className="py-2.5 px-2 text-right">
                الرصيد — {side.direction}
              </td>
              <td colSpan={2} className="py-2.5 px-2 text-left text-accent">
                {formatCurrency(side.abs_balance)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export default function DualStatementPage() {
  const [centerId, setCenterId] = useState('')

  const { data: centersData } = useQuery({
    queryKey: ['centers', 'broker'],
    queryFn: () => centersApi.list({ type: 'broker', limit: 200 }),
  })
  const brokers = centersData?.data || []

  const { data, isLoading } = useQuery({
    queryKey: ['dual-statement', centerId],
    queryFn: () => centersApi.dualStatement(centerId),
    enabled: !!centerId,
  })
  const stmt = data?.data
  const profit = stmt?.company_profit

  return (
    <div>
      <PageHeader
        title="كشف مزدوج"
        subtitle="جانب المخلص (ما ندفعه) مقابل جانب التاجر (ما نأخذه) — ومنه مربح الشركة"
        actions={
          <select
            className="w-56"
            value={centerId}
            onChange={(e) => setCenterId(e.target.value)}
          >
            <option value="">— اختر المخلص —</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        }
      />

      {!centerId && (
        <div className="card text-center text-ink-soft py-10">
          اختر مخلصاً لعرض الكشف المزدوج
        </div>
      )}

      {centerId && isLoading && <p className="text-ink-soft">جاري التحميل...</p>}

      {stmt && (
        <div className="space-y-5">
          {/* بانر مربح الشركة */}
          <div className="card bg-gradient-to-l from-accent/10 to-transparent border-accent/30">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div>
                <p className="text-xs text-ink-soft mb-1">مربح الشركة الإجمالي</p>
                <p
                  className={`text-3xl font-bold ${
                    profit.total >= 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  {formatCurrency(profit.total)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-soft mb-1">متوسط مربح السيارة</p>
                <p className="text-2xl font-bold text-accent">
                  {formatCurrency(profit.per_truck_avg)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-soft mb-1">عدد السيارات المُرحَّلة</p>
                <p className="text-2xl font-bold">
                  {profit.truck_count}{' '}
                  <span className="text-sm text-ink-soft font-normal">سيارة</span>
                </p>
              </div>
            </div>
            <p className="text-xs text-ink-faint mt-3">
              فاتورة التاجر {formatCurrency(stmt.trader_side.total_charges)} − تكلفة المخلص{' '}
              {formatCurrency(stmt.broker_side.total_charges)} ={' '}
              {formatCurrency(profit.total)}
            </p>
          </div>

          {/* الجانبان */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <SideTable side={stmt.broker_side} accent="text-danger" field="cost" />
            <SideTable side={stmt.trader_side} accent="text-success" field="price" />
          </div>
        </div>
      )}
    </div>
  )
}
