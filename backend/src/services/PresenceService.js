const PresenceModel = require('../models/PresenceModel')
const ProfileModel = require('../models/ProfileModel')

const ONLINE_THRESHOLD_SEC = 120

/**
 * يُظهر المستخدم متصلاً فقط إذا show_online=1 وآخر نبضة خلال العتبة.
 */
function computeIsOnline(lastSeenAt, showOnline, thresholdSec = ONLINE_THRESHOLD_SEC, now = new Date()) {
  if (!showOnline || showOnline === 0) return false
  if (!lastSeenAt) return false
  const last = new Date(String(lastSeenAt).replace(' ', 'T'))
  if (Number.isNaN(last.getTime())) return false
  const diffSec = (now.getTime() - last.getTime()) / 1000
  return diffSec >= 0 && diffSec <= thresholdSec
}

class PresenceService {
  heartbeat(userId) {
    ProfileModel.ensure(userId)
    return PresenceModel.upsertHeartbeat(userId)
  }

  resolveOnlineStatus(userId, showOnline) {
    if (!showOnline || showOnline === 0) return false
    return PresenceModel.isRecentlyActive(userId, ONLINE_THRESHOLD_SEC)
  }

  listOnlineUsers(excludeUserId = null) {
    const candidates = PresenceModel.listCandidates(ONLINE_THRESHOLD_SEC)
    return candidates
      .filter((u) => u.user_id !== excludeUserId)
      .map((u) => ({
        user_id: u.user_id,
        display_name: u.display_name,
        user_name: u.user_name,
        username: u.username,
        avatar_path: u.avatar_path,
        avatar_url: u.avatar_path
          ? `/profile/avatar/${require('path').basename(u.avatar_path)}`
          : null,
        is_online: true,
        last_seen_at: u.last_seen_at,
      }))
  }
}

module.exports = new PresenceService()
module.exports.computeIsOnline = computeIsOnline
module.exports.ONLINE_THRESHOLD_SEC = ONLINE_THRESHOLD_SEC
