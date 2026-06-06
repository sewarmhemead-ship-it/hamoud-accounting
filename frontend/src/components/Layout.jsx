import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth.store'
import Toast from './Toast'
import NotificationBell from './NotificationBell'
import AssistantPanel from './assistant/AssistantPanel'
import { reportsApi, authApi, presenceApi } from '../api'

const navSections = [
  {
    title: 'الرئيسية',
    items: [
      { to: '/',       label: 'لوحة التحكم', icon: '⊞', end: true },
      { to: '/reports', label: 'التقارير',    icon: '📈' },
      { to: '/messages', label: 'الرسائل',    icon: '💬' },
      { to: '/profile', label: 'ملفي',       icon: '👤', end: true },
      { action: 'assistant', label: 'مساعد حمود', icon: '🤖' },
    ],
  },
  {
    title: 'التخليص',
    items: [
      { to: '/shipments',                  label: 'كل السيارات',      icon: '🚛', end: true },
      { to: '/shipments/wip',              label: 'معلقة / WIP',      icon: '⏳', badge: 'wip' },
      { to: '/shipments/ready',            label: 'جاهزة للترحيل',   icon: '✅', badge: 'ready' },
      { to: '/shipments/broker-statement', label: 'كشف المخلص',      icon: '📋' },
      { to: '/shipments/dual-statement',   label: 'كشف مزدوج',       icon: '⚖️' },
      { to: '/trader-reports',             label: 'تقارير التجار',    icon: '🧾' },
      { to: '/shipments/new',              label: 'تخليص جديد',       icon: '＋', highlight: true },
    ],
  },
  {
    title: 'المراكز',
    items: [
      { to: '/centers',      label: 'المراكز',  icon: '🏢' },
      { to: '/transactions', label: 'الحركات',       icon: '💸' },
      { to: '/cash',         label: 'دفعات ومقاصة', icon: '💰' },
    ],
  },
  {
    title: 'المالية',
    items: [
      { to: '/profit',    label: 'المربح اليومي', icon: '💹' },
      { to: '/inventory', label: 'الجرد',         icon: '📦' },
    ],
  },
  {
    title: 'الإدارة',
    items: [
      { to: '/admin', label: 'لوحة الإدارة', icon: '⚙️' },
    ],
  },
]

