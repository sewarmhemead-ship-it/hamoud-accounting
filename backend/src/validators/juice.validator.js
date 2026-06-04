const { z } = require('zod')

const createJuiceSchema = z.object({
  date: z.string().min(1),
  product_type: z.string().min(1),
  units_sent: z.number().int().positive(),
  units_lost: z.number().int().min(0).default(0),
  capital: z.number().min(0).default(0),
  turkish_transport: z.number().min(0).default(0),
  tarseem: z.number().min(0).default(0),
  workers: z.number().min(0).default(0),
  clearance_fee: z.number().min(0).default(0),
  driver_cost: z.number().min(0).default(0),
  sale_price: z.number().positive(),
  center_id: z.number().int().positive(),
  driver: z.string().optional(),
  border_id: z.number().int().positive().optional(),
  notes: z.string().optional(),
})

module.exports = { createJuiceSchema }
