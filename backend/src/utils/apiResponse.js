const success = (data = null, message = null, meta = null) => ({
  success: true,
  data,
  message,
  ...(meta && { meta }),
})

const error = (message, errors = null, code = null) => ({
  success: false,
  data: null,
  message,
  code,
  ...(errors && { errors }),
})

const paginated = (rows, total, limit, offset) => ({
  success: true,
  data: rows,
  message: null,
  meta: {
    total,
    limit,
    offset,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit) || 1,
    hasMore: offset + limit < total,
  },
})

module.exports = { success, error, paginated }
