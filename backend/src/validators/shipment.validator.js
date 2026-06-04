const { z } = require('zod')

const createShipmentSchema = z.object({
  center_id: z.number().int().positive('التاجر مطلوب'),
  clearance_center_id: z.number().int().positive().optional(),
  border_id: z.number().int().positive('المعبر مطلوب'),
  goods_type_id: z.number().int().positive().optional(),
  goods_name: z.string().optional(),
  weight: z.number().positive().optional(),
  quantity: z.number().int().positive().optional(),
  source: z.string().min(1, 'المصدر مطلوب'),
  destination: z.string().min(1, 'الوجهة مطلوبة'),
  driver_name: z.string().optional(),
  entry_date: z.string().min(1, 'تاريخ الدخول مطلوب'),

  tarseem: z.number().min(0).optional(),
  service_fee: z.number().min(0).optional(),
  workers: z.number().min(0).optional(),
  clearance_fee: z.number().min(0).optional(),
  syrian_driver: z.number().min(0).optional(),
  turkish_transport: z.number().min(0).optional(),
  internal_transport: z.number().min(0).optional(),
  door_receipt: z.number().min(0).optional(),
  other_expenses: z.number().min(0).optional(),

  // الكشف المزدوج — ما ندفعه للمخلص (cost_*)
  cost_tarseem: z.number().min(0).optional(),
  cost_turkish_driver: z.number().min(0).optional(),
  cost_clearance_fee: z.number().min(0).optional(),
  cost_workers: z.number().min(0).optional(),
  cost_service_fee: z.number().min(0).optional(),
  cost_door_receipt: z.number().min(0).optional(),
  cost_other: z.number().min(0).optional(),

  // الكشف المزدوج — ما نأخذه من التاجر (price_*)
  price_tarseem: z.number().min(0).optional(),
  price_syrian_driver: z.number().min(0).optional(),
  price_clearance_fee: z.number().min(0).optional(),
  price_workers: z.number().min(0).optional(),
  price_service_fee: z.number().min(0).optional(),
  price_door_receipt: z.number().min(0).optional(),
  price_other: z.number().min(0).optional(),

  notes: z.string().optional(),
})

const updateFieldsSchema = z
  .object({
    tarseem: z.number().min(0).optional(),
    service_fee: z.number().min(0).optional(),
    workers: z.number().min(0).optional(),
    clearance_fee: z.number().min(0).optional(),
    syrian_driver: z.number().min(0).optional(),
    turkish_transport: z.number().min(0).optional(),
    internal_transport: z.number().min(0).optional(),
    door_receipt: z.number().min(0).optional(),
    other_expenses: z.number().min(0).optional(),

    // الكشف المزدوج — ما ندفعه للمخلص (cost_*)
    cost_tarseem: z.number().min(0).optional(),
    cost_turkish_driver: z.number().min(0).optional(),
    cost_clearance_fee: z.number().min(0).optional(),
    cost_workers: z.number().min(0).optional(),
    cost_service_fee: z.number().min(0).optional(),
    cost_door_receipt: z.number().min(0).optional(),
    cost_other: z.number().min(0).optional(),

    // الكشف المزدوج — ما نأخذه من التاجر (price_*)
    price_tarseem: z.number().min(0).optional(),
    price_syrian_driver: z.number().min(0).optional(),
    price_clearance_fee: z.number().min(0).optional(),
    price_workers: z.number().min(0).optional(),
    price_service_fee: z.number().min(0).optional(),
    price_door_receipt: z.number().min(0).optional(),
    price_other: z.number().min(0).optional(),

    notes: z.string().optional(),
    _note: z.string().optional(),
  })
  .strict()

const bulkPostSchema = z.object({
  shipment_ids: z.array(z.number().int().positive()).min(1),
})

module.exports = { createShipmentSchema, updateFieldsSchema, bulkPostSchema }
