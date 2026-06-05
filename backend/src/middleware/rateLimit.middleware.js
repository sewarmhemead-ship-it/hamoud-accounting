const store = new Map()

// نظف السجلات المنتهية كل 10 دقائق لمنع تسرب الذاكرة
setInterval(() => {
  const now = Date.now()
  for (const [key, rec] of store) {
    if (now > rec.resetAt) store.delete(key)
  }
}, 10 * 60 * 1000).unref()

function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, message = 'طلبات كثيرة جداً، حاول لاحقاً' } = {}) {
  return (req, res, next) => {
    const key = req.ip || 'unknown'
    const now = Date.now()
    const rec = store.get(key)

    if (!rec || now > rec.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    rec.count++
    if (rec.count > max) {
      return res.status(429).json({
        success: false,
        data: null,
        message,
        code: 'RATE_LIMITED',
      })
    }

    next()
  }
}

module.exports = rateLimit
