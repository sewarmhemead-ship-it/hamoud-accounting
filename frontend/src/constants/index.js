export const CENTER_TYPES = {
  trader: { label: 'تاجر', color: 'bg-blue-500/20 text-blue-300' },
  broker: { label: 'مخلص', color: 'bg-purple-500/20 text-purple-300' },
  supplier: { label: 'مورد', color: 'bg-orange-500/20 text-orange-300' },
  partner: { label: 'شريك', color: 'bg-pink-500/20 text-pink-300' },
  fund: { label: 'صندوق', color: 'bg-green-500/20 text-green-300' },
  internal: { label: 'داخلي', color: 'bg-gray-500/20 text-gray-300' },
}

export const SHIPMENT_STATUS = {
  pending: { label: 'معلقة', color: 'bg-warning/20 text-warning', icon: '◌' },
  complete: { label: 'مكتملة', color: 'bg-info/20 text-info', icon: '◎' },
  posted: { label: 'مرحّلة', color: 'bg-success/20 text-success', icon: '●' },
  delivered: { label: 'مُسلَّمة', color: 'bg-[#6366f118] text-[#818cf8]', icon: '✓' },
}

export const TX_TYPE = {
  out: { label: 'قيد-ص', sign: '+', color: 'text-danger' },
  in: { label: 'قيد-و', sign: '-', color: 'text-success' },
}

export const FIELD_LABELS = {
  tarseem: 'ترسيم',
  service_fee: 'خدمات المعبر (30$)',
  workers: 'عمال',
  clearance_fee: 'اتعاب',
  syrian_driver: 'سائق سوري',
  turkish_transport: 'سائق تركي / نقل تركي',
  internal_transport: 'نقل داخلي',
  door_receipt: 'وصل دور',
  other_expenses: 'مصاريف أخرى',
}
