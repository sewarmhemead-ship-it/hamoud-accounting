import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api'
import { useUiStore } from '../../store/auth.store'
import GlassPanel from '../ui/GlassPanel'
import { DEFAULT_APP_SETTINGS } from '../../constants/appSettingsDefaults'

const SECTIONS = [
  {
    id: 'brand',
    title: 'هوية الشركة',
    icon: '🏛',
    fields: [
      { key: 'company_name_ar', label: 'اسم الشركة (عربي — يظهر في التقارير)', type: 'text', wide: true },
      { key: 'company_name_en', label: 'اسم الشركة (إنجليزي)', type: 'text', wide: true },
      { key: 'company_phone', label: 'هاتف / تواصل', type: 'text' },
      { key: 'company_address', label: 'عنوان', type: 'text', wide: true },
    ],
  },
  {
    id: 'app',
    title: 'واجهة التطبيق',
    icon: '✨',
    fields: [
      { key: 'app_title', label: 'عنوان التطبيق (قصير)', type: 'text' },
      { key: 'app_subtitle', label: 'وصف تحت العنوان', type: 'text', wide: true },
    ],
  },
  {
    id: 'reports',
    title: 'التقارير',
    icon: '📄',
    fields: [
      { key: 'report_footer', label: 'تذييل التقارير (PDF/Excel)', type: 'textarea', wide: true },
    ],
  },
  {
    id: 'notify',
    title: 'التنبيهات',
    icon: '🔔',
    hint: 'لا تغيّر المربح أو الذمة — عتبات عرض فقط',
    fields: [
      { key: 'notification_wip_overdue_days', label: 'تأخير WIP (أيام)', type: 'number', min: 1, max: 365 },
      { key: 'notification_inventory_stale_days', label: 'جرد قديم (أيام)', type: 'number', min: 1, max: 365 },
      { key: 'notification_high_balance_usd', label: 'ذمة تاجر مرتفعة ($)', type: 'number', min: 0 },
    ],
  },
  {
    id: 'defaults',
    title: 'افتراضيات الواجهة',
    icon: '🚛',
    hint: 'تلميح عند تخليص جديد فقط — لا يُعاد حساب سيارات قديمة',
    fields: [
      { key: 'default_service_fee_usd', label: 'خدمات المعبر الافتراضية ($)', type: 'number', min: 0 },
    ],
  },
]

const BACKUP_INTERVAL_OPTIONS = []
for (let h = 0.5; h <= 24; h += 0.5) {
  BACKUP_INTERVAL_OPTIONS.push({ value: h, label: h < 1 ? `${h * 60} دقيقة` : `${h} ساعة` })
}

