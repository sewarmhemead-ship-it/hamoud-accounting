const {
  SHIPMENT_FIELD_LABELS,
  SHIPMENT_REQUIRED_FIELDS,
  SHIPMENT_STATUS,
  CENTER_TYPE,
} = require('../config/constants')
const { CalculationError } = require('./errors')
const { toFiniteNumber, round2 } = require('./numbers')
const {
  COST_FIELDS,
  PRICE_FIELDS,
  COST_FIELD_LABELS,
  PRICE_FIELD_LABELS,
  calculateCostTotal,
  calculatePriceTotal,
  calculateShipmentTotal,
  resolveTotalCost,
} = require('./clearance')
const {
  hasActiveDualLedger,
  missingRequiredFields,
} = require('./dualLedger')

/**
 * الترتيب القياسي لأعمدة التكلفة في كشف التخليص (يطابق ترتيب كشوف المخلصين الفعلية:
 * باب الهوى / تل ابيض / الراعي). الكشف يعرض فقط الأعمدة التي فيها بيانات فعلية،
 * فيظهر تلقائياً «بنفس ترتيبة» المخلص دون إعداد يدوي.
 */
const CLEARANCE_FIELD_ORDER = [
  'turkish_transport', // اجار / نقل تركي
  'tarseem', // الترسيم
  'tax_2pct', // ضريبة 2%
  'service_fee', // خدمات المعبر 30$
  'workers', // عمال
  'door_receipt', // مكتب / وصل دور
  'clearance_fee', // تخليص / اتعاب
  'syrian_driver', // اجار سائق سوري
  'internal_transport', // نقل داخلي
  'other_expenses', // مصاريف أخرى
]

const POSTABILITY = {
  INCOMPLETE: 'incomplete', // غير مكتملة — أقلام ناقصة، لا تُرحَّل
  POSTABLE: 'postable', // قابلة للترحيل — اكتملت وتنتظر القرار
  POSTED: 'posted', // مُرحَّلة — دخلت الكشف
  DELIVERED: 'delivered', // مُسلَّمة
}

const POSTABILITY_LABEL = {
  [POSTABILITY.INCOMPLETE]: 'غير مكتملة',
  [POSTABILITY.POSTABLE]: 'قابلة للترحيل',
  [POSTABILITY.POSTED]: 'مُرحَّلة',
  [POSTABILITY.DELIVERED]: 'مُسلَّمة',
}

/**
 * يحدّد قابلية ترحيل سيارة: مُرحَّلة/مُسلَّمة تبقى كما هي، وإلا يُفحَص اكتمال
 * الأقلام الإلزامية. الأقلام الناقصة تُعاد بأسمائها العربية.
 *
 * @param {object} shipment
 * @param {string[]} [requiredFields]
 * @returns {{ state:string, label:string, missing:string[], is_postable:boolean }}
 */
function classifyPostability(
  shipment = {},
  requiredFields = SHIPMENT_REQUIRED_FIELDS.required
) {
  if (shipment === null || typeof shipment !== 'object') {
    throw new CalculationError('بيانات السيارة غير صالحة')
  }

  if (shipment.status === SHIPMENT_STATUS.DELIVERED) {
    return { state: POSTABILITY.DELIVERED, label: POSTABILITY_LABEL.delivered, missing: [], is_postable: false }
  }
  if (shipment.status === SHIPMENT_STATUS.POSTED) {
    return { state: POSTABILITY.POSTED, label: POSTABILITY_LABEL.posted, missing: [], is_postable: false }
  }

  const missing = missingRequiredFields(shipment, requiredFields)

  const state = missing.length === 0 ? POSTABILITY.POSTABLE : POSTABILITY.INCOMPLETE
  return {
    state,
    label: POSTABILITY_LABEL[state],
    missing,
    is_postable: state === POSTABILITY.POSTABLE,
  }
}

/**
 * يكتشف أعمدة التكلفة المستخدمة فعلياً عبر سيارات الكشف (قيمة غير صفرية ولو مرة).
 * يُعاد بالترتيب القياسي مع التسميات العربية لعرضها كرؤوس أعمدة.
 *
 * @param {object[]} shipments
 * @returns {{ key:string, label:string }[]}
 */
