const { PERM, PERM_GROUPS, PERM_TEMPLATES, ALL_PERMS } = require('../config/permissions')

/** أولوية الصفحة الافتراضية بعد الترحيب — مرتبطة بصلاحيات حقيقية */
const LANDING_PRIORITY = [
  { path: '/profit', perm: PERM.PROFIT_VIEW },
  { path: '/shipments', perm: PERM.SHIPMENTS_VIEW },
  { path: '/centers', perm: PERM.CENTERS_VIEW },
  { path: '/reports', perm: PERM.REPORTS_VIEW },
  { path: '/payments', perm: PERM.PAYMENTS_CREATE },
  { path: '/inventory', perm: PERM.INVENTORY_MANAGE },
]

const QUICK_LINKS = [
  { path: '/', label: 'اللوحة', icon: '◆', perm: null },
  { path: '/shipments', label: 'السيارات', icon: '🚛', perm: PERM.SHIPMENTS_VIEW },
  { path: '/centers', label: 'المراكز', icon: '🏛', perm: PERM.CENTERS_VIEW },
  { path: '/profit', label: 'المربح', icon: '📊', perm: PERM.PROFIT_VIEW },
  { path: '/reports', label: 'التقارير', icon: '📄', perm: PERM.REPORTS_VIEW },
  { path: '/messages', label: 'الرسائل', icon: '💬', perm: null },
]

function userHasPerm(user, key) {
  if (!key) return true
  if (user.role === 'admin') return true
  return (user.permissions || []).includes(key)
}

function resolveLandingPath(user) {
  if (user.role === 'admin') return '/'
  for (const item of LANDING_PRIORITY) {
    if (userHasPerm(user, item.perm)) return item.path
  }
  return '/'
}

function detectMatchedTemplate(permissions, role) {
  if (role === 'admin') {
    return PERM_TEMPLATES.find((t) => t.id === 'full') || null
  }
  const set = new Set(permissions || [])
  for (const t of PERM_TEMPLATES) {
    if (t.id === 'full') continue
    const tPerms = t.perms
    if (
      tPerms.length === set.size &&
      tPerms.every((p) => set.has(p))
    ) {
      return t
    }
  }
  return null
}

function buildPermissionGroups(permissions, role) {
  const effective = role === 'admin' ? ALL_PERMS : permissions || []
  const set = new Set(effective)
  return PERM_GROUPS.map((g) => ({
    label: g.label,
    items: g.items.filter((i) => set.has(i.key)).map((i) => i.label),
  })).filter((g) => g.items.length > 0)
}

function buildQuickLinks(user) {
  const out = []
  for (const link of QUICK_LINKS) {
    if (!userHasPerm(user, link.perm)) continue
    out.push({ path: link.path, label: link.label, icon: link.icon })
    if (out.length >= 5) break
  }
  return out
}

/**
 * جلسة ترحيب بعد الدخول — مربوطة بـ PERM / PERM_TEMPLATES (مصدر الحقيقة).
 * @param {{ id, username, name, role, permissions }} user
 */
function buildWelcomeSession(user) {
  const permissions = user.permissions || []
  const template = detectMatchedTemplate(permissions, user.role)
  const permission_groups = buildPermissionGroups(permissions, user.role)
  const landing_path = resolveLandingPath(user)

  return {
    greeting: user.name || user.username,
    username: user.username,
    role: user.role,
    role_label: user.role === 'admin' ? 'مدير النظام' : 'محاسب',
    template: template
      ? {
          id: template.id,
          label: template.label,
          desc: template.desc,
          color: template.color,
        }
      : null,
    permission_count:
      user.role === 'admin' ? ALL_PERMS.length : permissions.length,
    permission_groups,
    landing_path,
    quick_links: buildQuickLinks(user),
  }
}

module.exports = {
  buildWelcomeSession,
  resolveLandingPath,
  detectMatchedTemplate,
  buildPermissionGroups,
  userHasPerm,
  LANDING_PRIORITY,
}
