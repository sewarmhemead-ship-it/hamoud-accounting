import { Navigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import GlassPanel from './ui/GlassPanel'

/** مسار الإدارة — يظهر للجميع، الدخول للمشرف (admin) فقط */
export default function AdminRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />

  if (user.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto mt-16 animate-fade-in">
        <GlassPanel className="!p-8 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <p className="text-lg font-bold text-ink">النظام</p>
          <p className="text-base text-warning font-semibold mt-2">
            ما عندك صلاحية تدخل هين
          </p>
          <p className="text-sm text-ink-soft mt-3 leading-relaxed">
            لوحة الإدارة وإعدادات التطبيق متاحة لحساب المشرف فقط.
            إذا احتجت صلاحية، تواصل مع مدير النظام.
          </p>
          <p className="text-xs text-ink-faint mt-4">
            مسجّل كـ: <span className="text-ink-soft">{user.name}</span> (موظف)
          </p>
          <Link to="/" className="btn-primary inline-flex mt-6">
            العودة للوحة التحكم
          </Link>
        </GlassPanel>
      </div>
    )
  }

  return children
}
