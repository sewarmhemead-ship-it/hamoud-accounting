import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { centersApi } from '../api'
import PageHeader from '../components/PageHeader'
import { formatCurrency, formatDate } from '../utils/format'
import { useUiStore } from '../store/auth.store'

const STATE_BADGE = {
  postable: 'bg-accent-muted text-accent',
  incomplete: 'bg-warning/20 text-warning',
  posted: 'bg-success/20 text-success',
  delivered: 'bg-green-500/20 text-green-400',
}

export default function BrokerStatementPage() {
  const [centerId, setCenterId] = useState('')
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)

  const { data: centersData } = useQuery({
    queryKey: ['centers', 'broker'],
    queryFn: () => centersApi.list({ type: 'broker', limit: 200 }),
  })
  const brokers = centersData?.data || []

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['clearance-statement', centerId],
    queryFn: () => centersApi.clearanceStatement(centerId),
    enabled: !!centerId,
  })
  const stmt = data?.data

  const postMutation = useMutation({
    mutationFn: () => centersApi.postReady(centerId),
    onSuccess: (res) => {
      const ok = res.data.results?.length || 0
      const fail = res.data.errors?.length || 0
      showToast(`تم ترحيل ${ok} سيارة${fail ? ` — فشل ${fail}` : ''}`, ok ? 'success' : 'error')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['centers'] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const cols = stmt?.columns || []
  const rows = stmt?.rows || []
  const hasTrader = rows.some((r) => r.kind === 'truck' && r.trader)

  return (
    <div>
      <PageHeader
        title="كشف المخلص"
        subtitle="نفس ترتيبة كشف التخليص: سيارات ودفعات بالتاريخ، مع المجموع والرصيد"
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
        <div className="card text-center text-gray-500 py-10">
          اختر مخلصاً لعرض كشفه
        </div>
      )}

      {centerId && isLoading && <p className="text-gray-500">جاري التحميل...</p>}

      {stmt && (
        <div className="space-y-5">
          {/* بطاقات الرصيد و WIP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">الرصيد ({stmt.totals.direction})</p>
              <p
                className={`text-2xl font-bold ${
                  stmt.totals.we_owe ? 'text-danger' : 'text-success'
                }`}
              >
                {formatCurrency(stmt.totals.abs_balance)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                مجموع {formatCurrency(stmt.totals.charges_posted)} − دفعات{' '}
                {formatCurrency(stmt.totals.payments_total)}
              </p>
            </div>

            <div className="card">
              <p className="text-xs text-gray-500 mb-1">قابلة للترحيل</p>
              <p className="text-2xl font-bold text-accent">
                {stmt.wip.postable.count}{' '}
                <span className="text-sm text-gray-500 font-normal">سيارة</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {formatCurrency(stmt.wip.postable.total)}
              </p>
              <button
                type="button"
                className="btn-success mt-2 w-full text-sm"
                disabled={stmt.wip.postable.count === 0 || postMutation.isPending}
                onClick={() => postMutation.mutate()}
              >
                ترحيل القابل للترحيل ({stmt.wip.postable.count})
              </button>
            </div>

            <div className="card">
              <p className="text-xs text-gray-500 mb-1">غير مكتملة</p>
              <p className="text-2xl font-bold text-warning">
                {stmt.wip.incomplete.count}{' '}
                <span className="text-sm text-gray-500 font-normal">سيارة</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                ينقصها أقلام إلزامية — لا تُرحَّل
              </p>
            </div>
          </div>

          {/* السيارات غير المكتملة */}
          {stmt.wip.incomplete.count > 0 && (
            <div className="card">
              <p className="text-sm font-medium text-warning mb-2">أقلام ناقصة</p>
              <div className="space-y-1">
                {stmt.wip.incomplete.rows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <Link to={`/shipments/${r.id}`} className="text-accent hover:underline">
                      {r.ref_number} — {r.goods_name || '—'}
                    </Link>
                    <span className="text-gray-500 text-xs">
                      ينقص: {r.missing.join('، ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* الكشف على نمط Excel */}
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 border-b border-surface-border bg-surface/50">
                  <th className="py-3 px-3 text-right">م</th>
                  <th className="py-3 px-3 text-right">التاريخ</th>
                  <th className="py-3 px-3 text-right">البيان</th>
                  {hasTrader && <th className="py-3 px-3 text-right">التاجر</th>}
                  {cols.map((c) => (
                    <th key={c.key} className="py-3 px-3 text-left">
                      {c.label}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-left">المجموع</th>
                  <th className="py-3 px-3 text-left">الدفعات</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5 + cols.length + (hasTrader ? 1 : 0)}
                      className="py-8 text-center text-gray-500"
                    >
                      لا توجد سيارات مُرحَّلة أو دفعات بعد
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr
                    key={`${r.kind}-${r.id ?? i}`}
                    className={`border-b border-surface-border/50 hover:bg-surface-hover/50 ${
                      r.kind === 'payment' ? 'bg-success/5' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-right text-gray-500">{i + 1}</td>
                    <td className="py-2.5 px-3 text-right">{formatDate(r.date)}</td>
                    <td className="py-2.5 px-3 text-right">
                      {r.kind === 'truck' ? (
                        <Link
                          to={`/shipments/${r.id}`}
                          className="text-accent hover:underline"
                        >
                          {r.goods_name || r.ref_number}
                        </Link>
                      ) : (
                        <span className="text-gray-300">{r.label}</span>
                      )}
                    </td>
                    {hasTrader && (
                      <td className="py-2.5 px-3 text-right text-gray-400">
                        {r.kind === 'truck' ? r.trader || '—' : ''}
                      </td>
                    )}
                    {cols.map((c) => (
                      <td key={c.key} className="py-2.5 px-3 text-left text-gray-300">
                        {r.kind === 'truck' && r.costs[c.key]
                          ? formatCurrency(r.costs[c.key])
                          : ''}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-left font-medium">
                      {r.kind === 'truck' ? formatCurrency(r.total) : ''}
                    </td>
                    <td className="py-2.5 px-3 text-left text-success">
                      {r.kind === 'payment' ? formatCurrency(r.amount) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-surface-border font-bold bg-surface/50">
                    <td
                      colSpan={3 + (hasTrader ? 1 : 0) + cols.length}
                      className="py-3 px-3 text-right"
                    >
                      اجمالي العمليات الحسابية
                    </td>
                    <td className="py-3 px-3 text-left">
                      {formatCurrency(stmt.totals.charges_posted)}
                    </td>
                    <td className="py-3 px-3 text-left text-success">
                      {formatCurrency(stmt.totals.payments_total)}
                    </td>
                  </tr>
                  <tr className="font-bold">
                    <td
                      colSpan={3 + (hasTrader ? 1 : 0) + cols.length}
                      className="py-3 px-3 text-right"
                    >
                      الرصيد — {stmt.totals.direction}
                    </td>
                    <td
                      colSpan={2}
                      className={`py-3 px-3 text-left ${
                        stmt.totals.we_owe ? 'text-danger' : 'text-success'
                      }`}
                    >
                      {formatCurrency(stmt.totals.abs_balance)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
