import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { reportsApi } from '../api'

const DROPDOWN_W = 360
const Z_BACKDROP = 10050
const Z_PANEL = 10051

const CATEGORY_LABEL = {
  shipments: 'التخليص',
  finance:   'المالية',
  inventory: 'الجرد',
  centers:   'المراكز',
  admin:     'الإدارة',
}

const SEVERITY_STYLE = {
  danger: {
    icon: '⚠️',
    bar:  'rgba(239,68,68,0.85)',
    glow: 'rgba(239,68,68,0.12)',
    badge: 'bg-danger/15 text-danger border-danger/25',
  },
  warning: {
    icon: '⏳',
    bar:  'rgba(245,158,11,0.85)',
    glow: 'rgba(245,158,11,0.1)',
    badge: 'bg-warning/15 text-warning border-warning/25',
  },
  info: {
    icon: 'ℹ️',
    bar:  'rgba(96,165,250,0.85)',
    glow: 'rgba(96,165,250,0.08)',
    badge: 'bg-accent/12 text-accent border-accent/25',
  },
  success: {
    icon: '✓',
    bar:  'rgba(34,197,94,0.85)',
    glow: 'rgba(34,197,94,0.08)',
    badge: 'bg-success/15 text-success border-success/25',
  },
}

function groupByCategory(alerts) {
  const map = new Map()
  for (const a of alerts) {
    const cat = a.category || 'other'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat).push(a)
  }
  return [...map.entries()]
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)
  const panelRef = useRef(null)
  const nav = useNavigate()

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => reportsApi.notifications(),
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
  })

  const payload = data?.data
  const alerts = payload?.alerts ?? (Array.isArray(payload) ? payload : [])
  const summary = payload?.summary
  const count = summary?.total ?? alerts.length
  const urgent = (summary?.danger ?? 0) + (summary?.warning ?? 0)

  const updatePosition = useCallback(() => {
    const btn = btnRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const left = Math.max(8, Math.min(r.right - DROPDOWN_W, window.innerWidth - DROPDOWN_W - 8))
    const top = r.bottom + 10
    const maxH = Math.min(window.innerHeight * 0.7, 520)
    const fitsBelow = top + maxH <= window.innerHeight - 8
    setPos({
      top: fitsBelow ? top : Math.max(8, r.top - maxH - 10),
      left,
    })
  }, [])

  const toggle = () => {
    if (!open) updatePosition()
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return
    updatePosition()
    const onScroll = () => updatePosition()
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      const t = e.target
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const groups = groupByCategory(alerts)

  const panel =
    open &&
    createPortal(
      <>
        <div
          className="fixed inset-0"
          style={{
            zIndex: Z_BACKDROP,
            background: 'rgba(4,6,12,0.45)',
            backdropFilter: 'blur(4px)',
          }}
          aria-hidden
          onClick={() => setOpen(false)}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-label="تنبيهات النظام"
          className="toast-glass rounded-2xl overflow-hidden animate-slide-down shadow-float"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: DROPDOWN_W,
            zIndex: Z_PANEL,
            maxHeight: 'min(70vh, 520px)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            className="px-4 py-3 flex items-center justify-between gap-2 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div>
              <p className="text-sm font-bold text-ink">تنبيهات النظام</p>
              <p className="text-[10px] text-ink-faint mt-0.5">
                مربوطة بالشحنات والمربح والجرد والمراكز
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isFetching && !isLoading && (
                <span className="text-[10px] text-ink-faint">تحديث…</span>
              )}
              <button
                type="button"
                className="text-[10px] text-accent hover:text-accent-hover px-2 py-1 rounded-lg hover:bg-accent/10"
                onClick={() => refetch()}
              >
                ⟳
              </button>
              {count > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold border border-accent/25">
                  {count}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-y-auto p-2 flex-1 overscroll-contain">
            {isLoading && (
              <div className="text-center py-10 text-ink-soft text-sm">جاري التحميل…</div>
            )}

            {isError && !isLoading && (
              <div className="text-center py-8 px-3">
                <p className="text-sm text-danger mb-2">تعذّر تحميل التنبيهات</p>
                <button type="button" className="btn-secondary text-xs" onClick={() => refetch()}>
                  إعادة المحاولة
                </button>
              </div>
            )}

            {!isLoading && !isError && count === 0 && (
              <div className="text-center py-10">
                <div
                  className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-xl"
                  style={{
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.25)',
                  }}
                >
                  ✓
                </div>
                <p className="text-sm text-ink-soft">لا تنبيهات حالياً</p>
                <p className="text-[11px] text-ink-faint mt-1">كل شيء على ما يرام</p>
              </div>
            )}

            {!isLoading &&
              !isError &&
              groups.map(([cat, items]) => (
                <div key={cat} className="mb-3 last:mb-0">
                  <p className="text-[9px] font-bold text-ink-faint tracking-widest uppercase px-2 py-1.5">
                    {CATEGORY_LABEL[cat] || cat}
                  </p>
                  <ul className="space-y-1">
                    {items.map((a) => {
                      const s = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.info
                      return (
                        <li key={a.id || a.type}>
                          <button
                            type="button"
                            disabled={!a.link}
                            onClick={() => {
                              if (a.link) {
                                nav(a.link)
                                setOpen(false)
                              }
                            }}
                            className="w-full flex items-stretch gap-0 rounded-xl text-right overflow-hidden transition-all duration-150 hover:bg-white/[0.05] disabled:cursor-default"
                            style={{ background: s.glow }}
                          >
                            <div className="w-1 shrink-0" style={{ background: s.bar }} />
                            <div className="flex-1 flex items-start gap-2.5 px-3 py-2.5 min-w-0">
                              <span className="text-base shrink-0 mt-0.5">{s.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-ink truncate">
                                    {a.title || a.type}
                                  </p>
                                  {a.count > 0 && (
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${s.badge}`}
                                    >
                                      {a.count}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">
                                  {a.message}
                                </p>
                                {a.link && (
                                  <p className="text-[10px] text-accent mt-1">اضغط للانتقال ←</p>
                                )}
                              </div>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
          </div>

          {summary?.generated_at && (
            <div
              className="px-4 py-2 text-[10px] text-ink-faint text-center shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              آخر فحص:{' '}
              {new Date(summary.generated_at).toLocaleTimeString('ar-SY', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>
      </>,
      document.body
    )

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
          open ? 'ring-1 ring-accent/40' : ''
        }`}
        style={{
          background: open ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${count > 0 ? 'rgba(96,165,250,0.28)' : 'rgba(255,255,255,0.09)'}`,
          boxShadow: count > 0 ? '0 0 20px rgba(96,165,250,0.15)' : undefined,
        }}
        title="تنبيهات النظام"
        aria-label="تنبيهات النظام"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className={`text-lg leading-none ${count > 0 && !open ? 'animate-pulse' : ''}`}>
          {count > 0 ? '🔔' : '🔕'}
        </span>
        {count > 0 && (
          <span
            className="absolute -top-1 -left-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1 border"
            style={{
              background: urgent > 0 ? 'rgba(239,68,68,0.95)' : 'rgba(96,165,250,0.95)',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.2)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {panel}
    </>
  )
}
