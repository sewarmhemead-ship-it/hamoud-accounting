const TX_TYPE = {
  OUT: 'out', // قيد-ص — استحقاق على التاجر
  IN: 'in',   // قيد-و — دفعة من التاجر
}

const CENTER_TYPE = {
  TRADER: 'trader',
  BROKER: 'broker',
  SUPPLIER: 'supplier',
  PARTNER: 'partner',
  FUND: 'fund',
  INTERNAL: 'internal',
}

const CURRENCY = {
  USD: 'USD',
  SYP: 'SYP',
  TRY: 'TRY',
}

const SHIPMENT_STATUS = {
  PENDING: 'pending',
  COMPLETE: 'complete',
  POSTED: 'posted',
  DELIVERED: 'delivered',
}

const SHIPMENT_REQUIRED_FIELDS = {
  required: ['tarseem', 'syrian_driver', 'clearance_fee'],
  optional: [
    'service_fee',
    'workers',
    'turkish_transport',
    'internal_transport',
    'door_receipt',
    'other_expenses',
  ],
}

const SHIPMENT_FIELD_LABELS = {
  tarseem: 'الترسيم',
  tax_2pct: 'ضريبة 2%',
  service_fee: 'خدمات المعبر',
  workers: 'عمال قلب',
  clearance_fee: 'اتعاب',
  syrian_driver: 'سائق سوري',
  turkish_transport: 'سائق تركي / نقل تركي',
  internal_transport: 'نقل داخلي',
  door_receipt: 'وصل دور',
  other_expenses: 'مصاريف أخرى',
}

const TX_CATEGORY = {
  CLEARANCE: 'clearance',
  PAYMENT: 'payment',
  OFFSET: 'offset',
  ADJUSTMENT: 'adjustment',
  EXPENSE: 'expense',
  DIRECT_SALE: 'direct_sale',
}

const REF_PREFIX = {
  TRUCK: 'TRK',
  TRANSACTION: 'OP-REC',
}

const REF_PAD = 5

const TAX_RATE = 0.02

const ALLOWED_ORDER = [
  'created_at DESC',
  'created_at ASC',
  'date DESC',
  'date ASC',
  'id DESC',
  'id ASC',
  'entry_date DESC',
  'entry_date ASC',
]

module.exports = {
  TX_TYPE,
  CENTER_TYPE,
  CURRENCY,
  SHIPMENT_STATUS,
  SHIPMENT_REQUIRED_FIELDS,
  SHIPMENT_FIELD_LABELS,
  TX_CATEGORY,
  REF_PREFIX,
  REF_PAD,
  TAX_RATE,
  ALLOWED_ORDER,
}
