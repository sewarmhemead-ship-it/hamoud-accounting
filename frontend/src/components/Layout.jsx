import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import Toast from './Toast'

const navSections = [
  {
    title: 'الرئيسية',
    items: [
      { to: '/', label: 'لوحة التحكم', icon: '▦', end: true },
      { to: '/reports', label: 'التقارير', icon: '📈' },
    ],
  },
  {
    title: 'التخليص',
    items: [
      { to: '/shipments', label: 'كل السيارات', icon: '🚛', end: true },
      { to: '/shipments/wip', label: 'معلقة / WIP', icon: '⏳' },
      { to: '/shipments/ready', label: 'جاهزة للترحيل', icon: '✅' },
      { to: '/shipments/broker-statement', label: 'كشف المخلص', icon: '📋' },
      { to: '/shipments/dual-statement', label: 'كشف مزدوج', icon: '⚖️' },
      { to: '/trader-reports', label: 'تقارير التجار', icon: '🧾' },
      { to: '/shipments/new', label: 'تخليص جديد', icon: '＋' },
    ],
  },
  {
    title: 'المراكز',
    items: [
      { to: '/centers', label: 'المراكز', icon: '🏢' },
      { to: '/transactions', label: 'الحركات', icon: '💸' },
      { to: '/payments', label: 'دفعات', icon: '💰' },
      { to: '/offset', label: 'مقاصة', icon: '🔄' },
    ],
  },
  {
    title: 'المالية',
    items: [
      { to: '/profit', label: 'المربح اليومي', icon: '💹' },
      { to: '/juice', label: 'طازج', icon: '🧃' },
      { to: '/inventory', label: 'الجرد', icon: '📦' },
    ],
  },
]

const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

function formatToday() {
  const d = new Date()
  return `${WEEKDAYS[d.getDay()]}، ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function currentTitle(pathname) {
  let best = null
  for (const section of navSections) {
    for (const item of section.items) {
      if (item.end ? pathname === item.to : pathname.startsWith(item.to)) {
        if (!best || item.to.length > best.to.length) best = item
      }
    }
  }
  return best?.label || 'حمود'
}

export default function Layout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()

  const title = currentTitle(location.pathname)
  const initial = (user?.name || 'أ').trim().charAt(0)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ─── SIDEBAR ─── */}
      <aside className="w-[220px] min-w-[220px] bg-surface-card border-l border-surface-border flex flex-col h-screen relative overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -left-16 w-52 h-52 rounded-full"
             style={{ background: 'radial-gradient(circle, #c9a84c0f 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-surface-border relative">
          <div className="flex items-center gap-2.5">
            <div
              className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-base shrink-0 shadow-gold"
              style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #8b6914 100%)' }}
            >
              🏛
            </div>
            <div>
              <div className="text-[15px] font-bold text-ink tracking-tight leading-none">حمود</div>
            </div>
          </div>
          <div className="text-[10px] text-ink-faint tracking-wide mt-1.5">نظام التخليص الجمركي</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-2.5 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="mb-1">
              <div className="text-[9px] font-semibold text-ink-faint tracking-[1.5px] uppercase px-2 pt-2.5 pb-1">
                {section.title}
              </div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] mb-px transition-all ${
                      isActive
                        ? 'bg-accent-muted text-accent font-medium after:content-[""] after:absolute after:right-0 after:top-[20%] after:bottom-[20%] after:w-0.5 after:bg-accent after:rounded-l-sm'
                        : 'text-ink-soft hover:bg-surface-hover hover:text-ink'
                    }`
                  }
                >
                  <span className="text-sm shrink-0">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3.5 py-3 border-t border-surface-border flex items-center gap-2.5">
          <div
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-ink truncate">{user?.name || '—'}</div>
            <div className="text-[10px] text-ink-faint">{user?.role || ''}</div>
          </div>
          <button
            type="button"
            title="تسجيل خروج"
            onClick={() => { logout(); navigate('/login') }}
            className="text-sm text-ink-faint hover:text-danger transition-colors"
          >
            ⎋
          </button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="bg-surface-card border-b border-surface-border px-6 h-14 flex items-center gap-4 shrink-0">
          <div>
            <div className="text-base font-bold text-ink leading-none">{title}</div>
            <div className="text-[11px] text-ink-faint mt-1">{formatToday()}</div>
          </div>
          <div className="flex-1" />
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: '#f59e0b18', color: '#f59e0b', border: '1px solid #f59e0b30' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
            اليوم مفتوح
          </div>
          <Link to="/profit" className="btn-secondary !py-1.5 !px-3.5 text-[13px]">إغلاق اليوم</Link>
          <Link to="/shipments/new" className="btn-primary !py-1.5 !px-3.5 text-[13px]">＋ تخليص جديد</Link>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
      <Toast />
    </div>
  )
}
