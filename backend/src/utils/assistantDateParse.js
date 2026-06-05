const { todayDB } = require('./dates')

/** يوم واحد YYYY-MM-DD */
function parseDateFromText(text) {
  const t = String(text || '').trim()

  if (/اليوم|هالليوم|today/i.test(t)) return todayDB()

  if (/أمس|امس|yesterday/i.test(t)) {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }

  const iso = t.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/)
  if (iso) {
    const y = iso[1]
    const m = String(iso[2]).padStart(2, '0')
    const day = String(iso[3]).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const dmy = t.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2}|\d{2})\b/)
  if (dmy) {
    let y = dmy[3]
    if (y.length === 2) y = `20${y}`
    const m = String(dmy[2]).padStart(2, '0')
    const day = String(dmy[1]).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  return null
}

/** شهر YYYY-MM من نص مثل 2026-06 أو يونيو 2026 */
function parseMonthFromText(text) {
  const t = String(text || '')
  const ym = t.match(/\b(20\d{2})-(\d{1,2})\b/)
  if (ym) return { year: parseInt(ym[1], 10), month: parseInt(ym[2], 10) }

  const now = new Date()
  const arMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ]
  for (let i = 0; i < arMonths.length; i++) {
    if (t.includes(arMonths[i])) {
      const yMatch = t.match(/20\d{2}/)
      return {
        year: yMatch ? parseInt(yMatch[0], 10) : now.getFullYear(),
        month: i + 1,
      }
    }
  }
  return null
}

module.exports = { parseDateFromText, parseMonthFromText }
