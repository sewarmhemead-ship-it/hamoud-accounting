import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { reportsApi } from '../api'
import GlassPanel from './ui/GlassPanel'

const SEV_DOT = {
  danger:  '#ef4444',
  warning: '#f59e0b',
  info:    '#60a5fa',
  success: '#22c55e',
}

/** شريط تنبيهات على اللوحة — نفس مصدر الجرس */
export default function NotificationsStrip() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => reportsApi.notifications(),
    staleTime: 20_000,
  })

  const alerts = data?.data?.alerts ?? []
  if (isLoading || isError || alerts.length === 0) return null

  const top = alerts.slice(0, 4)

  return (
    <GlassPanel className="!p-4 border border-accent/20">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-ink">تنبيهات تحتاج انتباهك</h3>
          <p className="text-[11px] text-ink-soft">{alerts.length} تنبيه نشط</p>
        </div>
        <span className="text-xs text-ink-faint">انقر الجرس 🔔 أعلى الشاشة للقائمة الكاملة</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {top.map((a) => (
          <Link
            key={a.id || a.type}
            to={a.link || '#'}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-white/[0.05]"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: SEV_DOT[a.severity] || SEV_DOT.info,
                boxShadow: `0 0 8px ${SEV_DOT[a.severity] || SEV_DOT.info}`,
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink truncate">{a.title}</p>
              <p className="text-[11px] text-ink-soft truncate">{a.message}</p>
            </div>
            {a.count > 0 && (
              <span className="text-[10px] font-bold text-accent shrink-0">{a.count}</span>
            )}
          </Link>
        ))}
      </div>
    </GlassPanel>
  )
}
