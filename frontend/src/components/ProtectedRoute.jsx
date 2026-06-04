import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'

export function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

export function GuestRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (token) return <Navigate to="/" replace />
  return children
}
