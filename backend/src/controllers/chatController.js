const path = require('path')
const ChatService = require('../services/ChatService')
const ChatMediaService = require('../services/ChatMediaService')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const chatController = {
  listThreads: asyncHandler(async (req, res) => {
    const data = ChatService.listThreads(req.user.id)
    res.json(apiResponse.success(data))
  }),

  getMessages: asyncHandler(async (req, res) => {
    const threadId = parseInt(req.params.id, 10)
    const limit = parseInt(req.query.limit || '50', 10)
    const beforeId = req.query.before ? parseInt(req.query.before, 10) : null
    const data = ChatService.getMessages(req.user.id, threadId, { limit, beforeId })
    res.json(apiResponse.success(data))
  }),

  startDirect: asyncHandler(async (req, res) => {
    const otherUserId = parseInt(req.body.user_id, 10)
    const data = ChatService.startDirectThread(req.user.id, otherUserId)
    res.status(201).json(apiResponse.success(data, 'تم بدء المحادثة'))
  }),

  sendMessage: asyncHandler(async (req, res) => {
    const threadId = parseInt(req.params.id, 10)
    const data = ChatService.sendMessage(req.user.id, threadId, req.body)
    res.status(201).json(apiResponse.success(data, 'تم الإرسال'))
  }),

  serveMedia: asyncHandler(async (req, res) => {
    const mediaId = parseInt(req.params.id, 10)
    const row = ChatMediaService.getForDownload(req.user.id, mediaId)
    res.setHeader('Content-Type', row.mime_type)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.filename)}"`)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.sendFile(path.resolve(row.file_path))
  }),
}

module.exports = chatController
