const ProfileService = require('../services/ProfileService')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const profileController = {
  listDirectory: asyncHandler(async (req, res) => {
    const data = ProfileService.listDirectory(req.user.id)
    res.json(apiResponse.success(data))
  }),

  getMe: asyncHandler(async (req, res) => {
    const data = ProfileService.getMyProfile(req.user.id)
    res.json(apiResponse.success(data))
  }),

  getByUserId: asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId, 10)
    const data = ProfileService.getProfile(req.user.id, userId)
    res.json(apiResponse.success(data))
  }),

  updateMe: asyncHandler(async (req, res) => {
    const data = ProfileService.updateMyProfile(req.user.id, req.body)
    res.json(apiResponse.success(data, 'تم تحديث الملف الشخصي'))
  }),

  uploadAvatar: asyncHandler(async (req, res) => {
    const { image } = req.body
    if (!image) {
      return res.status(422).json(apiResponse.error('الصورة مطلوبة'))
    }
    const data = ProfileService.saveAvatar(req.user.id, image)
    res.json(apiResponse.success(data, 'تم رفع الصورة'))
  }),

  serveAvatar: asyncHandler(async (req, res) => {
    const { fullPath, ext } = ProfileService.getAvatarFile(
      req.params.filename,
      req.user.id
    )
    const mime = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    }[ext] || 'application/octet-stream'
    res.setHeader('Content-Type', mime)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.sendFile(fullPath)
  }),
}

module.exports = profileController
