const bcrypt = require('bcrypt')
const UserModel = require('../models/UserModel')
const { PERM_GROUPS, PERM_TEMPLATES, ALL_PERMS } = require('../config/permissions')
const { BusinessRuleError } = require('../utils/errors')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const usersController = {
  list: asyncHandler(async (req, res) => {
    const result = UserModel.findAll({ limit: 200 })
    const safe = result.rows.map(({ password_hash, ...u }) => ({
      ...u,
      permissions: JSON.parse(u.permissions || '[]'),
    }))
    res.json(apiResponse.paginated(safe, result.total, result.limit, result.offset))
  }),

  create: asyncHandler(async (req, res) => {
    const { username, password, name, role = 'user', permissions = [] } = req.body
    const existing = UserModel.findByUsername(username)
    if (existing) throw new BusinessRuleError('اسم المستخدم موجود مسبقاً')

    const password_hash = await bcrypt.hash(password, 10)
    const user = UserModel.create({
      username, password_hash, name, role,
      permissions: JSON.stringify(permissions),
    })
    const { password_hash: _, ...safe } = user
    res.status(201).json(apiResponse.success({ ...safe, permissions }, 'تم إنشاء المستخدم'))
  }),

  update: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const { name, role, password, permissions } = req.body
    const updates = {}
    if (name        !== undefined) updates.name = name
    if (role        !== undefined) updates.role = role
    if (permissions !== undefined) updates.permissions = JSON.stringify(permissions)
    if (password)                  updates.password_hash = await bcrypt.hash(password, 10)

    const user = UserModel.update(id, updates)
    const { password_hash: _, ...safe } = user
    res.json(apiResponse.success({ ...safe, permissions: JSON.parse(safe.permissions || '[]') }, 'تم التحديث'))
  }),

  remove: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    if (id === req.user.id) throw new BusinessRuleError('لا يمكنك حذف حسابك')
    UserModel.softDelete(id)
    res.json(apiResponse.success(null, 'تم حذف المستخدم'))
  }),

  // إرجاع تعريف الصلاحيات والقوالب للواجهة
  permConfig: asyncHandler(async (req, res) => {
    res.json(apiResponse.success({ groups: PERM_GROUPS, templates: PERM_TEMPLATES }))
  }),

  /** تطبيق قالب صلاحيات على كل الموظفين (غير المشرفين) — لتحديث الصلاحيات القديمة */
  applyPermissionsTemplate: asyncHandler(async (req, res) => {
    const templateId = req.body.templateId || 'full'
    const tpl = PERM_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) throw new BusinessRuleError('قالب الصلاحيات غير موجود')

    const mode = req.body.mode === 'merge' ? 'merge' : 'replace'
    const { rows } = UserModel.findAll({ limit: 500 })
    let updated = 0
    const names = []

    for (const row of rows) {
      if (row.role === 'admin') continue
      const current = JSON.parse(row.permissions || '[]')
      const next =
        mode === 'merge'
          ? [...new Set([...current, ...tpl.perms])]
          : [...tpl.perms]
      const same =
        current.length === next.length &&
        current.every((p) => next.includes(p))
      if (!same) {
        UserModel.update(row.id, { permissions: JSON.stringify(next) })
        updated += 1
        names.push(row.name || row.username)
      }
    }

    res.json(
      apiResponse.success(
        { updated, templateId, mode, users: names.slice(0, 20) },
        updated
          ? `تم تحديث صلاحيات ${updated} مستخدم بقالب «${tpl.label}»`
          : 'كل الموظفين لديهم الصلاحيات المطلوبة مسبقاً'
      )
    )
  }),
}

module.exports = usersController
