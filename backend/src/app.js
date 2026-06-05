const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const routes = require('./routes')
const errorMiddleware = require('./middleware/error.middleware')

const app = express()

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3001']

app.use(
  cors({
    origin: (origin, cb) => {
      // بيئة التطوير أو طلب بلا origin (mobile / curl)
      if (!origin || process.env.NODE_ENV !== 'production') return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error('CORS: الأصل غير مسموح به'))
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '12mb' }))
app.use(express.urlencoded({ extended: true, limit: '12mb' }))

// Chrome DevTools يطلب هذا تلقائياً — نرد بـ 200 فارغ
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.json({}))

app.use('/api', routes)

// في الإنتاج: نقدّم واجهة React المبنية (frontend/dist تُنسخ إلى backend/public)
// من نفس الخادم، فيعمل baseURL النسبي '/api' بلا CORS ولا متغيّرات عنوان.
const publicDir = path.join(__dirname, '..', 'public')
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(publicDir, 'index.html'))
  })
}

app.use(errorMiddleware)

module.exports = app
