const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const ProfileModel = require('../models/ProfileModel')
const PresenceService = require('./PresenceService')
const UserModel = require('../models/UserModel')
const { ValidationError, NotFoundError, BusinessRuleError } = require('../utils/errors')

const AVATAR_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars')
const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

function validateProfilePatch(patch) {
  const errors = []
  const out = {}

  if (patch.display_name !== undefined) {
    const name = String(patch.display_name).trim()
    if (name.length < 1 || name.length > 80) {
      errors.push('الاسم المعروض يجب أن يكون بين 1 و 80 حرفاً')
    } else {
      out.display_name = name
    }
  }

  if (patch.bio !== undefined) {
    const bio = String(patch.bio)
    if (bio.length > 500) {
      errors.push('النبذة لا تتجاوز 500 حرف')
    } else {
      out.bio = bio.trim()
    }
  }

  if (patch.show_online !== undefined) {
    const v = patch.show_online
    if (v !== 0 && v !== 1 && v !== true && v !== false) {
      errors.push('show_online يجب أن يكون 0 أو 1')
    } else {
      out.show_online = v === true || v === 1 ? 1 : 0
    }
  }

  return { errors, settings: out }
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:image\/(\w+);base64,(.+)$/i)
  if (!match) return null
  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase()
  const buffer = Buffer.from(match[2], 'base64')
  return { ext, buffer }
}

function sanitizeExtension(ext) {
  const normalized = `.${String(ext).toLowerCase().replace(/^\./, '')}`
  if (!ALLOWED_EXT.has(normalized)) return null
  return normalized === '.jpeg' ? '.jpg' : normalized
}

class ProfileService {
  listDirectory(excludeUserId) {
    const rows = ProfileModel.db
      .prepare(
        `SELECT u.id, u.name, u.username,
                COALESCE(p.display_name, u.name) AS display_name,
                p.avatar_path
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.is_deleted = 0 AND u.id != ?
         ORDER BY u.name ASC`
      )
      .all(excludeUserId)
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      username: r.username,
      display_name: r.display_name,
      avatar_url: r.avatar_path
        ? `/profile/avatar/${path.basename(r.avatar_path)}`
        : null,
    }))
  }

  getMyProfile(userId) {
    const user = UserModel.findByIdIncludePassword(userId)
    if (!user) throw new NotFoundError()
    const profile = ProfileModel.ensure(userId, { display_name: user.name })
    const online = PresenceService.resolveOnlineStatus(userId, profile.show_online)
    return this.formatProfile(user, profile, online)
  }

  getProfile(viewerId, targetUserId) {
    const row = ProfileModel.getPublicProfile(targetUserId)
    if (!row) throw new NotFoundError('المستخدم غير موجود')
    const online = PresenceService.resolveOnlineStatus(targetUserId, row.show_online ?? 1)
    return {
      user_id: row.user_id,
      display_name: row.display_name || row.user_name,
      bio: row.bio || '',
      avatar_path: row.avatar_path,
      avatar_url: row.avatar_path ? `/profile/avatar/${path.basename(row.avatar_path)}` : null,
      show_online: row.show_online ?? 1,
      is_online: online,
      user_name: row.user_name,
      username: row.username,
      role: row.role,
      is_self: viewerId === targetUserId,
    }
  }

  updateMyProfile(userId, patch) {
    const { errors, settings } = validateProfilePatch(patch)
    if (errors.length) throw new ValidationError(errors.join(' — '))
    ProfileModel.ensure(userId)
    const updated = ProfileModel.update(userId, settings)
    return this.getMyProfile(userId)
  }

  saveAvatar(userId, dataUrl) {
    const parsed = parseDataUrl(dataUrl)
    if (!parsed) throw new ValidationError('صيغة الصورة غير صالحة — استخدم base64 مع data URL')

    if (parsed.buffer.length > MAX_AVATAR_BYTES) {
      throw new ValidationError('حجم الصورة يتجاوز 2 ميجابايت')
    }

    const ext = sanitizeExtension(parsed.ext)
    if (!ext) throw new ValidationError('امتداد الصورة غير مسموح')

    if (!fs.existsSync(AVATAR_DIR)) {
      fs.mkdirSync(AVATAR_DIR, { recursive: true })
    }

    const filename = `${userId}_${crypto.randomBytes(8).toString('hex')}${ext}`
    const fullPath = path.join(AVATAR_DIR, filename)

    const existing = ProfileModel.getByUserId(userId)
    if (existing?.avatar_path && fs.existsSync(existing.avatar_path)) {
      try { fs.unlinkSync(existing.avatar_path) } catch { /* ignore */ }
    }

    fs.writeFileSync(fullPath, parsed.buffer)
    ProfileModel.ensure(userId)
    ProfileModel.update(userId, { avatar_path: fullPath })

    return {
      avatar_path: fullPath,
      avatar_url: `/profile/avatar/${filename}`,
    }
  }

  getAvatarFile(filename, requesterId) {
    const safe = path.basename(filename)
    if (safe !== filename || safe.includes('..')) {
      throw new ValidationError('اسم ملف غير صالح')
    }
    const fullPath = path.join(AVATAR_DIR, safe)
    if (!fs.existsSync(fullPath)) throw new NotFoundError('الصورة غير موجودة')

    const row = ProfileModel.getByUserId(
      parseInt(safe.split('_')[0], 10)
    )
    if (!row?.avatar_path || path.basename(row.avatar_path) !== safe) {
      throw new NotFoundError('الصورة غير موجودة')
    }

    return { fullPath, ext: path.extname(safe).toLowerCase() }
  }

  formatProfile(user, profile, online) {
    return {
      user_id: user.id,
      display_name: profile.display_name || user.name,
      bio: profile.bio || '',
      avatar_path: profile.avatar_path,
      avatar_url: profile.avatar_path
        ? `/profile/avatar/${path.basename(profile.avatar_path)}`
        : null,
      show_online: profile.show_online ?? 1,
      is_online: online,
      user_name: user.name,
      username: user.username,
      role: user.role,
      is_self: true,
    }
  }
}

module.exports = new ProfileService()
module.exports.validateProfilePatch = validateProfilePatch
module.exports.sanitizeExtension = sanitizeExtension
module.exports.MAX_AVATAR_BYTES = MAX_AVATAR_BYTES