function formatBytes(n) {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n < 1024) return `${n} بايت`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} ك.ب`
  return `${(n / (1024 * 1024)).toFixed(2)} م.ب`
}

async function fetchBackupStatus() {
  const res = await adminApi.getBackupStatus()
  if (res?.data && typeof res.data === 'object') return res.data
  throw new Error(res?.message || 'تعذّر جلب حالة النسخ')
}

async function fetchSettings() {
  const res = await adminApi.getSettings()
  if (res?.data && typeof res.data === 'object') return res.data
  throw new Error(res?.message || 'استجابة غير متوقعة من الخادم')
}

export default function AdminSettingsTab() {
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)
  const [form, setForm] = useState(null)

  const { data: serverSettings, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: fetchSettings,
    retry: 2,
    staleTime: 10_000,
  })

  const {
    data: backupStatus,
    refetch: refetchBackup,
    isFetching: backupFetching,
  } = useQuery({
    queryKey: ['admin-backup-status'],
    queryFn: fetchBackupStatus,
    retry: 1,
    staleTime: 15_000,
  })

  useEffect(() => {
    if (serverSettings) {
      setForm({ ...DEFAULT_APP_SETTINGS, ...serverSettings })
    }
  }, [serverSettings])

  const saveMut = useMutation({
    mutationFn: (payload) => adminApi.updateSettings(payload),
    onSuccess: (res) => {
      const next = res?.data ? { ...res.data } : form
      setForm(next)
      queryClient.setQueryData(['admin-settings'], next)
      queryClient.invalidateQueries({ queryKey: ['branding'] })
      queryClient.invalidateQueries({ queryKey: ['admin-backup-status'] })
      showToast(res?.message || 'تم حفظ الإعدادات', 'success')
    },
    onError: (e) => showToast(e.message || 'تعذّر الحفظ', 'error'),
  })

  const runBackupMut = useMutation({
    mutationFn: () => adminApi.runBackup(),
    onSuccess: (res) => {
      refetchBackup()
      showToast(res?.message || 'تم النسخ الاحتياطي', 'success')
    },
    onError: (e) => showToast(e.message || 'فشل النسخ', 'error'),
  })

  const downloadBackup = async () => {
    try {
      const blob = await adminApi.downloadBackup()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'hamoud_accounting_backup.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      showToast(e.message || 'تعذّر التحميل', 'error')
    }
  }

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  // وجهات النسخ (مصفوفة مسارات مجلدات يحددها المستخدم)
  const destinations = Array.isArray(form?.backup_destinations) ? form.backup_destinations : []
  const setDest = (i, val) =>
    setForm((f) => {
      const arr = [...(f.backup_destinations || [])]
      arr[i] = val
      return { ...f, backup_destinations: arr }
    })
  const addDest = () =>
    setForm((f) => ({ ...f, backup_destinations: [...(f.backup_destinations || []), ''] }))
  const removeDest = (i) =>
    setForm((f) => ({
      ...f,
      backup_destinations: (f.backup_destinations || []).filter((_, idx) => idx !== i),
    }))

  if (isLoading && !form) {
    return (
      <p className="text-ink-faint text-sm py-8 text-center">
        جاري تحميل الإعدادات…
      </p>
    )
  }

  if (isError && !form) {
    return (
      <GlassPanel className="!p-6 text-center max-w-md mx-auto">
        <p className="text-danger font-semibold mb-2">تعذّر تحميل الإعدادات</p>
        <p className="text-sm text-ink-soft mb-4">{error?.message || 'تحقق من تشغيل الخادم'}</p>
        <p className="text-xs text-ink-faint mb-4">
          إن كان الخادم قديماً: أعد تشغيله بعد التحديث (ينشئ جدول الإعدادات تلقائياً).
        </p>
        <button type="button" className="btn-primary" onClick={() => refetch()}>
          إعادة المحاولة
        </button>
      </GlassPanel>
    )
  }

  if (!form) {
    return (
      <GlassPanel className="!p-6 text-center">
        <p className="text-ink-soft text-sm">لا توجد بيانات — استخدم الافتراضيات</p>
        <button
          type="button"
          className="btn-secondary mt-4"
          onClick={() => setForm({ ...DEFAULT_APP_SETTINGS })}
        >
          عرض النموذج بالافتراضي
        </button>
      </GlassPanel>
    )
  }

  return (
    <div className="space-y-5">
      {isFetching && (
        <p className="text-[10px] text-ink-faint text-center">تحديث من الخادم…</p>
      )}

      <div
        className="rounded-2xl px-4 py-3 text-[11px] text-ink-soft leading-relaxed"
        style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)' }}
      >
        <strong className="text-accent">آمن للمحاسبة:</strong> هذه الإعدادات لا تعدّل محرك الذمة، المربح
        اليومي، أو مجموع تكلفة السيارة. التغييرات تظهر في التقارير، العناوين، والتنبيهات فقط.
      </div>

      <GlassPanel
        title="💾 النسخ الاحتياطي"
        subtitle="نسخة قاعدة بيانات كاملة مؤرّخة تُحفظ في عدة مجلدات تحددها — مع تحقّق سلامة لكل نسخة"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={!!form.backup_auto_enabled}
                onChange={(e) => set('backup_auto_enabled', e.target.checked)}
              />
              تفعيل النسخ التلقائي
            </label>
          </div>
          <div>
            <label className="label text-xs">الفترة بين النسخ</label>
            <select
              value={form.backup_interval_hours ?? 0.5}
              onChange={(e) => set('backup_interval_hours', Number(e.target.value))}
            >
              {BACKUP_INTERVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={!!form.backup_include_db}
                onChange={(e) => set('backup_include_db', e.target.checked)}
              />
              تضمين نسخة قاعدة البيانات (.db)
            </label>
          </div>
        </div>

        {/* وجهات النسخ — مجلدات يحددها المستخدم (قرص خارجي، OneDrive، شبكة) */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="label text-xs !mb-0">📁 وجهات النسخ — تُنسخ إليها القاعدة الكاملة</label>
            <span className="text-[10px] text-ink-faint">حد أقصى 5</span>
          </div>
          {destinations.length === 0 && (
            <p className="text-xs text-ink-faint">
              لا توجد وجهات إضافية — نسخة محلية فقط. أضف قرصاً خارجياً أو مجلد OneDrive/Google Drive للحماية الكاملة.
            </p>
          )}
          {destinations.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={d}
                onChange={(e) => setDest(i, e.target.value)}
                placeholder="مثال: D:\Backups  أو  C:\Users\you\OneDrive\hamoud"
                dir="ltr"
                className="flex-1 text-sm"
              />
              <button type="button" className="btn-danger !py-1.5 !px-2.5 text-xs" onClick={() => removeDest(i)}>
                حذف
              </button>
            </div>
          ))}
          {destinations.length < 5 && (
            <button type="button" className="btn-secondary !py-1.5 !px-3 text-xs" onClick={addDest}>
              + إضافة وجهة
            </button>
          )}
          <div className="flex items-center gap-2 pt-1">
            <label className="label text-xs !mb-0">عدد النسخ المحفوظة بكل مجلد:</label>
            <input
              type="number"
              min={1}
              max={365}
              value={form.backup_keep_copies ?? 30}
              onChange={(e) => set('backup_keep_copies', Number(e.target.value))}
              className="w-24 text-sm"
            />
          </div>
          <p className="text-[10px] text-ink-faint">
            احفظ الإعدادات أولاً، ثم اضغط «نسخ الآن» لاختبار الوجهات فعلياً.
          </p>
        </div>

        <div
          className="mt-4 rounded-xl px-3 py-3 text-xs text-ink-soft space-y-1"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="font-semibold text-ink">آخر نسخة</p>
          {backupFetching && !backupStatus ? (
            <p>جاري التحميل…</p>
          ) : (
            <>
              <p>
                التاريخ:{' '}
                {backupStatus?.last_at
                  ? new Date(backupStatus.last_at).toLocaleString('ar-SY')
                  : 'لم يُنفَّذ بعد'}
              </p>
              <p>
                Excel:{' '}
                {backupStatus?.xlsx_exists
                  ? `${formatBytes(backupStatus.xlsx_size)} — hamoud_accounting_backup.xlsx`
                  : 'غير موجود'}
              </p>
              {backupStatus?.include_db && (
                <p>
                  DB:{' '}
                  {backupStatus?.db_exists
                    ? `${formatBytes(backupStatus.db_size)} — hamoud_accounting_backup.db`
                    : 'غير موجود'}
                </p>
              )}
              {backupStatus?.last_destinations?.length > 0 && (
                <div className="pt-1 space-y-0.5">
                  <p className="font-semibold text-ink">الوجهات (آخر نسخة):</p>
                  {backupStatus.last_destinations.map((d, i) => (
                    <p key={i} dir="ltr" className={d.ok ? 'text-success' : 'text-danger'}>
                      {d.ok ? '✓' : '✗'} {d.path}{' '}
                      {d.ok ? `(${formatBytes(d.bytes)})` : `— ${d.error || 'فشل'}`}
                    </p>
                  ))}
                </div>
              )}
              {backupStatus?.last_error && (
                <p className="text-danger">خطأ: {backupStatus.last_error}</p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4 justify-end">
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={runBackupMut.isPending || !backupStatus?.xlsx_exists}
            onClick={downloadBackup}
          >
            تحميل Excel
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={runBackupMut.isPending}
            onClick={() => runBackupMut.mutate()}
          >
            {runBackupMut.isPending ? 'جاري النسخ…' : 'نسخ الآن'}
          </button>
        </div>
      </GlassPanel>

      {SECTIONS.map((sec) => (
        <GlassPanel key={sec.id} title={`${sec.icon} ${sec.title}`} subtitle={sec.hint}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sec.fields.map((f) => (
              <div key={f.key} className={f.wide ? 'sm:col-span-2' : ''}>
                <label className="label text-xs">{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    rows={2}
                    value={form[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    type={f.type}
                    min={f.min}
                    max={f.max}
                    value={form[f.key] ?? ''}
                    onChange={(e) =>
                      set(
                        f.key,
                        f.type === 'number' ? Number(e.target.value) : e.target.value
                      )
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </GlassPanel>
      ))}

      <div
        className="flex flex-wrap gap-3 justify-end sticky bottom-0 py-3"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(9,11,18,0.92) 40%)' }}
      >
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setForm({ ...DEFAULT_APP_SETTINGS, ...serverSettings })}
          disabled={saveMut.isPending}
        >
          تراجع
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={saveMut.isPending}
          onClick={() => saveMut.mutate(form)}
        >
          {saveMut.isPending ? 'جاري الحفظ…' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  )
}
