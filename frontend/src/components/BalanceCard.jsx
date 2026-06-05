import { formatCurrency } from '../utils/format'

const TONES = {
  default:  { card: 'tone-blue',    value: 'text-accent' },
  positive: { card: 'tone-green',   value: 'text-success' },
  warning:  { card: 'tone-warning', value: 'text-warning' },
  accent:   { card: 'tone-blue',    value: 'text-accent' },
  danger:   { card: 'tone-red',     value: 'text-danger' },
}

export default function BalanceCard({
  title,
  value,
  subtitle,
  variant = 'default',
  format = 'currency',
  icon,
}) {
  const tone = TONES[variant] || TONES.default

  const display =
    format === 'currency'
      ? formatCurrency(value)
      : format === 'number'
        ? Number(value || 0).toLocaleString('en-US')
        : value

  return (
    <div className={`stat-card ${tone.card}`}>
      {icon && <div className="text-lg mb-2.5 opacity-80">{icon}</div>}
      <p className="text-[11px] text-ink-faint mb-1.5">{title}</p>
      <p className={`text-[22px] font-bold leading-none tracking-tight mb-0.5 ${tone.value}`}>
        {display}
      </p>
      {subtitle && <p className="text-[10px] text-ink-faint mt-1.5">{subtitle}</p>}
    </div>
  )
}
