// الحقول المزدوجة — مرآة engine/clearance.js COST_FIELDS / PRICE_FIELDS
export const DUAL_COST_FIELDS = [
  ['cost_tarseem',        'ترسيم (تكلفة)'],
  ['cost_turkish_driver', 'سائق/نقل تركي (تكلفة)'],
  ['cost_clearance_fee',  'تخليص (تكلفة)'],
  ['cost_workers',        'عمال (تكلفة)'],
  ['cost_service_fee',    'خدمات المعبر (تكلفة)'],
  ['cost_door_receipt',   'وصل دور (تكلفة)'],
  ['cost_other',          'مصاريف أخرى (تكلفة)'],
]

export const DUAL_PRICE_FIELDS = [
  ['price_tarseem',       'ترسيم (فاتورة)'],
  ['price_syrian_driver', 'سائق سوري (فاتورة)'],
  ['price_clearance_fee', 'تخليص (فاتورة)'],
  ['price_workers',       'عمال (فاتورة)'],
  ['price_service_fee',   'خدمات أخرى (فاتورة)'],
  ['price_door_receipt',  'وصل دور (فاتورة)'],
  ['price_other',         'مصاريف أخرى (فاتورة)'],
]

export const DUAL_COST_TO_PRICE = {
  cost_tarseem:        'price_tarseem',
  cost_turkish_driver: 'price_syrian_driver',
  cost_clearance_fee:  'price_clearance_fee',
  cost_workers:        'price_workers',
  cost_service_fee:    'price_service_fee',
  cost_door_receipt:   'price_door_receipt',
  cost_other:          'price_other',
}

export const CENTER_TYPES = {
  trader: { label: 'تاجر', color: 'bg-blue-500/20 text-blue-300' },
  broker: { label: 'مخلص', color: 'bg-purple-500/20 text-purple-300' },
  supplier: { label: 'مورد', color: 'bg-orange-500/20 text-orange-300' },
  partner: { label: 'شريك', color: 'bg-pink-500/20 text-pink-300' },
  fund: { label: 'صندوق', color: 'bg-green-500/20 text-green-300' },
  internal: { label: 'داخلي', color: 'bg-white/10 text-ink-soft' },
}

/** فلاتر حالة السيارة — مشتركة بين لوحة التحكم وصفحة السيارات */
export const SHIPMENT_STATUS_FILTERS = [
  { value: '', label: 'الكل' },
  { value: 'pending', label: 'معلقة' },
  { value: 'complete', label: 'مكتملة' },
  { value: 'posted', label: 'مرحّلة' },
  { value: 'delivered', label: 'مُسلّمة' },
]

export const SHIPMENT_STATUS = {
  pending:   { label: 'معلقة',    color: 'bg-warning/15 text-warning', icon: '◌' },
  complete:  { label: 'مكتملة',  color: 'bg-accent/15 text-accent',   icon: '◎' },
  posted:    { label: 'مرحّلة',  color: 'bg-success/15 text-success', icon: '●' },
  delivered: { label: 'مُسلَّمة', color: 'bg-[#6366f115] text-[#818cf8]', icon: '✓' },
}

export const TX_TYPE = {
  out: { label: 'قيد-ص', sign: '+', color: 'text-danger' },
  in: { label: 'قيد-و', sign: '-', color: 'text-success' },
}

/** تصنيفات القيود — مطابقة قاعدة البيانات */
export const TX_CATEGORY = {
  clearance: { label: 'تخليص', color: 'bg-accent/15 text-accent' },
  payment: { label: 'دفعة', color: 'bg-success/15 text-success' },
  offset: { label: 'مقاصة', color: 'bg-info/15 text-info' },
  adjustment: { label: 'تعديل', color: 'bg-warning/15 text-warning' },
  expense: { label: 'مصروف', color: 'bg-danger/15 text-danger' },
  direct_sale: { label: 'بيع مباشر', color: 'bg-purple-500/15 text-purple-300' },
}

export const TX_CATEGORY_FILTERS = [
  { value: '', label: 'كل التصنيفات' },
  ...Object.entries(TX_CATEGORY).map(([value, { label }]) => ({ value, label })),
]

export const TX_TYPE_FILTERS = [
  { value: '', label: 'الكل' },
  { value: 'out', label: 'قيد-ص (استحقاق)' },
  { value: 'in', label: 'قيد-و (دفعة)' },
]

export const TX_DELIVERED_FILTERS = [
  { value: '', label: 'الكل' },
  { value: '1', label: 'مسلّم' },
  { value: '0', label: 'غير مسلّم' },
]

export const FIELD_LABELS = {
  ...Object.fromEntries(DUAL_COST_FIELDS),
  ...Object.fromEntries(DUAL_PRICE_FIELDS),
  tarseem: 'ترسيم',
  tax_2pct: 'ضريبة 2%',
  service_fee: 'خدمات المعبر',
  workers: 'عمال قلب',
  clearance_fee: 'اتعاب',
  syrian_driver: 'سائق سوري',
  turkish_transport: 'سائق تركي / نقل تركي',
  internal_transport: 'نقل داخلي',
  door_receipt: 'وصل دور',
  other_expenses: 'مصاريف أخرى',
  notes: 'ملاحظات',
  goods_name: 'البضاعة',
  source: 'المصدر',
  destination: 'الوجهة',
  weight: 'الوزن',
  driver_name: 'اسم السائق',
  total_cost: 'المجموع',
}
