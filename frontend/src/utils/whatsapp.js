/**
 * أدوات واتساب — روابط wa.me (click-to-chat) بلا أي API أو خطر حظر.
 * المستخدم يضغط الرابط → يفتح واتساب والرسالة جاهزة → يضغط إرسال.
 */
import { formatCurrency } from './format'

/**
 * يطبّع رقم الهاتف لصيغة wa.me (أرقام فقط، بلا + أو أصفار بادئة).
 * مثال: "0944 123 456" → "944123456" ، "+963 944..." → "963944..."
 */
export function toWaNumber(phone) {
  if (!phone) return ''
  let d = String(phone).replace(/[^\d]/g, '')
  d = d.replace(/^00/, '') // بادئة دولية 00
  d = d.replace(/^0+/, '') // أصفار بادئة محلية
  return d
}

/** يبني رابط wa.me؛ إن لم يوجد رقم يفتح واتساب بلا مستلم (يختاره المستخدم). */
export function waLink(phone, text) {
  const num = toWaNumber(phone)
  const t = encodeURIComponent(text || '')
  return num ? `https://wa.me/${num}?text=${t}` : `https://wa.me/?text=${t}`
}

/** قالب تذكير بالرصيد لتاجر/مخلص. */
export function buildReminderText(center, balance) {
  const name = center?.name || ''
  const grand = balance?.grand_total ?? balance?.balance ?? 0
  const lines = [
    `السيد ${name} المحترم،`,
    ``,
    `نذكّركم بأن الذمة المستحقة لدى مكتبنا: *${formatCurrency(grand)}*`,
  ]
  if (balance?.posted_undelivered_value) {
    lines.push(`منها سيارات مُرحَّلة قيد التسليم: ${formatCurrency(balance.posted_undelivered_value)}`)
  }
  lines.push('', 'نرجو التكرّم بالتسوية. وشكراً لتعاملكم معنا 🌹')
  return lines.join('\n')
}
