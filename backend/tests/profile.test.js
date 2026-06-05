const { createSocialTestDb, destroySocialTestDb } = require('./helpers/socialTestDb')
const {
  validateProfilePatch,
  sanitizeExtension,
  MAX_AVATAR_BYTES,
} = require('../src/services/ProfileService')

let db

beforeEach(() => {
  db = createSocialTestDb()
})

afterEach(() => {
  destroySocialTestDb(db)
  db = null
})

describe('ProfileService — validateProfilePatch', () => {
  it('يقبل تحديثاً صالحاً', () => {
    const { errors, settings } = validateProfilePatch({
      display_name: 'أحمد',
      bio: 'محاسب تخليص',
      show_online: 1,
    })
    expect(errors).toHaveLength(0)
    expect(settings.display_name).toBe('أحمد')
    expect(settings.show_online).toBe(1)
  })

  it('يرفض اسم معروض فارغاً', () => {
    const { errors } = validateProfilePatch({ display_name: '   ' })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('يرفض نبذة طويلة', () => {
    const { errors } = validateProfilePatch({ bio: 'x'.repeat(501) })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('show_online=false يُحوَّل إلى 0', () => {
    const { settings } = validateProfilePatch({ show_online: false })
    expect(settings.show_online).toBe(0)
  })

  it('يرفض show_online غير صالح', () => {
    const { errors } = validateProfilePatch({ show_online: 'yes' })
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe('ProfileService — sanitizeExtension', () => {
  it('يقبل jpg و png', () => {
    expect(sanitizeExtension('jpg')).toBe('.jpg')
    expect(sanitizeExtension('.png')).toBe('.png')
  })

  it('يرفض امتدادات خطرة', () => {
    expect(sanitizeExtension('exe')).toBeNull()
    expect(sanitizeExtension('php')).toBeNull()
  })
})

describe('ProfileService — قاعدة البيانات', () => {
  it('ينشئ ملفاً شخصياً تلقائياً', () => {
    const ProfileService = require('../src/services/ProfileService')
    const profile = ProfileService.getMyProfile(1)
    expect(profile.user_id).toBe(1)
    expect(profile.display_name).toBe('محاسب أول')
    expect(profile.show_online).toBe(1)
  })

  it('تحديث show_online يخفي الحالة', () => {
    const ProfileService = require('../src/services/ProfileService')
    ProfileService.updateMyProfile(1, { show_online: 0 })
    const profile = ProfileService.getProfile(2, 1)
    expect(profile.show_online).toBe(0)
    expect(profile.is_online).toBe(false)
  })

  it('يرفض صورة أكبر من الحد', () => {
    const ProfileService = require('../src/services/ProfileService')
    const big = Buffer.alloc(MAX_AVATAR_BYTES + 1).toString('base64')
    const dataUrl = `data:image/png;base64,${big}`
    expect(() => ProfileService.saveAvatar(1, dataUrl)).toThrow(/2 ميجابايت/)
  })

  it('يحفظ صورة حقيقية ويعيد رابطاً صالحاً', () => {
    const fs = require('fs')
    const ProfileService = require('../src/services/ProfileService')
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`
    const result = ProfileService.saveAvatar(1, dataUrl)
    expect(result.avatar_url).toMatch(/^\/profile\/avatar\/1_/)
    expect(fs.existsSync(result.avatar_path)).toBe(true)
    const profile = ProfileService.getMyProfile(1)
    expect(profile.avatar_url).toBe(result.avatar_url)
  })
})
