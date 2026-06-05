const fs = require('fs')
const path = require('path')
const BackupService = require('../services/BackupService')
const { BusinessRuleError } = require('../utils/errors')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const backupController = {
  status: asyncHandler(async (req, res) => {
    res.json(apiResponse.success(BackupService.getStatus()))
  }),

  run: asyncHandler(async (req, res) => {
    const result = await BackupService.runBackup({
      userId: req.user.id,
      reason: 'manual',
    })
    res.json(apiResponse.success(result, 'تم النسخ الاحتياطي'))
  }),

  download: asyncHandler(async (req, res) => {
    const { xlsx } = BackupService.getPaths()
    if (!fs.existsSync(xlsx)) {
      throw new BusinessRuleError('لا يوجد ملف نسخ احتياطي بعد — شغّل النسخ أولاً')
    }
    const filename = path.basename(xlsx)
    const encoded = encodeURIComponent(filename)
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="backup.xlsx"; filename*=UTF-8''${encoded}`
    )
    fs.createReadStream(xlsx).pipe(res)
  }),
}

module.exports = backupController
