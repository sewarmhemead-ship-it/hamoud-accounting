const AdminModel = require('../models/AdminModel')
const { BusinessRuleError } = require('../utils/errors')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const adminController = {
  /* ── إحصاء عام ── */
  stats: asyncHandler(async (req, res) => {
    res.json(apiResponse.success(AdminModel.getStats()))
  }),

  /* ── معابر ── */
  listBorders: asyncHandler(async (req, res) => {
    res.json(apiResponse.success(AdminModel.getBorders()))
  }),

  createBorder: asyncHandler(async (req, res) => {
    const { name, name_en } = req.body
    if (!name?.trim()) throw new BusinessRuleError('اسم المعبر مطلوب')
    const border = AdminModel.createBorder({ name: name.trim(), name_en: name_en?.trim() || null })
    res.status(201).json(apiResponse.success(border, 'تم إضافة المعبر'))
  }),

  updateBorder: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const border = AdminModel.updateBorder(id, req.body)
    res.json(apiResponse.success(border, 'تم التحديث'))
  }),

  /* ── أنواع البضائع ── */
  listGoodsTypes: asyncHandler(async (req, res) => {
    res.json(apiResponse.success(AdminModel.getGoodsTypes()))
  }),

  createGoodsType: asyncHandler(async (req, res) => {
    const { name, name_en } = req.body
    if (!name?.trim()) throw new BusinessRuleError('اسم النوع مطلوب')
    const gt = AdminModel.createGoodsType({ name: name.trim(), name_en: name_en?.trim() || null })
    res.status(201).json(apiResponse.success(gt, 'تم إضافة النوع'))
  }),

  updateGoodsType: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const gt = AdminModel.updateGoodsType(id, req.body)
    res.json(apiResponse.success(gt, 'تم التحديث'))
  }),

  /* ── المصادر ── */
  listSources: asyncHandler(async (req, res) => {
    res.json(apiResponse.success(AdminModel.getSources()))
  }),

  createSource: asyncHandler(async (req, res) => {
    const { name, name_en } = req.body
    if (!name?.trim()) throw new BusinessRuleError('اسم المصدر مطلوب')
    const src = AdminModel.createSource({ name: name.trim(), name_en: name_en?.trim() || null })
    res.status(201).json(apiResponse.success(src, 'تم إضافة المصدر'))
  }),

  updateSource: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const src = AdminModel.updateSource(id, req.body)
    res.json(apiResponse.success(src, 'تم التحديث'))
  }),

  /* ── الوجهات ── */
  listDestinations: asyncHandler(async (req, res) => {
    res.json(apiResponse.success(AdminModel.getDestinations()))
  }),

  createDestination: asyncHandler(async (req, res) => {
    const { name, name_en } = req.body
    if (!name?.trim()) throw new BusinessRuleError('اسم الوجهة مطلوب')
    const dst = AdminModel.createDestination({ name: name.trim(), name_en: name_en?.trim() || null })
    res.status(201).json(apiResponse.success(dst, 'تم إضافة الوجهة'))
  }),

  updateDestination: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const dst = AdminModel.updateDestination(id, req.body)
    res.json(apiResponse.success(dst, 'تم التحديث'))
  }),

  /* ── سجل النشاط ── */
  auditLog: asyncHandler(async (req, res) => {
    const { user_id, action, entity, from, to, limit = 50, offset = 0 } = req.query
    const result = AdminModel.getAuditLog({
      user_id: user_id ? parseInt(user_id, 10) : undefined,
      action, entity, from, to,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    })
    res.json(apiResponse.paginated(result.rows, result.total, parseInt(limit, 10), parseInt(offset, 10)))
  }),
}

module.exports = adminController
