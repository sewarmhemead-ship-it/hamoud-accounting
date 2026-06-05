/** تحويل قيمة إلى رقم آمن (0 عند null/undefined/NaN) */
export const parseNum = (v) => parseFloat(v) || 0

export function formatCurrency(amount, currency = 'USD') {
  const num = Number(amount) || 0
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (currency === 'USD') return `$${formatted}`
  if (currency === 'SYP') return `${formatted} ل.س`
  if (currency === 'TRY') return `₺${formatted}`
  return formatted
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return dateStr.split('T')[0]
}

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}
