import { useNavigate } from 'react-router-dom'
import ProgrammerCredit from '../branding/ProgrammerCredit'

function PermGroup({ group, index }) {
  return (
    <div
      className="intro-stagger rounded-2xl p-3 border border-white/8 bg-white/[0.03]"
      style={{ animationDelay: `${120 + index * 70}ms` }}
    >
      <p className="text-xs font-semibold text-accent mb-2">{group.label}</p>
      <div className="flex flex-wrap gap-1.5">
        {group.items.map((label) => (
          <span
            key={label}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white/6 text-ink-soft border border-white/6"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function WelcomeIntro({ welcome, onContinue }) {
  const navigate = useNavigate()
  const initial = (welcome?.greeting || '?').charAt(0)

  const go = () => {
    const path = welcome?.landing_path || '/'
    if (onContinue) onContinue(path)
    else navigate(path, { replace: true })
  }

  return (
    <div className="login-intro-shell w-full max-w-lg mx-auto text-center">
      <div
        className="intro-stagger w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl font-bold text-white shadow-accent intro-avatar-ring"
        style={{ animationDelay: '0ms' }}
      >
        {initial}
      </div>

      <p
        className="intro-stagger text-ink-faint text-sm mb-1"
        style={{ animationDelay: '60ms' }}
      >
        أهلاً بك
      </p>
      <h2
        className="intro-stagger text-3xl font-bold text-ink mb-2 tracking-tight"
        style={{ animationDelay: '90ms' }}
      >
        {welcome?.greeting}
      </h2>
      <p
        className="intro-stagger text-ink-soft text-sm mb-6"
        style={{ animationDelay: '110ms' }}
      >
        @{welcome?.username} · {welcome?.role_label}
        {welcome?.permission_count != null && (
          <span className="text-ink-faint"> · {welcome.permission_count} صلاحية</span>
        )}
      </p>

      {welcome?.template && (
        <div
          className="intro-stagger inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border border-white/10 bg-white/[0.04]"
          style={{
            animationDelay: '130ms',
            boxShadow: `0 0 24px ${welcome.template.color}22`,
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: welcome.template.color }}
          />
          <span className="text-sm font-medium text-ink">{welcome.template.label}</span>
          <span className="text-xs text-ink-faint">— {welcome.template.desc}</span>
        </div>
      )}

      <div className="text-right space-y-2 mb-8 max-h-[38vh] overflow-y-auto pr-1">
        {(welcome?.permission_groups || []).map((g, i) => (
          <PermGroup key={g.label} group={g} index={i} />
        ))}
      </div>

      {welcome?.quick_links?.length > 0 && (
        <div
          className="intro-stagger flex flex-wrap justify-center gap-2 mb-8"
          style={{ animationDelay: '200ms' }}
        >
          {welcome.quick_links.map((link) => (
            <button
              key={link.path}
              type="button"
              className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-ink-soft hover:bg-white/10 hover:text-ink transition-colors"
              onClick={() => navigate(link.path)}
            >
              {link.icon} {link.label}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className="intro-stagger btn-primary w-full py-3.5 text-base rounded-2xl"
        style={{ animationDelay: '240ms' }}
        onClick={go}
      >
        ابدأ العمل
      </button>
      <p
        className="intro-stagger text-[11px] text-ink-faint mt-4"
        style={{ animationDelay: '280ms' }}
      >
        ستُوجَّه إلى{' '}
        <span className="text-accent">{landingLabel(welcome?.landing_path)}</span>{' '}
        حسب صلاحياتك
      </p>

      <div
        className="intro-stagger flex justify-center mt-6 pt-4 border-t border-white/6"
        style={{ animationDelay: '320ms' }}
      >
        <ProgrammerCredit compact />
      </div>
    </div>
  )
}

function landingLabel(path) {
  const map = {
    '/': 'اللوحة الرئيسية',
    '/profit': 'المربح اليومي',
    '/shipments': 'السيارات',
    '/centers': 'المراكز',
    '/reports': 'التقارير',
    '/payments': 'الدفعات',
    '/inventory': 'الجرد',
  }
  return map[path] || 'الصفحة المناسبة'
}
