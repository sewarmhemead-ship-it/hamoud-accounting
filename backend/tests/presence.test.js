const { createSocialTestDb, destroySocialTestDb } = require('./helpers/socialTestDb')
const {
  computeIsOnline,
  ONLINE_THRESHOLD_SEC,
} = require('../src/services/PresenceService')

let db

beforeEach(() => {
  db = createSocialTestDb()
})

afterEach(() => {
  destroySocialTestDb(db)
  db = null
})

describe('PresenceService — computeIsOnline', () => {
  const now = new Date('2026-06-05T12:00:00')

  it('متصل إذا آخر ظهور خلال 120 ثانية', () => {
    const last = '2026-06-05 11:59:30'
    expect(computeIsOnline(last, 1, ONLINE_THRESHOLD_SEC, now)).toBe(true)
  })

  it('غير متصل إذا تجاوز 120 ثانية', () => {
    const last = '2026-06-05 11:57:00'
    expect(computeIsOnline(last, 1, ONLINE_THRESHOLD_SEC, now)).toBe(false)
  })

  it('show_online=0 يظهر دائماً غير متصل', () => {
    const last = '2026-06-05 11:59:59'
    expect(computeIsOnline(last, 0, ONLINE_THRESHOLD_SEC, now)).toBe(false)
  })

  it('بدون last_seen غير متصل', () => {
    expect(computeIsOnline(null, 1, ONLINE_THRESHOLD_SEC, now)).toBe(false)
  })
})

describe('PresenceService — heartbeat وقائمة المتصلين', () => {
  it('heartbeat يحدّث last_seen', () => {
    const PresenceService = require('../src/services/PresenceService')
    const row = PresenceService.heartbeat(1)
    expect(row.is_online).toBe(1)
    expect(row.last_seen_at).toBeTruthy()
  })

  it('يظهر في قائمة المتصلين بعد نبضة', () => {
    const PresenceService = require('../src/services/PresenceService')
    PresenceService.heartbeat(1)
    PresenceService.heartbeat(2)
    const online = PresenceService.listOnlineUsers()
    const ids = online.map((u) => u.user_id)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
  })

  it('show_online=0 لا يظهر في القائمة', () => {
    const ProfileService = require('../src/services/ProfileService')
    const PresenceService = require('../src/services/PresenceService')
    ProfileService.updateMyProfile(1, { show_online: 0 })
    PresenceService.heartbeat(1)
    const online = PresenceService.listOnlineUsers()
    expect(online.find((u) => u.user_id === 1)).toBeUndefined()
  })

  it('resolveOnlineStatus يحترم العتبة', () => {
    const PresenceModel = require('../src/models/PresenceModel')
    const PresenceService = require('../src/services/PresenceService')
    db.prepare(
      `INSERT INTO user_presence (user_id, last_seen_at, is_online)
       VALUES (1, datetime('now', '-200 seconds'), 0)`
    ).run()
    expect(PresenceService.resolveOnlineStatus(1, 1)).toBe(false)
    PresenceModel.upsertHeartbeat(1)
    expect(PresenceModel.isRecentlyActive(1, 120)).toBe(true)
    expect(PresenceService.resolveOnlineStatus(1, 1)).toBe(true)
  })
})
