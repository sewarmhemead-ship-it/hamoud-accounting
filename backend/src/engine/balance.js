const { toFiniteNumber, round2 } = require('./numbers')

/**
 * رصيد ذمة المركز (تاجر/مخلص...).
 *   الرصيد = مجموع الاستحقاقات (out) − مجموع الدفعات (in)
 *   موجب ⇒ «لنا» على المركز، سالب ⇒ «علينا» للمركز.
 *
 * @param {number} totalOut مجموع قيود الصرف/الاستحقاق
 * @param {number} totalIn مجموع الدفعات الواردة
 * @returns {number} الرصيد مقرّباً لمنزلتين (قد يكون سالباً)
 */
function calculateCenterBalance(totalOut, totalIn) {
  const out = toFiniteNumber(totalOut, 'مجموع الاستحقاقات', { allowNegative: true })
  const inn = toFiniteNumber(totalIn, 'مجموع الدفعات', { allowNegative: true })
  return round2(out - inn)
}

/**
 * المجموع الكلي للذمة شاملاً السيارات المُرحَّلة وغير المُسلَّمة بعد.
 *   الإجمالي = الرصيد + قيمة السيارات المُرحَّلة غير المُسلَّمة
 *
 * @param {number} balance الرصيد الحالي
 * @param {number} postedUndelivered قيمة المُرحَّل غير المُسلَّم
 * @returns {number} مقرّباً لمنزلتين
 */
function calculateGrandTotal(balance, postedUndelivered) {
  const b = toFiniteNumber(balance, 'الرصيد', { allowNegative: true })
  const p = toFiniteNumber(postedUndelivered, 'المُرحَّل غير المُسلَّم', {
    allowNegative: true,
  })
  return round2(b + p)
}

module.exports = { calculateCenterBalance, calculateGrandTotal }
