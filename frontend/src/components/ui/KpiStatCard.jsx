import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '../../utils/format'

const TONE_ICON_BG = {
  accent:  'rgba(96,165,250,0.12)',
  success: 'rgba(34,197,94,0.12)',
  warning: 'rgba(245,158,11,0.12)',
  danger:  'rgba(239,68,68,0.12)',
}

export default function KpiStatCard({
  icon,
  label,
  value,
  sub,
  delta,
  tone = 'accent',
  format = 'currency',
  to,
}) {
  const navigate = useNavigate()
  const display =
    format === 'currency'
      ? formatCurrency(value)
      : format === 'number'
        ? Number(value || 0).toLocaleString('en-US')
        : value

  return (
    <button
      type="button"
      onClick={() => to && navigate(to)}
      className={`stat-card tone-${tone === 'accent' ? 'blue' : tone} text-right w-full text-start
        transition-all duration-300 hover:-translate-y-0.5 group
        ${to ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between gap-3 relative z-[1]">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-2">
            {label}
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-[26px] xl:text-[28px] font-extrabold text-ink leading-none tabular-nums">
              {display}
            </p>
            {delta != null && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  delta >= 0
                    ? 'text-success bg-success/15'
                    : 'text-danger bg-danger/15'
                }`}
              >
                {delta >= 0 ? '+' : ''}
                {delta}% {delta >= 0 ? '↑' : '↓'}
              </span>
            )}
          </div>
          {sub && (
            <p className="text-[11px] text-ink-faint mt-2">{sub}</p>
          )}
        </div>
        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 opacity-90"
            style={{ background: TONE_ICON_BG[tone] || TONE_ICON_BG.accent }}
          >
            {icon}
          </div>
        )}
      </div>
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 80% 0%, var(--color-accent-glow) 0%, transparent 70%)',
        }}
      />
    </button>
  )
}
