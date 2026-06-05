const { ForbiddenError } = require('../utils/errors')

/**
 * يفحص أن المستخدم يملك الصلاحية المطلوبة.
 * admin يتجاوز الفحص تلقائياً.
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next()
    const perms = req.user?.permissions || []
    if (!perms.includes(permission)) {
      return next(new ForbiddenError(`ليس لديك صلاحية: ${permission}`))
    }
    next()
  }
}

module.exports = requirePermission
