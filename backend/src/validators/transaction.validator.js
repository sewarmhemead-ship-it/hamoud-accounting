const { z } = require('zod')

const createPaymentSchema = z.object({
  center_id: z.number().int().positive('المركز مطلوب'),
  date: z.string().min(1, 'التاريخ مطلوب'),
  amount: z.number().positive('المبلغ مطلوب'),
  currency: z.enum(['USD', 'SYP', 'TRY']).default('USD'),
  amount_usd: z.number().positive().optional(),
  exchange_rate: z.number().positive().default(1),
  category: z
    .enum(['payment', 'offset', 'adjustment', 'expense', 'direct_sale'])
    .default('payment'),
  notes: z.string().optional(),
})

const offsetSchema = z
  .object({
    from_center_id: z.number().int().positive(),
    to_center_id: z.number().int().positive(),
    amount: z.number().positive(),
    notes: z.string().optional(),
  })
  .refine((d) => d.from_center_id !== d.to_center_id, {
    message: 'لا يمكن المقاصة بين نفس المركز',
    path: ['to_center_id'],
  })

const updateTransactionSchema = z
  .object({
    amount: z.number().positive('المبلغ يجب أن يكون موجباً').optional(),
    currency: z.enum(['USD', 'SYP', 'TRY']).optional(),
    exchange_rate: z.number().positive('سعر الصرف يجب أن يكون موجباً').optional(),
    date: z.string().min(1, 'التاريخ غير صالح').optional(),
    notes: z.string().nullable().optional(),
    category: z
      .enum(['payment', 'offset', 'adjustment', 'expense', 'direct_sale', 'clearance'])
      .optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'لا يوجد ما يُحدّث',
  })

module.exports = { createPaymentSchema, offsetSchema, updateTransactionSchema }
