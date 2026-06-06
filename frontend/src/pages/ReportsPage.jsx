import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { centersApi, reportsApi } from '../api'
import { PERM } from '../constants/permissions'
import { useAuthStore } from '../store/auth.store'
import { formatCurrency, formatDate, todayISO } from '../utils/format'
import { defaultReportRange, isValidReportRange } from '../utils/reportRange'
import { SHIPMENT_STATUS } from '../constants'
import GlassPanel from '../components/ui/GlassPanel'
import ReportExportButtons from '../components/ReportExportButtons'
import StatusBadge from '../components/StatusBadge'
import PageHeader from '../components/PageHeader'

const REPORT_TYPES = [
  {
    id: 'daily',
    label: 'تقرير المربح اليومي',
    desc: 'يوم واحد — معاينة أو مُغلق (نفس تقرير صفحة المربح)',
    needsTrader: false,
    singleDate: true,
  },
  {
    id: 'period',
    label: 'ملخص الفترة المحاسبي',
    desc: 'أيام مُغلقة + شحنات حسب تاريخ الدخول',
    needsTrader: false,
  },
  {
    id: 'trader',
    label: 'كشف حساب تاجر',
    desc: 'فواتير ودفعات للتاجر — بدون تكلفة أو ربح (للإرسال للتاجر)',
    needsTrader: true,
  },
  {
    id: 'profit',
    label: 'تقرير ربح تاجر',
    desc: 'تكلفة، فاتورة، ومربح الشركة — داخلي',
    needsTrader: true,
  },
]

