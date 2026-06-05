const { SHIPMENT_FIELD_LABELS } = require('./constants')
const { COST_FIELD_LABELS, PRICE_FIELD_LABELS } = require('../engine/clearance')

function withSuffix(labels, suffix) {
  const out = {}
  for (const [key, label] of Object.entries(labels)) {
    out[key] = `${label} (${suffix})`
  }
  return out
}

/** كل أسماء حقول السيارة المعروضة للمستخدم (عربي) */
const ALL_SHIPMENT_FIELD_LABELS = {
  ...SHIPMENT_FIELD_LABELS,
  ...withSuffix(COST_FIELD_LABELS, 'تكلفة'),
  ...withSuffix(PRICE_FIELD_LABELS, 'فاتورة'),
  notes: 'ملاحظات',
  goods_name: 'البضاعة',
  source: 'المصدر',
  destination: 'الوجهة',
  weight: 'الوزن',
  driver_name: 'اسم السائق',
  total_cost: 'المجموع',
}

module.exports = { ALL_SHIPMENT_FIELD_LABELS }
