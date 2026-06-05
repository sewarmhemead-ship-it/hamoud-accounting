import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      // admin دائماً يملك كل الصلاحيات
      hasPermission: (key) => {
        const u = get().user
        if (!u) return false
        if (u.role === 'admin') return true
        return (u.permissions || []).includes(key)
      },
    }),
    { name: 'hamoud-auth' }
  )
)

export const useUiStore = create((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toast: null,
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}))
