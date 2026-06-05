const PresenceService = require('../services/PresenceService')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const presenceController = {
  heartbeat: asyncHandler(async (req, res) => {
    const row = PresenceService.heartbeat(req.user.id)
    res.json(apiResponse.success({
      user_id: req.user.id,
      last_seen_at: row.last_seen_at,
      is_online: true,
    }))
  }),

  listOnline: asyncHandler(async (req, res) => {
    const data = PresenceService.listOnlineUsers(req.user.id)
    res.json(apiResponse.success(data))
  }),
}

module.exports = presenceController
