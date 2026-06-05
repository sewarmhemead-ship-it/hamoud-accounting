const { TAX_RATE, SHIPMENT_FIELD_LABELS } = require('../config/constants')
const { CalculationError } = require('./errors')
const { toFiniteNumber, round2 } = require('./numbers')

/**
 * الأقلام المالية التي تُجمع لاحتساب مجموع تكلفة تخليص السيارة.
 * يطابق ترتيب كشف التاجر الفعلي (راجع docs/business-logic-from-excel.md).
 */
const CLEARANCE_COST_FIELDS = [
  'tarseem', // الترسيم
  'tax_2pct', // ضريبة 2%
  'service_fee', // خدمات المعبر (30$ غالباً)
  'workers', // عمال قلب
  'clearance_fee', // اتعاب
  'syrian_driver', // سائق سوري
  'turkish_transport', // سائق/نقل تركي
  'internal_transport', // نقل داخلي
  'door_receipt', // وصل دور
  'other_expenses', // مصاريف أخرى
]

/**
 * مجموع تكلفة تخليص سيارة = جمع كل الأقلام المالية الموجودة.
 * الأقلام الفارغة (null/undefined) تُعامل كصفر، والقيم غير الرقمية أو السالبة ترمي خطأ.
 *
 * @param {object} shipment كائن السيارة بالأقلام المالية
 * @returns {number} المجموع مقرّباً لمنزلتين
 */
function calculateShipmentTotal(shipment = {}) {
  if (shipment === null || typeof shipment !== 'object') {
    throw new CalculationError('بيانات السيارة غير صالحة')
  }

  let total = 0
  for (const field of CLEARANCE_COST_FIELDS) {
    const label = SHIPMENT_FIELD_LABELS[field] || field
    total += toFiniteNumber(shipment[field], label)
  }

  return round2(total)
}

/**
 * ضريبة 2% على الترسيم.
 * - عند تمرير قيمة صريحة (providedTax) تُستخدم كما هي (override يدوي) بعد التحقق.
 * - وإلا تُحتسب = الترسيم × 2%.
 *
 * @param {number|null|undefined} tarseem قيمة الترسيم
 * @param {number|null|undefined} [providedTax] قيمة ضريبة مُدخلة يدوياً (اختياري)
 * @returns {number} مبلغ الضريبة مقرّباً لمنزلتين
 */
function calculateTax2Pct(tarseem, providedTax) {
  if (providedTax !== null && providedTax !== undefined) {
    return round2(toFiniteNumber(providedTax, SHIPMENT_FIELD_LABELS.tax_2pct))
  }

  const base = toFiniteNumber(tarseem, SHIPMENT_FIELD_LABELS.tarseem)
  return round2(base * TAX_RATE)
}

/**
 * جدول رسوم جمركية افتراضية بالدولار لكل كيلوغرام حسب نوع البضاعة.
 * الأسماء تطابق seed أنواع البضائع (goods_types). يمكن تجاوزها بمعدل صريح.
 * هذه قيم مبدئية قابلة للتعديل من إعدادات الشركة لاحقاً.
 */
const CUSTOMS_RATE_PER_KG = {
  خضار: 0.05,
  فواكه: 0.07,
  طازج: 0.06,
  'مواد غذائية': 0.08,
  'مواد بناء': 0.03,
  أخرى: 0.1,
}

const DEFAULT_CUSTOMS_RATE_PER_KG = 0.1

/**
 * حساب الرسوم الجمركية بناءً على نوع البضاعة والوزن.
 *
 * الصيغة: الرسوم = الوزن (كغ) × المعدل لكل كغ.
 * - وزن صفر ⇒ رسوم صفر (حالة صحيحة، لا خطأ).
 * - وزن سالب أو غير رقمي ⇒ CalculationError.
 * - نوع غير معروف ⇒ يُستخدم المعدل الافتراضي.
 * - يمكن تمرير ratePerKg صريح لتجاوز الجدول (يجب أن يكون ≥ 0).
 *
 * @param {object} params
 * @param {string} [params.goodsType] اسم نوع البضاعة (عربي)
 * @param {number} params.weight الوزن بالكيلوغرام (≥ 0)
 * @param {number} [params.ratePerKg] معدل صريح لكل كغ يتجاوز الجدول
 * @returns {{ weight:number, ratePerKg:number, goodsType:(string|null), fee:number }}
 */
