import { useEffect } from 'react'
import { useUiStore } from '../store/auth.store'

export default function Toast() {
  const toast = useUiStore((s) => s.toast)
  const clearToast = useUiStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 4000)
    return () => clearTimeout(t)
  }, [toast, clearToast])

  if (!toast) return null

  const accents = {
    info:    { border: 'rgba(201,168,76,0.4)',  text: '#e8c96a', icon: 'ℹ' },
    success: { border: 'rgba(34,197,94,0.4)',   text: '#4ade80', icon: '✓' },
    error:   { border: 'rgba(239,68,68,0.4)',   text: '#f87171', icon: '✕' },
  }
  const a = accents[toast.type] || accents.info

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-sm animate-fade-in">
      <div
        className="toast-glass rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ borderLeft: `3px solid ${a.border}` }}
      >
        <span className="text-sm font-bold shrink-0" style={{ color: a.border }}>{a.icon}</span>
        <span className="text-sm" style={{ color: a.text }}>{toast.message}</span>
      </div>
    </div>
  )
}
