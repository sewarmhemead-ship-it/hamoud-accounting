const { CalculationError } = require('./errors')

/**
 * يحوّل قيمة إلى رقم آمن للحسابات المالية.
 * - null/undefined → القيمة الافتراضية (0 افتراضياً) دون خطأ، لأن الأقلام قد تكون فارغة.
 * - رقم منتهٍ (finite) → يُعاد كما هو.
 * - أي شيء آخر (نص، NaN، Infinity، كائن) → CalculationError.
 *
 * @param {*} value القيمة المُدخلة
 * @param {string} fieldLabel اسم الحقل للرسالة العربية
 * @param {object} [opts]
 * @param {number} [opts.fallback=0] القيمة عند null/undefined
 * @param {boolean} [opts.allowNegative=false] السماح بالقيم السالبة
 * @returns {number}
 */
function toFiniteNumber(value, fieldLabel, opts = {}) {
  const { fallback = 0, allowNegative = false } = opts

  if (value === null || value === undefined || value === '') {
    return fallback
  }

  // نرفض القيم المنطقية صراحةً (true/false تتحول لأرقام بصمت في JS)
  if (typeof value === 'boolean') {
    throw new CalculationError(`قيمة غير صالحة في الحقل «${fieldLabel}»`, {
      field: fieldLabel,
      value,
    })
  }

  const num = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(num)) {
    throw new CalculationError(`قيمة غير صالحة في الحقل «${fieldLabel}»`, {
      field: fieldLabel,
      value,
    })
  }

  if (!allowNegative && num < 0) {
    throw new CalculationError(`لا يُسمح بقيمة سالبة في الحقل «${fieldLabel}»`, {
      field: fieldLabel,
      value: num,
    })
  }

  return num
}

/**
 * تقريب مالي إلى منزلتين عشريتين مع تفادي أخطاء الفاصلة العائمة.
 * round2(0.1 + 0.2) === 0.3
 * @param {number} value
 * @returns {number}
 */
function round2(value) {
  if (!Number.isFinite(value)) {
    throw new CalculationError('ناتج حسابي غير صالح')
  }
  // الضرب بـ(1 + Number.EPSILON) يصحّح حالات مثل 1.005
  return Math.round((value + Number.EPSILON) * 100) / 100
}

module.exports = { toFiniteNumber, round2 }