function calculateCustomsFee(params = {}) {
  if (params === null || typeof params !== 'object') {
    throw new CalculationError('مدخلات حساب الرسوم الجمركية غير صالحة')
  }

  const { goodsType = null, weight, ratePerKg } = params

  const safeWeight = toFiniteNumber(weight, 'الوزن')

  let rate
  if (ratePerKg !== null && ratePerKg !== undefined) {
    rate = toFiniteNumber(ratePerKg, 'المعدل لكل كغ')
  } else {
    const key = typeof goodsType === 'string' ? goodsType.trim() : ''
    rate = Object.prototype.hasOwnProperty.call(CUSTOMS_RATE_PER_KG, key)
      ? CUSTOMS_RATE_PER_KG[key]
      : DEFAULT_CUSTOMS_RATE_PER_KG
  }

  return {
    goodsType: goodsType ?? null,
    weight: safeWeight,
    ratePerKg: rate,
    fee: round2(safeWeight * rate),
  }
}

/**
 * الكشف المزدوج — راجع ورقتَي «مخلص» و«تاجر» في باب الهوى.
 * cost_*  = ما ندفعه نحن للمخلص.   price_* = ما نأخذه من التاجر.
 */
const COST_FIELDS = [
  'cost_tarseem',
  'cost_turkish_driver',
  'cost_clearance_fee',
  'cost_workers',
  'cost_service_fee',
  'cost_door_receipt',
  'cost_other',
]

const PRICE_FIELDS = [
  'price_tarseem',
  'price_syrian_driver',
  'price_clearance_fee',
  'price_workers',
  'price_service_fee',
  'price_door_receipt',
  'price_other',
]

const COST_FIELD_LABELS = {
  cost_tarseem: 'ترسيم',
  cost_turkish_driver: 'سائق/نقل تركي',
  cost_clearance_fee: 'تخليص',
  cost_workers: 'عمال',
  cost_service_fee: 'خدمات المعبر',
  cost_door_receipt: 'مكتب / وصل دور',
  cost_other: 'مصاريف أخرى',
}

const PRICE_FIELD_LABELS = {
  price_tarseem: 'ترسيم',
  price_syrian_driver: 'سائق سوري',
  price_clearance_fee: 'تخليص',
  price_workers: 'عمال',
  price_service_fee: 'خدمات أخرى',
  price_door_receipt: 'مكتب / وصل دور',
  price_other: 'مصاريف أخرى',
}

function sumFields(shipment, fields) {
  if (shipment === null || typeof shipment !== 'object') {
    throw new CalculationError('بيانات السيارة غير صالحة')
  }
  let total = 0
  for (const f of fields) {
    total += toFiniteNumber(shipment[f], COST_FIELD_LABELS[f] || PRICE_FIELD_LABELS[f] || f)
  }
  return round2(total)
}

/** مجموع ما يُدفع للمخلص (تكلفة الشركة). */
function calculateCostTotal(shipment) {
  return sumFields(shipment, COST_FIELDS)
}

/** مجموع ما يؤخذ من التاجر (فاتورة الشركة). */
function calculatePriceTotal(shipment) {
  return sumFields(shipment, PRICE_FIELDS)
}

/** مربح الشركة على السيارة = الفاتورة − التكلفة (قد يكون سالباً). */
function calculateShipmentProfit(shipment) {
  return round2(calculatePriceTotal(shipment) - calculateCostTotal(shipment))
}

/**
 * مصدر الحقيقة الوحيد لتحديد مجموع السيارة.
 *
 * إذا وُجدت أعمدة مزدوجة (cost_* أو price_*) → الكشف المزدوج:
 *   traderAmount   = فاتورة التاجر (price_*) — ما نأخذه
 *   clearanceAmount = تكلفة المخلص (cost_*) — ما ندفعه
 *
 * وإلا → الكشف الكلاسيكي:
 *   كلاهما = مجموع الأقلام العادية (totalCost)
 *
 * @param {object} shipment
 * @returns {{ traderAmount:number, clearanceAmount:number, isDual:boolean }}
 */
function resolveTotalCost(shipment) {
  const priceTotal = calculatePriceTotal(shipment)
  const costTotal  = calculateCostTotal(shipment)

  if (priceTotal > 0 || costTotal > 0) {
    return {
      traderAmount:    priceTotal,
      clearanceAmount: costTotal,
      isDual:          true,
    }
  }

  const legacy = calculateShipmentTotal(shipment)
  return {
    traderAmount:    legacy,
    clearanceAmount: legacy,
    isDual:          false,
  }
}

module.exports = {
  CLEARANCE_COST_FIELDS,
  CUSTOMS_RATE_PER_KG,
  DEFAULT_CUSTOMS_RATE_PER_KG,
  COST_FIELDS,
  PRICE_FIELDS,
  COST_FIELD_LABELS,
  PRICE_FIELD_LABELS,
  calculateShipmentTotal,
  calculateTax2Pct,
  calculateCustomsFee,
  calculateCostTotal,
  calculatePriceTotal,
  calculateShipmentProfit,
  resolveTotalCost,
}
