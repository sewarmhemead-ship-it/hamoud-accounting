const { ForbiddenError } = require('../utils/errors')

function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next()
    const perms = req.user?.permissions || []
    if (permissions.some((p) => perms.includes(p))) return next()
    return next(new ForbiddenError('ليس لديك صلاحية لهذه العملية'))
  }
}

module.exports = requireAnyPermission
