const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const routes = require('./routes')
const errorMiddleware = require('./middleware/error.middleware')

const app = express()

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3001']

function isAllowedOrigin(origin, req) {
  if (!origin) return true
  if (process.env.NODE_ENV !== 'production') return true
  if (allowedOrigins.includes(origin)) return true

  // SPA على نفس الخادم (Railway / إنتاج موحّد): Origin يطابق Host الطلب
  const host = req.get('host')
  if (host) {
    try {
      if (new URL(origin).host === host) return true
    } catch {
      /* origin غير صالح */
    }
  }

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN
  if (railwayDomain) {
    try {
      const hostname = new URL(origin).hostname
      if (hostname === railwayDomain || `${hostname}` === railwayDomain) return true
    } catch {
      /* ignore */
    }
  }

  return false
}

/** CORS لـ /api فقط — يحتاج req لمطابقة same-host في الإنتاج */
function apiCors(req, res, next) {
  return cors({
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin, req)) return cb(null, true)
      cb(new Error('CORS: الأصل غير مسموح به'))
    },
    credentials: true,
  })(req, res, next)
}

app.use(express.json({ limit: '12mb' }))
app.use(express.urlencoded({ extended: true, limit: '12mb' }))

// Chrome DevTools يطلب هذا تلقائياً — نرد بـ 200 فارغ
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.json({}))

// CORS على /api فقط — الملفات الثابتة (JS/CSS) تُقدَّم same-origin بلا CORS
app.use('/api', apiCors, routes)

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
