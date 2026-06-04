require('dotenv').config()

const NODE_ENV = process.env.NODE_ENV || 'development'
const DEFAULT_JWT_SECRET = 'dev-secret-change-in-production'
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET

// حماية: المفتاح الافتراضي ممنوع في الإنتاج — نوقف الإقلاع بدل تشغيل غير آمن.
if (NODE_ENV === 'production' && JWT_SECRET === DEFAULT_JWT_SECRET) {
  throw new Error(
    'JWT_SECRET غير مضبوط في الإنتاج — عيّن متغير بيئة JWT_SECRET قوياً قبل التشغيل'
  )
}

module.exports = {
  NODE_ENV,
  PORT: parseInt(process.env.PORT || '3001', 10),
  DB_PATH: process.env.DB_PATH || './data/hamoud.db',
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
}
