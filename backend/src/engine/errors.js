/**
 * أخطاء محرك الحسابات.
 * تُرمى عند مدخلات غير صالحة أو حالات حسابية مستحيلة (قسمة على صفر مثلاً)
 * ثم تُحوَّل في الطبقة الأعلى إلى BusinessRuleError برسالة عربية للمستخدم.
 */
class CalculationError extends Error {
  /**
   * @param {string} message رسالة عربية واضحة للمستخدم
   * @param {object} [meta] بيانات إضافية للتشخيص (الحقل، القيمة...)
   */
  constructor(message, meta = {}) {
    super(message)
    this.name = 'CalculationError'
    this.meta = meta
  }
}

module.exports = { CalculationError }