function detectCostColumns(shipments = []) {
  const usedLegacy = new Set()
  const usedDual = new Set()
  for (const s of shipments) {
    for (const field of CLEARANCE_FIELD_ORDER) {
      const v = s[field]
      if (v !== null && v !== undefined && Number(v) !== 0) usedLegacy.add(field)
    }
    if (hasActiveDualLedger(s)) {
      for (const field of COST_FIELDS) {
        const v = s[field]
        if (v !== null && v !== undefined && Number(v) !== 0) usedDual.add(field)
      }
    }
  }

  if (usedDual.size > 0) {
    return COST_FIELDS.filter((f) => usedDual.has(f)).map((f) => ({
      key: f,
      label: COST_FIELD_LABELS[f] || f,
    }))
  }

  return CLEARANCE_FIELD_ORDER.filter((f) => usedLegacy.has(f)).map((f) => ({
    key: f,
    label: SHIPMENT_FIELD_LABELS[f] || f,
  }))
}

function truckRow(shipment, requiredFields) {
  const postability = classifyPostability(shipment, requiredFields)
  const { clearanceAmount } = resolveTotalCost(shipment)

  let costs = {}
  if (hasActiveDualLedger(shipment)) {
    for (const field of COST_FIELDS) {
      costs[field] = toFiniteNumber(shipment[field], COST_FIELD_LABELS[field] || field)
    }
  } else {
    for (const field of CLEARANCE_FIELD_ORDER) {
      costs[field] = toFiniteNumber(shipment[field], SHIPMENT_FIELD_LABELS[field] || field)
    }
  }
  const total = hasActiveDualLedger(shipment)
    ? round2(calculateCostTotal(shipment))
    : round2(calculateShipmentTotal(shipment))
  const displayTotal = clearanceAmount > 0 || hasActiveDualLedger(shipment) ? clearanceAmount : total

  return {
    kind: 'truck',
    id: shipment.id,
    ref_number: shipment.ref_number || null,
    date: shipment.entry_date || null,
    goods_name: shipment.goods_name || null,
    trader: shipment.center_name || null,
    border: shipment.border_name || null,
    source: shipment.source || null,
    destination: shipment.destination || null,
    weight: shipment.weight ?? null,
    quantity: shipment.quantity ?? null,
    costs,
    total: displayTotal,
    state: postability.state,
    state_label: postability.label,
    missing: postability.missing,
    is_postable: postability.is_postable,
  }
}

function paymentRow(payment) {
  const isOffset = payment.category === 'offset'
  return {
    kind: isOffset ? 'offset_payment' : 'payment',
    id: payment.id,
    ref_number: payment.ref_number || null,
    date: payment.date || null,
    label: payment.notes || (isOffset ? 'مقاصة' : 'دفعة'),
    amount: round2(toFiniteNumber(payment.amount_usd ?? payment.amount, 'مبلغ الدفعة')),
    tx_type: payment.type || null,
    category: payment.category || null,
  }
}

function offsetChargeRow(tx) {
  return {
    kind: 'offset_charge',
    id: tx.id,
    ref_number: tx.ref_number || null,
    date: tx.date || null,
    label: tx.notes || 'مقاصة',
    amount: round2(toFiniteNumber(tx.amount_usd ?? tx.amount, 'مبلغ المقاصة')),
    tx_type: tx.type || null,
    category: tx.category || null,
  }
}

function sortByDate(a, b) {
  const da = a.date || ''
  const db = b.date || ''
  if (da !== db) return da < db ? -1 : 1
  return (a.id || 0) - (b.id || 0)
}

/**
 * يبني كشف المخلص الموحّد على نمط ملفات Excel:
 * سطور السيارات + سطور الدفعات متشابكة حسب التاريخ، مع تذييل بالمجاميع والرصيد،
 * وفصل السيارات غير المُرحَّلة إلى «قابلة للترحيل» و«غير مكتملة».
 *
 * صيغة الرصيد المُرحَّل = Σ(مجموع السيارات المُرحَّلة/المُسلَّمة) − Σ(الدفعات).
 * الإشارة تُترجَم حسب نوع المركز: للمخلص الموجب = «علينا»، لغيره الموجب = «لنا».
 *
 * @param {object} params
 * @param {object[]} [params.shipments] سيارات يخلّصها هذا المركز
 * @param {object[]} [params.payments] حركات/دفعات على هذا المركز
 * @param {string} [params.centerType] نوع المركز (broker/trader...)
 * @param {string[]} [params.requiredFields]
 * @returns {object} كشف مفصّل
 */
