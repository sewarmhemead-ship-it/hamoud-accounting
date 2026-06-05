import { SHIPMENT_STATUS } from '../constants'

const STEPS = [
  { key: 'pending',   icon: '1', desc: 'أقلام ناقصة — لا تدخل اليوميات' },
  { key: 'complete',  icon: '2', desc: 'جاهزة للترحيل — انتظار قرار' },
  { key: 'posted',    icon: '3', desc: 'مرحّلة — قيد على التاجر' },
  { key: 'delivered', icon: '4', desc: 'مُسلّمة — تدخل رصيد التاجر' },
]

export default function ShipmentLifecycle({
  currentStatus,
  compact = false,
  overview = false,
  counts = {},
}) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStatus)

  if (overview) {
    const max = Math.max(1, ...STEPS.map((s) => counts[s.key] || 0))
    return (
      <div className="relative pt-2 pb-1">
        <div
          className="absolute top-[22px] right-[12%] left-[12%] h-px"
          style={{ background: 'var(--color-border)' }}
        />
        <div className="relative grid grid-cols-4 gap-2">
          {STEPS.map((step, i) => {
            const n = counts[step.key] || 0
            const intensity = n / max
            const active = n > 0 && intensity >= 0.5
            return (
              <div key={step.key} className="flex flex-col items-center gap-2">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold relative z-10 transition-all"
                  style={
                    active
                      ? {
                          background: 'linear-gradient(135deg, #60A5FA, #3b82f6)',
                          color: '#fff',
                          boxShadow:
                            '0 0 0 3px rgba(96,165,250,0.2), 0 0 20px rgba(96,165,250,0.35)',
                        }
                      : {
                          background: 'rgba(255,255,255,0.04)',
                          border: '2px solid var(--color-border)',
                          color: 'var(--color-ink-soft)',
                        }
                  }
                >
                  {step.icon}
                </div>
                <div className="text-center">
                  <p
                    className={`text-xs font-semibold ${
                      active ? 'text-accent' : 'text-ink-soft'
                    }`}
                  >
                    {SHIPMENT_STATUS[step.key]?.label}
                  </p>
                  <p className="text-lg font-extrabold text-ink mt-0.5 tabular-nums">
                    {n}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <span className="sr-only">→</span>
                )}
              </div>
            )
          })}
        </div>
        <ul className="mt-5 space-y-2 text-[11px] text-ink-soft border-t border-surface-border pt-4">
          {STEPS.map((step) => (
            <li key={step.key} className="flex gap-2">
              <span className="text-accent shrink-0">•</span>
              <span>
                <strong className="text-ink font-medium">
                  {SHIPMENT_STATUS[step.key]?.label}:
                </strong>{' '}
                {step.desc}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {STEPS.map((step, i) => {
          const done = i < currentIdx
          const active = i === currentIdx
          const cfg = SHIPMENT_STATUS[step.key]
          return (
            <span key={step.key} className="flex items-center gap-1">
              <span
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all ${
                  active ? 'text-accent' : done ? 'text-success' : 'text-ink-faint'
                }`}
                style={
                  active
                    ? {
                        background: 'var(--color-accent-muted)',
                        border: '1px solid rgba(96,165,250,0.28)',
                      }
                    : done
                      ? {
                          background: 'rgba(34,197,94,0.08)',
                          border: '1px solid rgba(34,197,94,0.15)',
                        }
                      : {
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--color-border)',
                        }
                }
              >
                {cfg?.label}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={`text-[10px] ${i < currentIdx ? 'text-success' : 'text-ink-faint'}`}
                >
                  ←
                </span>
              )}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="relative">
        <div
          className="absolute top-5 right-[calc(12.5%+10px)] left-[calc(12.5%+10px)] h-px"
          style={{ background: 'var(--color-border)' }}
        />
        <div
          className="absolute top-5 right-[calc(12.5%+10px)] h-px transition-all duration-500"
          style={{
            background: 'linear-gradient(90deg, #22c55e, #60A5FA)',
            width: `${currentIdx > 0 ? (currentIdx / (STEPS.length - 1)) * 100 : 0}%`,
            maxWidth: 'calc(75% - 20px)',
            boxShadow: '0 0 8px var(--color-accent-glow)',
          }}
        />

        <div className="relative grid grid-cols-4 gap-2">
          {STEPS.map((step, i) => {
            const done = i < currentIdx
            const active = i === currentIdx
            return (
              <div key={step.key} className="flex flex-col items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 relative z-10 ${
                    active ? 'text-white' : done ? 'text-success' : 'text-ink-faint'
                  }`}
                  style={
                    active
                      ? {
                          background: 'linear-gradient(135deg, #60A5FA, #3b82f6)',
                          boxShadow:
                            '0 0 0 3px rgba(96,165,250,0.2), 0 0 16px rgba(96,165,250,0.35)',
                        }
                      : done
                        ? {
                            background: 'rgba(34,197,94,0.15)',
                            border: '2px solid rgba(34,197,94,0.5)',
                          }
                        : {
                            background: 'rgba(255,255,255,0.04)',
                            border: '2px solid var(--color-border)',
                          }
                  }
                >
                  {done ? '✓' : i + 1}
                </div>
                <div className="text-center">
                  <p
                    className={`text-xs font-semibold ${
                      active ? 'text-accent' : done ? 'text-success' : 'text-ink-faint'
                    }`}
                  >
                    {SHIPMENT_STATUS[step.key]?.label}
                  </p>
                  <p className="text-[10px] text-ink-faint mt-0.5 leading-tight hidden sm:block">
                    {step.desc.split(' — ')[0]}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
