const { getDatabase } = require('../config/database')

function auditMiddleware(action, entity) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res)

    res.json = (body) => {
      if (body?.success && req.user) {
        try {
          const db = getDatabase()
          db.prepare(
            `INSERT INTO audit_log (user_id, action, entity, entity_id, payload, ip_address)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            req.user.id,
            action,
            entity,
            req.params.id ? parseInt(req.params.id, 10) : null,
            JSON.stringify({ body: req.body, response: body?.data }),
            req.ip
          )
        } catch {
          // audit failure should not block response
        }
      }
      return originalJson(body)
    }

    next()
  }
}

module.exports = auditMiddleware
