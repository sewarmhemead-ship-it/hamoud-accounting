/** إزالة محارف RTL/BOM والمسافات الزائدة من نص البحث */
function normalizeSearchQuery(q) {
  return String(q ?? '')
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** تقسيم البحث إلى كلمات — كل كلمة يجب أن تطابق أحد الحقول (AND) */
function searchTokens(q) {
  const normalized = normalizeSearchQuery(q)
  if (!normalized) return []
  return normalized.split(/\s+/).filter((t) => t.length > 0)
}

module.exports = { normalizeSearchQuery, searchTokens }
