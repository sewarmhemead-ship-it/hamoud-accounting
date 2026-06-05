const { z } = require('zod')

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ بصيغة YYYY-MM-DD')

const periodRangeSchema = z
  .object({
    from: dateStr,
    to: dateStr,
  })
  .refine((d) => d.from <= d.to, {
    message: '«من تاريخ» يجب أن يكون قبل أو يساوي «إلى تاريخ»',
    path: ['from'],
  })

module.exports = { periodRangeSchema }
