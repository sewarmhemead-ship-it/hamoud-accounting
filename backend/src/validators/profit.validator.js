const { z } = require('zod')

const closeDaySchema = z.object({
  date: z.string().min(1),
  num_trucks: z.number().int().min(0).optional(),
  clearance_diff: z.number().default(0),
  transport_diff: z.number().default(0),
  workers_diff: z.number().default(0),
  driver_diff: z.number().default(0),
  credit_diff: z.number().default(0),
  gross_profit: z.number().optional(),
  office_expenses: z.number().min(0).default(0),
  home_expenses: z.number().min(0).default(0),
  notes: z.string().optional(),
})

const updateDaySchema = z
  .object({
    num_trucks: z.number().int().min(0).optional(),
    clearance_diff: z.number().optional(),
    transport_diff: z.number().optional(),
    workers_diff: z.number().optional(),
    driver_diff: z.number().optional(),
    credit_diff: z.number().optional(),
    gross_profit: z.number().optional(),
    office_expenses: z.number().min(0).optional(),
    home_expenses: z.number().min(0).optional(),
    notes: z.string().optional(),
  })
  .strict()

module.exports = { closeDaySchema, updateDaySchema }