export default function ReportsPage() {
  const defaults = useMemo(() => defaultReportRange(), [])
  const [reportType, setReportType] = useState('period')
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [traderId, setTraderId] = useState('')
  const [dailyDate, setDailyDate] = useState(todayISO())

  const rangeOk = isValidReportRange(from, to)
  const params = rangeOk ? { from, to } : null
  const typeMeta = REPORT_TYPES.find((t) => t.id === reportType)

  const { data: centersRes } = useQuery({
    queryKey: ['centers'],
    queryFn: () => centersApi.list({ limit: 200 }),
  })
  const traders = centersRes?.data?.filter((c) => c.type === 'trader') || []

  const { data: periodRes, isLoading: periodLoading, error: periodError } = useQuery({
    queryKey: ['reports', 'period', from, to],
    queryFn: () => reportsApi.period(params),
    enabled: reportType === 'period' && !!params,
  })

  const { data: traderRes, isLoading: traderLoading } = useQuery({
    queryKey: ['reports', 'trader', traderId, from, to],
    queryFn: () => centersApi.traderReport(traderId, params),
    enabled: reportType === 'trader' && !!params && !!traderId,
  })

  const { data: profitRes, isLoading: profitLoading } = useQuery({
    queryKey: ['reports', 'profit', traderId, from, to],
    queryFn: () => centersApi.profitReport(traderId, params),
    enabled: reportType === 'profit' && !!params && !!traderId,
  })

  const { data: dailyRes, isLoading: dailyLoading } = useQuery({
    queryKey: ['reports', 'daily', dailyDate],
    queryFn: () => reportsApi.dailySummary(dailyDate),
    enabled: reportType === 'daily' && !!dailyDate,
  })

  const period = periodRes?.data
  const trader = traderRes?.data
  const profit = profitRes?.data
  const daily = dailyRes?.data
  const traderName = traders.find((t) => String(t.id) === String(traderId))?.name || 'تاجر'
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canExportDaily = hasPermission(PERM.PROFIT_VIEW)

  const canPreview =
    (reportType === 'daily' && !!dailyDate) ||
    (rangeOk &&
      (reportType === 'period' ||
        (reportType !== 'period' && reportType !== 'daily' && traderId)))

  const loading =
    (reportType === 'period' && periodLoading) ||
    (reportType === 'trader' && traderLoading) ||
    (reportType === 'profit' && profitLoading) ||
    (reportType === 'daily' && dailyLoading)

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="التقارير"
        subtitle="اختر نوع التقرير والفترة — ثم عاين وصدّر Excel أو PDF"
      />

      <InventoryReportPanel />

      {/* نوع التقرير */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {REPORT_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setReportType(t.id)}
            className={`text-right rounded-2xl p-4 transition-all border ${
              reportType === t.id ? 'border-accent/40' : 'border-transparent'
            }`}
            style={{
              background:
                reportType === t.id
                  ? 'var(--color-accent-muted)'
                  : 'rgba(255,255,255,0.03)',
            }}
          >
            <p className={`font-bold text-sm ${reportType === t.id ? 'text-accent' : 'text-ink'}`}>
              {t.label}
            </p>
            <p className="text-[11px] text-ink-soft mt-1 leading-relaxed">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* التاريخ / الفترة */}
      <GlassPanel
        title={typeMeta?.singleDate ? 'تاريخ التقرير' : 'فترة التقرير'}
        subtitle={
          typeMeta?.singleDate
            ? 'تقرير المربح اليومي — Excel و PDF'
            : 'كل الأرقام مربوطة بهذه التواريخ'
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {typeMeta?.singleDate ? (
            <div>
              <label className="label">تاريخ اليوم</label>
              <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
            </div>
          ) : (
            <>
              <div>
                <label className="label">من تاريخ</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">إلى تاريخ</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}
          {typeMeta?.needsTrader && (
            <div className="sm:col-span-2">
              <label className="label">التاجر</label>
              <select value={traderId} onChange={(e) => setTraderId(e.target.value)}>
                <option value="">— اختر التاجر —</option>
                {traders.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!typeMeta?.singleDate && !rangeOk && (
          <p className="text-sm text-danger mt-3">تحقق من التواريخ: «من» يجب أن يكون قبل «إلى»</p>
        )}

        {typeMeta?.singleDate ? (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            {canExportDaily ? (
              <ReportExportButtons
                filenameBase={`مربح_يومي_${dailyDate}`}
                fetchBlob={(fmt) => reportsApi.dailyProfitBlob(dailyDate, fmt)}
              />
            ) : (
              <p className="text-xs text-ink-faint">تحتاج صلاحية عرض المربح للتصدير</p>
            )}
            <Link to="/profit" className="btn-secondary !py-2 !px-4 text-sm">
              صفحة المربح
            </Link>
          </div>
        ) : (
          <div className="mt-4 p-3 rounded-xl text-[11px] text-ink-soft leading-relaxed"
               style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)' }}>
            <strong className="text-ink">ربط التواريخ:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>ملخص المربح: أيام <code className="text-accent">daily_profit.date</code> (أيام مُغلقة فقط)</li>
              <li>الشحنات: <code className="text-accent">shipments.entry_date</code> (تاريخ دخول السيارة)</li>
              <li>كشف/ربح التاجر: نفس الفترة على الشحنات والدفعات</li>
            </ul>
          </div>
        )}
      </GlassPanel>

      {/* معاينة + تصدير */}
      {canPreview && (
        <GlassPanel
          title={`معاينة: ${typeMeta?.label}`}
          subtitle={
            reportType === 'daily'
              ? formatDate(dailyDate)
              : rangeOk
                ? `${from} → ${to}`
                : ''
          }
          action={
            reportType === 'daily' ? (
              canExportDaily ? (
                <ReportExportButtons
                  disabled={loading}
                  filenameBase={`مربح_يومي_${dailyDate}`}
                  fetchBlob={(fmt) => reportsApi.dailyProfitBlob(dailyDate, fmt)}
                />
              ) : null
            ) : (
              <ReportExportButtons
                disabled={loading}
                filenameBase={
                  reportType === 'period'
                    ? `تقرير_فترة_${from}_${to}`
                    : `${reportType === 'profit' ? 'ربح' : 'كشف'}_${traderName}_${from}`
                }
                fetchBlob={(fmt) => {
                  if (reportType === 'period') {
                    return reportsApi.periodBlob(fmt, params)
                  }
                  const kind = reportType === 'profit' ? 'profit' : 'trader'
                  return centersApi.reportBlob(traderId, `${kind}.${fmt}`, params)
                }}
              />
            )
          }
        >
          {loading && <p className="text-sm text-ink-soft py-8 text-center">جاري تحميل التقرير...</p>}

          {periodError && reportType === 'period' && (
            <p className="text-sm text-danger">{periodError.message}</p>
          )}

          {!loading && reportType === 'daily' && daily && (
            <DailyProfitPreview data={daily} date={dailyDate} />
          )}

          {!loading && reportType === 'period' && period && (
            <PeriodPreview data={period} />
          )}

          {!loading && reportType === 'trader' && trader && (
            <TraderPreview data={trader} external />
          )}

          {!loading && reportType === 'profit' && profit && (
            <TraderPreview data={profit} external={false} />
          )}

          {!loading && reportType !== 'period' && !traderId && (
            <p className="text-sm text-ink-soft text-center py-6">اختر تاجراً لعرض التقرير</p>
          )}
        </GlassPanel>
      )}
    </div>
  )
}

function DailyProfitPreview({ data, date }) {
  const closed = data.closed
  const preview = data.preview || {}
  const isClosed = !!closed

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <span
          className="pill text-xs"
          style={
            isClosed
              ? { background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }
              : { background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.28)' }
          }
        >
          {isClosed ? 'يوم مُغلق' : 'معاينة — لم يُغلق بعد'}
        </span>
        <span className="text-xs text-ink-faint">{formatDate(date)}</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="سيارات مُرحَّلة" value={preview.num_trucks ?? closed?.num_trucks ?? 0} format="number" />
        <MiniStat
          label="إيراد التخليص"
          value={isClosed ? closed?.gross_profit : preview.gross_revenue ?? preview.gross_profit}
        />
        {isClosed && (
          <>
            <MiniStat label="مصاريف مكتب" value={closed.office_expenses} />
            <MiniStat label="صافي اليوم" value={closed.net_profit} tone="success" />
          </>
        )}
      </div>
      {!isClosed && (
        <p className="text-xs text-ink-soft">
          التصدير يتضمن المعاينة الحية. لإغلاق اليوم انتقل إلى{' '}
          <Link to="/profit" className="text-accent hover:underline">
            المربح اليومي
          </Link>
          .
        </p>
      )}
    </div>
  )
}

function PeriodPreview({ data }) {
  const st = data.shipments.by_status
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="أيام مُغلقة" value={data.profit.totals.days_count} format="number" />
        <MiniStat label="إيراد الفترة" value={data.profit.totals.gross_profit} />
        <MiniStat label="صافي الفترة" value={data.profit.totals.net_profit} tone="success" />
        <MiniStat label="شحنات (دخول)" value={data.shipments.totals.count} format="number" />
      </div>

      <div>
        <h4 className="text-sm font-bold text-ink mb-2">الأيام المُغلقة</h4>
        {data.profit.days.length === 0 ? (
          <p className="text-xs text-ink-faint">لا توجد أيام مُغلقة في هذه الفترة</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-soft text-xs border-b border-surface-border">
                  <th className="py-2 text-right">التاريخ</th>
                  <th className="py-2">سيارات</th>
                  <th className="py-2">إيراد</th>
                  <th className="py-2">صافي</th>
                </tr>
              </thead>
              <tbody>
                {data.profit.days.map((d) => (
                  <tr key={d.date} className="border-b border-surface-border/50 text-ink">
                    <td className="py-2">{formatDate(d.date)}</td>
                    <td className="py-2 text-center">{d.num_trucks}</td>
                    <td className="py-2">{formatCurrency(d.gross_profit)}</td>
                    <td className="py-2 text-success">{formatCurrency(d.net_profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-bold text-ink mb-2">الشحنات حسب الحالة (تاريخ الدخول)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {['pending', 'posted', 'delivered'].map((key) => (
            <div key={key} className="rounded-xl p-3 text-center" style={{ border: '1px solid var(--color-border)' }}>
              <p className="text-lg font-bold text-ink">{st[key]?.count || 0}</p>
              <p className="text-[10px] text-ink-soft">{SHIPMENT_STATUS[key]?.label}</p>
              <p className="text-xs text-accent mt-1">{formatCurrency(st[key]?.total || 0)}</p>
            </div>
          ))}
        </div>
        {data.shipments.rows.length > 0 && (
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-ink-soft border-b border-surface-border">
                  <th className="py-2 text-right">تاريخ</th>
                  <th className="py-2">رقم</th>
                  <th className="py-2">تاجر</th>
                  <th className="py-2">حالة</th>
                  <th className="py-2">مجموع</th>
                </tr>
              </thead>
              <tbody>
                {data.shipments.rows.slice(0, 15).map((s) => (
                  <tr key={s.id} className="border-b border-surface-border/50">
                    <td className="py-1.5">{formatDate(s.entry_date)}</td>
                    <td className="py-1.5 font-mono text-accent">{s.ref_number}</td>
                    <td className="py-1.5">{s.center_name}</td>
                    <td className="py-1.5"><StatusBadge status={s.status} /></td>
                    <td className="py-1.5">{formatCurrency(s.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.shipments.rows.length > 15 && (
              <p className="text-[10px] text-ink-faint mt-2">عرض 15 من {data.shipments.rows.length} — التفاصيل في Excel</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TraderPreview({ data, external }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink">
        <strong>{data.center.name}</strong>
        <span className="text-ink-soft"> — {data.rows.length} سيارة في الفترة</span>
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="فواتير (لنا)" value={data.totals.charges} />
        {!external && (
          <>
            <MiniStat label="تكلفة" value={data.totals.cost} />
            <MiniStat label="مربح" value={data.totals.profit} tone="success" />
            <MiniStat label="هامش %" value={data.totals.margin_pct} format="number" />
          </>
        )}
        <MiniStat label="دفعات" value={data.totals.payments} />
        <MiniStat label="الرصيد" value={data.totals.balance} />
      </div>
      {data.rows.length > 0 && (
        <div className="overflow-x-auto max-h-48 text-xs">
          <table className="w-full">
            <thead>
              <tr className="text-ink-soft border-b border-surface-border">
                <th className="py-2 text-right">تاريخ</th>
                <th className="py-2">رقم</th>
                <th className="py-2">بضاعة</th>
                <th className="py-2">مجموع</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.slice(0, 10).map((r) => (
                <tr key={r.id} className="border-b border-surface-border/50">
                  <td className="py-1.5">{formatDate(r.entry_date)}</td>
                  <td className="py-1.5 font-mono">{r.ref_number}</td>
                  <td className="py-1.5">{r.goods_name || '—'}</td>
                  <td className="py-1.5">
                    {formatCurrency(external ? r.price_total : r.price_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function InventoryReportPanel() {
  const defaults = useMemo(() => defaultReportRange(), [])
  const [invDate, setInvDate] = useState(todayISO())
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const rangeOk = isValidReportRange(from, to)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canExport =
    hasPermission(PERM.INVENTORY_MANAGE) || hasPermission(PERM.REPORTS_EXPORT)

  return (
    <GlassPanel className="!p-4 space-y-4">
      <div>
        <p className="font-semibold text-ink">جرد الذمم — Excel / PDF</p>
        <p className="text-xs text-ink-faint mt-1">يوم واحد أو فترة — مرتبط بكشف المركز</p>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">يوم واحد</label>
          <input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} />
        </div>
        {canExport ? (
          <ReportExportButtons
            filenameBase={`جرد_${invDate}`}
            fetchBlob={(fmt) => reportsApi.inventoryBlob(invDate, fmt)}
          />
        ) : null}
      </div>
      <div className="border-t border-surface-border pt-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">من</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">إلى</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {canExport && rangeOk ? (
          <ReportExportButtons
            filenameBase={`جرد_${from}_${to}`}
            fetchBlob={(fmt) => reportsApi.inventoryRangeBlob(fmt, { from, to })}
            xlsxLabel="Excel فترة"
            pdfLabel="PDF فترة"
          />
        ) : null}
        <Link to="/inventory" className="btn-secondary !py-2 !px-4 text-sm mr-auto">
          صفحة الجرد
        </Link>
      </div>
    </GlassPanel>
  )
}

function MiniStat({ label, value, format = 'currency', tone }) {
  const display =
    format === 'number' ? Number(value || 0).toLocaleString('en-US') : formatCurrency(value)
  return (
    <div className="rounded-xl p-3" style={{ border: '1px solid var(--color-border)' }}>
      <p className="text-[10px] text-ink-soft">{label}</p>
      <p className={`text-lg font-bold mt-1 ${tone === 'success' ? 'text-success' : 'text-ink'}`}>
        {display}
        {format === 'number' && tone !== 'success' ? '' : ''}
      </p>
    </div>
  )
}
