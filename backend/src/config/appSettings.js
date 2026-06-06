/**
 * إعدادات التطبيق — لا تغيّر محرك الحساب (balance / dailyProfit / clearance totals).
 * تؤثر على: العلامة التجارية، التقارير، عتبات التنبيهات، قيم افتراضية للواجهة فقط.
 */
const DEFAULT_APP_SETTINGS = {
  company_name_ar: 'شركة الحمود التجارية للنقل الدولي',
  company_name_en: 'Hamoud International Transport',
  app_title: 'حمود',
  app_subtitle: 'نظام التخليص الجمركي',
  report_footer: '',
  company_phone: '',
  company_address: '',
  /** عتبات التنبيهات — لا علاقة لها بمحرك الذمة */
  notification_wip_overdue_days: 7,
  notification_inventory_stale_days: 14,
  notification_high_balance_usd: 50000,
  /** تلميح عند إنشاء سيارة جديدة فقط — لا يُعاد حساب سيارات قديمة */
  default_service_fee_usd: 30,
  /** نسخ احتياطي تلقائي — نسخة قاعدة بيانات كاملة مؤرّخة (انظر BackupService) */
  backup_auto_enabled: false,
  backup_interval_hours: 0.5,
  backup_include_db: true,
  /** مجلدات وجهة إضافية ينسخ إليها المستخدم (قرص خارجي، OneDrive، شبكة...) */
  backup_destinations: [],
  /** عدد النسخ المؤرّخة المحفوظة في كل مجلد (سياسة الاحتفاظ) */
  backup_keep_copies: 30,
}

const NUMERIC_KEYS = new Set([
  'notification_wip_overdue_days',
  'notification_inventory_stale_days',
  'notification_high_balance_usd',
  'default_service_fee_usd',
  'backup_interval_hours',
  'backup_keep_copies',
])

const BOOLEAN_KEYS = new Set(['backup_auto_enabled', 'backup_include_db'])

const ARRAY_KEYS = new Set(['backup_destinations'])

const MAX_DESTINATIONS = 5

const STRING_KEYS = new Set([
  'company_name_ar',
  'company_name_en',
  'app_title',
  'app_subtitle',
  'report_footer',
  'company_phone',
  'company_address',
])

const ALL_KEYS = [...STRING_KEYS, ...NUMERIC_KEYS, ...BOOLEAN_KEYS, ...ARRAY_KEYS]

/** يطبّع قائمة مجلدات الوجهة: نصوص غير فارغة، منزوعة التكرار، بحد أقصى. */
function normalizeDestinations(raw) {
  let arr = raw
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr)
    } catch {
      arr = arr.split('\n')
    }
  }
  if (!Array.isArray(arr)) return []
  const seen = new Set()
  const out = []
  for (const item of arr) {
    const p = String(item ?? '').trim()
    if (!p || seen.has(p)) continue
    seen.add(p)
    out.push(p)
    if (out.length >= MAX_DESTINATIONS) break
  }
  return out
}

function mergeSettings(stored = {}) {
  const out = { ...DEFAULT_APP_SETTINGS }
  for (const key of ALL_KEYS) {
    if (stored[key] === undefined || stored[key] === null) continue
    if (BOOLEAN_KEYS.has(key)) {
      out[key] = stored[key] === true || stored[key] === 'true' || stored[key] === 1
    } else if (NUMERIC_KEYS.has(key)) {
      const n = Number(stored[key])
      if (Number.isFinite(n)) out[key] = n
    } else if (ARRAY_KEYS.has(key)) {
      out[key] = normalizeDestinations(stored[key])
    } else if (typeof stored[key] === 'string') {
      out[key] = stored[key].trim()
    }
  }
  return out
}

/**
 * @param {object} patch حقول للتحديث
 * @returns {{ settings: object, errors: string[] }}
 */
function validateSettingsPatch(patch) {
  const errors = []
  const next = {}

  for (const [key, raw] of Object.entries(patch || {})) {
    if (!ALL_KEYS.includes(key)) {
      errors.push(`حقل غير معروف: ${key}`)
      continue
    }
    if (BOOLEAN_KEYS.has(key)) {
      next[key] = raw === true || raw === 'true' || raw === 1 || raw === '1'
      continue
    }
    if (ARRAY_KEYS.has(key)) {
      const dests = normalizeDestinations(raw)
      if (dests.some((d) => d.length > 500)) {
        errors.push(`${key}: مسار طويل جداً`)
        continue
      }
      next[key] = dests
      continue
    }
    if (NUMERIC_KEYS.has(key)) {
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 0) {
        errors.push(`${key}: يجب أن يكون رقماً موجباً`)
        continue
      }
      if (key === 'backup_interval_hours') {
        if (n < 0.5 || n > 24) {
          errors.push(`${key}: بين 0.5 و 24 ساعة`)
          continue
        }
        const halfSteps = Math.round(n * 2)
        if (Math.abs(halfSteps / 2 - n) > 0.001) {
          errors.push(`${key}: مضاعفات 0.5 ساعة فقط`)
          continue
        }
        next[key] = halfSteps / 2
        continue
      }
      if (key.includes('days') && (n < 1 || n > 365)) {
        errors.push(`${key}: بين 1 و 365 يوماً`)
        continue
      }
      if (key === 'backup_keep_copies') {
        if (n < 1 || n > 365) {
          errors.push(`${key}: بين 1 و 365 نسخة`)
          continue
        }
        next[key] = Math.round(n)
        continue
      }
      if (key === 'default_service_fee_usd' && n > 10_000) {
        errors.push(`${key}: قيمة كبيرة جداً`)
        continue
      }
      next[key] = Math.round(n * 100) / 100
    } else {
      const s = String(raw ?? '').trim()
      if (key === 'company_name_ar' && s.length < 2) {
        errors.push('اسم الشركة (عربي) مطلوب')
        continue
      }
      if (key === 'app_title' && s.length < 1) {
        errors.push('عنوان التطبيق مطلوب')
        continue
      }
      if (s.length > 500) {
        errors.push(`${key}: نص طويل جداً`)
        continue
      }
      next[key] = s
    }
  }

  return { settings: next, errors }
}

function brandingFromSettings(settings) {
  const s = settings || DEFAULT_APP_SETTINGS
  return {
    app_title: s.app_title,
    app_subtitle: s.app_subtitle,
    company_name_ar: s.company_name_ar,
    company_name_en: s.company_name_en,
  }
}

module.exports = {
  DEFAULT_APP_SETTINGS,
  ALL_KEYS,
  NUMERIC_KEYS,
  BOOLEAN_KEYS,
  mergeSettings,
  validateSettingsPatch,
  brandingFromSettings,
}
