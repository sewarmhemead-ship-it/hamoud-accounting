/**
 * نص بحث آمن لـ instr/LIKE — يزيل محارف البحث الخاصة (% _ \).
 */
function searchLiteral(term) {
  const raw = String(term ?? '').trim()
  if (!raw) return null
  const cleaned = raw.replace(/[%_\\]/g, '')
  return cleaned || null
}

/** @deprecated استخدم searchLiteral — للتوافق مع الاختبارات القديمة */
function likePattern(term) {
  return searchLiteral(term)
}

module.exports = { searchLiteral, likePattern }