function buildBrokerStatement({
  shipments = [],
  payments = [],
  offsetCharges = [],
  centerType = CENTER_TYPE.BROKER,
  requiredFields = SHIPMENT_REQUIRED_FIELDS.required,
} = {}) {
  if (!Array.isArray(shipments) || !Array.isArray(payments) || !Array.isArray(offsetCharges)) {
    throw new CalculationError('بيانات الكشف غير صالحة')
  }

  const truckRows = shipments.map((s) => truckRow(s, requiredFields))
  const paymentRows = payments.map(paymentRow)
  const offsetChargeRows = offsetCharges.map(offsetChargeRow)

  // الكشف الفعلي (Ledger): السيارات المُرحَّلة/المُسلَّمة + مقاصة (out) + الدفعات/مقاصة (in)
  const postedTrucks = truckRows.filter(
    (r) => r.state === POSTABILITY.POSTED || r.state === POSTABILITY.DELIVERED
  )
  const ledgerRows = [...postedTrucks, ...offsetChargeRows, ...paymentRows].sort(sortByDate)

  const chargesPosted = round2(
    postedTrucks.reduce((a, r) => a + r.total, 0) +
      offsetChargeRows.reduce((a, r) => a + r.amount, 0)
  )
  const paymentsTotal = round2(paymentRows.reduce((a, r) => a + r.amount, 0))
  const balance = round2(chargesPosted - paymentsTotal)

  const isBroker = centerType === CENTER_TYPE.BROKER
  // للمخلص: الموجب يعني أننا مدينون له (علينا). لغيره: الموجب يعني له علينا دين لصالحنا (لنا).
  const weOwe = isBroker ? balance > 0 : balance < 0
  const direction =
    balance === 0 ? 'متوازن' : weOwe ? 'علينا' : 'لنا'

  // قيد التطوير (WIP): غير مُرحَّلة بعد
  const postable = truckRows.filter((r) => r.state === POSTABILITY.POSTABLE)
  const incomplete = truckRows.filter((r) => r.state === POSTABILITY.INCOMPLETE)

  return {
    columns: detectCostColumns(shipments),
    rows: ledgerRows,
    totals: {
      charges_posted: chargesPosted,
      payments_total: paymentsTotal,
      balance,
      abs_balance: round2(Math.abs(balance)),
      direction,
      we_owe: weOwe,
      truck_count: postedTrucks.length,
      payment_count: paymentRows.length,
    },
    wip: {
      postable: {
        rows: postable,
        count: postable.length,
        total: round2(postable.reduce((a, r) => a + r.total, 0)),
        ids: postable.map((r) => r.id),
      },
      incomplete: {
        rows: incomplete,
        count: incomplete.length,
        total: round2(incomplete.reduce((a, r) => a + r.total, 0)),
      },
    },
  }
}

/* ───────────────────────── الكشف المزدوج (مخلص + تاجر) ───────────────────────── */

function dualSideColumns(shipments, fields, labels) {
  const used = new Set()
  for (const s of shipments) {
    for (const f of fields) {
      const v = s[f]
      if (v !== null && v !== undefined && Number(v) !== 0) used.add(f)
    }
  }
  return fields.filter((f) => used.has(f)).map((f) => ({ key: f, label: labels[f] || f }))
}

function dualTruckRow(shipment, requiredFields) {
  const costTotal = calculateCostTotal(shipment)
  const priceTotal = calculatePriceTotal(shipment)
  const postability = classifyPostability(shipment, requiredFields)
  return {
    kind: 'truck',
    id: shipment.id,
    ref_number: shipment.ref_number || null,
    date: shipment.entry_date || null,
    goods_name: shipment.goods_name || null,
    trader: shipment.center_name || null,
    source: shipment.source || null,
    destination: shipment.destination || null,
    cost: COST_FIELDS.reduce((o, f) => ((o[f] = toFiniteNumber(shipment[f], COST_FIELD_LABELS[f])), o), {}),
    price: PRICE_FIELDS.reduce((o, f) => ((o[f] = toFiniteNumber(shipment[f], PRICE_FIELD_LABELS[f])), o), {}),
    cost_total: costTotal,
    price_total: priceTotal,
    profit: round2(priceTotal - costTotal),
    state: postability.state,
    state_label: postability.label,
    missing: postability.missing,
    is_postable: postability.is_postable,
  }
}

