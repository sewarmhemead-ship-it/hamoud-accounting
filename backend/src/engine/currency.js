const { CURRENCY } = require('../config/constants')
const { CalculationError } = require('./errors')
const { toFiniteNumber, round2 } = require('./numbers')

/**
 * تحويل مبلغ إلى الدولار الأمريكي (USD) — العملة الأساسية للنظام.
 *
 * اصطلاح سعر الصرف (مهم):
 *   exchange_rate = عدد وحدات العملة المحلية مقابل 1 دولار
 *   (أي «سعر صرف الدولار»: 1 USD = exchange_rate من SYP/TRY).
 *   لذلك: amount_usd = amount / exchange_rate
 *
 * - عند currency = USD: لا حاجة لسعر صرف، والنتيجة = المبلغ نفسه (rate = 1).
 * - عند عملة أخرى: سعر الصرف مطلوب ويجب أن يكون > 0 (تفادي القسمة على صفر).
 * - مبلغ سالب غير مسموح (الدفعات/الاستحقاقات تُعالَج بالنوع لا بالإشارة).
 *
 * @param {number} amount المبلغ بالعملة الأصلية (≥ 0)
 * @param {string} [currency='USD'] رمز العملة (USD/SYP/TRY)
 * @param {number} [exchangeRate] سعر صرف الدولار بالعملة المحلية (مطلوب لغير USD)
 * @returns {{ amount:number, currency:string, exchange_rate:number, amount_usd:number }}
 */
function convertToUsd(amount, currency = CURRENCY.USD, exchangeRate) {
  const safeAmount = toFiniteNumber(amount, 'المبلغ')
  const code = (currency || CURRENCY.USD).toString().toUpperCase()

  if (code === CURRENCY.USD) {
    return {
      amount: round2(safeAmount),
      currency: CURRENCY.USD,
      exchange_rate: 1,
      amount_usd: round2(safeAmount),
    }
  }

  if (exchangeRate === null || exchangeRate === undefined) {
    throw new CalculationError(`سعر الصرف مطلوب لتحويل ${code} إلى دولار`, {
      currency: code,
    })
  }

  const rate = toFiniteNumber(exchangeRate, 'سعر الصرف')
  if (rate <= 0) {
    throw new CalculationError('سعر الصرف يجب أن يكون أكبر من صفر', {
      currency: code,
      exchange_rate: rate,
    })
  }

  return {
    amount: round2(safeAmount),
    currency: code,
    exchange_rate: rate,
    amount_usd: round2(safeAmount / rate),
  }
}

module.exports = { convertToUsd }
