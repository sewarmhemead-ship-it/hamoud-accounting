import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '../api'
import { useAuthStore, useUiStore } from '../store/auth.store'
import WelcomeIntro from '../components/auth/WelcomeIntro'
import ProgrammerCredit from '../components/branding/ProgrammerCredit'
import GlassPanel from '../components/ui/GlassPanel'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState('login')
  const [welcome, setWelcome] = useState(null)
  const setAuth = useAuthStore((s) => s.setAuth)
  const showToast = useUiStore((s) => s.showToast)
  const navigate = useNavigate()

  const { data: brandingRes } = useQuery({
    queryKey: ['branding'],
    queryFn: () => authApi.branding(),
    staleTime: 300_000,
  })
  const branding = brandingRes?.data

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login(username.trim(), password)
      setAuth(res.data.token, res.data.user)
      setWelcome(res.data.welcome || null)
      setPhase('welcome')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const finishWelcome = (path) => {
    navigate(path || welcome?.landing_path || '/', { replace: true })
  }

  return (
    <div className="login-page min-h-screen flex flex-col lg:flex-row relative overflow-hidden">
      <div className="login-mesh" aria-hidden />

      <aside className="login-hero relative z-10 flex-1 flex flex-col justify-center px-8 py-12 lg:px-14 lg:py-16">
        <div className="login-hero-glow" aria-hidden />
        <p className="text-accent/90 text-sm font-medium tracking-wide mb-3 intro-stagger">
          {branding?.company_name_en || 'Hamoud International'}
        </p>
        <h1 className="text-4xl lg:text-5xl font-bold text-ink leading-tight mb-4 intro-stagger max-w-md">
          {branding?.app_title || 'حمود'}
        </h1>
        <p className="text-ink-soft text-lg max-w-sm leading-relaxed intro-stagger">
          {branding?.app_subtitle || 'نظام التخليص الجمركي'}
        </p>
        <ul className="mt-10 space-y-3 text-ink-faint text-sm intro-stagger hidden sm:block">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            ذمة وتخليص مربوطان بمحرك حساب واحد
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent/70" />
            صلاحيات دقيقة لكل محاسب
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent/50" />
            تقارير، رسائل، ونسخ احتياطي
          </li>
        </ul>
      </aside>

      <main className="relative z-10 flex-1 flex items-center justify-center p-6 lg:p-12">
        {phase === 'welcome' && welcome ? (
          <GlassPanel className="login-card w-full max-w-lg !p-8 lg:!p-10">
            <WelcomeIntro welcome={welcome} onContinue={finishWelcome} />
          </GlassPanel>
        ) : (
          <GlassPanel className="login-card w-full max-w-md !p-8 lg:!p-10">
            <div className="text-center mb-8">
              <div className="login-logo-badge mx-auto mb-4">🏛</div>
              <h2 className="text-xl font-bold text-ink">تسجيل الدخول</h2>
              <p className="text-ink-faint text-sm mt-1">أدخل بيانات حسابك المعتمد</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">اسم المستخدم</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  placeholder="مثال: admin"
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="label">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  className="w-full"
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full py-3 rounded-2xl text-base font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2 justify-center">
                    <span className="login-spinner" />
                    جاري التحقق…
                  </span>
                ) : (
                  'متابعة'
                )}
              </button>
            </form>

            <p className="text-center text-[11px] text-ink-faint mt-6">
              بعد الدخول تُعرض صلاحياتك الفعلية من النظام
            </p>

            <div className="flex justify-center mt-6 pt-4 border-t border-white/6">
              <ProgrammerCredit compact />
            </div>
          </GlassPanel>
        )}
      </main>

      <footer className="login-page-footer relative z-10 flex justify-center px-6 pb-6 lg:pb-8">
        <ProgrammerCredit />
      </footer>
    </div>
  )
}
