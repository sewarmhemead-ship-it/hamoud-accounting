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

const offsetSchema = z.object({
  from_center_id: z.number().int().positive(),
  to_center_id: z.number().int().positive(),
  amount: z.number().positive(),
  notes: z.string().optional(),
})

module.exports = { createPaymentSchema, offsetSchema }
