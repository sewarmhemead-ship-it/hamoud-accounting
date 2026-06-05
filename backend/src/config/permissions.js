/**
 * كل صلاحيات النظام — مصدر الحقيقة الوحيد.
 * admin يتجاوز الفحص تلقائياً بغض النظر عن القائمة.
 */
const PERM = {
  // ─── التخليص ───
  SHIPMENTS_VIEW:    'shipments_view',
  SHIPMENTS_CREATE:  'shipments_create',
  SHIPMENTS_EDIT:    'shipments_edit',
  SHIPMENTS_POST:    'shipments_post',
  SHIPMENTS_DELIVER: 'shipments_deliver',
  // ─── المراكز ───
  CENTERS_VIEW:      'centers_view',
  CENTERS_MANAGE:    'centers_manage',
  // ─── المعاملات ───
  PAYMENTS_CREATE:   'payments_create',
  PAYMENTS_DELETE:   'payments_delete',
  OFFSET:            'offset',
  // ─── المالية ───
  PROFIT_VIEW:        'profit_view',
  PROFIT_CLOSE:       'profit_close',
  /** تعديل يوم مُغلق — للمشرف بصلاحيات كاملة فقط */
  PROFIT_EDIT_CLOSED: 'profit_edit_closed',
  INVENTORY_MANAGE:  'inventory_manage',
  // ─── التقارير ───
  REPORTS_VIEW:      'reports_view',
  REPORTS_EXPORT:    'reports_export',
}

/** قائمة منظّمة للعرض في الواجهة */
const PERM_GROUPS = [
  {
    label: 'التخليص',
    items: [
      { key: PERM.SHIPMENTS_VIEW,    label: 'عرض السيارات' },
      { key: PERM.SHIPMENTS_CREATE,  label: 'إضافة سيارات جديدة' },
      { key: PERM.SHIPMENTS_EDIT,    label: 'تعديل أقلام السيارة' },
      { key: PERM.SHIPMENTS_POST,    label: 'ترحيل السيارة لليوميات' },
      { key: PERM.SHIPMENTS_DELIVER, label: 'تسجيل التسليم' },
    ],
  },
  {
    label: 'المراكز',
    items: [
      { key: PERM.CENTERS_VIEW,    label: 'عرض المراكز وكشوف الحساب' },
      { key: PERM.CENTERS_MANAGE,  label: 'إنشاء وتعديل المراكز' },
    ],
  },
  {
    label: 'المعاملات',
    items: [
      { key: PERM.PAYMENTS_CREATE, label: 'تسجيل دفعات' },
      { key: PERM.PAYMENTS_DELETE, label: 'حذف دفعات' },
      { key: PERM.OFFSET,          label: 'إجراء مقاصة بين مركزين' },
    ],
  },
  {
    label: 'المالية',
    items: [
      { key: PERM.PROFIT_VIEW,        label: 'عرض المربح اليومي' },
      { key: PERM.PROFIT_CLOSE,       label: 'إغلاق اليوم' },
      { key: PERM.PROFIT_EDIT_CLOSED, label: 'تعديل يوم مُغلق (مشرف كامل)' },
      { key: PERM.INVENTORY_MANAGE,  label: 'إدارة الجرد' },
    ],
  },
  {
    label: 'التقارير',
    items: [
      { key: PERM.REPORTS_VIEW,   label: 'عرض التقارير' },
      { key: PERM.REPORTS_EXPORT, label: 'تصدير Excel / PDF' },
    ],
  },
]

const ALL_PERMS = Object.values(PERM)

/** قوالب جاهزة لتعيين مجموعة صلاحيات دفعة واحدة */
const PERM_TEMPLATES = [
  {
    id: 'operator',
    label: 'مشغّل تخليص',
    desc: 'يضيف سيارات ويرحّلها ويسجّل التسليم',
    color: '#3b82f6',
    perms: [
      PERM.SHIPMENTS_VIEW, PERM.SHIPMENTS_CREATE,
      PERM.SHIPMENTS_EDIT, PERM.SHIPMENTS_POST,
      PERM.SHIPMENTS_DELIVER, PERM.CENTERS_VIEW,
    ],
  },
  {
    id: 'accountant',
    label: 'محاسب',
    desc: 'يدير الدفعات ويغلق اليوم ويصدّر التقارير',
    color: '#22c55e',
    perms: [
      PERM.SHIPMENTS_VIEW, PERM.CENTERS_VIEW,
      PERM.PAYMENTS_CREATE, PERM.PAYMENTS_DELETE, PERM.OFFSET,
      PERM.PROFIT_VIEW, PERM.PROFIT_CLOSE,
      PERM.INVENTORY_MANAGE,
      PERM.REPORTS_VIEW, PERM.REPORTS_EXPORT,
    ],
  },
  {
    id: 'viewer',
    label: 'مستعرض',
    desc: 'قراءة فقط بدون أي تعديل',
    color: '#8891a8',
    perms: [
      PERM.SHIPMENTS_VIEW, PERM.CENTERS_VIEW,
      PERM.PROFIT_VIEW, PERM.REPORTS_VIEW,
    ],
  },
  {
    id: 'full',
    label: 'صلاحيات كاملة',
    desc: 'كل الصلاحيات (بدون إدارة النظام)',
    color: '#c9a84c',
    perms: ALL_PERMS,
  },
]

module.exports = { PERM, PERM_GROUPS, PERM_TEMPLATES, ALL_PERMS }