/**
 * يبني الكشف المزدوج لمركز تخليص (مخلص): جانب «المخلص» (ما ندفعه = cost_*) وجانب
 * «التاجر» (ما نأخذه = price_*)، ومنه مربح الشركة = فاتورة التاجر − تكلفة المخلص.
 *
 * مرجع باب الهوى: مجموع التاجر 237675 − مجموع المخلص 235365 = 2310 ربح إجمالي.
 *
 * @param {object} params
 * @param {object[]} [params.shipments] سيارات يخلّصها هذا المركز (تحوي أعمدة cost و price)
 * @param {object[]} [params.brokerPayments] دفعات «وارد» على ذمة المخلص
 * @param {object[]} [params.traderPayments] دفعات «وارد» من التجّار على هذه السيارات
 * @param {string[]} [params.requiredFields]
 * @returns {object} { broker_side, trader_side, company_profit, wip }
 */
function buildDualStatement({
  shipments = [],
  brokerPayments = [],
  traderPayments = [],
  requiredFields = SHIPMENT_REQUIRED_FIELDS.required,
} = {}) {
  if (
    !Array.isArray(shipments) ||
    !Array.isArray(brokerPayments) ||
    !Array.isArray(traderPayments)
  ) {
    throw new CalculationError('بيانات الكشف المزدوج غير صالحة')
  }

  const truckRows = shipments.map((s) => dualTruckRow(s, requiredFields))
  const posted = truckRows.filter(
    (r) => r.state === POSTABILITY.POSTED || r.state === POSTABILITY.DELIVERED
  )

  const brokerPayRows = brokerPayments.map(paymentRow)
  const traderPayRows = traderPayments.map(paymentRow)

  const costCharges = round2(posted.reduce((a, r) => a + r.cost_total, 0))
  const priceCharges = round2(posted.reduce((a, r) => a + r.price_total, 0))
  const brokerPaid = round2(brokerPayRows.reduce((a, r) => a + r.amount, 0))
  const traderPaid = round2(traderPayRows.reduce((a, r) => a + r.amount, 0))

  const brokerBalance = round2(costCharges - brokerPaid)
  const traderBalance = round2(priceCharges - traderPaid)

  const brokerRows = [...posted, ...brokerPayRows].sort(sortByDate)
  const traderRows = [...posted, ...traderPayRows].sort(sortByDate)

  const profitTotal = round2(priceCharges - costCharges)
  const truckCount = posted.length

  const postable = truckRows.filter((r) => r.state === POSTABILITY.POSTABLE)
  const incomplete = truckRows.filter((r) => r.state === POSTABILITY.INCOMPLETE)

  return {
    broker_side: {
      label: 'كشف المخلص (ما ندفعه)',
      columns: dualSideColumns(shipments, COST_FIELDS, COST_FIELD_LABELS),
      rows: brokerRows,
      total_charges: costCharges,
      total_payments: brokerPaid,
      balance: brokerBalance,
      abs_balance: round2(Math.abs(brokerBalance)),
      // المخلص: الموجب يعني علينا دين له
      direction: brokerBalance === 0 ? 'متوازن' : brokerBalance > 0 ? 'علينا' : 'لنا',
    },
    trader_side: {
      label: 'كشف التاجر (ما نأخذه)',
      columns: dualSideColumns(shipments, PRICE_FIELDS, PRICE_FIELD_LABELS),
      rows: traderRows,
      total_charges: priceCharges,
      total_payments: traderPaid,
      balance: traderBalance,
      abs_balance: round2(Math.abs(traderBalance)),
      // التاجر: الموجب يعني له علينا فاتورة لم تُسدَّد ⇒ على التاجر
      direction: traderBalance === 0 ? 'متوازن' : traderBalance > 0 ? 'على التاجر' : 'لنا',
    },
    company_profit: {
      total: profitTotal,
      truck_count: truckCount,
      per_truck_avg: truckCount ? round2(profitTotal / truckCount) : 0,
    },
    wip: {
      postable: {
        count: postable.length,
        ids: postable.map((r) => r.id),
        cost_total: round2(postable.reduce((a, r) => a + r.cost_total, 0)),
        price_total: round2(postable.reduce((a, r) => a + r.price_total, 0)),
      },
      incomplete: {
        count: incomplete.length,
        rows: incomplete,
      },
    },
  }
}

module.exports = {
  CLEARANCE_FIELD_ORDER,
  POSTABILITY,
  POSTABILITY_LABEL,
  classifyPostability,
  detectCostColumns,
  buildBrokerStatement,
  buildDualStatement,
}
