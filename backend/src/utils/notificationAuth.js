const SEVERITY_ORDER = { danger: 0, warning: 1, info: 2, success: 3 }

function userHasPerm(user, perm) {
  if (!user) return false
  if (user.role === 'admin') return true
  return (user.permissions || []).includes(perm)
}

module.exports = { userHasPerm, SEVERITY_ORDER }