const WEEKDAYS = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const MONTHS   = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

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
  const [assistantOpen, setAssistantOpen] = useState(false)
  const user    = useAuthStore((s) => s.user)
  const logout  = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const title    = currentTitle(location.pathname)
  const initial  = (user?.name || 'أ').trim().charAt(0)
  const { data: brandingRes } = useQuery({
    queryKey: ['branding'],
    queryFn: () => authApi.branding(),
    staleTime: 120_000,
  })
  const branding = brandingRes?.data

  // بيانات badges من الـ dashboard
  const { data: dashRes } = useQuery({
    queryKey:  ['dashboard'],
    queryFn:   () => reportsApi.dashboard(),
    staleTime: 60_000,
  })
  const badges = {
    wip: dashRes?.data?.shipments?.pending?.count || 0,
    ready: dashRes?.data?.shipments?.ready_to_post?.count ?? (dashRes?.data?.shipments?.complete?.count || 0),
  }

  useEffect(() => {
    if (!user) return undefined
    presenceApi.heartbeat().catch(() => {})
    const id = setInterval(() => {
      presenceApi.heartbeat().catch(() => {})
    }, 45_000)
    return () => clearInterval(id)
  }, [user?.id])

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ─── SIDEBAR ─── */}
      <aside className="glass-sidebar w-[248px] min-w-[248px] flex flex-col h-screen relative overflow-hidden order-first">
        {/* توهّجات خلفية */}
        <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full"
             style={{ background: 'radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 65%)', filter:'blur(16px)' }} />
        <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 rounded-full"
             style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.05) 0%,transparent 65%)' }} />

        {/* ── الملف الشخصي (أعلى الشريط — كالموكاب) ── */}
        <Link
          to="/profile"
          className="px-4 pt-5 pb-4 relative block hover:bg-white/[0.03] transition-colors"
          style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-accent"
              style={{ background:'linear-gradient(135deg,#60A5FA,#3b82f6)' }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink truncate">{user?.name || 'حمود'}</div>
              <div className="text-[10px] text-ink-soft">{user?.role === 'admin' ? 'مدير النظام' : 'موظف'}</div>
            </div>
          </div>
        </Link>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="mb-1">
              <div className="text-[9px] font-bold text-ink-faint tracking-[1.8px] uppercase px-2.5 pt-3 pb-1.5 select-none">
                {section.title}
              </div>
              {section.items.map((item) => {
                if (item.action === 'assistant') {
                  return (
                    <button
                      key="assistant"
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setAssistantOpen(true)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] mb-0.5 text-ink-soft hover:text-ink hover:bg-white/[0.04] transition-colors text-right"
                    >
                      <span className="text-sm shrink-0">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                    </button>
                  )
                }
                const badgeCount = item.badge ? badges[item.badge] : 0
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] mb-0.5 transition-all duration-200 ${
                        isActive ? 'text-accent font-semibold' : 'text-ink-soft hover:text-ink'
                      }`
                    }
                    style={({ isActive }) => isActive ? {
                      background:     'rgba(96,165,250,0.12)',
                      border:         '1px solid rgba(96,165,250,0.22)',
                      boxShadow:      'inset 0 0 20px rgba(96,165,250,0.06), 0 0 24px rgba(96,165,250,0.08)',
                    } : item.highlight ? {
                      background:     'rgba(96,165,250,0.06)',
                      border:         '1px dashed rgba(96,165,250,0.25)',
                    } : {
                      border: '1px solid transparent',
                    }}
                  >
                    {({ isActive }) => (<>
                      {/* مؤشر يمين للعنصر النشط — بدون NavLink مكرر */}
                      {isActive && (
                        <div className="absolute right-0 top-[20%] bottom-[20%] w-0.5 rounded-l-sm pointer-events-none"
                             style={{ background:'linear-gradient(180deg,#60A5FA,#3b82f6)' }} />
                      )}
                      <span className="text-sm shrink-0 leading-none">{item.icon}</span>
                    <span className="flex-1 leading-none">{item.label}</span>
                      {badgeCount > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                              style={{ background:'rgba(245,158,11,0.2)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.3)' }}>
                          {badgeCount}
                        </span>
                      )}
                    </>)}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* ── تذييل: خروج ── */}
        <div className="px-3.5 py-3 flex items-center justify-between"
             style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-[10px] text-ink-faint">{branding?.app_title || 'حمود'} · تخليص</span>
          <button type="button" title="تسجيل خروج"
                  onClick={() => { logout(); navigate('/login') }}
                  className="text-xs text-ink-soft hover:text-danger transition-colors px-2 py-1 rounded-lg hover:bg-danger/10">
            خروج
          </button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* ── Topbar ── */}
        <header className="glass-header relative z-40 px-6 h-[60px] flex items-center gap-4 shrink-0">
          <div>
            <div className="text-lg font-bold text-ink leading-none">{title}</div>
            <div className="text-[11px] text-ink-soft mt-1">{formatToday()}</div>
          </div>
          <div className="flex-1" />
          {dashRes?.data?.today && (
            <span
              className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: dashRes.data.today.is_closed
                  ? 'rgba(34,197,94,0.12)'
                  : 'rgba(96,165,250,0.1)',
                border: `1px solid ${
                  dashRes.data.today.is_closed
                    ? 'rgba(34,197,94,0.3)'
                    : 'rgba(96,165,250,0.28)'
                }`,
                color: dashRes.data.today.is_closed ? '#22c55e' : '#60A5FA',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: 'currentColor',
                  boxShadow: `0 0 8px currentColor`,
                }}
              />
              {dashRes.data.today.is_closed ? 'اليوم مُغلق' : 'اليوم مفتوح'}
            </span>
          )}
          <button
            type="button"
            title="مساعد حمود"
            className="btn-secondary !py-2 !px-3 text-[13px] hidden sm:inline-flex"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setAssistantOpen(true)}
          >
            🤖 مساعد
          </button>
          <NotificationBell />
          <Link to="/profit"
                className="btn-secondary !py-2 !px-4 text-[13px] hidden md:inline-flex">
            إغلاق اليوم
          </Link>
          <Link to="/shipments/new"
                className="btn-primary !py-2 !px-4 text-[13px]">
            ＋ تخليص جديد
          </Link>
        </header>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 xl:p-6 max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>

      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <Toast />
    </div>
  )
}
