const { parseDateFromText, parseMonthFromText } = require('./assistantDateParse')
const { todayDB } = require('./dates')

/**
 * تصنيف سؤال عربي — قواعد فقط (بدون نموذج خارجي).
 * @returns {{ intent: string, date: string|null, month: {year,month}|null, centerQuery: string|null }}
 */
function classifyQuestion(question) {
  const q = String(question || '').trim().toLowerCase()
  const date = parseDateFromText(q) || (/مربح|ميزان|ربح|إغلاق|اغلاق/i.test(q) ? todayDB() : null)
  const month = parseMonthFromText(q)

  let centerQuery = null
  const codeMatch = q.match(/(?:تاجر|مركز|كود)\s*[#:]?\s*(\d{2,5})/i)
  if (codeMatch) centerQuery = codeMatch[1]
  const nameMatch = q.match(/(?:تاجر|مركز)\s+([^\s؟?،,]+)/i)
  if (!centerQuery && nameMatch) centerQuery = nameMatch[1]

  if (/ذمة|رصيد|كشف|مدين|دائن/i.test(q) && /تاجر|مركز|\d{2,}/i.test(q)) {
    return { intent: 'center_balance', date, month, centerQuery }
  }

  if (/ميزان|مربح|ربح|إيراد|صافي|إغلاق اليوم|الميزانية/i.test(q)) {
    if (month && !/يوم|اليوم|تاريخ/.test(q)) {
      return { intent: 'profit_month', date, month, centerQuery }
    }
    return { intent: 'profit_day', date: date || todayDB(), month, centerQuery }
  }

  if (/شو صار|ماذا حدث|ملخص|حدث|صار ب/i.test(q) && (date || /تاريخ/.test(q))) {
    return { intent: 'day_summary', date: date || todayDB(), month, centerQuery }
  }

  if (/شهر|شهري|monthly/i.test(q) && month) {
    return { intent: 'profit_month', date, month, centerQuery }
  }

  if (date) {
    return { intent: 'day_summary', date, month, centerQuery }
  }

  return { intent: 'help', date: null, month: null, centerQuery }
}

module.exports = { classifyQuestion }
