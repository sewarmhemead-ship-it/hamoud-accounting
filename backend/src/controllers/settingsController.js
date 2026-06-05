const SettingsService = require('../services/SettingsService')
const { BusinessRuleError } = require('../utils/errors')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const settingsController = {
  /** للمشرف — كل الإعدادات */
  getAdmin: asyncHandler(async (req, res) => {
    res.json(apiResponse.success(SettingsService.get()))
  }),

  putAdmin: asyncHandler(async (req, res) => {
    try {
      const settings = SettingsService.update(req.body, req.user.id)
      res.json(apiResponse.success(settings, 'تم حفظ الإعدادات'))
    } catch (e) {
      if (e.name === 'ValidationError') {
        throw new BusinessRuleError(e.message)
      }
      throw e
    }
  }),

  /** أي مستخدم مسجّل — هوية العرض فقط */
  getBranding: asyncHandler(async (req, res) => {
    res.json(apiResponse.success(SettingsService.getBranding()))
  }),
}

module.exports = settingsController
