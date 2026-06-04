const logger = require('../utils/logger')

function errorMiddleware(err, req, res, next) {
  if (err.name === 'ZodError') {
    return res.status(422).json({
      success: false,
      data: null,
      message: 'بيانات غير صحيحة',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
  }

  if (err.isOperational) {
    return res.status(err.status).json({
      success: false,
      data: null,
      message: err.message,
      code: err.code,
    })
  }

  logger.error({ err, url: req.url, method: req.method })

  return res.status(500).json({
    success: false,
    data: null,
    message: 'حدث خطأ في النظام',
    code: 'SERVER_ERROR',
  })
}

module.exports = errorMiddleware
