const { ForbiddenError } = require('./errors')

function isAdmin(user) {
  return user?.role === 'admin'
}

function assertAdmin(user) {
  if (!isAdmin(user)) {
    throw new ForbiddenError('هذه العملية للمشرف فقط')
  }
}

function hasPermission(user, perm) {
  if (!user) return false
  if (isAdmin(user)) return true
  return (user.permissions || []).includes(perm)
}

module.exports = { isAdmin, assertAdmin, hasPermission }
