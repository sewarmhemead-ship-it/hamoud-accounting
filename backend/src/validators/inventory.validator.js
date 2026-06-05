const { z } = require('zod')
const { periodRangeSchema } = require('./report.validator')

const createSnapshotSchema = z.object({
  snapshot_date: z.string().min(1),
  label: z.string().max(200).optional(),
  replace: z.boolean().optional(),
})

const dateParamSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

module.exports = { createSnapshotSchema, dateParamSchema, inventoryRangeSchema: periodRangeSchema }
