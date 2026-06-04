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

  const colors = {
    info: 'border-accent bg-accent-muted text-blue-200',
    success: 'border-success bg-success/10 text-green-300',
    error: 'border-danger bg-danger/10 text-red-300',
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-sm animate-in fade-in">
      <div
        className={`rounded-lg border px-4 py-3 shadow-lg ${colors[toast.type] || colors.info}`}
      >
        {toast.message}
      </div>
    </div>
  )
}
