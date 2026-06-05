const { assertAdmin } = require('../utils/accessControl')

function requireAdmin(req, res, next) {
  try {
    assertAdmin(req.user)
    next()
  } catch (err) {
    next(err)
  }
}

module.exports = requireAdmin
