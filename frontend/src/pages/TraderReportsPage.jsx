import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { centersApi } from '../api'
import { formatCurrency, formatDate } from '../utils/format'
import { downloadBlob } from '../utils/download'
import { useUiStore } from '../store/auth.store'

function DownloadBtns({ centerId, kind, params, label }) {
  const showToast = useUiStore((s) => s.showToast)
  const [busy, setBusy] = useState('')

  const download = async (fmt) => {
    setBusy(fmt)
    try {
      const blob = await centersApi.reportBlob(centerId, `${kind}.${fmt}`, params)
      downloadBlob(blob, `${label}.${fmt}`)
    } catch (e) {
      showToast(e.message || 'تعذّر التصدير', 'error')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="flex gap-2">
      <button type="button" className="btn-success !py-1.5 !px-3 text-xs" disabled={!!busy} onClick={() => download('xlsx')}>
        {busy === 'xlsx' ? '...' : '⬇ Excel'}
      </button>
      <button type="button" className="btn-danger !py-1.5 !px-3 text-xs" disabled={!!busy} onClick={() => download('pdf')}>
        {busy === 'pdf' ? '...' : '⬇ PDF'}
      </button>
    </div>
  )
}

function BatchZip({ params }) {
  const showToast = useUiStore((s) => s.showToast)
  const [busy, setBusy] = useState('')
  const dl = async (kind) => {
    setBusy(kind)
    try {
      const blob = await centersApi.tradersReportZip({ ...params, kind, fmt: 'xlsx' })
      downloadBlob(blob, `${kind === 'profit' ? 'تقارير_ربح' : 'كشوف'}_التجار.zip`)
    } catch (e) {
      showToast(e.message || 'تعذّر التصدير', 'error')
    } finally {
      setBusy('')
    }
  }
  return (
    <div className="flex gap-2">
      <button type="button" className="btn-secondary !py-1.5 !px-3 text-xs" disabled={!!busy} onClick={() => dl('trader')}>
        {busy === 'trader' ? '...' : '🗜 كشوف كل التجار (ZIP)'}
      </button>
      <button type="button" className="btn-secondary !py-1.5 !px-3 text-xs" disabled={!!busy} onClick={() => dl('profit')}>
        {busy === 'profit' ? '...' : '🗜 تقارير الربح (ZIP)'}
      </button>
    </div>
  )
}

export default function TraderReportsPage() {
  const [traderId, setTraderId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: centersRes } = useQuery({
    queryKey: ['centers'],
    queryFn: () => centersApi.list({ limit: 200 }),
  })
  const traders = centersRes?.data?.filter((c) => c.type === 'trader') || []

  const params = {}
  if (from) params.from = from
  if (to) params.to = to

  const { data: traderRes } = useQuery({
    queryKey: ['trader-report', traderId, from, to],
    queryFn: () => centersApi.traderReport(traderId, params),
    enabled: !!traderId,
  })
  const { data: profitRes } = useQuery({
    queryKey: ['profit-report', traderId, from, to],
    queryFn: () => centersApi.profitReport(traderId, params),
    enabled: !!traderId,
  })

  const trader = traderRes?.data
  const profit = profitRes?.data
  const traderName = traders.find((t) => String(t.id) === String(traderId))?.name || 'تاجر'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-ink">تقارير التجار</h2>
          <p className="text-ink-soft text-sm mt-1">
            تقريران منفصلان: كشف حساب للتاجر (بلا تكلفة/ربح)، وتقرير ربح وميزانية داخلي — تصدير Excel و PDF
          </p>
        </div>
        <BatchZip params={params} />
      </div>

      {/* أدوات الاختيار */}
      <div className="card grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="label">التاجر</label>
          <select value={traderId} onChange={(e) => setTraderId(e.target.value)}>
            <option value="">— اختر التاجر —</option>
            {traders.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">من تاريخ</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">إلى تاريخ</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {!traderId && <p className="text-ink-faint text-sm">اختر تاجراً لعرض التقارير وتصديرها.</p>}

      {traderId && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* التقرير الخارجي */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-info">كشف حساب التاجر (خارجي)</h3>
                <p className="text-[11px] text-ink-faint">يُعطى للتاجر — بلا تكلفة أو ربح</p>
              </div>
              <DownloadBtns centerId={traderId} kind="trader" params={params} label={`كشف ${traderName}`} />
            </div>
            {trader && (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="stat-card tone-blue"><p className="text-[11px] text-ink-faint mb-1">الفواتير</p><p className="text-lg font-bold text-info">{formatCurrency(trader.totals.charges)}</p></div>
                  <div className="stat-card tone-green"><p className="text-[11px] text-ink-faint mb-1">الدفعات</p><p className="text-lg font-bold text-success">{formatCurrency(trader.totals.payments)}</p></div>
                  <div className="stat-card tone-gold"><p className="text-[11px] text-ink-faint mb-1">الرصيد</p><p className="text-lg font-bold text-accent">{formatCurrency(trader.totals.balance)}</p></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-ink-faint border-b border-surface-border">
                        <th className="text-right py-2 px-1">التاريخ</th>
                        <th className="text-right py-2 px-1">البضاعة</th>
                        <th className="text-right py-2 px-1">الوجهة</th>
                        <th className="text-left py-2 px-1">المجموع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trader.rows.map((r) => (
                        <tr key={r.id} className="border-b border-surface-border/40">
                          <td className="py-1.5 px-1">{formatDate(r.entry_date)}</td>
                          <td className="py-1.5 px-1">{r.goods_name || '—'}</td>
                          <td className="py-1.5 px-1">{r.destination || '—'}</td>
                          <td className="py-1.5 px-1 text-left">{formatCurrency(r.total)}</td>
                        </tr>
                      ))}
                      {trader.rows.length === 0 && (
                        <tr><td colSpan={4} className="text-center py-4 text-ink-faint">لا سيارات ضمن الفترة</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* التقرير الداخلي */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-accent">الربح والميزانية (داخلي)</h3>
                <p className="text-[11px] text-ink-faint">للشركة فقط — تكلفة مقابل سعر ومربح</p>
              </div>
              <DownloadBtns centerId={traderId} kind="profit" params={params} label={`ربح ${traderName}`} />
            </div>
            {profit && (
              <>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="stat-card tone-red"><p className="text-[10px] text-ink-faint mb-1">التكلفة</p><p className="text-base font-bold text-danger">{formatCurrency(profit.totals.cost)}</p></div>
                  <div className="stat-card tone-blue"><p className="text-[10px] text-ink-faint mb-1">الفاتورة</p><p className="text-base font-bold text-info">{formatCurrency(profit.totals.charges)}</p></div>
                  <div className="stat-card tone-gold"><p className="text-[10px] text-ink-faint mb-1">المربح</p><p className="text-base font-bold text-accent">{formatCurrency(profit.totals.profit)}</p></div>
                  <div className="stat-card tone-green"><p className="text-[10px] text-ink-faint mb-1">الهامش</p><p className="text-base font-bold text-success">{profit.totals.margin_pct}%</p></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-ink-faint border-b border-surface-border">
                        <th className="text-right py-2 px-1">التاريخ</th>
                        <th className="text-right py-2 px-1">المخلص</th>
                        <th className="text-left py-2 px-1">تكلفة</th>
                        <th className="text-left py-2 px-1">فاتورة</th>
                        <th className="text-left py-2 px-1">مربح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profit.rows.map((r) => (
                        <tr key={r.id} className="border-b border-surface-border/40">
                          <td className="py-1.5 px-1">{formatDate(r.entry_date)}</td>
                          <td className="py-1.5 px-1">{r.broker_name || '—'}</td>
                          <td className="py-1.5 px-1 text-left">{formatCurrency(r.cost_total)}</td>
                          <td className="py-1.5 px-1 text-left">{formatCurrency(r.price_total)}</td>
                          <td className={`py-1.5 px-1 text-left font-semibold ${r.profit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(r.profit)}</td>
                        </tr>
                      ))}
                      {profit.rows.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-4 text-ink-faint">لا سيارات ضمن الفترة</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
