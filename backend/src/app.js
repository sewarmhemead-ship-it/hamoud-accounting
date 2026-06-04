const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const routes = require('./routes')
const errorMiddleware = require('./middleware/error.middleware')

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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
