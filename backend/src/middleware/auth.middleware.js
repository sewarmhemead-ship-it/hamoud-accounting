const AuthService = require('../services/AuthService')
const { UnauthorizedError } = require('../utils/errors')

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError())
  }

  const token = header.slice(7)
  try {
    req.user = AuthService.verifyToken(token)
    next()
  } catch (err) {
    next(err)
  }
}

module.exports = authMiddleware
