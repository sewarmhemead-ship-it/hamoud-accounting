import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { reportsApi, shipmentsApi } from '../api'
import ReportExportButtons from '../components/ReportExportButtons'
import { useAuthStore } from '../store/auth.store'
import { PERM } from '../constants/permissions'
import DashboardSearchPanel from '../components/DashboardSearchPanel'
import NotificationsStrip from '../components/NotificationsStrip'
import ShipmentLifecycle from '../components/ShipmentLifecycle'
import GlassPanel from '../components/ui/GlassPanel'
import KpiStatCard from '../components/ui/KpiStatCard'
import { formatCurrency, formatDate } from '../utils/format'

function Sk({ className = 'h-28' }) {
  return (
    <div
      className={`${className} rounded-2xl animate-pulse glass-panel`}
      style={{ background: 'rgba(255,255,255,0.03)' }}
    />
  )
}

export default function DashboardPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canExportInv =
    hasPermission(PERM.INVENTORY_MANAGE) || hasPermission(PERM.REPORTS_EXPORT)

  const { data: dashRes, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard(),
    staleTime: 60_000,
  })

  const { data: readyRes } = useQuery({
    queryKey: ['shipments', 'ready', 'dashboard-queue'],
    queryFn: () => shipmentsApi.ready({ limit: 5 }),
    enabled: !!dashRes?.data,
    staleTime: 60_000,
  })

  const d = dashRes?.data
  const readyList = readyRes?.data || []

  if (isLoading || !d) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Sk key={i} />
          ))}
        </div>
        <Sk className="h-72" />
        <div className="grid grid-cols-3 gap-4">
          <Sk className="h-24" />
          <Sk className="h-24" />
          <Sk className="h-24" />
        </div>
      </div>
    )
  }

  const { today, shipments, centers, top_balances, profit_trend, inventory } = d
  const closed7 = profit_trend.filter((x) => x.is_closed)
  const todayNet = closed7.at(-1)?.net_profit ?? null
  const yestNet = closed7.at(-2)?.net_profit ?? null
  const profitDelta =
    todayNet != null && yestNet != null && yestNet !== 0
      ? Math.round(((todayNet - yestNet) / Math.abs(yestNet)) * 100)
      : null

  const wipCount = shipments.pending.count || 0
  const wipVal = shipments.pending.total_value || 0
  const readyCount = shipments.ready_to_post?.count ?? shipments.complete?.count ?? 0
  const pipelineExpenses =
    wipVal + (shipments.posted.total_value || 0)
  const officeToday = today.closed?.office_expenses ?? 0
  const netToday = today.closed?.net_profit ?? todayNet

  const lifecycleCounts = {
    pending: wipCount,
    posted: shipments.posted.count || 0,
    delivered: shipments.delivered?.count || 0,
  }

  return (
    <div className="space-y-5 animate-fade-in">

      <NotificationsStrip />

      {/* ── KPI ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiStatCard
          icon="📈"
          label="إجمالي الإيراد اليوم"
          value={today.gross_revenue}
          sub={`${today.num_trucks} سيارة • ${today.is_closed ? 'يوم مُغلق ✓' : 'اليوم مفتوح'}`}
          delta={profitDelta}
          tone="accent"
          to="/profit"
        />
        <KpiStatCard
          icon="🚛"
          label="سيارات مرحّلة اليوم"
          value={today.num_trucks}
          format="number"
          sub="مرحّلة في اليوميات"
          tone="success"
          to="/shipments?status=posted"
        />
        <KpiStatCard
          icon="⏳"
          label="WIP (معلقة)"
          value={wipVal}
          sub={`${wipCount} سيارة${readyCount ? ` · ${readyCount} جاهزة` : ''}`}
          tone="warning"
          to="/shipments/wip"
        />
        <KpiStatCard
          icon="📦"
          label="قيمة الجارية + WIP"
          value={pipelineExpenses}
          sub={`${shipments.posted.count || 0} مرحّلة غير مُسلّمة`}
          tone="danger"
          to="/shipments?status=posted"
        />
      </div>

      <DashboardSearchPanel />

      {/* ── وسط: مراكز + دورة الحياة + مربح ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-3 flex flex-col gap-4">
          <GlassPanel title="المراكز" subtitle="تجار ومخلّصون نشطون">
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/centers?type=trader"
                className="rounded-xl p-4 text-center transition-all hover:border-accent/30"
                style={{
                  background: 'var(--color-accent-muted)',
                  border: '1px solid rgba(96,165,250,0.2)',
                }}
              >
                <p className="text-3xl font-extrabold text-accent tabular-nums">
                  {centers.traders}
                </p>
                <p className="text-[11px] text-ink-soft mt-1">تاجر</p>
              </Link>
              <Link
                to="/centers?type=broker"
                className="rounded-xl p-4 text-center transition-all hover:border-accent/30"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <p className="text-3xl font-extrabold text-ink tabular-nums">
                  {centers.brokers}
                </p>
                <p className="text-[11px] text-ink-soft mt-1">مخلّص</p>
              </Link>
            </div>
            {top_balances[0] && (
              <Link
                to={`/centers/${top_balances[0].id}`}
                className="block mt-3 p-3 rounded-xl text-sm hover:bg-white/[0.03] transition-colors"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <span className="text-ink-soft text-[10px]">أكبر رصيد</span>
                <div className="flex justify-between mt-1">
                  <span className="font-semibold text-ink">{top_balances[0].name}</span>
                  <span className="font-bold text-danger">
                    {formatCurrency(top_balances[0].balance)}
                  </span>
                </div>
              </Link>
            )}
          </GlassPanel>

          <GlassPanel title="المربح اليومي" subtitle={today.date}>
            {today.is_closed ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">صافي المربح</span>
                  <span className="text-xl font-extrabold text-success">
                    {formatCurrency(netToday)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">مصاريف مكتب</span>
                  <span className="font-semibold text-ink">
                    {formatCurrency(officeToday)}
                  </span>
                </div>
                <p className="text-[11px] text-success flex items-center gap-1">
                  <span>✓</span> اليوم مُغلق
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-ink-soft">اليوم لم يُغلق بعد</p>
                <p className="text-2xl font-extrabold text-ink">
                  {formatCurrency(today.gross_revenue)}
                </p>
                <p className="text-[11px] text-ink-faint">إيراد مرحّل (معاينة)</p>
                <Link to="/profit" className="text-accent text-sm font-semibold hover:underline">
                  إغلاق اليوم ←
                </Link>
              </div>
            )}
            <div className="pt-3 mt-3 border-t border-surface-border flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-ink-faint">تقرير اليوم</span>
              <ReportExportButtons
                filenameBase={`مربح_يومي_${today.date}`}
                fetchBlob={(fmt) => reportsApi.dailyProfitBlob(today.date, fmt)}
                xlsxLabel="Excel"
                pdfLabel="PDF"
              />
            </div>
          </GlassPanel>

          <GlassPanel title="آخر جرد" subtitle={inventory?.latest_date ? formatDate(inventory.latest_date) : 'لم يُحفظ بعد'}>
            {inventory?.latest_date ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-soft">إجمالي الذمم</span>
                  <span className="font-bold text-success tabular-nums">
                    {formatCurrency(inventory.totals?.total)}
                  </span>
                </div>
                <p className="text-[11px] text-ink-faint">{inventory.centers} مركز · {inventory.label || 'بدون تسمية'}</p>
                <Link to="/inventory" className="text-accent text-sm font-semibold hover:underline">
                  فتح الجرد ←
                </Link>
                {canExportInv && (
                  <div className="pt-2">
                    <ReportExportButtons
                      filenameBase={`جرد_${inventory.latest_date}`}
                      fetchBlob={(fmt) => reportsApi.inventoryBlob(inventory.latest_date, fmt)}
                      xlsxLabel="Excel"
                      pdfLabel="PDF"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-ink-soft">لا لقطة جرد محفوظة</p>
                <Link to="/inventory" className="text-accent text-sm font-semibold hover:underline">
                  إنشاء جرد ←
                </Link>
              </div>
            )}
          </GlassPanel>
        </div>

        <div className="xl:col-span-9">
          <GlassPanel
            title="دورة حياة السيارة"
            subtitle="من التسجيل حتى التسليم — نظرة عامة على الأسطول"
            action={
              <Link to="/shipments" className="text-[11px] text-accent font-semibold hover:underline">
                كل السيارات ←
              </Link>
            }
          >
            <ShipmentLifecycle overview counts={lifecycleCounts} />
          </GlassPanel>
        </div>
      </div>

      {/* ── حالات سريعة ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/shipments/wip"
          className="glass-panel rounded-2xl p-4 flex items-center justify-between hover:border-warning/30 transition-colors group"
        >
          <div>
            <p className="text-3xl font-extrabold text-danger tabular-nums">
              {shipments.pending.count || 0}
            </p>
            <p className="text-sm text-ink-soft mt-1">معلقة</p>
          </div>
          <span className="text-2xl opacity-60 group-hover:opacity-100">⏳</span>
        </Link>
        <Link
          to="/shipments/ready"
          className="glass-panel rounded-2xl p-4 flex items-center justify-between hover:border-warning/30 transition-colors group"
        >
          <div>
            <p className="text-3xl font-extrabold text-warning tabular-nums">
              {readyCount}
            </p>
            <p className="text-sm text-ink-soft mt-1">قابلة للترحيل</p>
          </div>
          <span className="text-2xl opacity-60 group-hover:opacity-100">✅</span>
        </Link>
        <Link
          to="/shipments?status=posted"
          className="glass-panel rounded-2xl p-4 flex items-center justify-between hover:border-success/30 transition-colors group"
        >
          <div>
            <p className="text-3xl font-extrabold text-success tabular-nums">
              {shipments.posted.count || 0}
            </p>
            <p className="text-sm text-ink-soft mt-1">مرحّلة غير مُسلّمة</p>
          </div>
          <span className="text-2xl opacity-60 group-hover:opacity-100">📦</span>
        </Link>
      </div>

      {/* ── طابور الترحيل ── */}
      {readyList.length > 0 && (
        <GlassPanel
          title={`${readyList.length} سيارة تنتظر الترحيل`}
          action={
            <Link
              to="/shipments/ready"
              className="text-[11px] text-accent font-semibold hover:underline"
            >
              ترحيل الكل ←
            </Link>
          }
        >
          <ul className="space-y-2">
            {readyList.map((s) => (
              <li
                key={s.id}
                className="flex justify-between items-center py-2 px-3 rounded-xl text-sm"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <Link
                  to={`/shipments/${s.id}`}
                  className="font-mono text-accent hover:underline"
                >
                  {s.ref_number}
                </Link>
                <span className="text-ink-soft truncate max-w-[40%]">
                  {s.center_name}
                </span>
                <span className="font-bold text-ink tabular-nums">
                  {formatCurrency(s.total_cost)}
                </span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}
    </div>
  )
}
