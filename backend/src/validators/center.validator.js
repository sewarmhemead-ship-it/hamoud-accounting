const { z } = require('zod')

const createCenterSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1, 'الاسم مطلوب'),
  type: z.enum(['trader', 'broker', 'supplier', 'partner', 'fund', 'internal']),
  currency: z.enum(['USD', 'SYP', 'TRY']).default('USD'),
  notes: z.string().optional(),
})

const updateCenterSchema = createCenterSchema.partial()

module.exports = { createCenterSchema, updateCenterSchema }
