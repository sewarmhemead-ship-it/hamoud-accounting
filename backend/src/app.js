const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const routes = require('./routes')
const errorMiddleware = require('./middleware/error.middleware')

const app = express()
app.set('trust proxy', 1)

const publicDir = path.join(__dirname, '..', 'public')
const servesSpa = fs.existsSync(publicDir)

const explicitCorsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : null

const devOrigins = ['http://localhost:5173', 'http://localhost:3001']

/**
 * إنتاج موحّد (SPA + /api على نفس الخادم): لا CORS — same-origin فقط.
 * CORS يُفعَّل فقط عند: تطوير (5173→3001) أو CORS_ORIGINS صريح (دومين خارجي).
 */
const needsApiCors =
  process.env.NODE_ENV !== 'production' ||
  !!explicitCorsOrigins ||
  !servesSpa

function apiCors(req, res, next) {
  const allowList = explicitCorsOrigins || devOrigins
  return cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowList.includes(origin)) return cb(null, true)
      cb(new Error('CORS: الأصل غير مسموح به'))
    },
    credentials: true,
  })(req, res, next)
}

app.use(express.json({ limit: '12mb' }))
app.use(express.urlencoded({ extended: true, limit: '12mb' }))

app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.json({}))

if (needsApiCors) {
  app.use('/api', apiCors, routes)
} else {
  app.use('/api', routes)
}

if (servesSpa) {
  app.use(express.static(publicDir))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(publicDir, 'index.html'))
  })
}

app.use(errorMiddleware)

module.exports = app
